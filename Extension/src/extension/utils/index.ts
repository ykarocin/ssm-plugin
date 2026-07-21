import { modLine } from "models/AnalysisOutput";
import { Node } from "@extension/components/Graph/Node";

/** Append ".java" to a file name if it does not already end with it. */
const ensureJavaExtension = (fileName: string): string => {
  if (fileName.endsWith(".java")) {
    return fileName;
  }
  return fileName + ".java";
};

/**
 * Extract the class name from a Java file path (the final path segment without the
 * ".java" extension). For non-".java" inputs, returns just the last path segment.
 */
const getClassFromJavaFilename = (filename: string): string | undefined => {
  if (!filename.endsWith(".java")) return filename.split("/").pop();
  return filename
    .substring(0, filename.length - 5)
    .split("/")
    .pop();
};

/**
 * Extract a bare method name from a fully-qualified Java method signature, returning it
 * with trailing "()" (e.g. "void com.Foo.bar" -> "bar()").
 */
const getMethodNameFromJavaMethod = (methodName: string): string | undefined => {
  const result = methodName.split(" ").pop()?.replace(">", "").trim();
  return result?.endsWith(")") ? result : `${result}()`;
};

/**
 * Return true if any of the given nodes falls on a line the left branch added or removed,
 * matching nodes to modified lines by class name and highlighted line number.
 */
const isLineFromLeft = (lines: Node[], modlines: modLine[]): boolean => {
  return lines.some((line) =>
    modlines.some(
      (modLine) =>
        getClassFromJavaFilename(modLine.file) === getClassFromJavaFilename(line.fileName) &&
        (modLine.leftAdded.includes(line.numberHighlight) || modLine.leftRemoved.includes(line.numberHighlight))
    )
  );
};

/** Shallow-compare two arrays for equal length and element-wise strict equality. */
function areArraysEqual(arr1: any[], arr2: any[]) {
  return arr1.length === arr2.length && arr1.every((value, index) => value === arr2[index]);
}

export { getClassFromJavaFilename, getMethodNameFromJavaMethod, isLineFromLeft, areArraysEqual, ensureJavaExtension };