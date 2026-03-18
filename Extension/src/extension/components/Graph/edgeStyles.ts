import { ArrowType } from "./arrowLayout";

export interface EdgeColors {
  primary: string;
  secondary?: string;
  markerFill: string;
}

export function getEdgeColors(type?: ArrowType): EdgeColors {
  const baseType = type || "call";

  switch (baseType) {
    case "call":
      return {
        primary: "#FF9800",
        markerFill: "#FF9800",
      };

    case "OA":
      return {
        primary: "#9C27B0",
        secondary: "#D1C4E9",
        markerFill: "#9C27B0",
      };

    case "DF":
      return {
        primary: "#00BCD4",
        secondary: "#B2EBF2",
        markerFill: "#00BCD4",
      };

    case "CF":
      return {
        primary: "#4CAF50",
        secondary: "#C8E6C9",
        markerFill: "#4CAF50",
      };

    default:
      return {
        primary: "#FF9800",
        markerFill: "#FF9800",
      };
  }
}

export function getArrowTypeLabel(type?: ArrowType): string {
  const baseType = type || "call";
  
  const labels: Record<ArrowType, string> = {
    call: "Call",
    OA: "Overriding Assignment",
    DF: "Data Flow",
    CF: "Confluence",
  };

  return labels[baseType];
}
