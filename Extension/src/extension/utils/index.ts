import { modLine } from "models/AnalysisOutput";
import { Node } from "@extension/components/Graph/Node";

const getClassFromJavaFilename = (filename: string): string | undefined => {
  if (!filename.endsWith(".java")) return filename.split("/").pop();
  return filename
    .substring(0, filename.length - 5)
    .split("/")
    .pop();
};

const getMethodNameFromJavaMethod = (methodName: string): string | undefined => {
  const result = methodName.split(" ").pop()?.replace(">", "").trim();
  return result?.endsWith(")") ? result : `${result}()`;
};

const isLineFromLeft = (lines: Node[], modlines: modLine[]): boolean => {
  return lines.some((line) =>
    modlines.some(
      (modLine) =>
        getClassFromJavaFilename(modLine.file) === getClassFromJavaFilename(line.fileName) &&
        (modLine.leftAdded.includes(line.numberHighlight) || modLine.leftRemoved.includes(line.numberHighlight))
    )
  );
};

export { getClassFromJavaFilename, getMethodNameFromJavaMethod, isLineFromLeft };