import type { MutableRefObject } from 'react';
import { useEffect } from 'react';
import { IFocusNodeMap } from '../../../types';
import { computeSelectionScope } from '../utils/selectionScope';

interface UseSelectionSyncParams {
  loading: boolean;
  cyDataNodes: any[];
  cyDataEdges: any[];
  selectedFocusNodes: string[];
  selectedTypeIds: string[];
  selectedViolationIds: string[];
  selectedExemplarIds: string[];
  focusNodeMap: IFocusNodeMap;
  typeMap: any;
  violationMap: any;
  exemplarMap: any;
  violationTypesMap: Record<string, string[]>;
  typesViolationMap: Record<string, string[]>;
  hiddenNodesRef: MutableRefObject<Set<string>>;
  hiddenEdgesRef: MutableRefObject<Set<string>>;
  convertData: () => void;
}

export function useSelectionSync({
  loading,
  cyDataNodes,
  cyDataEdges,
  selectedFocusNodes,
  selectedTypeIds,
  selectedViolationIds,
  selectedExemplarIds,
  focusNodeMap,
  typeMap,
  violationMap,
  exemplarMap,
  violationTypesMap,
  typesViolationMap,
  hiddenNodesRef,
  hiddenEdgesRef,
  convertData,
}: UseSelectionSyncParams) {
  useEffect(() => {
    if (loading || cyDataNodes.length === 0) {
      return;
    }

    const { idsToSelect, visibleEdgeIds } = computeSelectionScope({
      selectedFocusNodes,
      selectedTypeIds,
      selectedViolationIds,
      selectedExemplarIds,
      focusNodeMap,
      typeMap,
      violationMap,
      exemplarMap,
      violationTypesMap,
      typesViolationMap,
      cyDataEdges,
    });

    let needsRefresh = false;

    cyDataNodes.forEach((node) => {
      const shouldSelect = idsToSelect.has(node.data.id);
      if (node.data.selected !== shouldSelect) {
        node.data.selected = shouldSelect;
        needsRefresh = true;
      }
      if (shouldSelect && node.data.visible === false) {
        node.data.visible = true;
        needsRefresh = true;
      }
      if (shouldSelect) {
        hiddenNodesRef.current.delete(node.data.id);
      }
    });

    cyDataEdges.forEach((edge) => {
      const shouldSelect = visibleEdgeIds.has(edge.data.id);
      if (edge.data.selected !== shouldSelect) {
        edge.data.selected = shouldSelect;
        needsRefresh = true;
      }
      if (shouldSelect && edge.data.visible === false) {
        edge.data.visible = true;
        needsRefresh = true;
      }
      if (shouldSelect) {
        hiddenEdgesRef.current.delete(edge.data.id);
      }
    });

    if (needsRefresh) {
      convertData();
    }
  }, [
    loading,
    cyDataNodes,
    cyDataEdges,
    selectedFocusNodes,
    selectedTypeIds,
    selectedViolationIds,
    selectedExemplarIds,
    focusNodeMap,
    typeMap,
    violationMap,
    exemplarMap,
    violationTypesMap,
    typesViolationMap,
    hiddenNodesRef,
    hiddenEdgesRef,
    convertData,
  ]);
}
