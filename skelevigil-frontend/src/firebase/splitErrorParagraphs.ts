/** Split auth UI messages on blank lines into a headline + optional body. */
export function splitErrorParagraphs(message: string): { primary: string; detail?: string } {
  const chunks = message
    .split(/\n\n/)
    .map((c) => c.trim())
    .filter(Boolean);
  if (chunks.length >= 2) {
    return { primary: chunks[0], detail: chunks.slice(1).join('\n\n') };
  }
  return { primary: message.trim() };
}
