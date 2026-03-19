import { CodeNodeProps } from "./Node";

export type ArrowType = "call" | "OA" | "DF" | "CF";

export type Arrow = {
  from: { x1?: number; y1?: number; x2?: number; y2?: number };
  to: { x1?: number; y1?: number; x2?: number; y2?: number };
  type: ArrowType;
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

  // Call edges: always L -> LC and R -> RC when both ends exist
  if (nodeCoords["L"] && nodeCoords["LC"]) {
    arrows.push(BuildArrow(nodeCoords["L"], nodeCoords["LC"], gridRect, "call"));
  }

  if (nodeCoords["R"] && nodeCoords["RC"]) {
    arrows.push(BuildArrow(nodeCoords["R"], nodeCoords["RC"], gridRect, "call"));
  }

  // Dependency edge: connect the actual dependent nodes (prefer LC/RC if available, fallback to L/R)
  const depFrom = nodeCoords["LC"] ?? nodeCoords["L"];
  const depTo = nodeCoords["RC"] ?? nodeCoords["R"];

  if (depFrom && depTo) {
    arrows.push(BuildArrow(depFrom, depTo, gridRect, depArrowType));
  }

  console.log("the arrows: ", arrows);
  return arrows;
}

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