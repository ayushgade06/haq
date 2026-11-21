"use client";

import { useEffect, useId } from "react";

// Mermaid is loaded from a pinned CDN build on this page only (no npm dependency). Without JS the
// diagram source still shows.
const SRC = "https://cdn.jsdelivr.net/npm/mermaid@11.4.1/dist/mermaid.esm.min.mjs";

export function Mermaid({ chart, label }: { chart: string; label: string }) {
  const id = useId().replace(/:/g, "");
  useEffect(() => {
    const dark = matchMedia("(prefers-color-scheme: dark)").matches;
    const s = document.createElement("script");
    s.type = "module";
    s.textContent = `import m from "${SRC}";
m.initialize({ startOnLoad: false, theme: "base", fontFamily: "Inter, sans-serif",
  themeVariables: ${JSON.stringify(
    dark
      ? { primaryColor: "#22264d", primaryTextColor: "#e8eaf7", primaryBorderColor: "#aeb0ff", lineColor: "#a6abcb", secondaryColor: "#151937", tertiaryColor: "#0d0f22", clusterBkg: "#151937", clusterBorder: "#2b2f5c", fontSize: "15px" }
      : { primaryColor: "#e8e9f4", primaryTextColor: "#15173a", primaryBorderColor: "#2d2a8f", lineColor: "#535877", secondaryColor: "#ffffff", tertiaryColor: "#f4f5fa", clusterBkg: "#ffffff", clusterBorder: "#d9dbe9", fontSize: "15px" },
  )} });
await m.run({ querySelector: "#m-${id}" });`;
    document.body.appendChild(s);
    return () => s.remove();
  }, [id]);
  return (
    <figure className="overflow-x-auto rounded-2xl border bg-card p-4 sm:p-6">
      <pre id={`m-${id}`} className="mermaid min-w-[36rem] text-[0.8rem] text-muted-foreground">
        {chart}
      </pre>
      <figcaption className="mt-2 text-[0.8rem] text-muted-foreground">{label}</figcaption>
    </figure>
  );
}
