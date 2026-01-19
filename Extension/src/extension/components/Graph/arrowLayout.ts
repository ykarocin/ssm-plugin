import { CodeNodeProps } from "./Node";
import { getWidth, getHeight } from "./Node";

const padding = 32;

export type ArrowType = "call" | "OA" | "DF" | "CF";

export type Arrow = {
  from: { x1?: number; y1?: number; x2?: number; y2?: number };
  to: { x1?: number; y1?: number; x2?: number; y2?: number };
  type: ArrowType;
};

// Função principal
export function getArrows(
  nodeCoords: { [role: string]: { x: number; y: number; idx: number; node: CodeNodeProps } },
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


const BuildArrow = (nodeL:{ x: number; y: number; idx: number; node: CodeNodeProps}, nodeR:{ x: number; y: number; idx: number; node: CodeNodeProps}, gridRect: { x: number; y: number; width: number; height: number }, type: ArrowType): Arrow => {
  if (nodeL.x === nodeR.x){
    // vertical arrow
    return {
      from: {
        x1: nodeL.x + getWidth(nodeL.node.isSource || false)/2 + padding - gridRect.x,
        y1: nodeL.y + getHeight(nodeL.node.isCall || nodeL.node.isSink || false) - gridRect.y
      },
      to: {
        x2: nodeR.x + getWidth(nodeR.node.isSource || false)/2 + padding - gridRect.x,
        y2: nodeR.y - gridRect.y
      },
      type
    }
  } else if (nodeL.y === nodeR.y) {
    // horizontal arrows
    if (nodeL.x < nodeR.x){
      return {
      from: {
          x1: nodeL.x + getWidth(nodeL.node.isSource || false) + 2 * padding - gridRect.x,
          y1: nodeL.y + getHeight(nodeL.node.isCall || nodeL.node.isSink || false)/2 - gridRect.y
        },
        to: {
          x2: nodeR.x - gridRect.x,
          y2: nodeR.y + getHeight(nodeR.node.isCall || nodeR.node.isSink || false)/2 - gridRect.y
        },
        type
      }
    } else {
      return {
      from: {
          x1: nodeR.x + getWidth(nodeR.node.isSource || false) + 2 * padding - gridRect.x,
          y1: nodeR.y + getHeight(nodeR.node.isCall || nodeR.node.isSink || false)/2 - gridRect.y
        },
        to: {
          x2: nodeL.x - gridRect.x,
          y2: nodeL.y + getHeight(nodeL.node.isCall || nodeL.node.isSink || false)/2 - gridRect.y
        },
        type
      }
    }
  } else {
    // diagonal arrows
    ///0////1
    ///2////3
    if (nodeL.x < nodeR.x) {
      if (nodeL.y < nodeR.y) {
        // from position 0 to 3 
        return {
          from: {
            x1: nodeL.x + getWidth(nodeL.node.isSource || false) + 2 * padding - gridRect.x,
            y1: nodeL.y + getHeight(nodeL.node.isCall || nodeL.node.isSink || false)/2 - gridRect.y
          },
          to: {
            x2: nodeR.x + getWidth(nodeR.node.isSource || false)/2 - gridRect.x,
            y2: nodeR.y - padding - gridRect.y,
          },
          type
        }
    } else {
      // from position 2 to 1
      return{
        from: {
          x1: nodeL.x + getWidth(nodeL.node.isSource || false) + 2 * padding - gridRect.x,
          y1: nodeL.y + getHeight(nodeL.node.isCall || nodeL.node.isSink || false)/2 - gridRect.y
        },
        to: {
          x2: nodeR.x + getWidth(nodeR.node.isCall || nodeR.node.isSink || false)/2 + padding - gridRect.x,
          y2: nodeR.y + getHeight(nodeR.node.isCall || nodeR.node.isSink || false) - gridRect.y
        },
        type
      }
    }
  } else {
    if (nodeL.y < nodeR.y) {
      // form position 1 to 2
        return {
            from: {
            x1: nodeL.x + getWidth(nodeL.node.isCall || nodeL.node.isSink || false)/2 + padding - gridRect.x,
            y1: nodeL.y + getHeight(nodeL.node.isCall || nodeL.node.isSink || false) - gridRect.y
          },
          to: {
            x2: nodeR.x + getWidth(nodeR.node.isCall || nodeR.node.isSink || false)/2 + padding - gridRect.x,
            y2: nodeR.y - gridRect.y
          },
          type
        }
    } else {
      // from position 3 to 0
      return{
        from: {
          x1: nodeL.x + getWidth(nodeL.node.isSource || false)/2 - gridRect.x,
          y1: nodeL.y - padding - gridRect.y
        },
        to: {
          x2: nodeR.x + getWidth(nodeR.node.isSource || false) + 2 * padding - gridRect.x,
          y2: nodeR.y + getHeight(nodeR.node.isCall || nodeR.node.isSink || false)/2 - gridRect.y
        },
        type
      }
    }
  }

}
}