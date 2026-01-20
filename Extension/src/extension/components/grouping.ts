import { Node } from "./Graph/Node";
import { dependency } from "@src/models/AnalysisOutput";
import { ConflictGridType } from "./Graph/GraphView";

type FileObject = {
  fileName: string;
  nodes: Node[];
};

const ConflictGridTypeLayouts: { [key: string]: ConflictGridType } = {
  A1: { layout: { rows: 2, columns: 3 }, positions: [[1, 2], [2, 2]] },
  A2: { layout: { rows: 2, columns: 3 }, positions: [[1, 2], [2, 2]] },
  B2: { layout: { rows: 2, columns: 2 }, positions: [[1, 1], [2, 1], [2, 2]] },
  C2: { layout: { rows: 2, columns: 2 }, positions: [[1, 1], [2, 1], [1, 2]] },
  D2: { layout: { rows: 2, columns: 2 }, positions: [[1, 1], [1, 2], [2, 2]] },
  E2: { layout: { rows: 2, columns: 2 }, positions: [[2, 1], [1, 2], [2, 2]] },
  F2: { layout: { rows: 2, columns: 2 }, positions: [[1, 1], [2, 1], [1, 2], [2, 2]] },
  A3: { layout: { rows: 2, columns: 2 }, positions: [[1, 1], [1, 2], [2, 2]] },
  B3: { layout: { rows: 2, columns: 2 }, positions: [[2, 1], [1, 2], [2, 2]] },
  C3: { layout: { rows: 2, columns: 2 }, positions: [[1, 1], [2, 1], [1, 2], [2, 2]] },
  D3: { layout: { rows: 2, columns: 2 }, positions: [[1, 1], [2, 1], [1, 2], [2, 2]] },
  A4: { layout: { rows: 2, columns: 2 }, positions: [[1, 1], [2, 1], [1, 2], [2, 2]] },
  default: { layout: { rows: 2, columns: 2 }, positions: [[1, 1], [2, 1], [1, 2], [2, 2]] }
};

const Grouping_nodes = (dep: dependency, L: Node, R: Node, LC: Node, RC: Node) => {
  const graph: FileObject[] = [];

  if (dep.type.startsWith("OA") || dep.type.startsWith("CONFLICT")) {
    const fileMap: Map<string, Node[]> = new Map();

    const addNodeToFile = (node: Node) => {
      if (!fileMap.has(node.fileName)) {
        fileMap.set(node.fileName, []);
      }
      const fileNodes = fileMap.get(node.fileName)!;

      if (!fileNodes.some((n) => n.numberHighlight === node.numberHighlight)) {
        if (node === L){
          node.role = "L";
        } else if ( node === R){
          node.role = "R";
        } else if ( node === LC){
          node.role = "LC";
        } else if (node === RC){
          node.role = "RC";
        }
        fileNodes.push(node);
      }
    };

    [L, R, LC, RC].forEach(addNodeToFile);

    for (const [fileName, nodes] of fileMap.entries()) {
      graph.push({ fileName, nodes });
    }

    console.log("nodes: ", graph);
    
    // sort nodes by line
    graph.forEach(file => {
      file.nodes.sort((a, b) => {
        return a.numberHighlight - b.numberHighlight;
      });
    });

    return graph;
  }
};

const getGraphType = (dep: dependency, L: Node, R: Node, LC: Node, RC: Node): ConflictGridType | null => {
  // extracting nodes info
  const Lfile = L.fileName;
  const Rfile = R.fileName;
  const LCfile = LC.fileName;
  const RCfile = RC.fileName;

  // checking unique nodes
  const areLRdifferent = Lfile !== Rfile || L.numberHighlight !== R.numberHighlight;
  const isLCdifferent = LC.fileName !== Lfile || LC.numberHighlight !== L.numberHighlight;
  const isRCdifferent = RC.fileName !== Rfile || RC.numberHighlight !== R.numberHighlight;

  // DF and OA conflicts use the same layout logic
  if (dep.type.startsWith("CONFLICT") || dep.type.startsWith("OA")) {
    // L and R are different - must check LC and RC
    if (areLRdifferent) {
      // 4 nodes
      if (isLCdifferent && isRCdifferent) {
        // all different files
        if (
          Lfile !== Rfile &&
          Lfile !== LCfile &&
          Lfile !== RCfile &&
          Rfile !== LCfile &&
          Rfile !== RCfile &&
          LCfile !== RCfile
        ) {
          return ConflictGridTypeLayouts.A4;
        }
        // L and R in different files A and B, LC and RC in same file C
        else if (
          Lfile !== Rfile &&
          Lfile !== LCfile &&
          Lfile !== RCfile &&
          Rfile !== LCfile &&
          Rfile !== RCfile &&
          LCfile === RCfile
        ) {
          return ConflictGridTypeLayouts.C3;
        }
        // L and R in same file A, LC and RC in different files B and C
        else if (
          Lfile === Rfile &&
          Lfile !== LCfile &&
          Lfile !== RCfile &&
          LCfile !== RCfile
        ) {
          return ConflictGridTypeLayouts.D3;
        }
        // L and R in same file A, LC and RC in same file B
        else if (
          Lfile === Rfile &&
          Lfile !== LCfile &&
          Lfile !== RCfile &&
          LCfile === RCfile
        ) {
          return ConflictGridTypeLayouts.F2;
        }
      }
      // 3 nodes (LC)
      else if (isLCdifferent && !isRCdifferent) {
        // all different files
        if (
          Lfile !== Rfile &&
          Lfile !== LCfile &&
          Rfile !== LCfile
        ) {
          return ConflictGridTypeLayouts.A3;
        }
        // L and R in same file A, LC in different file B
        else if (
          Lfile === Rfile &&
          Lfile !== LCfile
        ) {
          return ConflictGridTypeLayouts.B2;
        }
        // L in file A, R and LC in same file B
        else if (
          Lfile !== Rfile &&
          Lfile !== LCfile &&
          Rfile === LCfile
        ) {
          return ConflictGridTypeLayouts.D2;
        }
      }
      // 3 nodes (RC)
      else if (!isLCdifferent && isRCdifferent) {
        // all different files
        if (
          Lfile !== Rfile &&
          Lfile !== RCfile &&
          Rfile !== RCfile
        ) {
          return ConflictGridTypeLayouts.B3;
        }
        // L and R in same file A, RC in different file B
        else if (
          Lfile === Rfile &&
          Lfile !== RCfile
        ) {
          return ConflictGridTypeLayouts.C2;
        }
        // R in file A, L and RC in same file B
        else if (
          Lfile !== Rfile &&
          Lfile !== RCfile &&
          Rfile === RCfile
        ) {
          return ConflictGridTypeLayouts.E2;
        }
      }
      // 2 nodes
      else {
        // L and R in same file A
        if (Lfile === Rfile) {
          return ConflictGridTypeLayouts.A1;
        }
        // L and R in different files A and B
        else {
          return ConflictGridTypeLayouts.A2;
        }
      }
    }
    // 3 nodes (no R - LC and RC must be different)
    else if (isLCdifferent && isRCdifferent) {
      // all different files
      if (
        Lfile !== LCfile &&
        Lfile !== RCfile &&
        LCfile !== RCfile
      ) {
        return ConflictGridTypeLayouts.A3;
      }
      // L and RC in same file A, LC in different file B
      else if (
        Lfile === RCfile &&
        Lfile !== LCfile
      ) {
        return ConflictGridTypeLayouts.B2;
      }
      // L in file A, LC and RC in same file B
      else if (
        Lfile !== LCfile &&
        Lfile !== RCfile &&
        LCfile === RCfile
      ) {
        return ConflictGridTypeLayouts.D2;
      }
    }
    return ConflictGridTypeLayouts.default;
  }
  
  return null;
};

export { Grouping_nodes, getGraphType };
export type { FileObject };