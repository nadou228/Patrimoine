/**
 * Extrait l'IUP d'un payload QR : JSON BiensPage, URL API, ou IUP brut.
 */
export function parseQrPayload(raw: string): string {
  const cleaned = raw.trim();
  if (!cleaned) return '';

  if (cleaned.startsWith('{')) {
    try {
      const obj = JSON.parse(cleaned);
      if (obj.iup) return String(obj.iup).trim();
    } catch {
      // not JSON
    }
  }

  const urlMatch = cleaned.match(/\/(?:scan|iup|qr)\/([^/?#]+)/i);
  if (urlMatch?.[1]) return urlMatch[1].trim();

  if (cleaned.includes('/')) {
    const parts = cleaned.split('/');
    return parts[parts.length - 1].trim();
  }

  return cleaned;
}

export function matchBienByPayload<T extends { id: number; iup: string }>(
  biens: T[],
  raw: string
): T | undefined {
  const iup = parseQrPayload(raw);
  if (!iup) return undefined;

  let matched = biens.find(b => b.iup === iup || iup.includes(b.iup) || b.iup.includes(iup));
  if (!matched) {
    const idNum = parseInt(iup, 10);
    if (!isNaN(idNum)) matched = biens.find(b => b.id === idNum);
  }
  return matched;
}
