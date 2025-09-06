"use client";

import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeHighlight from "rehype-highlight";

// NOTE: If Next.js warns about CSS imports, add a theme in your global CSS instead, e.g.:
// @import "highlight.js/styles/github-dark.css";

export default function MarkdownBubble({ text, rtl = true }: { text: string; rtl?: boolean }) {
  return (
    <div
      dir={rtl ? "rtl" : "auto"}
      className="markdown-bubble"
      style={{ maxWidth: "68ch", lineHeight: "1.75" }}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeHighlight]}
        components={{
          a: ({ node, ...props }) => (
            <a {...props} target="_blank" rel="noreferrer" style={{ textDecoration: "underline" }} />
          ),
          pre: ({ children }) => (
            <pre
              dir="ltr"
              style={{
                padding: "12px",
                borderRadius: 12,
                overflowX: "auto",
                border: "1px solid var(--border)",
                background: "color-mix(in oklab, var(--card) 94%, transparent)",
              }}
            >
              {children}
            </pre>
          ),
          code: ({ inline, className, children, ...props }) =>
            inline ? (
              <code
                {...props}
                className={className}
                style={{
                  padding: "2px 6px",
                  borderRadius: 6,
                  border: "1px solid var(--border)",
                  background: "color-mix(in oklab, var(--card) 92%, transparent)",
                }}
              >
                {children}
              </code>
            ) : (
              <code {...props} className={className}>
                {children}
              </code>
            ),
          ul: ({ children }) => <ul style={{ paddingInlineStart: 20, marginBlock: 8 }}>{children}</ul>,
          ol: ({ children }) => <ol style={{ paddingInlineStart: 22, marginBlock: 8 }}>{children}</ol>,
          table: ({ children }) => (
            <div style={{ overflowX: "auto" }}>
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  border: "1px solid var(--border)",
                }}
              >
                {children}
              </table>
            </div>
          ),
          th: ({ children }) => (
            <th style={{ textAlign: "start", padding: "6px 8px", borderBottom: "1px solid var(--border)" }}>
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td style={{ textAlign: "start", padding: "6px 8px", borderBottom: "1px solid var(--border)" }}>
              {children}
            </td>
          ),
        }}
      >
        {text}
      </ReactMarkdown>

      <style jsx>{`
        .markdown-bubble :global(h1) { font-size: 1.1rem; margin: 0.4rem 0; font-weight: 700; }
        .markdown-bubble :global(h2) { font-size: 1.05rem; margin: 0.35rem 0; font-weight: 700; }
        .markdown-bubble :global(h3) { font-size: 1rem;  margin: 0.30rem 0; font-weight: 700; }
        .markdown-bubble :global(p)  { margin: 0.35rem 0; }
        .markdown-bubble :global(li) { margin: 0.15rem 0; }
      `}</style>
    </div>
  );
}