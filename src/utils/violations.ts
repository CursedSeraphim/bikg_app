import store from '../components/Store/Store';
import { INumberViolationsPerNodeMap, INumberViolationsPerNodeValue } from '../types';
import { computeMaxCumulativeViolations, getNormalizedNodeId, getViolationCountsForNodeFromMap } from './violationsCore';

let cachedNumberViolationsPerNode: INumberViolationsPerNodeMap | undefined;
let maxCumulativeViolations = 0;

const updateMaxCumulativeViolations = (numberViolationsPerNode?: INumberViolationsPerNodeMap) => {
  if (numberViolationsPerNode === cachedNumberViolationsPerNode) return;
  cachedNumberViolationsPerNode = numberViolationsPerNode;
  maxCumulativeViolations = computeMaxCumulativeViolations(numberViolationsPerNode);
};

const getNumberViolationsPerNodeMap = (overrideMap?: INumberViolationsPerNodeMap): INumberViolationsPerNodeMap | undefined => {
  if (overrideMap) return overrideMap;
  return store.getState().combined.numberViolationsPerNode;
};

export { getNormalizedNodeId };

export const getViolationCountsForNode = (nodeId: string, overrideMap?: INumberViolationsPerNodeMap): INumberViolationsPerNodeValue => {
  const numberViolationsPerNode = getNumberViolationsPerNodeMap(overrideMap);
  return getViolationCountsForNodeFromMap(nodeId, numberViolationsPerNode);
};

export const getTotalViolationsForNode = (nodeId: string, overrideMap?: INumberViolationsPerNodeMap): number => {
  return getViolationCountsForNode(nodeId, overrideMap).violations;
};

export const getMaxCumulativeViolations = (overrideMap?: INumberViolationsPerNodeMap): number => {
  if (overrideMap) return computeMaxCumulativeViolations(overrideMap);

  const { numberViolationsPerNode } = store.getState().combined;
  updateMaxCumulativeViolations(numberViolationsPerNode);
  return maxCumulativeViolations;
};
