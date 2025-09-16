import { Node } from "./Graph/Node";
import { dependency } from "@src/models/AnalysisOutput";

type FileObject = {
  fileName: string;
  nodes: Node[];
};

const Grouping_nodes = (dep: dependency, L: Node, R: Node, LC: Node, RC: Node) => {
  const graph: FileObject[] = [];

  if (dep.type.startsWith("OA") || dep.type.startsWith("CONFLICT")) {
    const fileMap: Map<string, Node[]> = new Map();

    const normalizeFileName = (fileName: string) => fileName.replace(/\.java$/, "");

    const addNodeToFile = (node: Node, origin: "L" | "R" | "LC" | "RC") => {
      node.origin = origin;
      const normalized = normalizeFileName(node.fileName);

      if (!fileMap.has(normalized)) {
      fileMap.set(normalized, []);
      }
      const fileNodes = fileMap.get(normalized)!;

      if (!fileNodes.some((n) => n.lines[0] === node.lines[0])) {
        fileNodes.push(node);
      }
    };

    addNodeToFile(L, "L");
    addNodeToFile(R, "R");
    addNodeToFile(LC, "LC");
    addNodeToFile(RC, "RC");

    for (const [fileName, nodes] of fileMap.entries()) {
      graph.push({ fileName, nodes });
    }

    return graph;
  }
};

export { Grouping_nodes };
export type { FileObject };