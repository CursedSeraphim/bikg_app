import { computeAssociationTargets } from '../src/components/D3NodeLink/utils/associationTargets';
import { getAssociatedHoverPreviewTargets } from '../src/components/D3NodeLink/utils/associatedHoverPreview';

describe('ctrl+shift expansion behavior', () => {
  it('previews and expands associated nodes when hidden nodes are available', () => {
    const cyDataNodes = [
      { data: { id: 'v1', visible: true, label: 'Violation' } },
      { data: { id: 'n1', visible: false, label: 'Node' } },
      { data: { id: 't1', visible: true, label: 'Type' } },
    ];
    const cyDataEdges = [
      { data: { id: 'e-v1-n1', source: 'v1', target: 'n1', label: 'edge1' } },
      { data: { id: 'e-v1-t1', source: 'v1', target: 't1', label: 'edge2' } },
    ];

    const selectionScope = {
      idsToSelect: new Set(['v1', 'n1', 't1']),
      visibleEdgeIds: new Set(['e-v1-n1', 'e-v1-t1']),
    };

    const hoverPreview = getAssociatedHoverPreviewTargets({
      selectionScope,
      cyDataNodes,
      cyDataEdges,
      hiddenNodes: new Set(),
      isLabelBlacklisted: () => false,
      isIdBlacklisted: () => false,
    });

    expect(hoverPreview.nodeIds).toEqual(['n1']);
    expect(hoverPreview.edges.map((edge) => edge.id).sort()).toEqual(['e-v1-n1', 'e-v1-t1'].sort());

    const expansion = computeAssociationTargets({
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
      focusNodeMap: {},
      typeMap: {},
      exemplarMap: {},
      violationTypesMap: {},
      typesViolationMap: {},
    });

    expect(expansion.nodeIds).toEqual(['n1']);
    expect(expansion.edges.map((edge) => edge.id).sort()).toEqual(['e-v1-n1', 'e-v1-t1'].sort());
  });
});
