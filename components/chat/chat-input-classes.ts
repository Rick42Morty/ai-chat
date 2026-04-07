import { cn } from "@/lib/utils";

/** Shared textarea styles: optical vertical center for placeholder + caret (line box matches row height). */
export function chatComposerTextareaClassName(extra?: string) {
  return cn(
    "min-h-11 max-h-[200px] flex-1 resize-none overflow-y-auto border-0 bg-transparent px-0 shadow-none",
    "box-border py-[10px] text-sm leading-6 [field-sizing:content]",
    "font-sans text-foreground caret-foreground placeholder:text-muted-foreground",
    "focus-visible:ring-0 focus-visible:outline-none",
    extra,
  );
}
