import { FileObject } from "../components/grouping";
import { Node } from "../components/Graph/Node";

export function getFileAndNodePositions(
  fileData: FileObject[],
  fileSpacing = 400,
  startX = 40,
  startY = 40,
  nodeYOffset = 16,
  nodeSpacing = 64,
  nodePadding = 20
): {
  filePositions: { x: number; y: number }[];
  nodePositions: { [key: string]: { x: number; y: number } };
} {
  const filePositions = fileData.map((file, i) => ({
    x: startX + i * fileSpacing,
    y: startY,
  }));

  const nodePositions: { [key: string]: { x: number; y: number } } = {};
  fileData.forEach((file, fileIdx) => {
    file.nodes.forEach((node, nodeIdx) => {
      const x = filePositions[fileIdx].x + nodePadding;
      const y = filePositions[fileIdx].y + nodeYOffset + nodeIdx * nodeSpacing;
      nodePositions[`${file.fileName}_${node.origin}`] = { x, y };
    });
  });

  return { filePositions, nodePositions };
}