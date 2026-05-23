// Tiny safe-by-construction markdown renderer for evidence entries.
// Scope is intentionally narrow: bold, italic, inline code, links, and
// auto-linked URLs. Everything else is treated as plain text. No HTML
// passthrough — the input is escaped first so user-pasted angle brackets
// can never become tags.

const ESCAPE = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

function escapeHTML(s) {
  return String(s).replace(/[&<>"']/g, (c) => ESCAPE[c]);
}

function isSafeURL(url) {
  try {
    const u = new URL(url);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

function linkTag(href, label) {
  if (!isSafeURL(href)) return escapeHTML(label);
  return `<a href="${escapeHTML(href)}" target="_blank" rel="noopener noreferrer">${escapeHTML(label)}</a>`;
}

export function renderMarkdown(input) {
  if (!input) return "";
  let s = escapeHTML(input);

  // explicit links: [label](https://example.com)
  s = s.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_m, label, href) => {
    // labels and hrefs were already escaped; we want raw url in href, raw label in text
    const rawHref = href.replace(/&amp;/g, "&");
    const rawLabel = label.replace(/&amp;/g, "&");
    return linkTag(rawHref, rawLabel);
  });

  // auto-link bare URLs (don't double-link things already inside <a>)
  s = s.replace(/(^|[^"=>])(https?:\/\/[^\s<]+[^\s.,;:!?)<])/g, (m, prefix, url) => {
    const rawUrl = url.replace(/&amp;/g, "&");
    return prefix + linkTag(rawUrl, rawUrl);
  });

  // inline code
  s = s.replace(/`([^`\n]+)`/g, "<code>$1</code>");

  // bold then italic — order matters because ** matches before *
  s = s.replace(/\*\*([^*\n]+)\*\*/g, "<strong>$1</strong>");
  s = s.replace(/(^|[^*])\*([^*\n]+)\*/g, "$1<em>$2</em>");
  s = s.replace(/(^|[^_])_([^_\n]+)_/g, "$1<em>$2</em>");

  // preserve newlines
  s = s.replace(/\n/g, "<br>");

  return s;
}
