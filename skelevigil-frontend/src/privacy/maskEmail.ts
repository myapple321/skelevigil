/**
 * Masks the local part as first char + **** + last char before @ (e.g. sue@x.com → s****e@x.com).
 */
export function maskEmailAddress(email: string): string {
  const trimmed = email.trim();
  const at = trimmed.indexOf('@');
  if (at <= 0) return '****';
  const local = trimmed.slice(0, at);
  const domain = trimmed.slice(at + 1);
  if (!domain) return '****';
  if (local.length <= 1) return `****@${domain}`;
  return `${local[0]}****${local[local.length - 1]}@${domain}`;
}
