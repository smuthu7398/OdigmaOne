import sanitizeHtml from "sanitize-html";

/** Whitelist sanitizer for rich-text fields (task descriptions).
 *  Applied server-side on every write — user HTML never reaches the DB raw. */
export function sanitizeRichText(html: string): string {
  return sanitizeHtml(html, {
    allowedTags: [
      "p", "br", "strong", "b", "em", "i", "u", "s",
      "h1", "h2", "h3",
      "ul", "ol", "li",
      "a", "img",
      "code", "pre", "blockquote", "hr",
    ],
    allowedAttributes: {
      a: ["href", "target", "rel"],
      img: ["src", "alt", "title"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    // our uploaded screenshots use relative /api/v1/files/<id> URLs
    allowProtocolRelative: false,
    transformTags: {
      a: sanitizeHtml.simpleTransform("a", {
        target: "_blank",
        rel: "noopener noreferrer",
      }),
    },
  });
}
