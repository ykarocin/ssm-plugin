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
