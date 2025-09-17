import { useRef, useEffect } from "react";
import Grid, { gridRef } from "./Grid";
import { FileObject } from "../grouping";
import { CodeNode } from "./Node";
import { layout } from "./Grid";

export type ConflictGridType = {
  layout: layout;
  positions: [number, number][];
};

interface GraphViewProps {
  data: FileObject[];
  conflictGridType: ConflictGridType;
}

export default function GraphView({ data, conflictGridType }: GraphViewProps) {
  const gridRef = useRef<gridRef>(null);

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