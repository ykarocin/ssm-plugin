import React from "react";
import { CodeNode, Node } from "./Node";
import { FileObject } from "../grouping";
import "../../../app/App.css";

interface FileComponentProps {
  file: FileObject;
  width: number;
  height: number;
}

export const FileComponent: React.FC<FileComponentProps> = ({ file, width, height }) => {
  console.log("Rendering FileComponent for file:", file.fileName);;
  const foldSize = 32;
  // const padding = 20;
  // const columnSpacing = 20;
  // const rowSpacing = 60;

  // // Use a map to get width and height for each node
  // const nodeDimensions = file.nodes.map((node) => ({
  //   width: node.getWidth(),
  //   height: node.getHeight(30)
  // }));

  // const isCallOnly = file.nodes.every((n) => n.isCall);

  // if (!isCallOnly && file.nodes.some((n) => n.isCall)) {
  //   file.nodes.forEach((n) => {
  //     if (n.isCall) {
  //       n.isDashed = true;
  //     }
  //   });
  // }

  // const nodeCount = file.nodes.length;
  // const columns = nodeCount <= 2 ? 1 : 2;
  // const rows = Math.ceil(nodeCount / 2);

  // const maxNodeWidth = Math.max(...nodeDimensions.map(d => d.width));
  // const totalWidth = columns * maxNodeWidth + (columns - 1) * columnSpacing + padding * 2;

  // const rowHeights: number[] = [];
  // for (let r = 0; r < rows; r++) {
  //   const rowNodes = file.nodes.slice(r * 2, r * 2 + 2);
  //   const rowHeight = Math.max(...rowNodes.map((n) => n.getHeight(30)));
  //   rowHeights.push(rowHeight);
  // }

  // const totalHeight = rowHeights.reduce((a, b) => a + b, 0) + (rows - 1) * rowSpacing + padding * 2 + 30; // 30 is for the file name

  // const getNodePosition = (index: number) => {
  //   const col = index % 2;
  //   const row = Math.floor(index / 2);
  //   const xPos = padding + col * (maxNodeWidth + columnSpacing);
  //   const yPos = padding + 30 +
  //     rowHeights.slice(0, row).reduce((a, b) => a + b, 0) +
  //     row * rowSpacing;
  //   return { x: xPos, y: yPos };
  // };

  // const arrows = file.nodes.flatMap((fromNode, i) => {
  //   return file.nodes.flatMap((toNode, j) => {
  //     if (i === j) return [];
  //     const fromPos = getNodePosition(i);
  //     const toPos = getNodePosition(j);

  //     const lineHeight = 30;
  //     const centerY = toPos.y + 35 + 1 * lineHeight;

  //     const conditions = [
  //       fromNode.isCall && toNode.isSource && fromNode.calledFile === toNode.fileName,
  //       fromNode.isCall && toNode.isSink && fromNode.calledFile === toNode.fileName,
  //       fromNode.isSource && toNode.isSink,
  //     ];

  //     if (conditions.some(Boolean)) {
  //       return (
  //         <g key={`arrow-${i}-${j}`}>
  //           <line
  //             x1={fromPos.x + fromNode.getWidth() / 2}
  //             y1={fromPos.y + fromNode.getHeight(30)}
  //             x2={toPos.x + toNode.getWidth() / 2}
  //             y2={centerY}
  //             stroke="#7E7E7E"
  //             strokeWidth={2}
  //             markerEnd="url(#arrowhead)"
  //           />
  //         </g>
  //       );
  //     }
  //     return [];
  //   });
  // });

  return (
    <svg width={width} height={height}>
      <defs>
        <marker
          id="arrowhead"
          markerWidth="10"
          markerHeight="7"
          refX="5"
          refY="3.5"
          orient="auto"
        >
          <polygon points="0 0, 10 3.5, 0 7" fill="#7E7E7E" />
        </marker>
      </defs>

      <polygon
        points={`
          0,0
          ${width - foldSize},0
          ${width},${foldSize}
          ${width},${height}
          0,${height}
        `}
        fill="white"
        stroke="black"
        strokeWidth={2}
        rx={8}
      />

      {/* {isCallOnly && (
        <rect
          x={-4}
          y={-4}
          width={totalWidth + 8}
          height={totalHeight + 8}
          rx={12}
          ry={12}
          fill="none"
          stroke="#000"
          strokeDasharray="4 4"
          strokeWidth={2}
        />
      )} */}

      <text x={16} y={24} fontSize={16} fontWeight="bold" fill="#000">
        {file.fileName}
      </text>

      <polygon
        points={`
          ${width - foldSize},0
          ${width - foldSize}, ${foldSize}
          ${width},${foldSize},
          ${width - foldSize},0
        `}
        fill="white"
        stroke="black"
        strokeWidth={1}
      />

      {/* Nodes
      {file.nodes.map((node, i) => {
        const pos = getNodePosition(i);
        return (
          <g key={i} transform={`translate(${pos.x}, ${pos.y})`}>
            <CodeNode
              fileName={node.fileName}
              lines={node.lines}
              numberHighlight={node.numberHighlight}
              isCall={node.isCall}
              isSink={node.isSink}
              isSource={node.isSource}
              calledFile={node.calledFile}
              isDashed={node.isDashed}
            />
          </g>
        );
      })}

      {/* Arrows */}
      {/* {arrows} */}
    </svg>
  );
};
