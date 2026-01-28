import { INumberViolationsPerNodeMap, INumberViolationsPerNodeValue } from '../types';

const UUID_SUFFIX_REGEX = /_[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

export const EMPTY_COUNTS: INumberViolationsPerNodeValue = {
  violations: 0,
  selected: 0,
  cumulativeViolations: 0,
  cumulativeSelected: 0,
};

export const getNormalizedNodeId = (nodeId: string): string => nodeId.replace(UUID_SUFFIX_REGEX, '');

export const getViolationCountsForNodeFromMap = (nodeId: string, numberViolationsPerNode?: INumberViolationsPerNodeMap): INumberViolationsPerNodeValue => {
  if (!numberViolationsPerNode) return EMPTY_COUNTS;

  const normalizedId = getNormalizedNodeId(nodeId);
  return numberViolationsPerNode[nodeId] ?? numberViolationsPerNode[normalizedId] ?? EMPTY_COUNTS;
};

export const computeMaxCumulativeViolations = (numberViolationsPerNode?: INumberViolationsPerNodeMap): number => {
  if (!numberViolationsPerNode) return 0;

  return Object.values(numberViolationsPerNode).reduce((maxValue, { cumulativeViolations }) => {
    return Math.max(maxValue, cumulativeViolations ?? 0);
  }, 0);
};
