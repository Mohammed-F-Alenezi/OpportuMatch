"use client";

import { useEffect, useRef } from "react";

/** Datawrapper iframe
 * - autoResize: true = let DW set pixel height via postMessage (default)
 * - autoResize: false = use parent’s fixed height (our case for a compact hero)
 */
export default function Datawrapper({
  id,
  version = 1,
  className = "",
  title,
  transparent = true,
  dark = "auto",
  autoResize = true,
}: {
  id: string;
  version?: number;
  className?: string;
  title?: string;
  transparent?: boolean;
  dark?: "auto" | "true" | "false";
  autoResize?: boolean;
}) {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);

  const src = `https://datawrapper.dwcdn.net/${id}/${version}/?${[
    transparent ? "transparent=true" : "",
    dark ? `dark=${dark}` : "",
  ]
    .filter(Boolean)
    .join("&")}`;

  useEffect(() => {
    if (!autoResize) return;
    const onMessage = (e: MessageEvent) => {
      const payload = (e?.data as any)?.["datawrapper-height"];
      if (!payload || !iframeRef.current) return;
      Object.entries(payload).forEach(([key, height]) => {
        if (
          iframeRef.current &&
          iframeRef.current.contentWindow &&
          (iframeRef.current as any).dataset.dw === key
        ) {
          iframeRef.current.style.height = `${height}px`;
        }
      });
    };
    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [autoResize]);

  return (
    <div className={className}>
      <iframe
        ref={iframeRef}
        data-dw={id}
        title={title || "Datawrapper chart"}
        src={src}
        // If autoResize=false, parent controls height (h-full). If true, DW sets pixel height.
        style={{
          width: "100%",
          border: 0,
          display: "block",
          ...(autoResize ? {} : { height: "100%" }),
        }}
        loading="lazy"
        scrolling="no"
        referrerPolicy="no-referrer-when-downgrade"
        allow="clipboard-write; fullscreen"
      />
      <noscript>
        <a href={`https://datawrapper.dwcdn.net/${id}/${version}/`}>Open chart</a>
      </noscript>
    </div>
  );
}
