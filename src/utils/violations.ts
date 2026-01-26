import { INumberViolationsPerNodeMap, INumberViolationsPerNodeValue } from '../types';
import store from '../components/Store/Store';

const UUID_SUFFIX_REGEX = /_[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const EMPTY_COUNTS: INumberViolationsPerNodeValue = {
  violations: 0,
  selected: 0,
  cumulativeViolations: 0,
  cumulativeSelected: 0,
};

export const getNormalizedNodeId = (nodeId: string): string => nodeId.replace(UUID_SUFFIX_REGEX, '');

const getNumberViolationsPerNodeMap = (overrideMap?: INumberViolationsPerNodeMap): INumberViolationsPerNodeMap | undefined => {
  if (overrideMap) {
    return overrideMap;
  }

  return store.getState().combined.numberViolationsPerNode;
};

export const getViolationCountsForNode = (nodeId: string, overrideMap?: INumberViolationsPerNodeMap): INumberViolationsPerNodeValue => {
  const numberViolationsPerNode = getNumberViolationsPerNodeMap(overrideMap);
  if (!numberViolationsPerNode) {
    return EMPTY_COUNTS;
  }

  const normalizedId = getNormalizedNodeId(nodeId);
  return numberViolationsPerNode[nodeId] ?? numberViolationsPerNode[normalizedId] ?? EMPTY_COUNTS;
};

export const getTotalViolationsForNode = (nodeId: string, overrideMap?: INumberViolationsPerNodeMap): number => {
  return getViolationCountsForNode(nodeId, overrideMap).violations;
};
