import { useRef, useEffect } from "react";
import Grid, { gridRef } from "./Grid";
import { FileObject } from "../grouping";
import { areArraysEqual } from "@extension/utils";
import { CodeNode } from "./Node";

const ConflictGridType = {
  A1: { layout: { rows: 2, columns: 3 }, positions: [[1, 2], [2, 2]] },
  A2: { layout: { rows: 2, columns: 3 }, positions: [[1, 2], [2, 2]] },
  B2: { layout: { rows: 2, columns: 2 }, positions: [[1, 1], [2, 1], [2, 2]] },
  C2: { layout: { rows: 2, columns: 2 }, positions: [[1, 1], [2, 1], [1, 2]] },
  default: { layout: { rows: 2, columns: 2 }, positions: [[1, 1], [2, 1], [1, 2], [2, 2]] }
};

interface GraphViewProps {
  data: FileObject[];
}

export default function GraphView({ data }: GraphViewProps) {
  const getConflictGridType = (data: FileObject[]) => {
    if (!data || data.length === 0) {
      return null;
    }

    const nodesQuant = data.reduce((acc, fileObject) => acc + fileObject.nodes.length, 0);
    if (nodesQuant < 2) {
      return null;
    }

    // always [L, R, LC, RC]
    const nodesDistrib = data.map(fileObject => fileObject.nodes.length);

    if (data.length === 1 && areArraysEqual(nodesDistrib, [2])) {
      return ConflictGridType.A1;
    } else if (data.length === 2 && areArraysEqual(nodesDistrib, [1, 1])) {
      return ConflictGridType.A2;
    } else if (data.length === 3 && areArraysEqual(nodesDistrib, [2, 1])) {
      return ConflictGridType.B2;
    }

    return ConflictGridType.default;
  };

  const gridRef = useRef<gridRef>(null);
  const conflictGridType = getConflictGridType(data);

  useEffect(() => {
    if (gridRef.current && conflictGridType) {
      console.log("Updating layout");
      gridRef.current.setLayout(conflictGridType.layout);

      console.log("Inserting grid elements");
      data.forEach((fileObject, fileIndex) => {
        fileObject.nodes.forEach((node, nodeIndex) => {
          const posIndex = fileIndex + nodeIndex;
          const position = conflictGridType.positions[posIndex];
          gridRef.current!.setCellElement(position[0] - 1, position[1] - 1,
            <CodeNode
              key={`${fileObject.fileName}-${nodeIndex}`}
              fileName={node.fileName}
              lines={node.lines}
              numberHighlight={node.numberHighlight}
              calledFile={node.calledFile}
              isCall={node.isCall}
              isSource={node.isSource}
              isSink={node.isSink}
              isDashed={node.isDashed}
            />
          );
        });
      });
    }
  }, [data, conflictGridType]);


  return conflictGridType ? <Grid width={300} height={100} layout={conflictGridType.layout} ref={gridRef} /> : null;
}

const a = [
    {
        "fileName": "org/example/Main",
        "nodes": [
            {
                "fileName": "org/example/Main",
                "lines": [
                    "\n    \n      6\n6\n    \n    \n        \n             \n                    Text t = new Text(input);\n        \n    \n",
                    "\n    \n      7\n7\n    \n    \n        \n             \n                    t.cleanText();\n        \n    \n",
                    "    }"
                ],
                "numberHighlight": 7,
                "calledFile": "",
                "isCall": false,
                "isSource": true,
                "isSink": false,
                "isDashed": false
            },
            {
                "fileName": "org/example/Main",
                "lines": [
                    "\n    \n      6\n6\n    \n    \n        \n             \n                    Text t = new Text(input);\n        \n    \n",
                    "\n    \n      7\n7\n    \n    \n        \n             \n                    t.cleanText();\n        \n    \n",
                    "        StringBuilder result = new StringBuilder(words[0]);"
                ],
                "numberHighlight": 7,
                "calledFile": "",
                "isCall": false,
                "isSource": true,
                "isSink": false,
                "isDashed": false
            }
        ]
    },
    {
        "fileName": "org/example/Text.java",
        "nodes": [
            {
                "fileName": "org/example/Text.java",
                "lines": [
                    "    public void normalizeWhiteSpace() {",
                    "        text = text.replaceAll(\"\\\\s{2,}\", \" \");",
                    "    }"
                ],
                "numberHighlight": 40,
                "calledFile": "",
                "isCall": false,
                "isSource": true,
                "isSink": false,
                "isDashed": false
            },
            {
                "fileName": "org/example/Text.java",
                "lines": [
                    "    public void removeDuplicateWords() {",
                    "        String[] words = text.split(\" \");",
                    "        StringBuilder result = new StringBuilder(words[0]);"
                ],
                "numberHighlight": 44,
                "calledFile": "",
                "isCall": false,
                "isSource": true,
                "isSink": false,
                "isDashed": false
            }
        ]
    }
]