import { useCallback, useEffect } from "react";
import Graph from "graphology";
import {
  SigmaContainer,
  ControlsContainer,
  ZoomControl,
  useLoadGraph,
  useRegisterEvents,
  useSetSettings,
  useSigma
} from "@react-sigma/core";
import { SerializedGraph } from "graphology-types";
import { NodeDisplayData, PartialButFor } from "sigma/types";
import { Settings } from "sigma/settings";
import { AnimateOptions } from "sigma/utils";
import { getDiffLine, scrollAndHighlight } from "../../Diff/diff-navigation";
import { firstVisibleLine, lastVisibleLine } from "../../Diff/InsertButtons";
import { expandTop, expandBottom } from "../../Diff/InsertButtons";

const LABEL_Y_OFFSET = 4;
const HOVER_PADDING = 2;
const CAMERA_DEFAULT_ZOOMING_RATIO = 1.2;

const sigmaStyle = { height: "500px", width: "100%" };

// Generate the message rendered for each node in the graph
export const generateNodeLabel = (node: PartialButFor<NodeDisplayData, "x" | "y" | "size" | "label" | "color">) => {
  const { label, method } = node;
  if (!label) return "";
  if (!method) return label;
  return `${label} in ${method}`;
};

// Custom node label renderer
function drawLabel(
  context: CanvasRenderingContext2D,
  data: PartialButFor<NodeDisplayData, "x" | "y" | "size" | "label" | "color">,
  settings: Settings
): void {
  if (!data.label) return;

  const size = settings.labelSize,
    font = settings.labelFont,
    weight = settings.labelWeight;

  context.font = `${weight} ${size}px ${font}`;
  context.fillStyle = "#000";

  const message = generateNodeLabel(data);

  // Render the label above the node by adjusting the y position
  if (data.labelPosition === "top") {
    context.textAlign = "center"; // Center align the text

    context.fillText(
      message,
      data.x,
      data.y - data.size - LABEL_Y_OFFSET - HOVER_PADDING // Adjust the offset to position label above the node
    );

    if (data.message) {
      context.fillStyle = "#f00";
      context.fillText(`(${data.message})`, data.x, data.y - data.size - LABEL_Y_OFFSET - HOVER_PADDING - size - 6);
    }
  } else if (data.labelPosition === "right") {
    context.textAlign = "left"; // Left align the text

    context.fillText(message, data.x + data.size + 3, data.y + size / 3);

    if (data.message) {
      context.fillStyle = "#f00";
      context.fillText(`(${data.message})`, data.x + data.size + 3, data.y + size + 6);
    }
  } else {
    //default to bottom
    context.textAlign = "center"; // Center align the text

    context.fillText(
      message,
      data.x,
      data.y + data.size + 3.5 * LABEL_Y_OFFSET + HOVER_PADDING // Adjust the offset to position label below the node
    );

    if (data.message) {
      context.fillStyle = "#f00";
      context.fillText(`(${data.message})`, data.x, data.y + data.size + 3.5 * LABEL_Y_OFFSET + HOVER_PADDING + size + 6);
    }
  }
}

// draw the label background on top of the node
const drawLabelRectTop = (
  context: CanvasRenderingContext2D,
  data: PartialButFor<NodeDisplayData, "x" | "y" | "size" | "label" | "color">,
  boxWidth: number,
  boxHeight: number,
  labelOffsetY: number,
  arcRadius: number
) => {
  // Draw the rounded rectangle above the node
  context.beginPath();
  context.moveTo(data.x - boxWidth / 2, data.y - labelOffsetY); // Top-left corner
  context.lineTo(data.x + boxWidth / 2, data.y - labelOffsetY); // Top-right corner
  context.lineTo(data.x + boxWidth / 2, data.y - labelOffsetY + boxHeight); // Bottom-right corner
  context.lineTo(data.x, data.y - labelOffsetY + boxHeight); // Middle-bottom
  context.arc(data.x, data.y, arcRadius, -Math.PI / 2, 1.5 * Math.PI); // Arc around the node
  context.lineTo(data.x - boxWidth / 2, data.y - labelOffsetY + boxHeight); // Bottom-left corner
  context.closePath();
  context.fill();
};

// draw the label background on the right of the node
const drawLabelRectRight = (
  context: CanvasRenderingContext2D,
  data: PartialButFor<NodeDisplayData, "x" | "y" | "size" | "label" | "color">,
  boxWidth: number,
  boxHeight: number,
  labelOffsetX: number,
  arcRadius: number
) => {
  const angleRadian = Math.asin(boxHeight / 2 / arcRadius);

  // Draw the rounded rectangle on the right of the node
  context.beginPath();
  context.moveTo(data.x + labelOffsetX, data.y + boxHeight / 2);
  context.lineTo(data.x + arcRadius + boxWidth, data.y + boxHeight / 2);
  context.lineTo(data.x + arcRadius + boxWidth, data.y - boxHeight / 2);
  context.lineTo(data.x + labelOffsetX, data.y - boxHeight / 2);
  context.arc(data.x, data.y, arcRadius, angleRadian, -angleRadian);
  context.closePath();
  context.fill();
};

// draw the label background on the bottom of the node
const drawLabelRectBottom = (
  context: CanvasRenderingContext2D,
  data: PartialButFor<NodeDisplayData, "x" | "y" | "size" | "label" | "color">,
  boxWidth: number,
  boxHeight: number,
  labelOffsetY: number,
  arcRadius: number
) => {
  // Draw the rounded rectangle on the bottom of the node
  context.beginPath();
  context.moveTo(data.x - boxWidth / 2, data.y + labelOffsetY); // Bottom-left corner
  context.lineTo(data.x + boxWidth / 2, data.y + labelOffsetY); // Bottom-right corner
  context.lineTo(data.x + boxWidth / 2, data.y + labelOffsetY - boxHeight); // Top-right corner
  context.lineTo(data.x, data.y + labelOffsetY - boxHeight); // Middle-bottom
  context.arc(data.x, data.y, arcRadius, Math.PI / 2, -1.5 * Math.PI); // Arc around the node
  context.lineTo(data.x - boxWidth / 2, data.y + labelOffsetY - boxHeight); // Top-left corner
  context.closePath();
  context.fill();
};

// Custom node label renderer for hover
function drawHover(
  context: CanvasRenderingContext2D,
  data: PartialButFor<NodeDisplayData, "x" | "y" | "size" | "label" | "color">,
  settings: Settings
): void {
  const size = settings.labelSize,
    font = settings.labelFont,
    weight = settings.labelWeight;

  context.font = `${weight} ${size}px ${font}`;

  // Then we draw the label background
  context.fillStyle = "#FFF";
  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
  context.shadowBlur = 8;
  context.shadowColor = "#000";

  if (typeof data.label === "string") {
    const message = generateNodeLabel(data);

    // Calculate the width of the text
    const textWidth = context.measureText(message).width,
      boxWidth = Math.round(textWidth + 5),
      boxHeight = Math.round(size + 2 * HOVER_PADDING),
      radius = Math.max(data.size, size / 2) + HOVER_PADDING;

    if (data.labelPosition === "top") {
      // Offset to place the label background above the node
      const labelOffsetY = data.size + boxHeight + HOVER_PADDING;
      drawLabelRectTop(context, data, boxWidth, boxHeight, labelOffsetY, radius);
    } else if (data.labelPosition === "right") {
      const labelOffsetX = Math.sqrt(Math.abs(Math.pow(radius, 2) - Math.pow(boxHeight / 2, 2)));
      drawLabelRectRight(context, data, boxWidth, boxHeight, labelOffsetX, radius);
    } else {
      //default to bottom
      const labelOffsetY = data.size + boxHeight + HOVER_PADDING;
      drawLabelRectBottom(context, data, boxWidth, boxHeight, labelOffsetY, radius);
    }
  } else {
    // Draw a circle around the node
    context.beginPath();
    context.arc(data.x, data.y, data.size + HOVER_PADDING, 0, Math.PI * 2);
    context.closePath();
    context.fill();
  }

  context.shadowOffsetX = 0;
  context.shadowOffsetY = 0;
  context.shadowBlur = 0;

  // draw the label
  drawLabel(context, data, settings);
}

// Node navigation to diff line
const navigateToDiffLine = (node: NodeDisplayData) => {
  if (!node || !node.label) return;

  const [file, line] = node.label.split(":");
  const diffLine = getDiffLine(file.endsWith(".java") ? file : `${file}.java`, Number(line));

  // checking if the diffLine is visible
  if (diffLine?.classList.contains("d2h-d-none")) {
    let firstLine = firstVisibleLine(file);
    const diffFile = document.querySelector(`${file}`) as HTMLElement;
    while (diffLine?.classList.contains("d2h-d-none")) {
      if (Number(line) > firstLine) {
        let lastLine = lastVisibleLine(file);
        expandBottom(diffFile, lastLine, file);
      } else {
        firstLine = firstVisibleLine(file);
        expandTop(diffFile, firstLine, file);
      }
    }
  }

  scrollAndHighlight(diffLine);
};

// Component that load the graph
const LoadGraph = ({ data }: { data: Partial<SerializedGraph> }) => {
  const sigma = useSigma();
  const loadGraph = useLoadGraph();
  const setSettings = useSetSettings();
  const registerEvents = useRegisterEvents();
  // custom reset zoom method
  const resetCamera = useCallback(
    (options?: Partial<AnimateOptions>) => {
      sigma.getCamera().animate(
        {
          x: 0.5,
          y: 0.5,
          ratio: CAMERA_DEFAULT_ZOOMING_RATIO,
          angle: 0
        },
        options
      );
    },
    [sigma]
  );

  useEffect(() => {
    registerEvents({
      clickNode: (event) => navigateToDiffLine(sigma.getNodeDisplayData(event.node) as NodeDisplayData)
    });
  });

  useEffect(() => {
    setSettings({
      renderLabels: true,
      renderEdgeLabels: true,
      defaultDrawNodeLabel: drawLabel,
      defaultDrawNodeHover: drawHover,
      edgeLabelSize: 12,
      edgeLabelFont: "Arial",
      edgeLabelWeight: "bold",
      edgeLabelColor: { color: "#000" }
    });
  }, [setSettings]);

  useEffect(() => {
    const graph = new Graph();
    graph.import(data);
    loadGraph(graph);
    resetCamera();
  }, [data, loadGraph, resetCamera]);
  return null;
};

interface GraphViewProps {
  data: Partial<SerializedGraph>;
}

const zoomControlStyle: React.CSSProperties = {
  colorScheme: "light"
};

// Component that display the graph
export default function GraphView({ data }: GraphViewProps) {
  return (
    <SigmaContainer style={sigmaStyle}>
      <LoadGraph data={data} />
      <ControlsContainer>
        <ZoomControl style={zoomControlStyle} />
      </ControlsContainer>
    </SigmaContainer>
  );
}
