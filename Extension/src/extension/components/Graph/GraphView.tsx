import { useRef, useEffect } from "react";
import Grid, { gridRef } from "./Grid";
import { FileObject } from "../grouping";
import { areArraysEqual } from "@extension/utils";
import { CodeNode } from "./Node";

const ConflictGridType = {
  A1: { layout: { rows: 2, columns: 3 }, positions: [[1, 2], [2, 2]] },
  A2: { layout: { rows: 2, columns: 3 }, positions: [[1, 2], [2, 2]] },
  B2: { layout: { rows: 2, columns: 2 }, positions: [[1, 1], [2, 1], [2, 2]] },
  C2: { layout: { rows: 2, columns: 2 }, positions: [[1, 1], [1, 2], [2, 2]] },
  D2: { layout: { rows: 2, columns: 2 }, positions: [[1, 1], [2, 1], [2, 2]] },
  E2: { layout: { rows: 2, columns: 2 }, positions: [[1, 2], [2, 1], [2, 2]] },
  F2: { layout: { rows: 2, columns: 2 }, positions: [[1, 1], [1, 2], [2, 1], [2, 2]] },
  A3: { layout: { rows: 2, columns: 2 }, positions: [[1, 1], [1, 2], [2, 1]] },
  B3: { layout: { rows: 2, columns: 2 }, positions: [[1, 2], [2, 1], [2, 2]] },
  C3: { layout: { rows: 2, columns: 2 }, positions: [[1, 1], [1, 2], [2, 1], [2, 2]] },
  D3: { layout: { rows: 2, columns: 2 }, positions: [[1, 1], [1, 2], [2, 1], [2, 2]] },
  A4: { layout: { rows: 2, columns: 2 }, positions: [[1, 1], [1, 2], [2, 1], [2, 2]] },
  default: { layout: { rows: 2, columns: 2 }, positions: [[1, 1], [1, 2], [2, 1], [2, 2]] }
};

interface GraphViewProps {
  data: FileObject[];
}

export default function GraphView({ data }: GraphViewProps) {
  const getConflictGridType = (data: FileObject[]) => {
    if (!data || data.length === 0) {
      return null;
    }

    const nodesQuant = data.reduce((acc, fileObject) => acc + fileObject.nodes.length, 0);
    if (nodesQuant < 2) {
      return null;
    }

    // always [L, R, LC, RC]
    const nodesDistrib = data.map(fileObject => fileObject.nodes.length);

    if (data.length === 1 && areArraysEqual(nodesDistrib, [2])) {
      return ConflictGridType.A1;
    } else if (data.length === 2 && areArraysEqual(nodesDistrib, [1, 1])) {
      return ConflictGridType.A2;
    } else if (data.length === 3 && areArraysEqual(nodesDistrib, [2, 1])) {
      return ConflictGridType.B2;
    }

    return ConflictGridType.default;
  };

  const gridRef = useRef<gridRef>(null);
  const conflictGridType = getConflictGridType(data);

  useEffect(() => {
    if (gridRef.current && conflictGridType) {
      console.log("Updating layout");
      gridRef.current.setLayout(conflictGridType.layout);

      console.log("Inserting grid elements");
      data.forEach((fileObject, fileIndex) => {
        fileObject.nodes.forEach((node, nodeIndex) => {
          const posIndex = fileIndex + nodeIndex;
          const position = conflictGridType.positions[posIndex];
          gridRef.current!.setCellElement(position[0] - 1, position[1] - 1,
            <CodeNode
              key={`${fileObject.fileName}-${nodeIndex}`}
              fileName={node.fileName}
              lines={node.lines}
              numberHighlight={node.numberHighlight}
              calledFile={node.calledFile}
              isCall={node.isCall}
              isSource={node.isSource}
              isSink={node.isSink}
              isDashed={node.isDashed}
            />
          );
        });
      });
    }
  }, [data, conflictGridType]);


  return conflictGridType ? <Grid width={300} height={100} layout={conflictGridType.layout} ref={gridRef} /> : null;
}