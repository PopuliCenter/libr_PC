/** Utilitas kecil untuk membangun XML OAI-PMH tanpa dependensi tambahan. */

export function xmlEscape(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/** Format datestamp OAI: YYYY-MM-DDThh:mm:ssZ (tanpa milidetik). */
export function oaiDate(date: Date): string {
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z');
}

export function tag(name: string, content: string, attrs = ''): string {
  return `<${name}${attrs ? ' ' + attrs : ''}>${content}</${name}>`;
}

export function envelope(
  baseUrl: string,
  verb: string | undefined,
  requestAttrs: Record<string, string | undefined>,
  body: string,
): string {
  const attrs = Object.entries(requestAttrs)
    .filter(([, v]) => v !== undefined)
    .map(([k, v]) => `${k}="${xmlEscape(v as string)}"`)
    .join(' ');
  return (
    `<?xml version="1.0" encoding="UTF-8"?>` +
    `<OAI-PMH xmlns="http://www.openarchives.org/OAI/2.0/"` +
    ` xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"` +
    ` xsi:schemaLocation="http://www.openarchives.org/OAI/2.0/ http://www.openarchives.org/OAI/2.0/OAI-PMH.xsd">` +
    tag('responseDate', oaiDate(new Date())) +
    tag('request', xmlEscape(baseUrl), attrs) +
    body +
    `</OAI-PMH>`
  );
}

export function errorBody(code: string, message: string): string {
  return tag('error', xmlEscape(message), `code="${code}"`);
}
