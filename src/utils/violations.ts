import { INumberViolationsPerNodeMap, INumberViolationsPerNodeValue } from '../types';

const UUID_SUFFIX_REGEX = /_[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const EMPTY_COUNTS: INumberViolationsPerNodeValue = {
  violations: 0,
  selected: 0,
  cumulativeViolations: 0,
  cumulativeSelected: 0,
};

export const getNormalizedNodeId = (nodeId: string): string => nodeId.replace(UUID_SUFFIX_REGEX, '');

export const getViolationCountsForNode = (
  nodeId: string,
  numberViolationsPerNode?: INumberViolationsPerNodeMap,
): INumberViolationsPerNodeValue => {
  if (!numberViolationsPerNode) {
    return EMPTY_COUNTS;
  }

  const normalizedId = getNormalizedNodeId(nodeId);
  return numberViolationsPerNode[nodeId] ?? numberViolationsPerNode[normalizedId] ?? EMPTY_COUNTS;
};

export const getTotalViolationsForNode = (nodeId: string, numberViolationsPerNode?: INumberViolationsPerNodeMap): number => {
  return getViolationCountsForNode(nodeId, numberViolationsPerNode).violations;
};
