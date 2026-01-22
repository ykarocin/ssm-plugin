import React from "react";
import { ArrowType } from "./arrowLayout";
import { getEdgeColors } from "./edgeStyles";

interface EdgeShapeProps {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  type?: ArrowType;
}

/**
 * Call Edge: Linha reta simples com seta triangular
 */
function CallEdge({ x1, y1, x2, y2 }: EdgeShapeProps) {
  const colors = getEdgeColors("call");
  const markerId = "marker-call";

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
          <path
            d="M 0 0 L 10 5 L 0 10 z"
            fill={colors.markerFill}
          />
        </marker>
      </defs>
      <line
        x1={x1}
        y1={y1}
        x2={x2}
        y2={y2}
        stroke={colors.primary}
        strokeWidth={3}
        markerEnd={`url(#${markerId})`}
      />
    </>
  );
}

/**
 * OA Edge: Seta simples e grossa representando Overriding Assignment
 */
function OAEdge({ x1, y1, x2, y2 }: EdgeShapeProps) {
  const colors = getEdgeColors("OA");
  const offset = 16;

  // Calcular ângulo e comprimento da seta
  const dx = x2 - x1;
  const dy = y2 - y1; 
  // +90, pois seta svg já aponta para baixo
  const angle = Math.atan2(-dy, dx) * (180 / Math.PI) + 90; // dy invertido devido ao sistema de coordenadas SVG
  const length = Math.sqrt(dx * dx + dy * dy);

  return (
    <g transform={`
      translate(${x1 - offset}, ${y1 + offset})
      `}> <path d="M36.5002 0C30.9773 0 26.5002 4.47716 26.5002 10V61.4237L17.4458 51.3246C13.759 47.2124 7.43679 46.8676 3.32464 50.5543C-0.787502 54.2411 -1.13235 60.5633 2.5544 64.6755L27.0653 92.0145C31.8343 97.3338 40.1659 97.3338 44.9349 92.0145L69.4458 64.6755C73.1325 60.5633 72.7877 54.2411 68.6755 50.5543C64.5634 46.8676 58.2411 47.2124 54.5544 51.3246L46.5002 60.3081V10C46.5002 4.47715 42.023 0 36.5002 0Z" 
      fill={colors.primary} 
      fillRule="evenodd" 
      clipRule="evenodd" /> </g>
  );
}

/**
 * DF Edge: Múltiplos degraus (steps) representando fluxo de dados com seta convergente
 */
function DFEdge({ x1, y1, x2, y2 }: EdgeShapeProps) {
  const colors = getEdgeColors("DF");

  // Calcular ângulo e comprimento
  const dx = x2 - x1;
  const dy = y2 - y1;
  const angle = Math.atan2(dy, dx) * (180 / Math.PI) - 90;
  const length = Math.sqrt(dx * dx + dy * dy);

  const borderRadius = 1;

  const stepHeight = 2;
  const stepSpacing = 2 * stepHeight;
  const arrowLength = 18;
  const arrowWidth = 16;
  const arrowHeadLength = 14;
  const stepAreaLength = length - arrowLength - stepSpacing;
  const numSteps = Math.max(2, Math.floor(stepAreaLength / (stepHeight + stepSpacing)));
  const stepWidth = arrowWidth;
  const stepOffsetX = (length - stepWidth) / 2;

  return (
    <g transform={`translate(${x1}, ${y1}) rotate(${angle})`}>
      {/* Degraus do fluxo de dados */}
      {(() => {
        let currentY = 0;
        let lastStepHeight = 0;
        
        return Array.from({ length: numSteps + 1 }).map((_, i) => {
          // Aumentar a altura gradativamente conforme aproxima da ponta
          const progressiveHeight = stepHeight + 2 * i

          // Diminuir o gap entre os degraus conforme aproxima da ponta
          const progressiveGap = Math.max(1, stepSpacing - (i * (stepSpacing / numSteps)));
          
          // Usar Y acumulado da iteração anterior
          const y = currentY;
          
          // Atualizar para próxima iteração
          currentY += progressiveHeight + progressiveGap;
          lastStepHeight = progressiveHeight;
          
          return (
            <rect
              key={`step-${i}`}
              x={stepOffsetX}
              y={y}
              width={stepWidth}
              height={progressiveHeight}
              rx={borderRadius}
              ry={borderRadius}
              fill={colors.primary}
              stroke={colors.primary}
              strokeWidth="0.5"
              strokeLinejoin="round"
            />
          );
        });
      })()}

      {/* Seta completa com corpo e ponta */}
      {/* Corpo da seta */}
      <rect
        x={length / 2 - arrowWidth / 2}
        y={stepAreaLength}
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
        d={`M ${length / 2 - arrowWidth} ${stepAreaLength + arrowLength - arrowHeadLength}
            L ${length / 2 + arrowWidth} ${stepAreaLength + arrowLength - arrowHeadLength}
            L ${length / 2} ${stepAreaLength + arrowLength}
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
export function EdgeShape({ x1, y1, x2, y2, type }: EdgeShapeProps) {
  const baseType = type || "call";

  switch (baseType) {
    case "call":
      return <CallEdge x1={x1} y1={y1} x2={x2} y2={y2} type={type} />;
    case "OA":
      return <OAEdge x1={x1} y1={y1} x2={x2} y2={y2} type={type} />;
    case "DF":
      return <DFEdge x1={x1} y1={y1} x2={x2} y2={y2} type={type} />;
    case "CF":
      return <CFEdge x1={x1} y1={y1} x2={x2} y2={y2} type={type} />;
    default:
      return <CallEdge x1={x1} y1={y1} x2={x2} y2={y2} type={type} />;
  }
}
