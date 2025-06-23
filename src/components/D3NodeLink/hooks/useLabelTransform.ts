export const EXEMPLAR_TERM = 'Exemplar';
export const GROUP_TERM = 'Group';

/**
 * Hook that provides helper functions to map node and edge labels before
 * rendering. Labels are kept unchanged elsewhere.
 */
export function useLabelTransform() {
  const mapNodeLabel = (label: string): string => {
    const regex = new RegExp(`_${EXEMPLAR_TERM.toLowerCase()}_(\\d+)$`, 'i');
    return label.replace(regex, `_${GROUP_TERM.toLowerCase()}_$1`);
  };

  const mapEdgeLabel = (label: string): string => {
    const regex = new RegExp(`has${EXEMPLAR_TERM}$`, 'i');
    return label.replace(regex, `has${GROUP_TERM}`);
  };

  return { mapNodeLabel, mapEdgeLabel };
}
