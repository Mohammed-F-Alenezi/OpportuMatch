"use client";

/**
 * Datawrapper iframe embed (official pattern with version slug).
 * Example usage: <Datawrapper id="aCJEg" version={1} className="h-60 w-full" />
 */
export default function Datawrapper({
  id,
  version = 1,
  className = "",
  title,
  transparent = true,
  dark = "auto",
}: {
  id: string;            // chart id, e.g. "aCJEg"
  version?: number;      // published version number from DW (default 1)
  className?: string;    // parent controls width/height
  title?: string;        // a11y
  transparent?: boolean; // lets parent bg show through
  dark?: "auto" | "true" | "false";
}) {
  // Official embed URL: https://datawrapper.dwcdn.net/<id>/<version>/?<options>
  const src = `https://datawrapper.dwcdn.net/${id}/${version}/?${[
    transparent ? "transparent=true" : "",
    dark ? `dark=${dark}` : "",
  ]
    .filter(Boolean)
    .join("&")}`;

  return (
    <div className={className}>
      <iframe
        title={title || "Datawrapper chart"}
        src={src}
        style={{ width: "100%", height: "100%", border: 0 }}
        loading="lazy"
        scrolling="no"
        referrerPolicy="no-referrer-when-downgrade"
        // optional: allow fullscreen/clipboard on some DW widgets
        allow="clipboard-write; fullscreen"
        // note: we provide explicit height via parent; DW also posts resize messages if you want to listen.
      />
      {/* Fallback small link (useful if something blocks iframes) */}
      <noscript>
        <a href={`https://datawrapper.dwcdn.net/${id}/${version}/`}>
          Open chart
        </a>
      </noscript>
    </div>
  );
}
