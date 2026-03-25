import { getClassFromJavaFilename } from "@extension/utils";

const linesToExpand = 20;
const cachedLinesByFile: { [fileName: string]: HTMLTableRowElement[] } = {};

type ExpandDirection = "up" | "down" | "both" | "all";

type HiddenBlock = {
  start: number;
  end: number;
};

export const firstVisibleLine = (classFileName: string): number => {
  const lines = cachedLinesByFile[classFileName];
  if (!lines) {
    return -1;
  }

  for (let index = 0; index < lines.length; index++) {
    if (!lines[index].classList.contains("d2h-d-none")) {
      return index;
    }
  }

  return -1;
};

export const lastVisibleLine = (classFileName: string): number => {
  const lines = cachedLinesByFile[classFileName];
  if (!lines) {
    return -1;
  }

  for (let index = lines.length - 1; index >= 0; index--) {
    if (!lines[index].classList.contains("d2h-d-none")) {
      return index;
    }
  }

  return -1;
};

const clearExpandControlRows = (diffFile: HTMLElement) => {
  diffFile.querySelectorAll("tr.pl-expand-controls").forEach((row) => row.remove());
};

const getSourceRows = (diffFile: HTMLElement, classFileName: string) => {
  const cachedRows = cachedLinesByFile[classFileName];
  if (cachedRows && cachedRows.length > 0 && cachedRows[0].isConnected) {
    return cachedRows;
  }

  const rows = Array.from(diffFile.querySelectorAll("tr")).filter(
    (row) => !row.classList.contains("button-container-dark")
  ) as HTMLTableRowElement[];

  cachedLinesByFile[classFileName] = rows;
  return rows;
};

const findHiddenBlocks = (lines: HTMLTableRowElement[]) => {
  const blocks: HiddenBlock[] = [];
  let blockStart = -1;

  for (let index = 0; index < lines.length; index++) {
    const isHidden = lines[index].classList.contains("d2h-d-none");
    if (isHidden && blockStart === -1) {
      blockStart = index;
      continue;
    }

    if (!isHidden && blockStart !== -1) {
      blocks.push({ start: blockStart, end: index - 1 });
      blockStart = -1;
    }
  }

  if (blockStart !== -1) {
    blocks.push({ start: blockStart, end: lines.length - 1 });
  }

  return blocks;
};

const revealHiddenBlock = (
  diffFile: HTMLElement,
  classFileName: string,
  blockStart: number,
  blockEnd: number,
  direction: ExpandDirection
) => {
  const lines = cachedLinesByFile[classFileName];
  if (!lines) {
    return;
  }

  let startToReveal = blockStart;
  let endToReveal = blockEnd;

  if (direction === "up") {
    startToReveal = Math.max(blockStart, blockEnd - linesToExpand + 1);
  } else if (direction === "down") {
    endToReveal = Math.min(blockEnd, blockStart + linesToExpand - 1);
  } else if (direction === "both") {
    const halfWindow = Math.max(1, Math.floor(linesToExpand / 2));

    for (let index = blockStart; index <= Math.min(blockEnd, blockStart + halfWindow - 1); index++) {
      lines[index].classList.remove("d2h-d-none");
    }

    for (let index = Math.max(blockStart, blockEnd - halfWindow + 1); index <= blockEnd; index++) {
      lines[index].classList.remove("d2h-d-none");
    }

    insertButtons(diffFile, classFileName);
    return;
  }

  for (let index = startToReveal; index <= endToReveal; index++) {
    lines[index].classList.remove("d2h-d-none");
  }

  insertButtons(diffFile, classFileName);
};

const insertControlRowForBlock = (
  diffFile: HTMLElement,
  lines: HTMLTableRowElement[],
  block: HiddenBlock,
  classFileName: string
) => {
  const hasVisibleAbove = block.start > 0;
  const hasVisibleBelow = block.end < lines.length - 1;
  const hiddenLinesCount = block.end - block.start + 1;

  const anchorRow = hasVisibleBelow ? lines[block.end + 1] : lines[block.start - 1];
  if (!anchorRow) {
    return;
  }

  const controlRow = document.createElement("tr");
  controlRow.classList.add("button-container-dark", "pl-expand-controls");

  const controlCell = document.createElement("td");
  controlCell.colSpan = Math.max(anchorRow.querySelectorAll("td").length, 1);
  controlCell.classList.add("button-cell", "pl-expand-controls-cell");

  const controls = document.createElement("div");
  controls.classList.add("pl-expand-controls-wrapper");

  const createControlButton = (direction: ExpandDirection, label: string, title: string) => {
    const button = document.createElement("button");
    button.classList.add("button-style-dark", "pl-expand-button");
    button.setAttribute("data-expand-direction", direction);
    button.innerHTML = label;
    button.title = title;
    button.onclick = () => revealHiddenBlock(diffFile, classFileName, block.start, block.end, direction);
    return button;
  };

  if (hasVisibleAbove && hasVisibleBelow) {
    controls.appendChild(
      createControlButton("both", "&#x25B2;&#x25BC;", `Expand ${linesToExpand} lines from both sides`)
    );
  } else if (hasVisibleBelow) {
    controls.appendChild(createControlButton("up", "&#x25B2;", `Expand ${linesToExpand} lines up`));
  } else if (hasVisibleAbove) {
    controls.appendChild(createControlButton("down", "&#x25BC;", `Expand ${linesToExpand} lines down`));
  }

  const hiddenLabel = document.createElement("span");
  hiddenLabel.classList.add("pl-expand-hidden-count");
  hiddenLabel.textContent = `${hiddenLinesCount} hidden lines`;
  controls.appendChild(hiddenLabel);

  if (hiddenLinesCount > linesToExpand) {
    controls.appendChild(createControlButton("all", "Show all", "Expand all hidden lines"));
  }

  controlCell.appendChild(controls);
  controlRow.appendChild(controlCell);

  if (hasVisibleBelow) {
    anchorRow.parentNode?.insertBefore(controlRow, anchorRow);
  } else {
    anchorRow.parentNode?.insertBefore(controlRow, anchorRow.nextSibling);
  }
};

export const expandTop = (diffFile: HTMLElement, lineButtonIndex: number, classFileName: string) => {
  const lines = cachedLinesByFile[classFileName];
  if (!lines || !lines[lineButtonIndex]) {
    return;
  }

  let hiddenStart = lineButtonIndex;
  while (hiddenStart > 0 && lines[hiddenStart - 1].classList.contains("d2h-d-none")) {
    hiddenStart--;
  }

  revealHiddenBlock(diffFile, classFileName, hiddenStart, lineButtonIndex - 1, "up");
};

export const expandBottom = (diffFile: HTMLElement, lineButtonIndex: number, classFileName: string) => {
  const lines = cachedLinesByFile[classFileName];
  if (!lines || !lines[lineButtonIndex]) {
    return;
  }

  let hiddenEnd = lineButtonIndex;
  while (hiddenEnd < lines.length - 1 && lines[hiddenEnd + 1].classList.contains("d2h-d-none")) {
    hiddenEnd++;
  }

  revealHiddenBlock(diffFile, classFileName, lineButtonIndex + 1, hiddenEnd, "down");
};

export const insertButtons = (diffFile: HTMLElement, fileName: string) => {
  const classFileName = getClassFromJavaFilename(fileName) || "null";
  const lines = getSourceRows(diffFile, classFileName);

  clearExpandControlRows(diffFile);

  const hiddenBlocks = findHiddenBlocks(lines);
  hiddenBlocks.forEach((block) => insertControlRowForBlock(diffFile, lines, block, classFileName));
};
