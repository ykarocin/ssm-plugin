/**
 * Core utility functions for conflict classification pipeline.
 * Ported from Python conflict_processor.py and related modules.
 */

import type { ClassificationResult, FrameInfo, ModifiedLinesMap } from "../models/Classification";

/**
 * Normalize a file reference (path, filename, or class name) into a canonical key.
 * Used for comparing files across different representations.
 *
 * Rules (in order):
 * 1. If falsy → return undefined
 * 2. If has known extension or contains path separators → extract filename without extension
 * 3. If contains '.' but no separators → extract last component (qualified class name)
 * 4. Otherwise → extract filename without extension
 *
 * Examples:
 * - "com/example/Foo.java" → "Foo"
 * - "com.example.Foo" → "Foo"
 * - "Foo.java" → "Foo"
 * - "Bar" → "Bar"
 */
export function normalizeFileKey(value: string | undefined | null): string | undefined {
  if (!value) {
    return undefined;
  }

  const knownExtensions = [
    ".java",
    ".py",
    ".kt",
    ".scala",
    ".js",
    ".ts",
    ".c",
    ".cpp",
    ".h",
    ".cs",
  ];

  // Check if has known extension or contains path separators
  const hasExtension = knownExtensions.some((ext) => value.includes(ext));
  const hasPathSeparator = value.includes("/") || value.includes("\\");

  if (hasExtension || hasPathSeparator) {
    // Extract filename and remove extension
    const filename = value.split(/[\/\\]/).pop() || value;
    return filename.replace(/\.[^.]+$/, "");
  }

  // Check if it's a qualified class name (contains '.' but no path separators)
  if (value.includes(".") && !hasPathSeparator) {
    // Extract last component after final '.'
    return value.split(".").pop();
  }

  // Fallback: remove extension if present, return as-is
  return value.replace(/\.[^.]+$/, "");
}

/**
 * Normalize a file path by standardizing separators and removing redundant prefixes.
 *
 * Rules:
 * - Replace backslashes with forward slashes
 * - Remove leading './'
 * - Remove leading '/'
 */
export function normalizeFilePath(path: string | undefined): string | undefined {
  if (!path) {
    return undefined;
  }

  return path
    .replace(/\\/g, "/") // Replace backslashes
    .replace(/^\.\/+/, "") // Remove leading ./
    .replace(/^\/+/, ""); // Remove leading /
}

/**
 * Extract an ordered list of frames from an interference node's stack trace.
 *
 * Each frame contains:
 * - fileKey: normalized file identifier
 * - line: line number (non-negative)
 * - frame: original frame object
 *
 * Skips:
 * - Frames with missing or invalid line numbers
 * - Frames with no resolvable file key
 * - Consecutive duplicate (fileKey, line) pairs
 *
 * After processing stack trace, also tries to add the node's location.file
 * as a final frame if it differs from the last appended frame.
 */
export function getFramesWithLines(
  interferenceNode: any,
  options?: { normalized?: boolean }
): FrameInfo[] {
  const frames: FrameInfo[] = [];
  const seenPairs = new Set<string>(); // Track (fileKey, line) pairs to avoid duplicates

  const stackTrace = interferenceNode.stackTrace || [];

  // Process stack trace frames
  for (const frame of stackTrace) {
    // Extract line number
    const line = frame.line ?? frame.location?.line;
    if (line === undefined || line === null || line < 0 || isNaN(line)) {
      continue;
    }

    // Extract file key from various possible locations
    let fileKey: string | undefined;
    if (frame.file) {
      fileKey = normalizeFileKey(frame.file);
    } else if (frame.location?.file) {
      fileKey = normalizeFileKey(frame.location.file);
    } else if (frame.class) {
      fileKey = normalizeFileKey(frame.class);
    } else if (frame.location?.class) {
      fileKey = normalizeFileKey(frame.location.class);
    }

    if (!fileKey) {
      continue;
    }

    // Skip consecutive duplicate (fileKey, line) pairs
    const pair = `${fileKey}:${line}`;
    if (seenPairs.has(pair)) {
      continue;
    }

    seenPairs.add(pair);
    frames.push({
      fileKey,
      line,
      frame,
    });
  }

  // Try to add node's location as final frame if different from last
  const locationFile = interferenceNode.location?.file;
  const locationLine = interferenceNode.location?.line;

  if (
    locationFile &&
    locationLine !== undefined &&
    locationLine !== null &&
    locationLine >= 0 &&
    !isNaN(locationLine)
  ) {
    const locFileKey = normalizeFileKey(locationFile);
    if (locFileKey) {
      const lastFrame = frames[frames.length - 1];
      if (!lastFrame || lastFrame.fileKey !== locFileKey || lastFrame.line !== locationLine) {
        frames.push({
          fileKey: locFileKey,
          line: locationLine,
          frame: interferenceNode.location,
        });
      }
    }
  }

  return frames;
}

/**
 * Convert a list of frames to an ordered list of unique consecutive file keys.
 *
 * Collapses consecutive duplicate file keys.
 *
 * Example:
 * [("A", 10), ("A", 20), ("B", 5), ("B", 15)] → ["A", "B"]
 */
export function framesToFiles(frames: FrameInfo[]): string[] {
  const files: string[] = [];

  for (const frame of frames) {
    // Add if list is empty or different from last
    if (files.length === 0 || files[files.length - 1] !== frame.fileKey) {
      files.push(frame.fileKey);
    }
  }

  return files;
}

/**
 * Reduce a file list for classification purposes.
 *
 * Rules:
 * - If ≤ 2 files: return as-is
 * - If > 2 files: return [first, last]
 * - If first == last (after reduction): return [first]
 */
export function filesForClassification(filesFull: string[]): string[] {
  if (filesFull.length <= 2) {
    return filesFull;
  }

  // Keep only first and last
  const reduced = [filesFull[0], filesFull[filesFull.length - 1]];

  // If they're the same, keep only one
  if (reduced[0] === reduced[1]) {
    return [reduced[0]];
  }

  return reduced;
}

/**
 * Check if a line number appears in any modified lines entry.
 * Used to determine if a frame belongs to the modified code.
 */
export function isLineModified(
  line: number,
  filePath: string,
  modifiedLines: ModifiedLinesMap | undefined
): boolean {
  if (!modifiedLines) {
    return true; // If no modified lines info, assume all are modified
  }

  const entry = modifiedLines[filePath];
  if (!entry) {
    return false;
  }

  const allModifiedLines = [
    ...entry.leftAdded,
    ...entry.leftRemoved,
    ...entry.rightAdded,
    ...entry.rightRemoved,
  ];

  return allModifiedLines.includes(line);
}

/**
 * Determine which branch owns a given file/line combination.
 * Returns 'L' for left, 'R' for right, or undefined if ambiguous.
 */
export function determineOwner(
  line: number,
  filePath: string,
  modifiedLines: ModifiedLinesMap | undefined
): "L" | "R" | undefined {
  if (!modifiedLines) {
    return undefined;
  }

  const entry = modifiedLines[filePath];
  if (!entry) {
    return undefined;
  }

  const inLeft = [
    ...entry.leftAdded,
    ...entry.leftRemoved,
  ].includes(line);
  const inRight = [
    ...entry.rightAdded,
    ...entry.rightRemoved,
  ].includes(line);

  if (inLeft && !inRight) {
    return "L";
  }
  if (inRight && !inLeft) {
    return "R";
  }

  return undefined;
}

/**
 * Find the closest modified line to a given reference line.
 * Returns the distance to the closest modified line.
 * Used for breaking ties in Rule 2 (duplicate last frame removal).
 */
export function closestModifiedDistance(
  lines: number[],
  modifiedLines: ModifiedLinesMap | undefined
): number {
  if (!modifiedLines) {
    return Infinity;
  }

  const allModified = new Set<number>();
  Object.values(modifiedLines).forEach((entry) => {
    [...entry.leftAdded, ...entry.leftRemoved, ...entry.rightAdded, ...entry.rightRemoved].forEach(
      (line) => allModified.add(line)
    );
  });

  if (allModified.size === 0) {
    return Infinity;
  }

  // Find minimum distance from any line to nearest modified line
  let minDistance = Infinity;
  for (const line of lines) {
    for (const modLine of allModified) {
      const dist = Math.abs(line - modLine);
      minDistance = Math.min(minDistance, dist);
    }
  }

  return minDistance;
}

/**
 * Rule 1: Find the start index in a frame list.
 *
 * Trim the stack to start from the first frame that was modified by the branch
 * that owns this interference node. This removes "shared boilerplate" frames.
 *
 * Steps:
 * 1. Determine owner via location-based check (file/line in modifiedLines)
 * 2. If indeterminate, check stack trace frames
 * 3. Default to 'L' if still unclear
 * 4. Find first frame in owner's modified lines, return that index
 */
export function findStartIndex(
  frames: FrameInfo[],
  thisInterf: any,
  otherInterf: any,
  modifiedLines: ModifiedLinesMap | undefined
): number {
  if (!modifiedLines || frames.length === 0) {
    return 0;
  }

  // Step 1: Location-based ownership
  const thisFile = normalizeFilePath(thisInterf.location?.file);
  const thisLine = thisInterf.location?.line;
  let owner: "L" | "R" | undefined;

  if (thisFile && thisLine !== undefined) {
    owner = determineOwner(thisLine, thisFile, modifiedLines);
  }

  // Step 2: Stack trace-based ownership (fallback)
  if (!owner) {
    for (const frame of frames) {
      const frameOwner = determineOwner(frame.line, frame.fileKey, modifiedLines);
      if (frameOwner) {
        owner = frameOwner;
        break;
      }
    }
  }

  // Step 3: Default to 'L'
  if (!owner) {
    owner = "L";
  }

  // Step 4: Find first frame in owner's modified lines
  for (let i = 0; i < frames.length; i++) {
    const frameOwner = determineOwner(frames[i].line, frames[i].fileKey, modifiedLines);
    if (frameOwner === owner) {
      return i;
    }
  }

  return 0;
}

/**
 * Rule 2: Filter duplicate last frames.
 *
 * When both left and right frame lists end with the same (fileKey, line) pair,
 * remove it from the side that does not own it to avoid ambiguity.
 *
 * Returns: [leftFrames, rightFrames, error]
 */
export function filterDuplicateLastFrames(
  leftFrames: FrameInfo[],
  rightFrames: FrameInfo[],
  modifiedLines: ModifiedLinesMap | undefined
): [FrameInfo[], FrameInfo[], string | undefined] {
  // If either list is empty or last frames differ, return as-is
  if (leftFrames.length === 0 || rightFrames.length === 0) {
    return [leftFrames, rightFrames, undefined];
  }

  const lastLeft = leftFrames[leftFrames.length - 1];
  const lastRight = rightFrames[rightFrames.length - 1];

  if (lastLeft.fileKey !== lastRight.fileKey || lastLeft.line !== lastRight.line) {
    return [leftFrames, rightFrames, undefined];
  }

  // Frames have same last (fileKey, line) - determine owner
  const owner = determineOwner(lastLeft.line, lastLeft.fileKey, modifiedLines);

  if (owner === "L") {
    // Left owns it, remove from right
    return [leftFrames, rightFrames.slice(0, -1), undefined];
  } else if (owner === "R") {
    // Right owns it, remove from left
    return [leftFrames.slice(0, -1), rightFrames, undefined];
  }

  // Owner is ambiguous - use modified-line distance heuristic
  if (!modifiedLines) {
    // No modified lines info - error
    return [
      leftFrames,
      rightFrames,
      "unmodified_stack_trace",
    ];
  }

  const leftDistance = closestModifiedDistance(
    leftFrames.map((f) => f.line),
    modifiedLines
  );
  const rightDistance = closestModifiedDistance(
    rightFrames.map((f) => f.line),
    modifiedLines
  );

  // Check if any frames are modified
  if (leftDistance === Infinity && rightDistance === Infinity) {
    return [
      leftFrames,
      rightFrames,
      "unmodified_stack_trace",
    ];
  }

  // Remove from the side with greater distance
  if (leftDistance > rightDistance) {
    return [leftFrames.slice(0, -1), rightFrames, undefined];
  } else if (rightDistance > leftDistance) {
    return [leftFrames, rightFrames.slice(0, -1), undefined];
  }

  // Distances are equal - use length as tie-breaker
  if (leftFrames.length > rightFrames.length) {
    return [leftFrames.slice(0, -1), rightFrames, undefined];
  } else if (rightFrames.length > leftFrames.length) {
    return [leftFrames, rightFrames.slice(0, -1), undefined];
  }

  // Ambiguous - both sides identical
  return [
    leftFrames,
    rightFrames,
    "ambiguous_duplicate_last_frame",
  ];
}

/**
 * Main pipeline for OA/DF conflicts.
 *
 * Given two interference nodes, produce the file sequences used for classification.
 *
 * Steps:
 * 1. Extract frames from both nodes
 * 2. Check for unmodified stack trace error
 * 3. Check for symmetric (identical) stacks error
 * 4. Apply Rule 1 to trim frames
 * 5. Apply Rule 2 to remove duplicate last frames
 * 6. Build full and classification file lists
 */
export interface ProcessedInterferencePair {
  leftFilesFull: string[];
  rightFilesFull: string[];
  leftFilesForClass: string[];
  rightFilesForClass: string[];
  error?: string;
}

export function processInterferencePair(
  leftInterf: any,
  rightInterf: any,
  modifiedLines: ModifiedLinesMap | undefined
): ProcessedInterferencePair {
  // Step 1: Extract frames
  let leftFrames = getFramesWithLines(leftInterf);
  let rightFrames = getFramesWithLines(rightInterf);

  // Step 2: Unmodified stack trace check
  if (modifiedLines && Object.keys(modifiedLines).length > 0) {
    const leftHasModified = leftFrames.some((f) =>
      isLineModified(f.line, f.fileKey, modifiedLines)
    );
    const rightHasModified = rightFrames.some((f) =>
      isLineModified(f.line, f.fileKey, modifiedLines)
    );

    if (!leftHasModified || !rightHasModified) {
      return {
        leftFilesFull: [],
        rightFilesFull: [],
        leftFilesForClass: [],
        rightFilesForClass: [],
        error: "unmodified_stack_trace",
      };
    }
  }

  // Step 3: Symmetric check
  const leftPairs = leftFrames.map((f) => `${f.fileKey}:${f.line}`);
  const rightPairs = rightFrames.map((f) => `${f.fileKey}:${f.line}`);
  if (
    leftPairs.length === rightPairs.length &&
    leftPairs.every((p, i) => p === rightPairs[i])
  ) {
    return {
      leftFilesFull: [],
      rightFilesFull: [],
      leftFilesForClass: [],
      rightFilesForClass: [],
      error: "symmetric_modified_lines",
    };
  }

  // Step 4: Apply Rule 1 (start index trimming)
  const lstart = findStartIndex(leftFrames, leftInterf, rightInterf, modifiedLines);
  const rstart = findStartIndex(rightFrames, rightInterf, leftInterf, modifiedLines);
  leftFrames = leftFrames.slice(lstart);
  rightFrames = rightFrames.slice(rstart);

  // Step 5: Apply Rule 2 (duplicate last frame removal)
  const [leftFiltered, rightFiltered, rule2Error] = filterDuplicateLastFrames(
    leftFrames,
    rightFrames,
    modifiedLines
  );

  if (rule2Error) {
    return {
      leftFilesFull: [],
      rightFilesFull: [],
      leftFilesForClass: [],
      rightFilesForClass: [],
      error: rule2Error,
    };
  }

  // Step 6: Build file lists
  const leftFilesFull = framesToFiles(leftFiltered);
  const rightFilesFull = framesToFiles(rightFiltered);
  const leftFilesForClass = filesForClassification(leftFilesFull);
  const rightFilesForClass = filesForClassification(rightFilesFull);

  return {
    leftFilesFull,
    rightFilesFull,
    leftFilesForClass,
    rightFilesForClass,
  };
}

/**
 * OA-specific entry point for conflict processing.
 *
 * For OA conflicts, the two nodes are simply:
 * - left: interference[0]
 * - right: interference[-1]
 */
export function processOAConflict(
  dependency: any,
  modifiedLines: ModifiedLinesMap | undefined
): ProcessedInterferencePair {
  const interference = dependency.body?.interference || [];
  if (interference.length < 2) {
    return {
      leftFilesFull: [],
      rightFilesFull: [],
      leftFilesForClass: [],
      rightFilesForClass: [],
      error: "insufficient_interference_nodes",
    };
  }

  const leftInterf = interference[0];
  const rightInterf = interference[interference.length - 1];

  return processInterferencePair(leftInterf, rightInterf, modifiedLines);
}

/**
 * DF-specific entry point for conflict processing.
 *
 * For DF conflicts, we select:
 * - left (Source): first node with "Source" in type, fallback to first node
 * - right (Sink): last node with "Sink" in type, fallback to last node
 */
export function processDFConflict(
  dependency: any,
  modifiedLines: ModifiedLinesMap | undefined
): ProcessedInterferencePair {
  const interference = dependency.body?.interference || [];
  if (interference.length < 2) {
    return {
      leftFilesFull: [],
      rightFilesFull: [],
      leftFilesForClass: [],
      rightFilesForClass: [],
      error: "insufficient_interference_nodes",
    };
  }

  // Find Source node (first with "Source" in type)
  let sourceNode = interference.find((node) =>
    (node.type || "").toLowerCase().includes("source")
  );
  if (!sourceNode) {
    sourceNode = interference[0];
  }

  // Find Sink node (last with "Sink" in type, scanning in reverse)
  let sinkNode: any = null;
  for (let i = interference.length - 1; i >= 0; i--) {
    if ((interference[i].type || "").toLowerCase().includes("sink")) {
      sinkNode = interference[i];
      break;
    }
  }
  if (!sinkNode) {
    sinkNode = interference[interference.length - 1];
  }

  return processInterferencePair(sourceNode, sinkNode, modifiedLines);
}
