import { dependency } from "../../models/AnalysisOutput";

interface ConflictProps {
  index: number;
  dependency: dependency;
  setConflict: (index: number) => void;
  isActive: boolean;
}

type locationStrings = {
  from: string;
  to: string;
};

export default function Conflict({ index, dependency, setConflict, isActive }: ConflictProps) {
  const getDependencyDisplayName = (dep: dependency): string => {
    if (dep.type.startsWith("CONFLUENCE")) {
      return "Confluence Flow";
    }

    if (dep.type.startsWith("OA")) {
      return "Overriding Assignment";
    }

    // Legacy SVFA/CONFLICT events are Data Flow dependencies.
    if (dep.type.startsWith("DF") || dep.type === "CONFLICT" || dep.label.toUpperCase().includes("SVFA")) {
      return "Data Flow";
    }

    return dep.label;
  };

  const getLocationStrings: (dep: dependency) => locationStrings = (dep: dependency) => {
    const nodes = dep.body.interference;

    if (dep.type.startsWith("CONFLICT") || dep.type.startsWith("DF")) {
      const sources = nodes.filter((n) => n.type.toLowerCase().includes("source"));
      const sinks = nodes.filter((n) => n.type.toLowerCase().includes("sink"));
      const sourceNode = sources.find((n) => n.location.line >= 0) ?? sources[0] ?? nodes[0];
      const sinkNode = [...sinks].reverse().find((n) => n.location.line >= 0) ?? sinks[sinks.length - 1] ?? nodes[nodes.length - 1];

      return {
        from: `${sourceNode.location.class}:${sourceNode.location.line}`,
        to: `${sinkNode.location.class}:${sinkNode.location.line}`
      };
    }

    if (dep.type.startsWith("CONFLUENCE")) {
      const sourceOne = nodes.find((n) => n.type === "source1") ?? nodes[0];
      const sourceTwo = nodes.find((n) => n.type === "source2") ?? nodes[nodes.length - 1];
      return {
        from: `${sourceOne.location.class}:${sourceOne.location.line}`,
        to: `${sourceTwo.location.class}:${sourceTwo.location.line}`
      };
    }

    const first = nodes.find((n) => n.location.line >= 0) ?? nodes[0];
    const last = [...nodes].reverse().find((n) => n.location.line >= 0) ?? nodes[nodes.length - 1];

    return {
      from: `${first.location.class}:${first.location.line}`,
      to: `${last.location.class}:${last.location.line}`
    };
  };

  const locationStrings = getLocationStrings(dependency);
  const fullLocationText = `in ${locationStrings.from} → ${locationStrings.to}`;
  
  const handleClick = () => {
    setConflict(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div
      className={`tw-cursor-pointer tw-w-full tw-rounded dependency-item ${isActive ? "dependency-item--active" : ""}`}
      aria-selected={isActive}
      onClick={handleClick}>
      <span>
        {getDependencyDisplayName(dependency)}
      </span>
      
      <p
        className="tw-text-gray-400"
        title={fullLocationText}
        style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
      {fullLocationText}
      </p>
    </div>
  );
}