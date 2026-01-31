import { computeAssociationTargets } from '../src/components/D3NodeLink/utils/associationTargets';

const baseMaps = {
  focusNodeMap: {},
  typeMap: {},
  exemplarMap: {},
  violationTypesMap: {},
  typesViolationMap: {},
};

describe('computeAssociationTargets', () => {
  it('returns edges for visible associated nodes so expansion can include relationships', () => {
    const cyDataNodes = [
      { data: { id: 'v1', visible: true, label: 'Violation' } },
      { data: { id: 'n1', visible: true, label: 'Node' } },
      { data: { id: 't1', visible: true, label: 'Type' } },
      { data: { id: 'e1', visible: true, label: 'Exemplar' } },
    ];
    const cyDataEdges = [
      { data: { id: 'e-v1-n1', source: 'v1', target: 'n1', label: 'edge1' } },
      { data: { id: 'e-v1-t1', source: 'v1', target: 't1', label: 'edge2' } },
      { data: { id: 'e-v1-e1', source: 'v1', target: 'e1', label: 'edge3' } },
    ];

    const result = computeAssociationTargets({
      nodeId: 'v1',
      violationMap: {
        v1: { nodes: ['n1'], types: ['t1'], exemplars: ['e1'] },
      },
      cyDataNodes,
      cyDataEdges,
      hiddenNodes: new Set(),
      hiddenEdges: new Set(),
      isLabelBlacklisted: () => false,
      isIdBlacklisted: () => false,
      ...baseMaps,
    });

    expect(result.nodeIds).toEqual([]);
    const edgeIds = result.edges.map((edge) => edge.id).sort();
    expect(edgeIds).toEqual(['e-v1-e1', 'e-v1-n1', 'e-v1-t1'].sort());
  });

  it('includes hidden associated nodes and their edges when expanding', () => {
    const cyDataNodes = [
      { data: { id: 'v1', visible: true, label: 'Violation' } },
      { data: { id: 'n1', visible: false, label: 'Node' } },
      { data: { id: 't1', visible: true, label: 'Type' } },
    ];
    const cyDataEdges = [
      { data: { id: 'e-v1-n1', source: 'v1', target: 'n1', label: 'edge1' } },
      { data: { id: 'e-v1-t1', source: 'v1', target: 't1', label: 'edge2' } },
    ];

    const result = computeAssociationTargets({
      nodeId: 'v1',
      violationMap: {
        v1: { nodes: ['n1'], types: ['t1'], exemplars: [] },
      },
      cyDataNodes,
      cyDataEdges,
      hiddenNodes: new Set(),
      hiddenEdges: new Set(),
      isLabelBlacklisted: () => false,
      isIdBlacklisted: () => false,
      ...baseMaps,
    });

    expect(result.nodeIds).toEqual(['n1']);
    expect(result.edges.map((edge) => edge.id).sort()).toEqual(['e-v1-n1', 'e-v1-t1'].sort());
  });
});
