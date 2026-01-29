import { INumberViolationsPerNodeMap, INumberViolationsPerNodeValue } from '../types';

type ViolationStateProvider = () => { combined: { numberViolationsPerNode: INumberViolationsPerNodeMap } };

const UUID_SUFFIX_REGEX = /_[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;

const EMPTY_COUNTS: INumberViolationsPerNodeValue = {
  violations: 0,
  selected: 0,
  cumulativeViolations: 0,
  cumulativeSelected: 0,
};

const computeMaxCumulativeViolations = (numberViolationsPerNode?: INumberViolationsPerNodeMap): number => {
  if (!numberViolationsPerNode) {
    return 0;
  }

  return Object.values(numberViolationsPerNode).reduce((maxValue, { cumulativeViolations }) => {
    return Math.max(maxValue, cumulativeViolations ?? 0);
  }, 0);
};

let cachedNumberViolationsPerNode: INumberViolationsPerNodeMap | undefined;
let maxCumulativeViolations = 0;
let violationStateProvider: ViolationStateProvider | null = null;

export const setViolationStateProvider = (provider: ViolationStateProvider): void => {
  violationStateProvider = provider;
};

const updateMaxCumulativeViolations = (numberViolationsPerNode?: INumberViolationsPerNodeMap) => {
  if (numberViolationsPerNode === cachedNumberViolationsPerNode) {
    return;
  }

  cachedNumberViolationsPerNode = numberViolationsPerNode;
  maxCumulativeViolations = computeMaxCumulativeViolations(numberViolationsPerNode);
};

export const getNormalizedNodeId = (nodeId: string): string => nodeId.replace(UUID_SUFFIX_REGEX, '');

const getNumberViolationsPerNodeMap = (overrideMap?: INumberViolationsPerNodeMap): INumberViolationsPerNodeMap | undefined => {
  if (overrideMap) {
    return overrideMap;
  }

  return violationStateProvider?.().combined.numberViolationsPerNode;
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

export const getMaxCumulativeViolations = (overrideMap?: INumberViolationsPerNodeMap): number => {
  if (overrideMap) {
    return computeMaxCumulativeViolations(overrideMap);
  }

  const numberViolationsPerNode = violationStateProvider?.().combined.numberViolationsPerNode;
  if (!numberViolationsPerNode) {
    return 0;
  }
  updateMaxCumulativeViolations(numberViolationsPerNode);
  return maxCumulativeViolations;
};
