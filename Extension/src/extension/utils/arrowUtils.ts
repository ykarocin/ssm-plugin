import { FileObject } from "../components/grouping";
import { Node } from "../components/Graph/Node";

export function getGlobalArrows(fileData: FileObject[]): { from: Node; to: Node }[] {
  const arrows: { from: Node; to: Node }[] = [];
  const allNodes = fileData.flatMap(file => file.nodes);

  const nodeL = allNodes.find(n => n.origin === "L");
  const nodeR = allNodes.find(n => n.origin === "R");

  fileData.forEach(file => {
    const lcNode = file.nodes.find(n => n.origin === "LC");
    if (lcNode && nodeL) {
      arrows.push({ from: nodeL, to: lcNode });
    }
    const rcNode = file.nodes.find(n => n.origin === "RC");
    if (rcNode && nodeR) {
      arrows.push({ from: nodeR, to: rcNode });
    }
  });

  return arrows;
}