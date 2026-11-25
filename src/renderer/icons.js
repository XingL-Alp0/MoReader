const icon = (body) =>
  `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;

export const icons = {
  sun: icon(
    '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.42-1.42M17.66 6.34l1.41-1.41"/>'
  ),
  moon: icon('<path d="M20.5 14.2A8.5 8.5 0 0 1 9.8 3.5 8.5 8.5 0 1 0 20.5 14.2Z"/>'),
  keyboard: icon(
    '<rect x="2.5" y="5.5" width="19" height="13" rx="3"/><path d="M6.5 9h.01M9.5 9h.01M12.5 9h.01M15.5 9h.01M18 9h.01M8 12.5h.01M11 12.5h.01M14 12.5h.01M17 12.5h.01M7.5 16h9"/>'
  ),
  settings: icon(
    '<path d="M12 15.2a3.2 3.2 0 1 0 0-6.4 3.2 3.2 0 0 0 0 6.4Z"/><path d="M19.4 15a1.7 1.7 0 0 0 .34 1.88l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.88-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.11-1.55 1.7 1.7 0 0 0-1.88.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.64 8.9a1.7 1.7 0 0 0-.34-1.88l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.7 1.7 0 0 0 1.88.34H9a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.88-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.7 1.7 0 0 0-.34 1.88V9a1.7 1.7 0 0 0 1.55 1H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.55 1Z"/>'
  ),
  undo: icon('<path d="M9 7 4 12l5 5"/><path d="M4 12h9a6 6 0 0 1 6 6"/>'),
  redo: icon('<path d="m15 7 5 5-5 5"/><path d="M20 12h-9a6 6 0 0 0-6 6"/>'),
  folder: icon(
    '<path d="M3 7.5A2.5 2.5 0 0 1 5.5 5H9l2 2.2h7.5A2.5 2.5 0 0 1 21 9.7v7.8a2.5 2.5 0 0 1-2.5 2.5h-13A2.5 2.5 0 0 1 3 17.5Z"/>'
  ),
  "folder-open": icon(
    '<path d="M3 8V6.5A2.5 2.5 0 0 1 5.5 4H9l2 2.2h7.5A2.5 2.5 0 0 1 21 8.7"/><path d="M3.4 10h17.9a1 1 0 0 1 .95 1.32l-2.1 6.5A2.5 2.5 0 0 1 17.78 19H5.5A2.5 2.5 0 0 1 3 16.5V10Z"/>'
  ),
  "chevron-right": icon('<path d="m9 18 6-6-6-6"/>'),
  "chevron-down": icon('<path d="m6 9 6 6 6-6"/>'),
  search: icon('<circle cx="11" cy="11" r="6.5"/><path d="m16 16 4.4 4.4"/>'),
  panel: icon(
    '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M9.5 4v16M6 8h1M6 11h1"/>'
  ),
  book: icon(
    '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H11v17H6.5A2.5 2.5 0 0 0 4 22V5.5Z"/><path d="M20 5.5A2.5 2.5 0 0 0 17.5 3H13v17h4.5A2.5 2.5 0 0 1 20 22V5.5Z"/>'
  ),
  columns: icon(
    '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M12 4v16"/>'
  ),
  pencil: icon(
    '<path d="M14.5 5.5 18.5 9.5M4 20l1.2-5.2L16.4 3.6a2.1 2.1 0 0 1 3 0l1 1a2.1 2.1 0 0 1 0 3L9.2 18.8 4 20Z"/>'
  ),
  more: icon('<circle cx="5" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.2" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.2" fill="currentColor" stroke="none"/>'),
  bold: icon('<path d="M7 4h6.5a4 4 0 0 1 0 8H7V4ZM7 12h7.5a4 4 0 0 1 0 8H7v-8Z"/>'),
  italic: icon('<path d="M14.5 4h-4M13.5 20h-4M14 4 10 20"/>'),
  strike: icon('<path d="M5 12h14M16.5 7.2A5 5 0 0 0 12 4.5c-3 0-5 1.5-5 3.8 0 1.7 1.1 2.8 3.4 3.5M8 16.5c.9 1.8 2.5 3 4.8 3 2.9 0 4.7-1.4 4.7-3.6 0-1-.3-1.8-1-2.4"/>'),
  code: icon('<path d="m8 9-4 3 4 3M16 9l4 3-4 3M14 5l-4 14"/>'),
  link: icon(
    '<path d="M10 13.5a4 4 0 0 0 5.66 0l2.83-2.83a4 4 0 0 0-5.66-5.66L11.5 6.34"/><path d="M14 10.5a4 4 0 0 0-5.66 0l-2.83 2.83a4 4 0 0 0 5.66 5.66l1.33-1.33"/>'
  ),
  quote: icon(
    '<path d="M9.5 6.5H5.8A1.8 1.8 0 0 0 4 8.3v3.4A1.8 1.8 0 0 0 5.8 13.5h2.6A1.8 1.8 0 0 0 10.2 11.7V6.5ZM9.5 11.7c0 2.6-1 4.3-3 5.3M19.5 6.5h-3.7a1.8 1.8 0 0 0-1.8 1.8v3.4a1.8 1.8 0 0 0 1.8 1.8h2.6a1.8 1.8 0 0 0 1.8-1.8V6.5ZM19.5 11.7c0 2.6-1 4.3-3 5.3"/>'
  ),
  list: icon(
    '<path d="M9 6h12M9 12h12M9 18h12"/><circle cx="4" cy="6" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="12" r="1" fill="currentColor" stroke="none"/><circle cx="4" cy="18" r="1" fill="currentColor" stroke="none"/>'
  ),
  "list-ordered": icon(
    '<path d="M9 6h12M9 12h12M9 18h12M4 4v4M3 8h2M3.5 12.2c.3-.5 1.5-.6 1.5.4 0 .8-1.8 1.7-2 2.4h2M3.4 17.6c.3-.4 1.5-.5 1.5.4 0 .6-.6.8-1 .9.4 0 1.2.2 1.2 1 0 1-1.4 1-1.8.6"/>'
  ),
  "check-square": icon(
    '<rect x="3.5" y="3.5" width="17" height="17" rx="3"/><path d="m8 12 2.7 2.7L16.5 9"/>'
  ),
  table: icon(
    '<rect x="3" y="4" width="18" height="16" rx="2.5"/><path d="M3 9.5h18M3 15h18M9 9.5V20M15 9.5V20"/>'
  ),
  minus: icon('<path d="M5 12h14"/>'),
  plus: icon('<path d="M12 5v14M5 12h14"/>'),
  plug: icon(
    '<path d="M9 3v5M15 3v5"/><path d="M7 8h10v3.5a5 5 0 0 1-10 0V8Z"/><path d="M12 16.5V21"/>'
  ),
  save: icon(
    '<path d="M5 3.5h11l3.5 3.5v13a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1Z"/><path d="M8 3.5V8h7V3.5M8 21v-6.5h8V21"/>'
  ),
  clock: icon('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.2 2"/>'),
  "arrow-up-right": icon('<path d="M7 17 17 7M8 7h9v9"/>'),
  "file-check": icon(
    '<path d="M13.5 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8.5L13.5 3Z"/><path d="M13.5 3v5.5H19M8.5 14.2l2.2 2.2 4.8-4.8"/>'
  ),
  file: icon(
    '<path d="M13.5 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8.5L13.5 3Z"/><path d="M13.5 3v5.5H19"/>'
  ),
  "file-down": icon(
    '<path d="M13.5 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8.5L13.5 3Z"/><path d="M13.5 3v5.5H19M12 11.5V17M9.5 14.5 12 17l2.5-2.5"/>'
  ),
  "file-code": icon(
    '<path d="M13.5 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8.5L13.5 3Z"/><path d="M13.5 3v5.5H19M10 12.5 8 15l2 2.5M14 12.5 16 15l-2 2.5"/>'
  ),
  "file-text": icon(
    '<path d="M13.5 3H6.5A1.5 1.5 0 0 0 5 4.5v15A1.5 1.5 0 0 0 6.5 21h11a1.5 1.5 0 0 0 1.5-1.5V8.5L13.5 3Z"/><path d="M13.5 3v5.5H19M8.5 12h7M8.5 15.5h7M8.5 19h4"/>'
  ),
  x: icon('<path d="M6 6l12 12M18 6 6 18"/>'),
  printer: icon(
    '<path d="M7 8V3h10v5M7 17H5a2 2 0 0 1-2-2v-4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v4a2 2 0 0 1-2 2h-2"/><rect x="7" y="14" width="10" height="7" rx="1"/><circle cx="17.5" cy="11.5" r=".8" fill="currentColor" stroke="none"/>'
  ),
  refresh: icon(
    '<path d="M20 11a8 8 0 1 0-2.2 6.6M20 4v7h-7"/>'
  ),
  copy: icon(
    '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V6a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h2"/>'
  ),
  alert: icon('<path d="M12 3 2.8 19a1.5 1.5 0 0 0 1.3 2h15.8a1.5 1.5 0 0 0 1.3-2L12 3Z"/><path d="M12 9v4.5M12 17h.01"/>'),
  sync: icon(
    '<path d="M20 11a8 8 0 0 0-14.3-4.9L4 8M4 4v4h4M4 13a8 8 0 0 0 14.3 4.9L20 16M20 20v-4h-4"/>'
  ),
  eyedropper: icon(
    '<path d="m14.5 5.5 4 4M13 7l3.5-3.5a2.1 2.1 0 0 1 3 3L16 10M4 20l1-4.5L15.5 5M4 20l4.5-1L19 8.5"/>'
  ),
  check: icon('<path d="m5 12.5 4.5 4.5L19 6.5"/>'),
  palette: icon(
    '<path d="M12 3a9 9 0 0 0 0 18h1.2a1.8 1.8 0 0 0 0-3.6h-.7a1.7 1.7 0 0 1 0-3.4H15a6 6 0 0 0 0-12h-3Z"/><circle cx="7.6" cy="10.2" r="1" fill="currentColor" stroke="none"/><circle cx="10" cy="6.8" r="1" fill="currentColor" stroke="none"/><circle cx="14" cy="6.5" r="1" fill="currentColor" stroke="none"/><circle cx="7.8" cy="14.2" r="1" fill="currentColor" stroke="none"/>'
  ),
  sparkles: icon(
    '<path d="M12 3.5c.6 4.7 2.2 6.3 7 7-4.8.7-6.4 2.3-7 7-.6-4.7-2.2-6.3-7-7 4.8-.7 6.4-2.3 7-7ZM19 15.5c.3 2.5 1.1 3.3 3.5 3.5-2.4.3-3.2 1.1-3.5 3.5-.3-2.4-1.1-3.2-3.5-3.5 2.4-.2 3.2-1 3.5-3.5Z"/>'
  ),
  sticker: icon(
    '<path d="M4 12a8 8 0 1 1 16 0c0 4.4-3.6 8-8 8H8a4 4 0 0 1-4-4v-4Z"/><path d="M14.5 20c.3-3 2.5-5.2 5.5-5.5"/>'
  ),
  image: icon(
    '<rect x="3" y="4" width="18" height="16" rx="2.5"/><circle cx="8.5" cy="9.5" r="1.6"/><path d="m4 17 4.5-4.5 3.5 3 3-2.5L20 17"/>'
  ),
  wand: icon(
    '<path d="m4 20 10.5-10.5M15 3v3M21 9h-3M18.5 5.5l-2 2M20 13.5l-1.5 1.5M10.5 3.5 9.5 5"/><path d="m13 11 2 2"/>'
  ),
  play: icon('<path d="M8 5.5v13l10-6.5-10-6.5Z"/>'),
  share: icon('<path d="M12 3v12M8 7l4-4 4 4"/><path d="M5 12.5v6A1.5 1.5 0 0 0 6.5 20h11a1.5 1.5 0 0 0 1.5-1.5v-6"/>'),
  download: icon('<path d="M12 3.5v11M8 11l4 4 4-4M4.5 17.5v1.6A1.4 1.4 0 0 0 5.9 20.5h12.2a1.4 1.4 0 0 0 1.4-1.4v-1.6"/>'),
  sigma: icon('<path d="M18 5H7l6 7-6 7h11M16 16.5h4"/>'),
  home: icon('<path d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-4.5v-6h-5v6H5a1 1 0 0 1-1-1v-9.5Z"/>')
};

export function hydrateIcons(root = document) {
  root.querySelectorAll("[data-icon]").forEach((node) => {
    const name = node.getAttribute("data-icon");
    const markup = icons[name];
    if (markup) node.innerHTML = markup;
  });
}
