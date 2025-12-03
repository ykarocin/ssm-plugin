import { Probot, Context } from "probot";
import { exec } from "child_process";
import fs from "fs";
import path from "path";
import util from "util";
import "dotenv/config";
import { v4 as uuidv4 } from "uuid";
import { IAnalysisOutput, dependency } from "../models/AnalysisOutput";
import { filterDuplicatedDependencies } from "../util/dependency";
import AnalysisService from "../services/analysisService";
import { PerformanceObserver } from "perf_hooks";
import RepoService from "../services/repoService";
import SettingsService from "../services/settingsService";
import { ISettingsData } from "../models/SettingsData";
const pexec = util.promisify(exec);

const repo = "";
const owner = "";
const left = "";
const right = "";

export default async () => {
    // Clone the repository
    if (fs.existsSync(repo)) fs.rmSync(repo, { recursive: true, force: true });
    await pexec(`git clone https://github.com/${owner}/${repo}`);
    process.chdir(repo);

    // Get the merge base of the parents
    let { stdout: merge_base } = await pexec(`git merge-base ${left} ${right}`);
    merge_base = merge_base.trim();

    // Create a real merge commit on the local repository
    await pexec(`git checkout ${left}`);
    await pexec(`git merge ${right}`);
    const merge_commit = (await pexec(`git rev-parse HEAD`)).stdout.trim();

    // Execute the two-dott diff between the base commit and the merge commit
    const { stdout: diffOutput } = await pexec(`git diff ${merge_base} ${merge_commit} -U10000`);

          if (process.env.APP_ENV === "development") {
        // Copy the outputs to the data directory
        fs.mkdirSync(`../src/data/reports/${repo}/`, { recursive: true });
        fs.copyFileSync("out.txt", `../src/data/reports/${repo}/out.txt`);
        fs.copyFileSync("out.json", `../src/data/reports/${repo}/out.json`);
        fs.copyFileSync("./data/soot-results.csv", `../src/data/reports/${repo}/soot-results.csv`);
      }

      // get the JSON output
      let jsonOutput = JSON.parse(fs.readFileSync(`out.json`, "utf-8")) as dependency[];

      // adjust the paths of the files in the JSON output
      jsonOutput.forEach((dependency) => {
        dependency.body.interference.forEach((interference) => {
          // Get the path of the Java file
          let javaFilePath = interference.location.class.replace(/\./g, "/") + ".java";
          javaFilePath = searchFile(".", javaFilePath, true) ?? "UNKNOWN";

          // Set the path of the Java file
          interference.location.file = javaFilePath;
        });
      });

      // filter the duplicated dependencies
      jsonOutput = filterDuplicatedDependencies(jsonOutput);

      // Get the modified lines for each branch
      // Search for the modified-lines.txt file
      const modifiedLinesFile = searchFile("./files/project", "modified-lines.txt", true);

      // Get the modified methods from the file
      let modifiedLines = [];
      if (modifiedLinesFile) {
        const sections = fs.readFileSync(modifiedLinesFile, "utf-8").split("\n\n");

        for (let section of sections) {
          const lines = section.split("\n").map((line) => line.substring(line.indexOf(":") + 1).trim());
          if (lines.length < 5) {
            continue;
          }

          const className = lines[0];
          const fileName = className.split(".").pop() + ".java";
          modifiedLines.push({
            file: fileName,
            leftAdded: JSON.parse(lines[1]),
            leftRemoved: JSON.parse(lines[2]),
            rightAdded: JSON.parse(lines[3]),
            rightRemoved: JSON.parse(lines[4])
          });
        }
      }

      // search for all related files for each conflict
      let allFiles: string[] = [];
      jsonOutput.forEach((dependency) => {
        dependency.body.interference.forEach((interference) => {
          interference.stackTrace?.forEach((node) => {
            // get the java file from the class name
            let javaFilePath: string | null = node.class.replace(/\./g, "/") + ".java";

            // search for the file in the project directory
            javaFilePath = searchFile(".", javaFilePath, true);

            if (javaFilePath && !allFiles.includes(javaFilePath)) {
              // add the file to the list of files
              allFiles.push(javaFilePath);
            }
          });
        });
      });

      // remove related files that are already on the diff
      const diffFiles = diffOutput.split("\n").filter((line) => line.startsWith("diff --git a/"));
      const missingFilesPaths = allFiles.filter((file) => {
        return !diffFiles.some((diffFile) => diffFile.includes(file));
      });

      // get the missing files content
      const missingFiles: { file: string; content: string }[] = [];
      missingFilesPaths.forEach((file) => {
        const fileContent = fs.readFileSync(file, "utf-8");
        missingFiles.push({ file: file, content: fileContent });
      });      
      
    }


function searchFile(source: string, filePath: string, recursive: boolean = false): string | null {
  // Check if the file exists in the source directory
  const searchPath = path.join(source, filePath);
  if (fs.existsSync(searchPath)) return searchPath.replace(/\\/g, "/");
  if (!recursive) return null;

  // Get the subdirectories of the source directory
  try {
    const dirs = fs
      .readdirSync(source, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    // Search the file in the subdirectories
    for (let dir of dirs) {
      const result = searchFile(path.join(source, dir), filePath, true);
      if (result) return result.replace(/\\/g, "/");
    }
  } catch (error) {
    return null;
  }
  return null;
}