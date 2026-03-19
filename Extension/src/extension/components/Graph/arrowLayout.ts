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

// Função principal
export function getArrows(
  nodeCoords: { [role: string]: { x: number; y: number; width: number; height: number; idx: number; node: CodeNodeProps } },
  gridRect: { x: number; y: number; width: number; height: number },
  dependencyType?: string
): Arrow[] {
  const arrows: Arrow[] = [];
  console.log("node coords: ", nodeCoords);

  const depArrowType = getArrowTypeFromDependency(dependencyType);

  // Build dependency first so call arrows can avoid it
  const depFrom = nodeCoords["LC"] ?? nodeCoords["L"];
  const depTo = nodeCoords["RC"] ?? nodeCoords["R"];
  const depArrow = depFrom && depTo ? BuildArrow(depFrom, depTo, gridRect, depArrowType) : null;
  if (depArrow) arrows.push(depArrow);

  // Call edges: L -> LC and R -> RC. Try different target faces to avoid overlaps.
  if (nodeCoords["L"] && nodeCoords["LC"]) {
    const callArrow = chooseBestCallArrowFace(
      nodeCoords["L"],
      nodeCoords["LC"],
      gridRect,
      depArrow ? [depArrow] : []
    );
    arrows.push(callArrow);
  }

  if (nodeCoords["R"] && nodeCoords["RC"]) {
    const callArrow = chooseBestCallArrowFace(
      nodeCoords["R"],
      nodeCoords["RC"],
      gridRect,
      depArrow ? [depArrow] : []
    );
    arrows.push(callArrow);
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

const buildArrowSegments = (arrow: Arrow): { x1: number; y1: number; x2: number; y2: number }[] => {
  const x1 = arrow.from.x1 ?? 0;
  const y1 = arrow.from.y1 ?? 0;
  const x2 = arrow.to.x2 ?? 0;
  const y2 = arrow.to.y2 ?? 0;

  const dx = Math.abs(x2 - x1);
  const dy = Math.abs(y2 - y1);

  if (dx >= dy) {
    const midX = (x1 + x2) / 2;
    return [
      { x1, y1, x2: midX, y2: y1 },
      { x1: midX, y1, x2: midX, y2 },
      { x1: midX, y1: y2, x2, y2 }
    ];
  }

  const midY = (y1 + y2) / 2;
  return [
    { x1, y1, x2: x1, y2: midY },
    { x1, y1: midY, x2, y2: midY },
    { x1: x2, y1: midY, x2, y2 }
  ];
};

const pointToSegmentDistance = (px: number, py: number, seg: { x1: number; y1: number; x2: number; y2: number }): number => {
  const vx = seg.x2 - seg.x1;
  const vy = seg.y2 - seg.y1;
  const wx = px - seg.x1;
  const wy = py - seg.y1;

  const len2 = vx * vx + vy * vy;
  if (len2 === 0) {
    const dx = px - seg.x1;
    const dy = py - seg.y1;
    return Math.sqrt(dx * dx + dy * dy);
  }

  const t = Math.max(0, Math.min(1, (wx * vx + wy * vy) / len2));
  const projX = seg.x1 + t * vx;
  const projY = seg.y1 + t * vy;
  const dx = px - projX;
  const dy = py - projY;
  return Math.sqrt(dx * dx + dy * dy);
};

const segmentsIntersect = (
  a: { x1: number; y1: number; x2: number; y2: number },
  b: { x1: number; y1: number; x2: number; y2: number }
): boolean => {
  const ccw = (ax: number, ay: number, bx: number, by: number, cx: number, cy: number) => {
    return (cy - ay) * (bx - ax) > (by - ay) * (cx - ax);
  };

  const a1 = ccw(a.x1, a.y1, b.x1, b.y1, b.x2, b.y2);
  const a2 = ccw(a.x2, a.y2, b.x1, b.y1, b.x2, b.y2);
  const b1 = ccw(a.x1, a.y1, a.x2, a.y2, b.x1, b.y1);
  const b2 = ccw(a.x1, a.y1, a.x2, a.y2, b.x2, b.y2);

  return a1 !== a2 && b1 !== b2;
};

const segmentsOverlap = (
  a: { x1: number; y1: number; x2: number; y2: number },
  b: { x1: number; y1: number; x2: number; y2: number }
): boolean => {
  if (segmentsIntersect(a, b)) return true;

  const tolerance = 8;
  const minDistance = Math.min(
    pointToSegmentDistance(a.x1, a.y1, b),
    pointToSegmentDistance(a.x2, a.y2, b),
    pointToSegmentDistance(b.x1, b.y1, a),
    pointToSegmentDistance(b.x2, b.y2, a)
  );

  return minDistance <= tolerance;
};

const arrowsHaveOverlap = (
  callArrow: Arrow,
  blockers: Arrow[]
): boolean => {
  const callSegments = buildArrowSegments(callArrow);
  return blockers.some((blocker) => {
    const blockerSegments = buildArrowSegments(blocker);
    return callSegments.some((callSeg) =>
      blockerSegments.some((blockerSeg) => segmentsOverlap(callSeg, blockerSeg))
    );
  });
};

const chooseBestCallArrowFace = (
  fromNode: { x: number; y: number; width: number; height: number; idx: number; node: CodeNodeProps },
  toNode: { x: number; y: number; width: number; height: number; idx: number; node: CodeNodeProps },
  gridRect: { x: number; y: number; width: number; height: number },
  blockers: Arrow[]
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

  const facePriority: NodeFace[] =
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

  for (const face of facePriority) {
    const toCoord = getTargetFaceCoords(toNode, face);
    const candidate = buildCallArrowWithCoords(
      fromNode,
      toCoord,
      gridRect,
      face
    );

    if (!arrowsHaveOverlap(candidate, blockers)) {
      return candidate;
    }
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

  // Conecta pelas bordas reais dos nós, priorizando o eixo predominante.
  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx >= 0) {
      fromX = fromNode.x + fromNode.width;
      toX = toNode.x;
    } else {
      fromX = fromNode.x;
      toX = toNode.x + toNode.width;
    }
  } else {
    if (dy >= 0) {
      fromY = fromNode.y + fromNode.height;
      toY = toNode.y;
    } else {
      fromY = fromNode.y;
      toY = toNode.y + toNode.height;
    }
  }

  // Aplicar clearance para manter distância de contornos de arquivo
  const clearanceMap = { call: 0, OA: 15, DF: 40, CF: 15 };
  const clearance = clearanceMap[type] || 0;

  if (clearance > 0) {
    const distance = Math.sqrt(dx * dx + dy * dy);
    if (distance > 0) {
      const ux = dx / distance;
      const uy = dy / distance;
      fromX += ux * clearance;
      fromY += uy * clearance;
      toX -= ux * clearance;
      toY -= uy * clearance;
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
    type,
  };
};