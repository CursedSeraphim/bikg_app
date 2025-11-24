import type { ICsvData } from '../../types';

export const ORIGINAL_FOCUS_NODE_KEY = '__focus_node_original' as const;

/**
 * Row type used inside LineUp when focus nodes are present.
 * Keeps the hidden original focus_node id alongside ICsvData.
 */
export type FocusRow = ICsvData & {
  [ORIGINAL_FOCUS_NODE_KEY]?: string;
};

/**
 * Returns the canonical id for coordination.
 * Falls back to focus_node if the hidden original id is not present.
 */
export function getOriginalFocusNodeId(row: FocusRow): string {
  const original = (row as Record<string, unknown>)[ORIGINAL_FOCUS_NODE_KEY];
  if (typeof original === 'string') {
    return original;
  }
  if (typeof row.focus_node === 'string') {
    return row.focus_node;
  }
  return '';
}

/**
 * Temporary anonymization for figure creation:
 * Replace any substring "boehringer" (case-insensitive) with "anonymized".
 */
const ANON_RE = /boehringer/gi;

export function anonymizeString(text: string): string {
  return text.replace(ANON_RE, 'anonymized');
}

export const anonymizeLabel = (s: string) => anonymizeString(s);

/**
 * Removes a namespace prefix of the form "prefix:value"
 * unless the string looks like a full URI.
 */
export function removePrefix(text: string): string {
  if (text.includes('://')) {
    return text;
  }

  const colonIndex = text.indexOf(':');
  if (colonIndex !== -1) {
    return text.slice(colonIndex + 1).trim();
  }

  return text;
}

/**
 * Apply anonymization to all fields.
 * Keeps the original focus_node id in a dedicated hidden property and
 * uses an anonymized label for rendering.
 */
export function applyAnonymizationToCells(data: ICsvData[]): FocusRow[] {
  return data.map((row) => {
    const realId = typeof row.focus_node === 'string' ? row.focus_node : '';

    const copy: FocusRow = { ...row };

    // Attach the original id as a hidden property.
    const storageTarget = copy as Record<string, unknown>;
    Object.defineProperty(storageTarget, ORIGINAL_FOCUS_NODE_KEY, {
      value: realId,
      enumerable: false,
      configurable: true,
    });

    // Anonymize all visible fields except focus_node.
    const mutable = copy as Record<string, unknown>;
    Object.keys(mutable).forEach((k) => {
      if (k === 'focus_node') return;
      const v = mutable[k];
      if (typeof v === 'string') {
        mutable[k] = anonymizeString(v);
      } else if (Array.isArray(v)) {
        mutable[k] = (v as unknown[]).map((x) => (typeof x === 'string' ? anonymizeString(x) : x));
      }
    });

    // The rendered label for focus_node is anonymized.
    copy.focus_node = anonymizeLabel(realId);

    return copy;
  });
}

/**
 * Applies optional prefix stripping to the rendered label and other string fields,
 * while keeping the original focus_node id unchanged.
 */
export function applyPrefixToCells(data: FocusRow[], hide: boolean): FocusRow[] {
  return data.map((row) => {
    const originalId = getOriginalFocusNodeId(row);

    const transformed: FocusRow = { ...row };

    // Ensure the hidden original id is present on the transformed row.
    Object.defineProperty(transformed as Record<string, unknown>, ORIGINAL_FOCUS_NODE_KEY, {
      value: originalId,
      enumerable: false,
      configurable: true,
    });

    const currentLabel = typeof transformed.focus_node === 'string' ? transformed.focus_node : '';
    const rendered = hide ? removePrefix(currentLabel) : currentLabel;

    transformed.focus_node = rendered;

    // Apply prefix handling to all other string values.
    const mutable = transformed as Record<string, unknown>;
    Object.keys(mutable).forEach((k) => {
      if (k === 'focus_node') return;
      const val = mutable[k];
      if (typeof val === 'string') {
        mutable[k] = hide ? removePrefix(val) : val;
      }
    });

    return transformed;
  });
}
