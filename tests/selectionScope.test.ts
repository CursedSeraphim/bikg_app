import { computeSelectionScope } from '../src/components/D3NodeLink/utils/selectionScope';

describe('computeSelectionScope', () => {
  it('expands violation selections to related nodes/types/exemplars and edges', () => {
    const cyDataEdges = [
      { data: { id: 'e-v1-n1', source: 'v1', target: 'n1' } },
      { data: { id: 'e-v1-n2', source: 'v1', target: 'n2' } },
      { data: { id: 'e-v1-t1', source: 'v1', target: 't1' } },
      { data: { id: 'e-v1-t2', source: 'v1', target: 't2' } },
      { data: { id: 'e-t1-n3', source: 't1', target: 'n3' } },
    ];

    const { idsToSelect, visibleEdgeIds } = computeSelectionScope({
      selectedFocusNodes: ['n1', 'n2'],
      selectedTypeIds: ['t1', 't2'],
      selectedViolationIds: ['v1'],
      selectedExemplarIds: [],
      focusNodeMap: {},
      typeMap: {
        t1: { nodes: ['n3'], violations: [], exemplars: [] },
        t2: { nodes: [], violations: [], exemplars: [] },
      },
      violationMap: {
        v1: { nodes: ['n1', 'n2'], types: ['t1', 't2'], exemplars: [] },
      },
      exemplarMap: {},
      violationTypesMap: {},
      typesViolationMap: {},
      cyDataEdges,
    });

    expect(Array.from(idsToSelect).sort()).toEqual(['v1', 'n1', 'n2', 't1', 't2', 'n3'].sort());
    expect(Array.from(visibleEdgeIds).sort()).toEqual(['e-v1-n1', 'e-v1-n2', 'e-v1-t1', 'e-v1-t2', 'e-t1-n3'].sort());
  });
});
