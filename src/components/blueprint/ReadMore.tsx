import { useRef, useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

interface ReadMoreProps {
  text: string;
  /** Number of characters shown when collapsed. Defaults to 260. */
  collapsedChars?: number;
  /** Tailwind classes for the paragraph. */
  className?: string;
}

/**
 * Collapses long descriptive paragraphs behind a "Read more" affordance so
 * Blueprint deep-detail screens don't open with walls of text. If the text is
 * already shorter than the threshold, it just renders inline.
 */
const ReadMore = ({
  text,
  collapsedChars = 260,
  className = "text-sm text-foreground/90 leading-relaxed font-serif whitespace-pre-line",
}: ReadMoreProps) => {
  const [expanded, setExpanded] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const needsTruncation = text.length > collapsedChars;

  if (!needsTruncation) {
    return <p className={className}>{text}</p>;
  }

  // Cut at a sentence/word boundary near the threshold for a nicer preview.
  let cutIndex = text.lastIndexOf(". ", collapsedChars);
  if (cutIndex < collapsedChars * 0.6) cutIndex = text.lastIndexOf(" ", collapsedChars);
  if (cutIndex < 0) cutIndex = collapsedChars;
  const preview = text.slice(0, cutIndex).trimEnd();

  const handleToggle = () => {
    const willCollapse = expanded;
    setExpanded((v) => !v);
    if (willCollapse) {
      requestAnimationFrame(() => {
        rootRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    }
  };

  return (
    <div ref={rootRef} className="scroll-mt-24">
      <p className={className}>
        {expanded ? text : `${preview}…`}
      </p>
      <button
        type="button"
        onClick={handleToggle}
        className="mt-2 inline-flex items-center gap-1 text-xs font-medium text-accent hover:text-accent/80 min-h-[44px] -mx-1 px-1"
        aria-expanded={expanded}
      >
        {expanded ? (
          <>
            Show less <ChevronUp className="w-3.5 h-3.5" />
          </>
        ) : (
          <>
            Read more <ChevronDown className="w-3.5 h-3.5" />
          </>
        )}
      </button>
    </div>
  );
};

export default ReadMore;