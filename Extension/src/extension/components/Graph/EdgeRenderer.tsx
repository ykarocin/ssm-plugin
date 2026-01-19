import { Arrow } from "./arrowLayout";
import { EdgeShape } from "./EdgeShapes";

interface EdgeRendererProps {
  arrows: Arrow[];
  gridRect: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null | undefined;
}

export function EdgeRenderer({ arrows, gridRect }: EdgeRendererProps) {
  return (
    <svg
      width={gridRect?.width ?? 0}
      height={gridRect?.height ?? 0}
      style={{
        position: "absolute",
        left: 0,
        top: 0,
        pointerEvents: "none",
        zIndex: 2
      }}
    >
      {arrows?.map((arrow, i) => (
        <g key={i}>
          <EdgeShape
            x1={arrow.from.x1 ?? 0}
            y1={arrow.from.y1 ?? 0}
            x2={arrow.to.x2 ?? 0}
            y2={arrow.to.y2 ?? 0}
            type={arrow.type}
          />
        </g>
      ))}
    </svg>
  );
}
