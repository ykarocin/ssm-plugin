// components/File.tsx
import React from "react";
import { CodeNode, Node } from "./Node";
import "../App.css";

export class File {
  nodes: Node[];
  name: string;

  constructor(name: string, nodes: Node[]) {
    this.name = name;
    this.nodes = nodes.slice(0, 4);
  }
}

interface FileComponentProps {
  file: File;
  x?: number;
  y?: number;
}

export const FileComponent: React.FC<FileComponentProps> = ({ file, x = 0, y = 0 }) => {
  const padding = 20;
  const columnSpacing = 20;
  const rowSpacing = 60;

  const nodeWidths = file.nodes.map((node) => node.getWidth());
  const nodeHeights = file.nodes.map((node) => node.getHeight(30));

  const isCallOnly = file.nodes.every((n) => n.isCall);

  if (!isCallOnly && file.nodes.some((n) => n.isCall)){
    file.nodes.forEach((n) => {
      if (n.isCall) {
        n.isDashed = true;
      }
    })
  }

  const nodeCount = file.nodes.length;

  const columns = nodeCount <= 2 ? 1 : 2;
  const rows = Math.ceil(nodeCount / 2);

  const maxNodeWidth = Math.max(...nodeWidths);
  const totalWidth = columns * maxNodeWidth + (columns - 1) * columnSpacing + padding * 2;

  const rowHeights: number[] = [];
  for (let r = 0; r < rows; r++) {
    const rowNodes = file.nodes.slice(r * 2, r * 2 + 2);
    const rowHeight = Math.max(...rowNodes.map((n) => n.getHeight(30)));
    rowHeights.push(rowHeight);
  }

  const totalHeight = rowHeights.reduce((a, b) => a + b, 0) + (rows - 1) * rowSpacing + padding * 2;

  const getNodePosition = (index: number) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const xPos = x + padding + col * (maxNodeWidth + columnSpacing);
    const yPos =
      y + padding +
      rowHeights.slice(0, row).reduce((a, b) => a + b, 0) +
      row * rowSpacing;
    return { x: xPos, y: yPos };
  };

  const arrows = file.nodes.flatMap((fromNode, i) => {
    return file.nodes.flatMap((toNode, j) => {
      if (i === j) return [];
      const fromPos = getNodePosition(i);
      const toPos = getNodePosition(j);

      const lineHeight = 30;
      const centerY = toPos.y + 35 + 1 * lineHeight;

      const conditions = [
        fromNode.isCall && toNode.isSource && fromNode.calledFile === toNode.fileName,
        fromNode.isCall && toNode.isSink && fromNode.calledFile === toNode.fileName,
        fromNode.isSource && toNode.isSink,
      ];

      if (conditions.some(Boolean)) {
        return (
          <g key={`arrow-${i}-${j}`}>
            <line
              x1={fromPos.x + fromNode.getWidth() / 2}
              y1={fromPos.y + fromNode.getHeight(30)}
              x2={toPos.x + toNode.getWidth() / 2}
              y2={centerY}
              stroke="#7E7E7E"
              strokeWidth={2}
              markerEnd="url(#arrowhead)"
            />
          </g>
        );
      }
      return [];
    });
  });

  return (
    <svg width={totalWidth} height={totalHeight}>
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

      <rect
        x={x}
        y={y}
        width={totalWidth}
        height={totalHeight}
        fill="white"
        stroke="black"
        strokeWidth={2}
        rx={8}
      />

      {isCallOnly && (
        <rect
          x={x - 4}
          y={y - 4}
          width={totalWidth + 8}
          height={totalHeight + 8}
          rx={12}
          ry={12}
          fill="none"
          stroke="#000"
          strokeDasharray="4 4"
          strokeWidth={2}
        />
      )}

      <text x={x + 16} y={y + 24} fontSize={16} fontWeight="bold" fill="#000">
        {file.name}
      </text>

      {/* Nodes */}
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
      {arrows}
    </svg>
  );
};
