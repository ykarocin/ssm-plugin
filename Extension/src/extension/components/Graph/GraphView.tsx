import { useRef, useEffect } from "react";
import Grid, { gridRef } from "./Grid";
import { FileObject } from "../grouping";
import { FileComponent } from "./File";
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
        console.log(`Processing file: ${fileObject.fileName}`);
        const position = conflictGridType.positions[fileIndex];
        // Ensure position is valid before attempting to set the cell element
        if (position) {
          // Pass the entire fileObject to the FileComponent
          gridRef.current!.setCellElement(position[0] - 1, position[1] - 1,
            <FileComponent
              key={fileObject.fileName}
              file={fileObject}
            />
          );
        }
      });
    }
  }, [data, conflictGridType]);

  return conflictGridType ? <Grid width={300} height={100} layout={conflictGridType.layout} ref={gridRef} /> : null;
}
