import katex from "katex";

export function splitFormulas(text: string) {
  const pattern = /(\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\\([\s\S]*?\\\)|(?<!\\)\$[^$\n]+?\$)/g;
  return text.split(pattern).filter(Boolean).map((part) => {
    const display = part.startsWith("$$") || part.startsWith("\\[");
    const math = display || part.startsWith("\\(") || part.startsWith("$");
    return { text: math ? part.slice(display || part.startsWith("\\(") ? 2 : 1, display || part.startsWith("\\(") ? -2 : -1) : part, math, display };
  });
}

export function renderFormula(text: string, display: boolean) {
  return katex.renderToString(text, { displayMode: display, throwOnError: false, trust: false, strict: "ignore", maxExpand: 1000 });
}