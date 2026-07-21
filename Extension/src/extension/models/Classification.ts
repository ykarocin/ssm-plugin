/**
 * Classification types and interfaces for semantic conflict analysis.
 * Defines the complete taxonomy of OA, DF, and CF conflict classifications.
 */

/**
 * Top-level conflict type: Overriding Assignment, Data Flow, or Confluence
 */
export type ConflictType = "OA" | "DF" | "CF";

/**
 * OA (Overriding Assignment) conflict types - 11 total
 * Two nodes: left (original) and right (modified) interference
 */
export type OAType =
  | "OA_A1"  // left A, right A (same file, same location)
  | "OA_A2"  // left A, right B (different files)
  | "OA_B2"  // left A, right A→B (one side in A, other crosses A→B)
  | "OA_C2"  // left B, right A→B (one side in B, other crosses A→B arriving at B)
  | "OA_A3"  // left A, right B→C (one side in A, other crosses B→C)
  | "OA_D2"  // left A→B, right A→B (both follow same path A→B)
  | "OA_E2"  // left A→B, right B→A (reversed paths)
  | "OA_B3"  // left A→C, right B→C (different starts, same end)
  | "OA_C3"  // left A→B, right A→C (same start, different ends)
  | "OA_D3"  // left A→B, right B→C (chained: one's end is other's start)
  | "OA_A4"; // left A→B, right C→D (all files distinct)

/**
 * DF (Data Flow) conflict types - 11 total
 * Same as OA but for Source→Sink data flow patterns
 */
export type DFType =
  | "DF_A1"  // source A, sink A (same file)
  | "DF_A2"  // source A, sink B (different files)
  | "DF_B2"  // source A, sink A→B
  | "DF_C2"  // source B, sink A→B
  | "DF_A3"  // source A, sink B→C
  | "DF_D2"  // source A→B, sink A→B
  | "DF_E2"  // source A→B, sink B→A (reversed)
  | "DF_B3"  // source A→C, sink B→C
  | "DF_C3"  // source A→B, sink A→C
  | "DF_D3"  // source A→B, sink B→C (chained)
  | "DF_A4"; // source A→B, sink C→D

/**
 * CF (Confluence) conflict types - 32 total
 * Three nodes: source1, source2, and confluence point
 */
export type CFType =
  // 1 distinct file
  | "CF_A1"
  // 2 distinct files
  | "CF_A2"
  | "CF_B2"
  | "CF_C2"
  | "CF_D2"
  | "CF_E2"
  | "CF_F2"
  | "CF_G2"
  | "CF_H2"
  | "CF_I2"
  // 3 distinct files
  | "CF_A3"
  | "CF_B3"
  | "CF_C3"
  | "CF_D3"
  | "CF_E3"
  | "CF_F3"
  | "CF_G3"
  | "CF_H3"
  | "CF_I3"
  | "CF_J3"
  | "CF_K3"
  | "CF_L3"
  | "CF_M3"
  | "CF_N3"
  | "CF_O3"
  // 4 distinct files
  | "CF_A4"
  | "CF_B4"
  | "CF_C4"
  | "CF_D4"
  | "CF_E4"
  | "CF_F4"
  // 5 distinct files
  | "CF_A5";

/**
 * Union of all possible classification labels (valid types or errors)
 */
export type ClassificationLabel =
  | OAType
  | DFType
  | CFType
  | `Error: ${string}`;

/**
 * Result of classifying a single dependency/conflict
 */
export interface ClassificationResult {
  /** The conflict type: OA, DF, or CF */
  conflictType: ConflictType;

  /** The specific classification label (e.g., "OA_A1", "DF_B2", "CF_A3", or error) */
  label: ClassificationLabel;

  /**
   * For OA/DF: file sequence for the left/source side
   * Array of 1-2 file keys (normalized class/file names)
   */
  leftFiles?: string[];

  /**
   * For OA/DF: file sequence for the right/sink side
   * Array of 1-2 file keys (normalized class/file names)
   */
  rightFiles?: string[];

  /**
   * For OA/DF: representative frame (file + line) for each entry in leftFiles, in order.
   * Lets graph rendering build nodes directly from the same locations classification used,
   * instead of re-deriving them from the dependency's raw interference array.
   */
  leftFrames?: FrameInfo[];

  /**
   * For OA/DF: representative frame (file + line) for each entry in rightFiles, in order.
   */
  rightFrames?: FrameInfo[];

  /**
   * For CF: file sequence for source1
   * Array of 1-2 file keys
   */
  source1Files?: string[];

  /**
   * For CF: file sequence for source2
   * Array of 1-2 file keys
   */
  source2Files?: string[];

  /**
   * For CF: representative frame (file + line) for each entry in source1Files, in order.
   */
  source1Frames?: FrameInfo[];

  /**
   * For CF: representative frame (file + line) for each entry in source2Files, in order.
   */
  source2Frames?: FrameInfo[];

  /**
   * For CF: file containing the confluence point
   * Single file key (always 1 element)
   */
  confluenceFile?: string;

  /**
   * For CF: the frame (file + line) of the confluence point.
   */
  confluenceFrame?: FrameInfo;

  /**
   * Optional explanation of the classification
   * Useful for debugging classification decisions
   */
  reason?: string;
}

/**
 * Information about a single frame in a stack trace
 */
export interface FrameInfo {
  /** Normalized file key (class name or filename without extension) */
  fileKey: string;

  /** Line number in the source file */
  line: number;

  /** Original frame object from stack trace */
  frame: Record<string, any>;
}

/**
 * Result of processing an interference pair (OA/DF)
 * Contains extracted frame sequences and any processing errors
 */
export interface ProcessedFrames {
  /** Extracted and filtered frames from left/source node */
  leftFrames: FrameInfo[];

  /** Extracted and filtered frames from right/sink node */
  rightFrames: FrameInfo[];

  /** Error message if processing failed (e.g., "unmodified_stack_trace") */
  error?: string;
}

/**
 * Processed CF-specific frame information
 */
export interface ProcessedCFFrames {
  /** Extracted and filtered frames from source1 node */
  source1Frames: FrameInfo[];

  /** Extracted and filtered frames from source2 node */
  source2Frames: FrameInfo[];

  /** Single frame for confluence node */
  confluenceFrame: FrameInfo | null;

  /** Error message if processing failed */
  error?: string;
}

/**
 * Mapping of modified lines per file
 * Keys are normalized file paths
 * Values contain line numbers added/removed by each branch
 */
export interface ModifiedLinesMap {
  [filePath: string]: {
    leftAdded: number[];
    leftRemoved: number[];
    rightAdded: number[];
    rightRemoved: number[];
  };
}
