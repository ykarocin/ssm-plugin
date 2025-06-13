import { useState, useImperativeHandle, forwardRef, MutableRefObject } from "react";

type gridRef = {
  initializeGrid: () => void;
  setCellElement: (row: number, column: number, element: JSX.Element) => void;
} | null;

interface GridProps {
  width: number;
  height: number;
  layout: {
    rows: number;
    columns: number;
    rowSizes?: number[];
    columnSizes?: number[];
  };
  ref: MutableRefObject<gridRef>;
}

/**
 * Component for managing the grid in the graph.
 * This component is responsible for positioning the graph nodes in equally spaced rows and columns.
 *
 * **!Edges and file contours are not limited to the grid!**
 *
 * @returns JSX.Element
 */
function Grid({ width, height, layout, ref }: GridProps): JSX.Element {
  // Save elements in a structure representing the grid layout
  // This structure will be used to position the nodes in the graph
  const [cells, setCells] = useState<Array<Array<JSX.Element>>>([]);

  //=============== Methods ===================
  // Initialize the grid cells based on the layout
  const initializeGrid = () => {
    const newCells = Array.from({ length: layout.rows }, () => Array.from({ length: layout.columns }, () => <></>));
    setCells(newCells);
  };

  // Set an element to a cell in the grid
  const setCellElement = (row: number, column: number, element: JSX.Element) => {
    setCells((prevCells) => {
      const newCells = [...prevCells];
      newCells[row][column] = element;
      return newCells;
    });
  };

  // Expose the grid methods to the parent component
  useImperativeHandle(ref, () => ({
    initializeGrid,
    setCellElement
  }));

  // =============== Initialization ==================
  // Get the relative size of each row and column
  const rowSizes = layout.rowSizes ? layout.rowSizes.map((size) => size / height) : Array(layout.rows).fill(1 / layout.rows);
  const columnSizes = layout.columnSizes
    ? layout.columnSizes.map((size) => size / width)
    : Array(layout.columns).fill(1 / layout.columns);

  // Calculate the position of each row and column
  const rowPositions = rowSizes.reduce((acc, size, index) => {
    const position = acc[index - 1] ? acc[index - 1] + size : size;
    acc.push(position);
    return acc;
  }, [] as number[]);
  const columnPositions = columnSizes.reduce((acc, size, index) => {
    const position = acc[index - 1] ? acc[index - 1] + size : size;
    acc.push(position);
    return acc;
  }, [] as number[]);

  return (
    <div
      style={{
        position: "absolute",
        width: "100%",
        height: "100%",
        display: "grid",
        gridTemplateRows: rowSizes.map((size) => `${size * 100}%`).join(" "),
        gridTemplateColumns: columnSizes.map((size) => `${size * 100}%`).join(" ")
      }}>
      {cells.map((row, rowIndex) =>
        row.map((cell, columnIndex) => (
          <div
            key={`${rowIndex}-${columnIndex}`}
            style={{
              gridRowStart: rowIndex + 1,
              gridColumnStart: columnIndex + 1,
              position: "relative"
            }}>
            {cell}
          </div>
        ))
      )}
    </div>
  );
}

export default forwardRef(Grid);
