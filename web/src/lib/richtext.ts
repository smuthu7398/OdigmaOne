// Post-processes sanitized rich-text HTML at render time: every image is
// wrapped in a Basecamp-style card — hover reveals open + download actions,
// a caption bar shows the file name. Input is ALWAYS sanitized server-side
// before storage, so attribute values here are already escaped.

const OPEN_ICON =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6"/><path d="M10 14 21 3"/><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/></svg>';

const DOWNLOAD_ICON =
  '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>';

const CLIP_ICON =
  '<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>';

export function decorateRichText(html: string): string {
  // uploaded-file links (zip, pdf, …) become attachment chips with a
  // forced download — before image handling so we never touch the
  // action links that the image step generates
  const withFileChips = html.replace(
    /<a\b([^>]*href="(\/api\/v1\/files\/[^"?]+)"[^>]*)>([\s\S]*?)<\/a>/g,
    (_match, _attrs: string, href: string, label: string) =>
      `<a class="rt-file" href="${href}?download=1" title="Download">${CLIP_ICON}<span>${label}</span>${DOWNLOAD_ICON}</a>`
  );

  return withFileChips.replace(/<img\b([^>]*?)\/?>/g, (match, attrs: string) => {
    const src = /src="([^"]+)"/.exec(attrs)?.[1];
    if (!src) return match;
    const alt = /alt="([^"]*)"/.exec(attrs)?.[1] || "image";
    const downloadHref = src.includes("?")
      ? `${src}&download=1`
      : `${src}?download=1`;

    return (
      `<figure class="rt-image">` +
      `<span class="rt-image-actions">` +
      `<a href="${src}" target="_blank" rel="noopener noreferrer" title="Open full size" aria-label="Open full size">${OPEN_ICON}</a>` +
      `<a href="${downloadHref}" title="Download" aria-label="Download">${DOWNLOAD_ICON}</a>` +
      `</span>` +
      `<img src="${src}" alt="${alt}" loading="lazy" />` +
      `<figcaption>${alt}</figcaption>` +
      `</figure>`
    );
  });
}
