import { CodeNodeProps } from "./Node";

export type ArrowType = "call" | "OA" | "DF" | "CF";

export type NodeFace = "left" | "top" | "bottom" | "right";

export type Arrow = {
  from: { x1?: number; y1?: number; x2?: number; y2?: number };
  to: { x1?: number; y1?: number; x2?: number; y2?: number };
  type: ArrowType;
  targetFace?: NodeFace;
  originFace?: NodeFace;
};

type OccupiedFaces = Set<string>;

const getFaceKey = (nodeRole: string, face: NodeFace): string => `${nodeRole}:${face}`;

// Main entry point
export function getArrows(
  nodeCoords: { [role: string]: { x: number; y: number; width: number; height: number; idx: number; node: CodeNodeProps } },
  gridRect: { x: number; y: number; width: number; height: number },
  dependencyType?: string
): Arrow[] {
  const arrows: Arrow[] = [];
  const occupiedFaces: OccupiedFaces = new Set();
  console.log("node coords: ", nodeCoords);

  const depArrowType = getArrowTypeFromDependency(dependencyType);

  // Build dependency first so call arrows can avoid it
  const depFromRole = nodeCoords["LC"] ? "LC" : nodeCoords["L"] ? "L" : null;
  const depToRole = nodeCoords["RC"] ? "RC" : nodeCoords["R"] ? "R" : null;
  const depFrom = depFromRole ? nodeCoords[depFromRole] : null;
  const depTo = depToRole ? nodeCoords[depToRole] : null;
  const depArrow = depFrom && depTo ? BuildArrow(depFrom, depTo, gridRect, depArrowType) : null;
  if (depArrow) {
    arrows.push(depArrow);
    if (depToRole && depArrow.targetFace) {
      occupiedFaces.add(getFaceKey(depToRole, depArrow.targetFace));
    }
  }

  // Call edges: L -> LC and R -> RC. Try different target faces to avoid overlaps.
  if (nodeCoords["L"] && nodeCoords["LC"]) {
    const callArrow = chooseBestCallArrowFace(
      nodeCoords["L"],
      nodeCoords["LC"],
      gridRect,
      "LC",
      occupiedFaces
    );
    arrows.push(callArrow);
    if (callArrow.targetFace) {
      occupiedFaces.add(getFaceKey("LC", callArrow.targetFace));
    }
  }

  if (nodeCoords["R"] && nodeCoords["RC"]) {
    const callArrow = chooseBestCallArrowFace(
      nodeCoords["R"],
      nodeCoords["RC"],
      gridRect,
      "RC",
      occupiedFaces
    );
    arrows.push(callArrow);
    if (callArrow.targetFace) {
      occupiedFaces.add(getFaceKey("RC", callArrow.targetFace));
    }
  }

  console.log("the arrows: ", arrows);
  return arrows;
}

const getTargetFaceCoords = (
  toNode: { x: number; y: number; width: number; height: number },
  face: NodeFace
): { x: number; y: number } => {
  const centerX = toNode.x + toNode.width / 2;
  const centerY = toNode.y + toNode.height / 2;

  switch (face) {
    case "left": return { x: toNode.x, y: centerY };
    case "right": return { x: toNode.x + toNode.width, y: centerY };
    case "top": return { x: centerX, y: toNode.y };
    case "bottom": return { x: centerX, y: toNode.y + toNode.height };
  }
};

const isFaceOccupied = (nodeRole: string, face: NodeFace, occupiedFaces: OccupiedFaces): boolean => {
  return occupiedFaces.has(getFaceKey(nodeRole, face));
};

const chooseBestCallArrowFace = (
  fromNode: { x: number; y: number; width: number; height: number; idx: number; node: CodeNodeProps },
  toNode: { x: number; y: number; width: number; height: number; idx: number; node: CodeNodeProps },
  gridRect: { x: number; y: number; width: number; height: number },
  toNodeRole: string,
  occupiedFaces: OccupiedFaces
): Arrow => {
  const fromCenterX = fromNode.x + fromNode.width / 2;
  const fromCenterY = fromNode.y + fromNode.height / 2;
  const toCenterX = toNode.x + toNode.width / 2;
  const toCenterY = toNode.y + toNode.height / 2;

  const dx = toCenterX - fromCenterX;
  const dy = toCenterY - fromCenterY;

  const targetSameX = dx === 0;
  const targetSameY = dy === 0;

  const targetToRight = dx >= 0;
  const targetBelow = dy >= 0;

  const preferredFaces: NodeFace[] =
    targetSameX
    ? targetBelow
      ? ["top"] // target directly below, prefer top
      : ["bottom"] // target directly above, prefer bottom
    : targetSameY
      ? targetToRight
        ? ["left"] // target directly right, prefer left
        : ["right"] // target directly left, prefer right
      : targetToRight
        ? targetBelow
          ? ["left", "top"] // target right and below, prefer left then top
          : ["left", "bottom"] // target right and above, prefer left then bottom
        : targetBelow
          ? ["right", "top"] // target left and below, prefer right then top
          : ["right", "bottom"]; // target left and above, prefer right then bottom

  const allFaces: NodeFace[] = ["left", "top", "bottom", "right"];
  const facePriority: NodeFace[] = [
    ...preferredFaces,
    ...allFaces.filter((face) => !preferredFaces.includes(face))
  ];

  for (const face of facePriority) {
    if (isFaceOccupied(toNodeRole, face, occupiedFaces)) {
      continue;
    }

    const toCoord = getTargetFaceCoords(toNode, face);
    const candidate = buildCallArrowWithCoords(
      fromNode,
      toCoord,
      gridRect,
      face
    );
    return candidate;
  }

  return buildCallArrowWithCoords(fromNode, getTargetFaceCoords(toNode, "left"), gridRect, "left");
};

const buildCallArrowWithCoords = (
  fromNode: { x: number; y: number; width: number; height: number; idx: number; node: CodeNodeProps },
  toCoord: { x: number; y: number },
  gridRect: { x: number; y: number; width: number; height: number },
  targetFace: NodeFace = "left"
): Arrow => {
  const fromCenterX = fromNode.x + fromNode.width / 2;
  const fromCenterY = fromNode.y + fromNode.height / 2;
  const toCenterX = toCoord.x;
  const toCenterY = toCoord.y;

  const dx = toCenterX - fromCenterX;
  const dy = toCenterY - fromCenterY;

  let fromX = fromCenterX;
  let fromY = fromCenterY;
  let toX = toCenterX;
  let toY = toCenterY;
  let originFace: NodeFace = "left";

  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx >= 0) {
      fromX = fromNode.x + fromNode.width;
      originFace = "right";
    } else {
      fromX = fromNode.x;
      originFace = "left";
    }
  } else {
    if (dy >= 0) {
      fromY = fromNode.y + fromNode.height;
      originFace = "bottom";
    } else {
      fromY = fromNode.y;
      originFace = "top";
    }
  }

  return {
    from: {
      x1: fromX - gridRect.x,
      y1: fromY - gridRect.y,
    },
    to: {
      x2: toX - gridRect.x,
      y2: toY - gridRect.y,
    },
    targetFace,
    originFace,
    type: "call",
  };
};

// Helper function to determine arrow type from dependency type
function getArrowTypeFromDependency(dependencyType?: string): ArrowType {
  if (!dependencyType) return "call";
  
  if (dependencyType.startsWith("OA")) return "OA";
  if (dependencyType.startsWith("CONFLICT")) return "DF";
  if (dependencyType.startsWith("CF")) return "CF";
  if (dependencyType.includes("CALL")) return "call";
  
  return "call";
}


const BuildArrow = (
  fromNode: { x: number; y: number; width: number; height: number; idx: number; node: CodeNodeProps },
  toNode: { x: number; y: number; width: number; height: number; idx: number; node: CodeNodeProps },
  gridRect: { x: number; y: number; width: number; height: number },
  type: ArrowType
): Arrow => {
  const fromCenterX = fromNode.x + fromNode.width / 2;
  const fromCenterY = fromNode.y + fromNode.height / 2;
  const toCenterX = toNode.x + toNode.width / 2;
  const toCenterY = toNode.y + toNode.height / 2;

  const dx = toCenterX - fromCenterX;
  const dy = toCenterY - fromCenterY;

  let fromX = fromCenterX;
  let fromY = fromCenterY;
  let toX = toCenterX;
  let toY = toCenterY;
  let originFace: NodeFace = "left";
  let targetFace: NodeFace = "right";

  // Connect via the nodes' real edges, prioritizing the dominant axis.
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx >= 0) {
      fromX = fromNode.x + fromNode.width;
      toX = toNode.x;
      originFace = "right";
      targetFace = "left";
    } else {
      fromX = fromNode.x;
      toX = toNode.x + toNode.width;
      originFace = "left";
      targetFace = "right";
    }
  } else {
    if (dy >= 0) {
      fromY = fromNode.y + fromNode.height;
      toY = toNode.y;
      originFace = "bottom";
      targetFace = "top";
    } else {
      fromY = fromNode.y;
      toY = toNode.y + toNode.height;
      originFace = "top";
      targetFace = "bottom";
    }
  }

  // Apply clearance to keep distance from file outlines
  const clearanceMap = { call: 0, OA: 15, DF: 12, CF: 15 };
  const maxClearance = clearanceMap[type] || 0;
  const minArrowLength = 8;

  const edgeDx = toX - fromX;
  const edgeDy = toY - fromY;
  const edgeDistance = Math.sqrt(edgeDx * edgeDx + edgeDy * edgeDy);
  const clearance = edgeDistance > 0
    ? Math.min(maxClearance, Math.max(0, (edgeDistance - minArrowLength) / 2))
    : 0;

  if (clearance > 0) {
    const ux = edgeDx / edgeDistance;
    const uy = edgeDy / edgeDistance;
    fromX += ux * clearance;
    fromY += uy * clearance;
    toX -= ux * clearance;
    toY -= uy * clearance;
  }

  return {
    from: {
      x1: fromX - gridRect.x,
      y1: fromY - gridRect.y,
    },
    to: {
      x2: toX - gridRect.x,
      y2: toY - gridRect.y,
    },
    targetFace,
    originFace,
    type,
  };
};