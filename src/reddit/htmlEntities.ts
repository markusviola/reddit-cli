const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
};

const ENTITY_PATTERN = /&(#\d+|#x[0-9a-fA-F]+|[a-zA-Z]+);/g;

// Reddit's title/selftext/comment-body fields arrive HTML-escaped
// (e.g. "&gt;" for ">"). Decodes named and numeric entities so the
// TUI renders the real characters instead of raw entity codes.
export function decodeHtmlEntities(text: string): string {
  return text.replace(ENTITY_PATTERN, (match, entity: string) => {
    const lower = entity.toLowerCase();
    if (lower.startsWith('#x')) {
      const codePoint = Number.parseInt(lower.slice(2), 16);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    if (lower.startsWith('#')) {
      const codePoint = Number.parseInt(lower.slice(1), 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }
    return NAMED_ENTITIES[lower] ?? match;
  });
}
