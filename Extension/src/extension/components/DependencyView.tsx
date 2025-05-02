import { useEffect, useState, useRef } from "react";
import AnalysisService from "../../services/AnalysisService";
import { dependency, modLine } from "../../models/AnalysisOutput";
import { filterDuplicatedDependencies, updateLocationFromStackTrace } from "./dependencies";
import Conflict from "./Conflict";
import DiffView from "./Diff/DiffView";
import GraphView from "./Graph/GraphView";
import { SerializedGraph } from "graphology-types";
import { generateGraphData, lineData } from "./Graph/graph";
import "../styles/dependency-plugin.css";
import SettingsButton from "./Settings/Settings-button";
import SettingsService from "../../services/SettingsService";
import { getClassFromJavaFilename, isLineFromLeft } from "@extension/utils";
import { Node } from "./Graph/Node";
import { getDiffLine } from "./Diff/diff-navigation";
import { File } from "./Graph/File";
import { Grouping_nodes } from "./grouping";

const analysisService = new AnalysisService();
const settingsService = new SettingsService();

async function getAnalysisOutput(owner: string, repository: string, pull_number: number) {
  return await analysisService.getAnalysisOutput(owner, repository, pull_number);
}

async function getSettings(owner: string, repository: string, pull_number: number) {
  return await settingsService.getSettings(owner, repository, pull_number);
}

interface DependencyViewProps {
  owner: string;
  repository: string;
  pull_number: number;
}

let dependencyViewConfig: { owner: string; repository: string; pull_number: number } | null = null;

export function getDependencyViewConfig() {
  if (!dependencyViewConfig) {
    throw new Error("DependencyViewConfig is not set. Ensure DependencyView is rendered.");
  }
  return dependencyViewConfig;
}

export default function DependencyView({ owner, repository, pull_number }: DependencyViewProps) {
  /*
   * analysis properties
   */
  const [dependencies, setDependencies] = useState<dependency[]>([]);
  const [modifiedLines, setModifiedLines] = useState<modLine[]>([]);
  const [diff, setDiff] = useState<string>("");
  const [filesFromBase, setFilesFromBase] = useState<string[]>([]);
  const [graphData, setGraphData] = useState<Partial<SerializedGraph> | null>(null);
  const [mainClass, setMainClass] = useState("");
  const [baseClass, setBaseClass] = useState("");
  const [mainMethod, setMainMethod] = useState("");
  const [loading, setloading] = useState<boolean>(true);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  /*
   * page properties
   */
  const [activeConflict, setActiveConflict] = useState<number | null>(null); // index of the active conflict on dependencies list

  /*
   * methods
   */
  const updateGraph = (dep: dependency, L: Node, R: Node, CF?: Node) => {
    let newGraphData;

    // get the LC and RC
    dep = updateLocationFromStackTrace(dep, { inplace: false, mode: "deep" });

    // get the filename and line numbers of the conflict
    let fileFrom;
    let lineFrom;
    let fileTo;
    let lineTo;
    let cfFilename = "";
    let cfLine;

    if (dep.type.startsWith("CONFLUENCE")) {
      let sourceOne = dep.body.interference.find((el) => el.type === "source1");
      let sourceTwo = dep.body.interference.find((el) => el.type === "source2");
      let confluence = dep.body.interference.find((el) => el.type === "confluence");

      if (!sourceOne || !sourceTwo || !confluence) {
        console.error("Erroe: Any interference of 'source' or 'confluence' type was founded");
        return;
      }

      fileFrom = sourceOne.location.file.replaceAll("\\", "/"); // filename source 1
      lineFrom = sourceOne; // line source 1
      fileTo = sourceTwo.location.file.replaceAll("\\", "/"); // filename source 2
      lineTo = sourceTwo; // line source 2
      cfFilename = confluence.location.file.replaceAll("\\", "/"); // filename targ
      cfLine = confluence; // line targ
    } else {
      fileFrom = dep.body.interference[0].location.file.replaceAll("\\", "/"); // first filename
      lineFrom = dep.body.interference[0]; // first line
      fileTo = dep.body.interference[dep.body.interference.length - 1].location.file.replaceAll("\\", "/"); // last filename
      lineTo = dep.body.interference[dep.body.interference.length - 1]; // last line
    }

    const LC_Lines :string[] = [];
    const LC_Numbers :number[] = [];
    const RC_Lines :string[] = [];
    const RC_Numbers :number[] = [];
    let LeftCall_Row;
    let RightCall_Row;

    for ( let i = -1; i < 1; i++){
      LeftCall_Row = getDiffLine(fileFrom, lineFrom.location.line + i);
      RightCall_Row = getDiffLine(fileTo, lineTo.location.line + i);

      LC_Lines.push(LeftCall_Row.textContent || "");
      LC_Numbers.push(lineFrom.location.line + i);
      RC_Lines.push(RightCall_Row.textContent || "");
      RC_Numbers.push(lineTo.location.line + i);
    }

    const LC = new Node(fileFrom, LC_Lines, LC_Numbers, L.fileName, true, false, false);
    const RC = new Node(fileTo, RC_Lines, RC_Numbers, R.fileName, true, false, false);


    // const LC = {
    //   file: fileFrom,
    //   line: lineFrom.location.line,
    //   method: lineFrom.stackTrace?.at(1)?.method ?? lineFrom.location.method
    // };
    // const RC = {
    //   file: fileTo,
    //   line: lineTo.location.line,
    //   method: lineTo.stackTrace?.at(1)?.method ?? lineTo.location.method
    // };

    // If the nodes are equal, update from the stack trace
    if (getClassFromJavaFilename(L.fileName) === getClassFromJavaFilename(LC.fileName) && L.numberLines[1] === LC.numberLines[1]) {
      L.fileName = dep.body.interference[0].stackTrace?.at(0)?.class.replaceAll(".", "/") ?? L.fileName;

      if (dep.body.interference[0].stackTrace?.at(0)?.line){
        L.numberLines[1] = dep.body.interference[0].stackTrace?.at(0)?.line ?? L.numberLines[1];

        let L_Row;
        let newNumber = L.numberLines[1];
        for ( let i = -1; i < 1; i++){
          L_Row = getDiffLine(L.fileName, newNumber + i);
    
          L.lines[i + 1] = L_Row.textContent || "";
          L.numberLines[i + 1] = newNumber + i;
        }

      } 
    }

    if (getClassFromJavaFilename(R.fileName) === getClassFromJavaFilename(RC.fileName) && R.numberLines[1] === RC.numberLines[1]) {
      R.fileName = dep.body.interference[dep.body.interference.length - 1].stackTrace?.at(0)?.class.replaceAll(".", "/") ?? R.fileName;

      if (dep.body.interference[dep.body.interference.length - 1].stackTrace?.at(0)?.line){
        R.numberLines[1] = dep.body.interference[dep.body.interference.length - 1].stackTrace?.at(0)?.line ?? R.numberLines[1];

        let R_Row;
        let newNumber = R.numberLines[1];
        for ( let i = -1; i < 1; i++){
          R_Row = getDiffLine(R.fileName, newNumber + i);
    
          R.lines[i + 1] = R_Row.textContent || "";
          R.numberLines[i + 1] = newNumber + i;
        }

      } 
    }

    // if (getClassFromJavaFilename(R.file) === getClassFromJavaFilename(RC.file) && R.line === RC.line) {
    //   R.file =
    //     (dep.type.startsWith("CONFLUENCE")
    //       ? dep.body.interference[1].stackTrace?.at(0)?.class.replaceAll(".", "/")
    //       : dep.body.interference[dep.body.interference.length - 1].stackTrace?.at(0)?.class.replaceAll(".", "/")) ?? R.file;
    //   R.line =
    //     (dep.type.startsWith("CONFLUENCE")
    //       ? dep.body.interference[1].stackTrace?.at(0)?.line
    //       : dep.body.interference[dep.body.interference.length - 1].stackTrace?.at(0)?.line) ?? R.line;
    // }

    //Sending the correct colors to the nodes
    let lColor = "";
    let rColor = "";

    const leftLines = [L, LC];

    if (isLineFromLeft(leftLines, modifiedLines)) {
      lColor = "#1E90FF"; //azul
      rColor = "#228B22"; //verde
    } else {
      lColor = "#228B22"; //verde
      rColor = "#1E90FF"; //azul
    }

    // Dividing the nodes into files
    const newGraph = Grouping_nodes(dep, L, R, LC, RC);

      // const descriptionRegex = /<(.+:.+)> - .*<(.+:.+)>/;
      // const variables = descriptionRegex.exec(dep.body.description);

      // newGraphData = generateGraphData(
      //   "oa",
      //   { L, R, LC, RC },
      //   lColor,
      //   rColor,
      //   variables ? { variables: { left: variables[1], right: variables[2] } } : undefined
      // );
    // } else if (dep.type.startsWith("CONFLICT")) {
    //   const variables = dep.body.description.split(" - ").map((v) => /<(.+:.+)>/.exec(v)?.[1] ?? v);

    //   // If the conflict is DF
    //   newGraphData = generateGraphData("df", { L, R, LC, RC }, lColor, rColor, {
    //     variables: { left: variables[0], right: variables[1] }
    //   });
    // } else if (dep.type.startsWith("CONFLUENCE")) {
    //   if (cfLine) {
    //     CF = {
    //       file: cfFilename,
    //       line: cfLine.location.line,
    //       method: cfLine.location.method
    //     };
    //     newGraphData = generateGraphData("cf", { L, R, LC, RC, CF }, lColor, rColor);
    //   }
    // }

    // set the new graph data
    if (!newGraphData) setGraphData(null);
    else setGraphData(newGraphData);
  };

  const changeActiveConflict = (dep: dependency) => {
    // get the filename and line numbers of the conflict
    let fileFrom;
    let lineFrom;
    let fileTo;
    let lineTo;
    let cfLine;
    let cfFileName = "";

    if (dep.type.startsWith("CONFLUENCE")) {
      let sourceOne = dep.body.interference.find((el) => el.type === "source1");
      let sourceTwo = dep.body.interference.find((el) => el.type === "source2");
      let confluence = dep.body.interference.find((el) => el.type === "confluence");

      if (!sourceOne || !sourceTwo || !confluence) {
        console.error("Error: Any interference of 'source' or 'confluence' type was founded");
        return;
      }

      fileFrom = sourceOne.location.file.replaceAll("\\", "/"); // source1 filename
      lineFrom = sourceOne; // source1 line
      fileTo = sourceTwo.location.file.replaceAll("\\", "/"); // source2 filename
      lineTo = sourceTwo; // source2 line
      cfLine = confluence;
      cfFileName = confluence.location.file.replaceAll("\\", "/"); // confluence filename
    } else {
      fileFrom = dep.body.interference[0].location.file.replaceAll("\\", "/"); // first filename
      lineFrom = dep.body.interference[0]; // first line
      fileTo = dep.body.interference[dep.body.interference.length - 1].location.file.replaceAll("\\", "/"); // last filename
      lineTo = dep.body.interference[dep.body.interference.length - 1]; // last line
    }

    // if the filename is unknown, try to get the first valid one from the stack trace
    if (fileFrom === "UNKNOWN" || fileTo === "UNKNOWN") {
      updateLocationFromStackTrace(dep, { inplace: true });
      fileFrom = dep.body.interference[0].location.file.replaceAll("\\", "/");
      fileTo = dep.type.startsWith("CONFLUENCE")
        ? dep.body.interference[1].location.file.replaceAll("\\", "/")
        : dep.body.interference[dep.body.interference.length - 1].location.file.replaceAll("\\", "/");
    }

    // declare the graph data variables
    if (dep.type.startsWith("CONFLUENCE") && cfLine) {
      let L: lineData = {
        file: fileFrom,
        line: lineFrom.location.line,
        method: dep.body.interference[0].stackTrace?.at(0)?.method ?? lineFrom.location.method
      };
      let R: lineData = {
        file: fileTo,
        line: lineTo.location.line,
        method: dep.body.interference[1].stackTrace?.at(0)?.method ?? lineTo.location.method
      };
      let CF: lineData = {
        file: cfFileName,
        line: cfLine.location.line,
        method: cfLine.stackTrace?.at(0)?.method ?? lineTo.location.method
      };
      updateGraph(dep, L, R, CF);
    } else {
      const L_Lines :string[] = [];
      const L_Numbers :number[] = [];
      const R_Lines :string[] = [];
      const R_Numbers :number[] = [];
      let Left_Row;
      let Right_Row;

      for ( let i = -1; i < 1; i++){
        Left_Row = getDiffLine(fileFrom, lineFrom.location.line + i);
        Right_Row = getDiffLine(fileTo, lineTo.location.line + i);

        L_Lines.push(Left_Row.textContent || "");
        L_Numbers.push(lineFrom.location.line + i);
        R_Lines.push(Right_Row.textContent || "");
        R_Numbers.push(lineTo.location.line + i);
      }

      const L = new Node(fileFrom, L_Lines, L_Numbers, "", false, true, false);
      const R = new Node(fileFrom, L_Lines, L_Numbers, "", false, true, false);
      // let L: lineData = {
      //   file: fileFrom,
      //   line: lineFrom.location.line,
      //   method: dep.body.interference[0].stackTrace?.at(0)?.method ?? lineFrom.location.method
      // };
      // let R: lineData = {
      //   file: fileTo,
      //   line: lineTo.location.line,
      //   method: dep.body.interference[dep.body.interference.length - 1].stackTrace?.at(0)?.method ?? lineTo.location.method
      // };
      updateGraph(dep, L, R);
    }
  };

  // get the analysis output
  useEffect(() => {
    const fetchAnalysis = () => {
      getAnalysisOutput(owner, repository, pull_number).then((response) => {
        setloading(false);
        dependencyViewConfig = { owner, repository, pull_number };
        let dependencies = response.getDependencies();
        dependencies.forEach((dep) => {
          if (
            dep.body.interference[0].location.file === "UNKNOWN" ||
            dep.body.interference[dep.body.interference.length - 1].location.file === "UNKNOWN"
          )
            updateLocationFromStackTrace(dep, { inplace: true });
        });
        dependencies = filterDuplicatedDependencies(dependencies);

        setDependencies(
          dependencies.sort((a, b) => {
            const aStartLine = a.body.interference[0].location.line;
            const bStartLine = b.body.interference[0].location.line;
            const aEndLine = a.body.interference[a.body.interference.length - 1].location.line;
            const bEndLine = b.body.interference[b.body.interference.length - 1].location.line;

            if (aStartLine < bStartLine) return -1;
            if (aStartLine > bStartLine) return 1;
            if (aEndLine < bEndLine) return -1;
            if (aEndLine > bEndLine) return 1;
            return 0;
          })
        );

        const appendMissingFilesToDiff = (diff: string, missingFiles: { file: string; content: string }[]) => {
          for (const { file, content } of missingFiles) {
            const fileHeader = `diff --git a/${file} b/${file}\nindex 0000000..0000000 100644\n--- a/${file}\n+++ b/${file}\n`;
            const contentSize = content.split("\n").length - 1;
            const fileContent = `@@ -1,${contentSize} +1,${contentSize} @@\n${content
              .split("\n")
              .map((line) => " " + line)
              .join("\n")}\n`;
            diff += fileHeader + fileContent;
          }
          return diff;
        };
        let newDiff = response.getDiff();
        const missingFiles: { file: string; content: string }[] = response.data.missingFiles ?? [];
        newDiff = appendMissingFilesToDiff(newDiff, missingFiles);

        setDiff(newDiff);
        setFilesFromBase(missingFiles.map((file) => file.file));
        setModifiedLines(response.data.modifiedLines ?? []);
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      });
    };

    fetchAnalysis();
    if (loading) {
      intervalRef.current = setInterval(fetchAnalysis, 3000);
    }
    // get the settings
    getSettings(owner, repository, pull_number).then((response) => {
      setMainClass(response.mainClass);
      setMainMethod(response.mainMethod);
      setBaseClass(response.baseClass ?? "");
    });
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [owner, repository, pull_number]);

  // update the active conflict
  useEffect(() => {
    if (activeConflict !== null) {
      const conflict = dependencies[activeConflict];
      changeActiveConflict(conflict);
    }
  }, [activeConflict]);

  return (
    <div id="dependency-plugin">
      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div> {/* Exibindo o spinner enquanto carrega */}
          <p>Loading analysis...</p>
        </div>
      ) : (
        <>
          {diff ? (
            <SettingsButton
              baseClass={baseClass}
              setBaseClass={setBaseClass}
              mainClass={mainClass}
              setMainClass={setMainClass}
              mainMethod={mainMethod}
              setMainMethod={setMainMethod}
            />
          ) : null}
          <div id="dependency-plugin-content" className="tw-flex tw-flex-row tw-justify-between">
            {dependencies.length ? (
              <div
                id="dependency-container"
                className="tw-min-w-fit tw-max-w-[20%] tw-h-fit tw-mr-5 tw-py-2 tw-px-3 tw-border tw-border-gray-700 tw-rounded">
                <h3 className="tw-mb-5 tw-text-red-600">
                  {dependencies.length} possible conflict
                  {dependencies.length > 1 ? "s" : ""} reported:
                </h3>
                <ul className="tw-list-none">
                  {dependencies.map((d, i) => {
                    return (
                      <li>
                        <Conflict key={i} index={i} dependency={d} setConflict={setActiveConflict} />
                      </li>
                    );
                  })}
                </ul>
              </div>
            ) : diff ? (
              <div id="no-dependencies">
                <p>No conflicts were found during the analysis</p>
              </div>
            ) : null}

            {diff ? (
              <div id="content-container" className="tw-w-full">
                {graphData && <GraphView data={graphData} />}
                <DiffView diff={diff} modifiedLines={modifiedLines} filesFromBase={filesFromBase} />
              </div>
            ) : (
              <div id="no-analysis" className="tw-mb-3">
                <p>The analysis results were not found...</p>
                <p>Please try again soon. If the problem persists, please contact support.</p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
