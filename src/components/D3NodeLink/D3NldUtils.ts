// File: src/components/D3NodeLink/D3NldUtils.ts

/**
 * Extracts the namespace prefix from a URI-like string (e.g. "ex:SomeNode" → "ex").
 */
export function extractNamespace(uri: string): string {
  const match = uri.match(/^([^:]+):/);
  return match ? match[1] : '';
}

/**
 * Computes a color based on the namespace prefix.
 * - "sh" → #669900
 * - "ex" → #DA5700
 * - otherwise → #007C45
 */
export function computeColorForId(id: string): string {
  const ns = extractNamespace(id).toLowerCase();
  if (ns === 'sh') {
    return '#669900';
  }
  if (ns === 'ex') {
    return '#DA5700';
  }
  return '#007C45';
}
