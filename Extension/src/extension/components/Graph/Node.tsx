// components/CodeNode.tsx
import React from "react";
import { getDiffLine, scrollAndHighlight } from "../Diff/diff-navigation";
import { firstVisibleLine, lastVisibleLine, expandBottom, expandTop } from "../Diff/InsertButtons";

interface CodeNodeProps {
  fileName: string;
  lines: string[];
  numberLines: number[];
  isCall?: boolean;
  isSource?: boolean;
  isSink?: boolean;
}

export class Node {
  fileName: string;
  lines: string[];
  numberLines: number[];
  isSource: boolean;
  isSink: boolean;

  constructor(
    fileName: string,
    lines: string[],
    numberLines: number[],
    isSource: boolean = false,
    isSink: boolean = false
  ) {
    this.fileName = fileName;
    this.lines = lines;
    this.numberLines = numberLines;
    this.isSource = isSource;
    this.isSink = isSink;
  }

  getWidth() {
    return this.isSource || this.isSink ? 290 : 363;
  }

  getHeight(lineHeight: number) {
    const padding = 40;
    return this.lines.length * lineHeight + padding;
  }
}

export const CodeNode: React.FC<CodeNodeProps> = ({
  fileName,
  lines,
  numberLines,
  isCall = false,
  isSource = false,
  isSink = false
}) => {
  const isSpecial = isCall || isSink;

  const width = isSpecial ? 290 : 363;
  const lineSpacing = isSpecial ? 2 : 4;
  const baseFontSize = isSpecial ? 16 : 20;
  const numberFontSize = isSpecial ? 12 : 14;
  const padding = 40;
  const lineHeight = baseFontSize + lineSpacing;
  const startY = 35;

  const handleClick = () => {
    const file= fileName;
    const line = lines[1];
    const diffLine = getDiffLine(file.endsWith(".java") ? file : `${file}.java`, Number(line));

    // checking if the diffLine is visible
    if (diffLine?.classList.contains("d2h-d-none")){
      let firstLine = firstVisibleLine(file);
      const diffFile = document.querySelector(`${file}`) as HTMLElement;
      while (diffLine?.classList.contains("d2h-d-none")) {
        if (Number(line) > firstLine){
          let lastLine = lastVisibleLine(file);
          expandBottom(diffFile, lastLine, file);
        } else{
          firstLine = firstVisibleLine(file);
          expandTop(diffFile, firstLine, file);
        }
      }
    }

    scrollAndHighlight(diffLine);
  };

  return (
    <svg width={width} height={lines.length * lineHeight + padding}>
      {/* Background */}
      <rect
        x="0"
        y="0"
        width={width}
        height={lines.length * lineHeight + padding}
        rx="24"
        ry="24"
        fill="#D9D9D9"
      />

      {/* Code Lines */}
      {lines.map((line, i) => {
        const y = startY + i * lineHeight;
        const isHighlight = i === 1;

        return (
          <g key={i}>
            {isHighlight ? (
              <g onClick={handleClick} style={{ cursor: "pointer" }}>
                <rect
                  x="20"
                  y={y - baseFontSize}
                  width={width - 40}
                  height={lineHeight}
                  fill="#A9A9A9"
                  rx="8"
                />
                <text
                  x="30"
                  y={y}
                  fontFamily="Roboto"
                  fontSize={numberFontSize}
                  fontWeight="400"
                  fill="#333"
                >
                  {numberLines[i]}
                </text>
                <text
                  x="60"
                  y={y}
                  fontFamily="Roboto"
                  fontSize={baseFontSize}
                  fontWeight="500"
                  fill="#000"
                >
                  {line}
                </text>
              </g>
            ) : (
              <>
                <text
                  x="30"
                  y={y}
                  fontFamily="Roboto"
                  fontSize={numberFontSize}
                  fontWeight="400"
                  fill="#333"
                >
                  {numberLines[i]}
                </text>
                <text
                  x="60"
                  y={y}
                  fontFamily="Roboto"
                  fontSize={baseFontSize}
                  fontWeight="400"
                  fill="#000"
                >
                  {line}
                </text>
              </>
            )}
          </g>
        );
      })}
    </svg>
  );
};
