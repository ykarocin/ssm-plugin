import { useRef, useEffect, useState } from "react";
import Grid, { gridRef } from "./Grid";
import { FileObject } from "../grouping";
import { CodeNode } from "./Node";
import { layout } from "./Grid";
import { FileComponent } from "./File";

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
  const fileWidth = 420;
  const fileHeight = 155;
  const padding = 32;
  const fileSpacing = 140;

  const [fileContours, setFileContours] = useState<
    { key: string; file: FileObject; width: number; height: number; minRow: number; minCol: number }[]
  >([]);

  useEffect(() => {
    if (gridRef.current && conflictGridType) {
      gridRef.current.setLayout(conflictGridType.layout);

      let curNodeIndex = 0;
      const contours: typeof fileContours = [];

      data.forEach((fileObject, fileIndex) => {
        const nodePositions: { row: number; col: number }[] = [];

        fileObject.nodes.forEach((node, nodeIndex) => {
          const posIndex = curNodeIndex++;
          const position = conflictGridType.positions[posIndex];
          nodePositions.push({ row: position[0] -1, col: position[1] - 1});

          gridRef.current!.setCellElement(position[0] - 1, position[1] - 1,
            <div style={{
              position: "relative",
              left: padding,
              top: padding,
              width: `calc(100% - ${padding * 2}px)`,
              height: `calc(100% - ${padding * 2}px)`
            }}>
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
            </div>
          );
        });

        if (nodePositions.length > 0) {
          const minRow = Math.min(...nodePositions.map(pos => pos.row));
          const maxRow = Math.max(...nodePositions.map(pos => pos.row));
          const minCol = Math.min(...nodePositions.map(pos => pos.col));
          const maxCol = Math.max(...nodePositions.map(pos => pos.col));

          const width = (maxCol - minCol + 1) * fileWidth;
          const height = (maxRow - minRow + 1) * fileHeight;

          contours.push({
            key: `file-contour-${fileObject.fileName}`,
            file: fileObject,
            width,
            height,
            minRow,
            minCol
          })
        }
      });

      setFileContours(contours);
    }
  }, [data, conflictGridType]);
  // pegar tamanho da coluna e subtrair do tamanho do node e somar com um padding
  // file com position relative e node com position absolute
  return conflictGridType ? (
    <div style={{ position: "relative" }}>
      {/* Renderize os contornos dos arquivos */}
      {fileContours.map(contour => (
        <div
          key={contour.key}
          style={{
            position: "absolute",
            left: contour.minCol * fileWidth + contour.minCol * fileSpacing,
            top: contour.minRow * fileHeight,
            zIndex: 0
          }}
        >
          <FileComponent
            file={contour.file}
            width={contour.width}
            height={contour.height}
          />
        </div>
      ))}
      {/* Renderize o grid normalmente */}
      <Grid width={300} height={100} layout={conflictGridType.layout} ref={gridRef} />
    </div>
  ) : null;
}
