import { Node } from "./Graph/Node";
import { File } from "./Graph/File";
import { dependency } from "@src/models/AnalysisOutput";

const Grouping_nodes = (dep: dependency, L: Node, R: Node, LC: Node, RC: Node) => {
  const graph: File[] = [];

  if (dep.type.startsWith("OA") || dep.type.startsWith("CONFLICT")) {
    const fileMap: Map<string, Node[]> = new Map();

    const addNodeToFile = (node: Node) => {
      if (!fileMap.has(node.fileName)) {
        fileMap.set(node.fileName, []);
      }
      const fileNodes = fileMap.get(node.fileName)!;

      if (!fileNodes.some((n) => n.lines[0] === node.lines[0])) {
        fileNodes.push(node);
      }
    };

    [L, R, LC, RC].forEach(addNodeToFile);

    for (const [fileName, nodes] of fileMap.entries()) {
      graph.push(new File(fileName, nodes));
    }

    return graph;
  }
};

export { Grouping_nodes };
