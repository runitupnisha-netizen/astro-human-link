import { ReactNode } from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

/**
 * Inline tap-to-define term. Renders a subtly underlined word; tap/hover
 * surfaces the definition. Used liberally across Blueprint sub-screens so
 * every technical term ("square", "projector", "master number", etc.) is
 * one tap from a plain-English definition.
 */
const TermTooltip = ({ term, definition, children }: { term?: string; definition: string; children?: ReactNode }) => (
  <TooltipProvider delayDuration={150}>
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="underline decoration-dotted decoration-accent/60 underline-offset-4 text-foreground hover:text-accent transition-colors"
        >
          {children ?? term}
        </button>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-[260px] text-xs leading-relaxed">
        {definition}
      </TooltipContent>
    </Tooltip>
  </TooltipProvider>
);

export default TermTooltip;