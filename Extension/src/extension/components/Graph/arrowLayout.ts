import { CodeNodeProps } from "./Node";
import { getWidth, getHeight } from "./Node";


const padding = 32;
// Tipo para uma seta
export type Arrow = {
  from: { x1: number; y1: number };
  to: { x2: number; y2: number };
};

// Função principal
export function getArrows(
  nodeCoords: { [role: string]: { x: number; y: number; idx: number; node: CodeNodeProps } },
  gridRect: { x: number; y: number; width: number; height: number } 
): Arrow[] {
  const arrows: Arrow[] = [];

  if (Object.keys(nodeCoords).length === 2 && nodeCoords["L"] && nodeCoords["R"]) {
    // Caso A1 e A2: L -> R
    arrows.push({
      from: {
        x1: nodeCoords["L"].x + getWidth(nodeCoords["L"].node.isSource || false)/2 + padding - gridRect.x,
        y1: nodeCoords["L"].y + getHeight(nodeCoords["L"].node.isCall || nodeCoords["L"].node.isSink || false) - gridRect.y
      },
      to: {
        x2: nodeCoords["R"].x + getWidth(nodeCoords["R"].node.isSource || false)/2 + padding - gridRect.x,
        y2: nodeCoords["R"].y - gridRect.y
      }
    });
  } else if (Object.keys(nodeCoords).length === 3) {
    if (nodeCoords["L"] && nodeCoords["R"] && nodeCoords["LC"] && nodeCoords["L"].node.fileName == nodeCoords["R"].node.fileName) {
      // Caso B2: L -> LC, LC -> R
      arrows.push({
        from: {
          x1: nodeCoords["L"].x + getWidth(nodeCoords["L"].node.isSource || false) + 2 * padding - gridRect.x,
          y1: nodeCoords["L"].y + getHeight(nodeCoords["L"].node.isCall || nodeCoords["L"].node.isSink || false)/2 - gridRect.y
        },
        to: {
          x2: nodeCoords["LC"].x + getWidth(nodeCoords["L"].node.isSource || false)/2 - gridRect.x,
          y2: nodeCoords["LC"].y - padding - gridRect.y,
        }
      });
      arrows.push({
        from: {
          x1: nodeCoords["LC"].x - gridRect.x,
          y1: nodeCoords["LC"].y + getHeight(nodeCoords["LC"].node.isCall || nodeCoords["LC"].node.isSink || false)/2 - gridRect.y
        },
        to: {
          x2: nodeCoords["R"].x + getWidth(nodeCoords["R"].node.isSource || false) + 2 * padding - gridRect.x,
          y2: nodeCoords["R"].y + getHeight(nodeCoords["R"].node.isCall || nodeCoords["R"].node.isSink || false)/2 - gridRect.y
        }
      });
    }else if (nodeCoords["L"] && nodeCoords["R"] && nodeCoords["RC"] && nodeCoords["L"].node.fileName == nodeCoords["RC"].node.fileName) {
    // Caso E2: R -> RC, L -> RC
      arrows.push({
        from: {
          x1: nodeCoords["R"].x + getWidth(nodeCoords["R"].node.isSource || false) + 2 * padding - gridRect.x,
          y1: nodeCoords["R"].y + getHeight(nodeCoords["R"].node.isCall || nodeCoords["R"].node.isSink || false)/2 - gridRect.y
        },
        to: {
          x2: nodeCoords["RC"].x - gridRect.x,
          y2: nodeCoords["RC"].y + getHeight(nodeCoords["RC"].node.isCall || nodeCoords["RC"].node.isSink || false)/2 - gridRect.y
        }
      });
      arrows.push({
        from: {
          x1: nodeCoords["L"].x + getWidth(nodeCoords["L"].node.isSource || false)/2 + padding - gridRect.x,
          y1: nodeCoords["L"].y + getHeight(nodeCoords["L"].node.isCall || nodeCoords["L"].node.isSink || false) - gridRect.y
        },
        to: {
          x2: nodeCoords["RC"].x + getWidth(nodeCoords["RC"].node.isSource || false)/2 + padding - gridRect.x,
          y2: nodeCoords["RC"].y - gridRect.y
        }
      });
    } else if (nodeCoords["L"] && nodeCoords["R"] && nodeCoords["RC"] && nodeCoords["L"].node.fileName == nodeCoords["R"].node.fileName) {
      // caso C2: R -> RC, L -> RC
      arrows.push({
        from: {
          x1: nodeCoords["R"].x + getWidth(nodeCoords["R"].node.isSource || false) + 2 * padding - gridRect.x,
          y1: nodeCoords["R"].y + getHeight(nodeCoords["R"].node.isCall || nodeCoords["R"].node.isSink || false)/2 - gridRect.y
        },
        to: {
          x2: nodeCoords["RC"].x + getWidth(nodeCoords["RC"].node.isCall || nodeCoords["RC"].node.isSink || false)/2 + padding - gridRect.x,
          y2: nodeCoords["RC"].y + getHeight(nodeCoords["RC"].node.isCall || nodeCoords["RC"].node.isSink || false) - gridRect.y
        }
      });
      arrows.push({
        from: {
          x1: nodeCoords["L"].x + getWidth(nodeCoords["L"].node.isSource || false) + 2 * padding - gridRect.x,
          y1: nodeCoords["L"].y + getHeight(nodeCoords["L"].node.isCall || nodeCoords["L"].node.isSink || false)/2 - gridRect.y
        },
        to: {
          x2: nodeCoords["RC"].x - gridRect.x,
          y2: nodeCoords["RC"].y + getHeight(nodeCoords["RC"].node.isCall || nodeCoords["RC"].node.isSink || false)/2 - gridRect.y
        }
      });
    } else if (nodeCoords["L"] && nodeCoords["LC"] && nodeCoords["R"] && nodeCoords["LC"].node.fileName == nodeCoords["R"].node.fileName) {
      // D2: L -> LC, LC -> R
      arrows.push({
        from: {
          x1: nodeCoords["L"].x + getWidth(nodeCoords["L"].node.isSource || false) + 2 * padding - gridRect.x,
          y1: nodeCoords["L"].y + getHeight(nodeCoords["L"].node.isCall || nodeCoords["L"].node.isSink || false)/2 - gridRect.y
        },
        to: {
          x2: nodeCoords["LC"].x - gridRect.x,
          y2: nodeCoords["LC"].y + getHeight(nodeCoords["LC"].node.isCall || nodeCoords["LC"].node.isSink || false)/2 - gridRect.y
        }
      });
      arrows.push({
        from: {
          x1: nodeCoords["LC"].x + getWidth(nodeCoords["LC"].node.isSource || false)/2 + padding - gridRect.x,
          y1: nodeCoords["LC"].y + getHeight(nodeCoords["LC"].node.isCall || nodeCoords["LC"].node.isSink || false) - gridRect.y
        },
        to: {
          x2: nodeCoords["R"].x + getWidth(nodeCoords["R"].node.isCall || nodeCoords["R"].node.isSink || false)/2 + padding - gridRect.x,
          y2: nodeCoords["R"].y - gridRect.y
        }
      });
    } else if ( nodeCoords["L"] && nodeCoords ["LC"] && nodeCoords["R"]) {
      // caso A3: L -> LC, LC -> R
      arrows.push({
        from: {
          x1: nodeCoords["L"].x + getWidth(nodeCoords["L"].node.isSource || false) + 2 * padding - gridRect.x,
          y1: nodeCoords["L"].y + getHeight(nodeCoords["L"].node.isCall || nodeCoords["L"].node.isSink || false)/2 - gridRect.y
        },
        to: {
          x2: nodeCoords["LC"].x - gridRect.x,
          y2: nodeCoords["LC"].y + getHeight(nodeCoords["LC"].node.isCall || nodeCoords["LC"].node.isSink || false)/2 - gridRect.y
        }
      });
      arrows.push({
        from: {
          x1: nodeCoords["LC"].x + getWidth(nodeCoords["LC"].node.isSource || false)/2 + padding - gridRect.x,
          y1: nodeCoords["LC"].y + getHeight(nodeCoords["LC"].node.isCall || nodeCoords["LC"].node.isSink || false) - gridRect.y
        },
        to: {
          x2: nodeCoords["R"].x + getWidth(nodeCoords["R"].node.isCall || nodeCoords["R"].node.isSink || false)/2 + padding - gridRect.x,
          y2: nodeCoords["R"].y - gridRect.y
        }
      });
    } else if (nodeCoords["L"] && nodeCoords["R"] && nodeCoords["RC"]) {
      // caso B3: L -> RC, R -> RC
      arrows.push({
        from: {
          x1: nodeCoords["R"].x + getWidth(nodeCoords["R"].node.isSource || false) + 2 * padding - gridRect.x,
          y1: nodeCoords["R"].y + getHeight(nodeCoords["R"].node.isCall || nodeCoords["R"].node.isSink || false)/2 - gridRect.y
        },
        to: {
          x2: nodeCoords["RC"].x - gridRect.x,
          y2: nodeCoords["RC"].y + getHeight(nodeCoords["RC"].node.isCall || nodeCoords["RC"].node.isSink || false)/2 - gridRect.y
        }
      });
      arrows.push({
        from: {
          x1: nodeCoords["L"].x + getWidth(nodeCoords["L"].node.isSource || false)/2 + padding - gridRect.x,
          y1: nodeCoords["L"].y + getHeight(nodeCoords["L"].node.isCall || nodeCoords["L"].node.isSink || false) - gridRect.y
        },
        to: {
          x2: nodeCoords["RC"].x + getWidth(nodeCoords["RC"].node.isSource || false)/2 + padding - gridRect.x,
          y2: nodeCoords["RC"].y - gridRect.y
        }
      });
    }
  } else if ( Object.keys(nodeCoords).length === 4
  ) {
      // caso F2/C3/D3/A4: L -> LC, R -> RC, LC -> RC
      arrows.push({
        from: {
          x1: nodeCoords["L"].x + getWidth(nodeCoords["L"].node.isSource || false) + 2 * padding - gridRect.x,
          y1: nodeCoords["L"].y + getHeight(nodeCoords["L"].node.isCall || nodeCoords["L"].node.isSink || false)/2 - gridRect.y
        },
        to: {
          x2: nodeCoords["LC"].x - gridRect.x,
          y2: nodeCoords["LC"].y + getHeight(nodeCoords["LC"].node.isCall || nodeCoords["LC"].node.isSink || false)/2 - gridRect.y
        }
      });
      arrows.push({
        from: {
          x1: nodeCoords["R"].x + getWidth(nodeCoords["R"].node.isSource || false) + 2 * padding - gridRect.x,
          y1: nodeCoords["R"].y + getHeight(nodeCoords["R"].node.isCall || nodeCoords["R"].node.isSink || false)/2 - gridRect.y
        },
        to: {
          x2: nodeCoords["RC"].x - gridRect.x,
          y2: nodeCoords["RC"].y + getHeight(nodeCoords["LC"].node.isCall || nodeCoords["LC"].node.isSink || false)/2 - gridRect.y
        }
      });
      arrows.push({
        from: {
          x1: nodeCoords["LC"].x + getWidth(nodeCoords["LC"].node.isSource || false)/2 + padding - gridRect.x,
          y1: nodeCoords["LC"].y + getHeight(nodeCoords["LC"].node.isCall || nodeCoords["LC"].node.isSink || false) - gridRect.y
        },
        to: {
          x2: nodeCoords["RC"].x + getWidth(nodeCoords["RC"].node.isSource || false)/2 + padding - gridRect.x,
          y2: nodeCoords["RC"].y - gridRect.y
        }
      });
    }
  return arrows;
}