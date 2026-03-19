import React from "react";
import { ArrowType, NodeFace } from "./arrowLayout";
import { getEdgeColors } from "./edgeStyles";

interface EdgeShapeProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type?: ArrowType;
  targetFace?: NodeFace;
  originFace?: NodeFace;
}

/**
 * Call Edge: Linha reta simples com seta triangular
 */
function CallEdge({ x1, y1, x2, y2, targetFace = "left", originFace = "right" }: EdgeShapeProps) {
  const colors = getEdgeColors("call");
  const markerId = "marker-call";
  const strokeColor = colors.primary;

  console.log(`CallEdge from (${x1}, ${y1}) to (${x2}, ${y2}), originFace: ${originFace}, targetFace: ${targetFace}`);

  // Categorize faces
  const originIsHorizontal = originFace === "left" || originFace === "right";
  const targetIsHorizontal = targetFace === "left" || targetFace === "right";

  let pathData: string;

  if (originIsHorizontal !== targetIsHorizontal) {
    // Different categories: use one bend (L-shape)
    if (targetIsHorizontal) {
      // Origin is vertical (top/bottom), target is horizontal (left/right)
      // Go vertical first to target's y, then horizontal to target's x
      pathData = `M ${x1} ${y1} L ${x1} ${y2} L ${x2} ${y2}`;
    } else {
      // Origin is horizontal (left/right), target is vertical (top/bottom)
      // Go horizontal first to target's x, then vertical to target's y
      pathData = `M ${x1} ${y1} L ${x2} ${y1} L ${x2} ${y2}`;
    }
  } else {
    // Same category: check alignment for zero or two bends
    if (originIsHorizontal) {
      // Both horizontal: check if on same row
      if (y1 === y2) {
        // Same row: straight line (zero bends)
        pathData = `M ${x1} ${y1} L ${x2} ${y2}`;
      } else {
        // Different rows: two bends with horizontal-vertical-horizontal pattern
        pathData = `M ${x1} ${y1} L ${(x1 + x2) / 2} ${y1} L ${(x1 + x2) / 2} ${y2} L ${x2} ${y2}`;
      }
    } else {
      // Both vertical: check if on same column
      if (x1 === x2) {
        // Same column: straight line (zero bends)
        pathData = `M ${x1} ${y1} L ${x2} ${y2}`;
      } else {
        // Different columns: two bends with vertical-horizontal-vertical pattern
        pathData = `M ${x1} ${y1} L ${x1} ${(y1 + y2) / 2} L ${x2} ${(y1 + y2) / 2} L ${x2} ${y2}`;
      }
    }
  }

  return (
    <>
      <defs>
        <marker
          id={markerId}
          markerWidth="8"
          markerHeight="8"
          refX="7"
          refY="4"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <path
            d="M 0 0 L 7 4 M 0 8 L 7 4"
            fill="none"
            stroke={strokeColor}
            strokeWidth="1.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </marker>
      </defs>

      <path
        d={pathData}
        stroke={strokeColor}
        strokeWidth={1.8}
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="miter"
        markerEnd={`url(#${markerId})`}
      />

      <circle cx={x1} cy={y1} r={4.5} fill={strokeColor} />
    </>
  );
}

/**
 * OA Edge: Seta simples e grossa representando Overriding Assignment
 */
function OAEdge({ x1, y1, x2, y2 }: EdgeShapeProps) {
  const colors = getEdgeColors("OA");
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI) - 90;

  // Calculate midpoint for equal distance from origin and target
  const midX = (x1 + x2) / 2;
  const midY = (y1 + y2) / 2;
  
  // Use the geometric center of the shape's bounding box as anchor point
  // Shape bounds: X [3.32 to 69.44], Y [0 to 92.01]
  const centerX = 36.38; // Center of X range
  const centerY = 46.01; // Center of Y range

  return (
    <g transform={`translate(${midX}, ${midY}) rotate(${angle}) translate(${-centerX}, ${-centerY})`}>
      <path d="M36.5002 0C30.9773 0 26.5002 4.47716 26.5002 10V61.4237L17.4458 51.3246C13.759 47.2124 7.43679 46.8676 3.32464 50.5543C-0.787502 54.2411 -1.13235 60.5633 2.5544 64.6755L27.0653 92.0145C31.8343 97.3338 40.1659 97.3338 44.9349 92.0145L69.4458 64.6755C73.1325 60.5633 72.7877 54.2411 68.6755 50.5543C64.5634 46.8676 58.2411 47.2124 54.5544 51.3246L46.5002 60.3081V10C46.5002 4.47715 42.023 0 36.5002 0Z"
        fill={colors.primary}
        fillRule="evenodd"
        clipRule="evenodd" />
    </g>
  );
}

/**
 * DF Edge: Múltiplos degraus (steps) representando fluxo de dados com seta convergente
 */
function DFEdge({ x1, y1, x2, y2 }: EdgeShapeProps) {
  const colors = getEdgeColors("DF");
  const topOffset = 18;

  // Calcular ângulo e comprimento
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI) - 90;
  const distance = Math.sqrt(dx * dx + dy * dy);

  const borderRadius = 2;

  const stepHeight = 4;
  const stepSpacing = 3 * stepHeight;
  const arrowLength = 36;
  const arrowWidth = 32;
  const arrowHeadLength = 28;
  const stepAreaLength = Math.max(0, distance - topOffset - arrowLength - stepSpacing);
  const bodyStartY = topOffset + stepAreaLength + stepSpacing;
  const stepWidth = arrowWidth;
  const stepOffsetX = -stepWidth / 2;

  return (
    <g transform={`translate(${x1}, ${y1}) rotate(${angle})`}>
      {/* Degraus do fluxo de dados */}
      {(() => {
        const steps = [];
        let currentY = 0;
        let stepIndex = 0;
        let previousHeight = 0;
        
        while (currentY < stepAreaLength) {
          // Aumentar a altura gradativamente conforme aproxima da ponta
          const progressiveHeight = stepHeight + 2 * stepIndex * stepHeight;

          // Diminuir o gap entre os degraus conforme aproxima da ponta
          const progressiveGap = Math.max(2, stepSpacing - stepSpacing * stepIndex * 0.5);

          const nextProgressiveGap = Math.max(2, stepSpacing - stepSpacing * (stepIndex + 1) * 0.5);

          // Calcular espaço restante
          const spaceRemaining = stepAreaLength - currentY - nextProgressiveGap;
          
          // Verificar se é o último degrau
          const isLastStep = progressiveHeight >= spaceRemaining;
          
          let finalHeight;
          if (isLastStep && spaceRemaining < previousHeight) {
            // Se o espaço restante for menor que o degrau anterior, preencher toda área
            finalHeight = stepAreaLength - currentY + borderRadius * 2;
          } else {
            finalHeight = Math.min(progressiveHeight, spaceRemaining);
          }
          
          // Usar Y acumulado da iteração anterior
          const y = currentY;
          
          steps.push(
            <rect
              key={`step-${stepIndex}`}
              x={stepOffsetX}
              y={topOffset + y}
              width={stepWidth}
              height={finalHeight}
              rx={borderRadius}
              ry={borderRadius}
              fill={colors.primary}
              stroke={colors.primary}
              strokeWidth="0.5"
              strokeLinejoin="round"
            />
          );

          previousHeight = finalHeight;
          currentY += finalHeight + progressiveGap;
          stepIndex++;
        }
        return steps;
      })()}

      {/* Seta completa com corpo e ponta */}
      {/* Corpo da seta */}
      <rect
        x={-arrowWidth / 2}
        y={bodyStartY}
        width={arrowWidth}
        height={arrowLength - arrowHeadLength + borderRadius}
        rx={borderRadius}
        ry={borderRadius}
        fill={colors.primary}
        stroke={colors.primary}
        strokeWidth="0.5"
      />

      {/* Ponta triangular da seta */}
      <path
        d={`M ${-arrowWidth} ${bodyStartY + arrowLength - arrowHeadLength}
          L ${arrowWidth} ${bodyStartY + arrowLength - arrowHeadLength}
          L 0 ${bodyStartY + arrowLength}
            Z`}
        fill={colors.primary}
        stroke={colors.primary}
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
    </g>
  );
}

/**
 * CF Edge: Linha em degraus (stepped) representando confluence
 */
function CFEdge({ x1, y1, x2, y2 }: EdgeShapeProps) {
  const colors = getEdgeColors("CF");
  const markerId = "marker-cf";

  // Criar path em formato de degraus (orthogonal)
  const midX = (x1 + x2) / 2;
  const pathData = `M ${x1} ${y1} L ${midX} ${y1} L ${midX} ${y2} L ${x2} ${y2}`;

  return (
    <>
      <defs>
        <marker
          id={markerId}
          markerWidth="10"
          markerHeight="10"
          refX="9"
          refY="5"
          orient="auto"
          markerUnits="strokeWidth"
        >
          <rect
            x="2"
            y="2"
            width="6"
            height="6"
            fill={colors.markerFill}
          />
          <path
            d="M 8 5 L 10 5"
            stroke={colors.markerFill}
            strokeWidth={2}
          />
        </marker>
      </defs>
      <path
        d={pathData}
        stroke={colors.primary}
        strokeWidth={2.5}
        fill="none"
        markerEnd={`url(#${markerId})`}
        strokeLinejoin="miter"
      />
      {/* Pequenos marcadores nos cantos para enfatizar o fluxo de controle */}
      <circle cx={midX} cy={y1} r={3} fill={colors.primary} opacity={0.7} />
      <circle cx={midX} cy={y2} r={3} fill={colors.primary} opacity={0.7} />
    </>
  );
}

/**
 * Componente principal que renderiza a aresta apropriada baseada no tipo
 */
export function EdgeShape({ x1, y1, x2, y2, type, originFace, targetFace }: EdgeShapeProps) {
  const baseType = type || "call";

  switch (baseType) {
    case "call":
      return <CallEdge x1={x1} y1={y1} x2={x2} y2={y2} type={type} originFace={originFace} targetFace={targetFace} />;
    case "OA":
      return <OAEdge x1={x1} y1={y1} x2={x2} y2={y2} type={type} />;
    case "DF":
      return <DFEdge x1={x1} y1={y1} x2={x2} y2={y2} type={type} />;
    case "CF":
      return <CFEdge x1={x1} y1={y1} x2={x2} y2={y2} type={type} />;
    default:
      return <CallEdge x1={x1} y1={y1} x2={x2} y2={y2} type={type} originFace={originFace} targetFace={targetFace} />;
  }
}
