"use client";

import { useMemo } from "react";

/** Font <link> tags are stored alongside the CSS behind this marker so an
 *  extracted component still loads its typeface on its own. */
const FONT_MARKER = "\n<!--fonts-->\n";

export function buildDoc(html: string, css: string) {
  const [fontLinks, styles] = css.includes(FONT_MARKER) ? css.split(FONT_MARKER) : ["", css];
  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
${fontLinks}
<style>${styles}</style></head><body>${html}</body></html>`;
}

export function ComponentFrame({
  html,
  css,
  title,
  className,
}: {
  html: string;
  css: string;
  title: string;
  className?: string;
}) {
  const doc = useMemo(() => buildDoc(html, css), [html, css]);
  return (
    <iframe
      srcDoc={doc}
      sandbox="allow-scripts"
      title={title}
      loading="lazy"
      className={className ?? "h-full w-full border-0 bg-white"}
    />
  );
}
