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
    { key: string; file: FileObject; width: number; height: number, left: number, top: number }[]
  >([]);

  const contours: typeof fileContours = [];
  const cells = gridRef.current?.getCells() ?? [];

  const nodeRefs = useRef<Array<Array<HTMLDivElement | null>>>([]);

  useEffect(() => {
    if (gridRef.current && conflictGridType) {
      gridRef.current.setLayout(conflictGridType.layout);

      let curNodeIndex = 0;

      data.forEach((fileObject, fileIndex) => {
        const nodesIndex: number[] = [];
        nodeRefs.current[fileIndex] = [];

        fileObject.nodes.forEach((node, nodeIndex) => {
          const posIndex = curNodeIndex++;
          const position = conflictGridType.positions[posIndex];
          nodesIndex.push(nodeIndex);

          gridRef.current!.setCellElement(position[0] - 1, position[1] - 1,
            <div
              key={`${fileObject.fileName}-${nodeIndex}`}
              ref={el => nodeRefs.current[fileIndex][nodeIndex] = el} 
              style={{
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
        
        // const fileCells: JSX.Element[] = [];
        // nodesIndex.forEach((idx) => {
        //   for (let row = 0; row < cells.length; row++) {
        //     for (let col = 0; col < cells[row].length; col++) {
        //       const cell = cells[row][col];
        //       // Verifica se o cell contém um CodeNode com nodeIndex igual ao idx
        //       if (
        //         cell &&
        //         cell.props &&
        //         cell.props.children &&
        //         cell.props.children.type === CodeNode &&
        //         cell.props.children.key === `${fileObject.fileName}-${idx}`
        //       ) {
        //         fileCells.push(cell);
        //       }
        //     }
        //   }
        // });

          // contours.push({
          //   key: `file-contour-${fileObject.fileName}`,
          //   file: fileObject,
          //   width,
          //   height,
          //   minRow,
          //   minCol
          // })
        }
      );

      // setFileContours(contours);
    }
  }, [data, conflictGridType]);

  useEffect(() => {
  // Aguarde a renderização dos nodes
  console.log("stop one");
  setTimeout(() => {
    const contours: typeof fileContours = [];
    const gridContainer = document.querySelector('#grid-container');
    const gridRect = gridContainer?.getBoundingClientRect();
    if (!gridRect) return;
    // Agrupe refs por fileObject se necessário
    // Exemplo para todos nodes:
    console.log("stop two");
    data.forEach((fileObject, fileIndex) => {
        console.log("stop three");     
        const rects = (nodeRefs.current[fileIndex] ?? [])
        .filter(Boolean)
        .map(el => el!.getBoundingClientRect());
        console.log("rects", rects);

      if (rects.length > 0) {
        const minLeft = Math.min(...rects.map(r => r.left));
        const minTop = Math.min(...rects.map(r => r.top));
        const maxRight = Math.max(...rects.map(r => r.right));
        const maxBottom = Math.max(...rects.map(r => r.bottom));

        const minX = Math.min(...rects.map(r => r.x));
        const minY = Math.min(...rects.map(r => r.y));

        const width = maxRight - minLeft;
        const height = maxBottom - minTop;

        const left = minX - gridRect.x;
        const top = minY - gridRect.y;
        console.log("width, height", width, height);

        // Adicione ao contours
        contours.push({
          key: `file-contour-${fileObject.fileName}`,
          file: fileObject,
          width,
          height,
          left,
          top
        });

        setFileContours([...contours]);
  }
});
  }, 0);
}, [data, conflictGridType]);
  // pegar tamanho da coluna e subtrair do tamanho do node e somar com um padding
  // file com position relative e node com position absolute
  return conflictGridType ? (
    console.log("Rendering GraphView with data:", data),
    <div style={{ position: "relative" }}>
      {/* Renderize os contornos dos arquivos */}
      {fileContours.map(contour => (
        <div
          key={contour.key}
          style={{
            position: "absolute",
            left: contour.left - 6,
            top: contour.top - padding,
            zIndex: 0
          }}
        >
          <FileComponent
            file={contour.file}
            width={contour.width - 3 * padding}
            height={contour.height + 2.3 * padding}
          />
        </div>
      ))}
      {/* Renderize o grid normalmente */}
      <Grid width={300} height={100} layout={conflictGridType.layout} ref={gridRef} />
    </div>
  ) : null;
}
