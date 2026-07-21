import { getDiffLine } from "../components/Diff/diff-navigation";
import { Node } from "../components/Graph/Node";
import { ensureJavaExtension } from "@extension/utils";
import { framesForClassification } from "./classification";
import type { ClassificationResult, FrameInfo } from "../models/Classification";

/**
 * Resolve the actual source file path for a classification frame. FrameInfo.fileKey is a
 * normalized (path-and-extension-stripped) identifier used only for classification
 * comparisons; the raw frame carries the real file/class needed to look up diff lines.
 */
function resolveFrameFileName(frame: FrameInfo): string {
  const raw = frame.frame as { file?: string; class?: string; location?: { file?: string; class?: string } };
  const rawFile = raw.file ?? raw.location?.file;
  if (rawFile) {
    return ensureJavaExtension(rawFile.replaceAll("\\", "/"));
  }
  const rawClass = raw.class ?? raw.location?.class;
  if (rawClass) {
    return ensureJavaExtension(rawClass.replaceAll(".", "/"));
  }
  return ensureJavaExtension(frame.fileKey);
}

/**
 * Build a graph Node for a classification frame, reading the frame's source line and the
 * one above and below it from the rendered diff so the node shows a small code snippet.
 */
function buildNodeFromFrame(frame: FrameInfo): Node {
  const fileName = resolveFrameFileName(frame);
  const lines: string[] = [];
  for (let i = -1; i <= 1; i++) {
    const row = getDiffLine(fileName, frame.line + i);
    lines.push(row?.querySelector(".d2h-code-line-ctn")?.textContent || "");
  }
  return new Node(fileName, lines, frame.line, "", false, true, false);
}

/** Normalize a path: forward slashes, and no leading "./" or "/". */
const normalizePath = (p: string) => p.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\/+/, "");

/**
 * Reconcile filenames across a set of nodes so the same file is represented by the same
 * string (Grouping_nodes groups strictly by exact fileName match). When one node's path is
 * a suffix of another's (e.g. "Main.java" vs "src/main/java/pkg/Main.java"), collapse both
 * to the shorter one.
 */
function unifyFileNames(nodes: Node[]): void {
  nodes.forEach((n) => {
    n.fileName = normalizePath(n.fileName);
  });

  for (let i = 0; i < nodes.length; i++) {
    for (let j = 0; j < nodes.length; j++) {
      if (i === j) continue;
      const a = nodes[i].fileName;
      const b = nodes[j].fileName;
      if (!a || !b || a === b) continue;

      if (a.includes(b) && b.length < a.length) {
        nodes[i].fileName = b;
      } else if (b.includes(a) && a.length < b.length) {
        nodes[j].fileName = a;
      }
    }
  }
}

/**
 * Build the graph's L/R/LC/RC nodes directly from a DF/OA classification result, instead of
 * re-deriving source/sink locations from the raw dependency. This guarantees the rendered
 * graph always matches the nodes classification actually reasoned about.
 *
 * LC/RC only end up distinct from L/R when the classified sequence crosses into a second
 * file (e.g. DF_B2, DF_D2, ...); otherwise they mirror L/R exactly, so Grouping_nodes'
 * dedup treats them as the same node.
 *
 * Returns null when the conflict has no usable classification (error label) or is a CF
 * conflict (not yet wired into Grouping_nodes/getGraphType).
 */
export function buildNodesFromClassification(
  classification: ClassificationResult
): { L: Node; R: Node; LC: Node; RC: Node } | null {
  if (classification.label.startsWith("Error:")) {
    return null;
  }
  if (classification.conflictType === "CF") {
    return null;
  }

  const leftFrames = classification.leftFrames;
  const rightFrames = classification.rightFrames;
  if (!leftFrames || !rightFrames || leftFrames.length === 0 || rightFrames.length === 0) {
    return null;
  }

  const leftEndpoints = framesForClassification(leftFrames);
  const rightEndpoints = framesForClassification(rightFrames);

  const L = buildNodeFromFrame(leftEndpoints[0]);
  const LC = buildNodeFromFrame(leftEndpoints[leftEndpoints.length - 1]);
  const R = buildNodeFromFrame(rightEndpoints[0]);
  const RC = buildNodeFromFrame(rightEndpoints[rightEndpoints.length - 1]);

  unifyFileNames([L, R, LC, RC]);

  return { L, R, LC, RC };
}
