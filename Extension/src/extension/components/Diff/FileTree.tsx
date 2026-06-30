import { useState, useEffect } from "react";
import { parse as parseDiff } from "diff2html";

type ChangeType = "added" | "deleted" | "modified" | "renamed";

type FileEntry = {
  path: string;
  href: string;
  addedLines: number;
  deletedLines: number;
  changeType: ChangeType;
};

type TreeNode = {
  name: string;
  isFile: boolean;
  href?: string;
  addedLines?: number;
  deletedLines?: number;
  changeType?: ChangeType;
  children: Map<string, TreeNode>;
};

function buildTree(files: FileEntry[]): TreeNode {
  const root: TreeNode = { name: "", isFile: false, children: new Map() };

  for (const file of files) {
    const parts = file.path.split("/");
    let node = root;

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i];
      const isLast = i === parts.length - 1;

      if (!node.children.has(part)) {
        node.children.set(part, {
          name: part,
          isFile: isLast,
          ...(isLast && {
            href: file.href,
            addedLines: file.addedLines,
            deletedLines: file.deletedLines,
            changeType: file.changeType,
          }),
          children: new Map(),
        });
      }

      node = node.children.get(part)!;
    }
  }

  return root;
}

interface TreeNodeViewProps {
  node: TreeNode;
  depth: number;
}

function TreeNodeView({ node, depth }: TreeNodeViewProps) {
  const [expanded, setExpanded] = useState(true);
  const indent = depth * 12;

  if (node.isFile) {
    return (
      <div className="ft-row" style={{ paddingLeft: `${indent + 16}px` }}>
        <svg className="ft-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          <path d="M2 1.75C2 .784 2.784 0 3.75 0h6.586c.464 0 .909.184 1.237.513l2.914 2.914c.329.328.513.773.513 1.237v9.586A1.75 1.75 0 0 1 13.25 16h-9.5A1.75 1.75 0 0 1 2 14.25Zm1.75-.25a.25.25 0 0 0-.25.25v12.5c0 .138.112.25.25.25h9.5a.25.25 0 0 0 .25-.25V6h-2.75A1.75 1.75 0 0 1 8.75 4.25V1.5Zm6.75.062V4.25c0 .138.112.25.25.25h2.688Z" />
        </svg>
        <a
          className="ft-label ft-filename"
          href={node.href}
          onClick={e => {
            e.preventDefault();
            if (node.href) {
              document.querySelector(node.href)?.scrollIntoView({ behavior: "smooth", block: "center" });
            }
          }}
        >
          {node.name}
        </a>
        {((node.addedLines ?? 0) > 0 || (node.deletedLines ?? 0) > 0) && (
          <span className="ft-stats">
            {(node.addedLines ?? 0) > 0 && <span className="ft-added">+{node.addedLines}</span>}
            {(node.deletedLines ?? 0) > 0 && <span className="ft-deleted">-{node.deletedLines}</span>}
          </span>
        )}
      </div>
    );
  }

  // Collapse single-child directory chains (e.g. src/main/java/org → one row)
  let displayName = node.name;
  let kids = [...node.children.values()];
  while (kids.length === 1 && !kids[0].isFile) {
    displayName = `${displayName}/${kids[0].name}`;
    kids = [...kids[0].children.values()];
  }

  return (
    <>
      <div
        className="ft-row ft-dir-row"
        style={{ paddingLeft: `${indent}px` }}
        onClick={() => setExpanded(e => !e)}
        role="button"
      >
        <span className="ft-chevron">{expanded ? "▾" : "▸"}</span>
        <svg className="ft-icon ft-dir-icon" width="16" height="16" viewBox="0 0 16 16" fill="currentColor">
          {expanded ? (
            <path d="M.513 1.513A1.75 1.75 0 0 1 1.75 1h3.5c.55 0 1.05.26 1.373.687L7.773 3H14.25c.966 0 1.75.784 1.75 1.75v8.5A1.75 1.75 0 0 1 14.25 15H1.75A1.75 1.75 0 0 1 0 13.25V2.75c0-.464.184-.91.513-1.237Z" />
          ) : (
            <path d="M1.75 1A1.75 1.75 0 0 0 0 2.75v10.5C0 14.216.784 15 1.75 15h12.5A1.75 1.75 0 0 0 16 13.25v-8.5A1.75 1.75 0 0 0 14.25 3H7.5a.25.25 0 0 1-.2-.1l-.9-1.2C6.07 1.26 5.55 1 5 1Z" />
          )}
        </svg>
        <span className="ft-label ft-dirname">{displayName}</span>
      </div>
      {expanded && kids.map(child => (
        <TreeNodeView key={child.name} node={child} depth={depth + 1} />
      ))}
    </>
  );
}

interface FileTreeProps {
  diff: string;
}

export default function FileTree({ diff }: FileTreeProps) {
  const [fileCount, setFileCount] = useState(0);
  const [tree, setTree] = useState<TreeNode | null>(null);

  useEffect(() => {
    if (!diff) return;

    const parsed = parseDiff(diff);

    // Read anchors from the rendered d2h file wrappers
    setTimeout(() => {
      const anchorMap = new Map<string, string>();
      document.querySelectorAll<HTMLElement>(".d2h-file-wrapper").forEach(el => {
        const id = el.id;
        const name = el.querySelector(".d2h-file-name")?.textContent?.trim() || "";
        if (id && name) anchorMap.set(name, `#${id}`);
      });

      const entries: FileEntry[] = parsed.map(f => {
        const path = f.newName !== "/dev/null" ? f.newName : f.oldName;
        const changeType: ChangeType = f.isNew ? "added" : f.isDeleted ? "deleted" : f.isRename ? "renamed" : "modified";
        return {
          path,
          href: anchorMap.get(path) || "",
          addedLines: f.addedLines,
          deletedLines: f.deletedLines,
          changeType,
        };
      });

      setFileCount(entries.length);
      setTree(buildTree(entries));
    }, 100);
  }, [diff]);

  if (!tree || fileCount === 0) return null;

  return (
    <div className="file-tree">
      <div className="ft-header">
        <span className="ft-title">Files changed ({fileCount})</span>
      </div>
      <div className="ft-body">
        {[...tree.children.values()].map(child => (
          <TreeNodeView key={child.name} node={child} depth={0} />
        ))}
      </div>
    </div>
  );
}
