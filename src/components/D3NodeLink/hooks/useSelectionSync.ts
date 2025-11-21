import type { MutableRefObject } from 'react';
import { useEffect } from 'react';
import { IFocusNodeMap } from '../D3NldTypes';

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

    const idsToSelect = new Set<string>();
    const addIds = (values?: Iterable<string>) => {
      if (!values) return;
      for (const value of values) {
        if (value) {
          idsToSelect.add(value);
        }
      }
    };

    addIds(selectedFocusNodes);
    addIds(selectedTypeIds);
    addIds(selectedViolationIds);
    addIds(selectedExemplarIds);

    selectedFocusNodes.forEach((focusId) => {
      const entry = focusNodeMap[focusId];
      if (!entry) return;
      addIds(entry.types);
      addIds(entry.violations);
      addIds(entry.exemplars);
    });

    selectedTypeIds.forEach((typeId) => {
      const entry = typeMap[typeId];
      if (entry) {
        addIds(entry.nodes);
        addIds(entry.violations);
        addIds(entry.exemplars);
      }
      addIds(typesViolationMap[typeId]);
    });

    selectedViolationIds.forEach((violationId) => {
      const entry = violationMap[violationId];
      if (entry) {
        addIds(entry.nodes);
        addIds(entry.types);
        addIds(entry.exemplars);
      }
      addIds(violationTypesMap[violationId]);
    });

    selectedExemplarIds.forEach((exemplarId) => {
      const entry = exemplarMap[exemplarId];
      if (!entry) return;
      addIds(entry.nodes);
      addIds(entry.types);
      addIds(entry.violations);
    });

    const selectedEdgeIds = new Set<string>();
    cyDataEdges.forEach((edge) => {
      const sourceId = edge.data.source;
      const targetId = edge.data.target;
      if (idsToSelect.has(sourceId) && idsToSelect.has(targetId)) {
        selectedEdgeIds.add(edge.data.id);
      }
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
      const shouldSelect = selectedEdgeIds.has(edge.data.id);
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
