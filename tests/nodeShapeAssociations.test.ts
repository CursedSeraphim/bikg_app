import { buildNodeShapeViolationMap, getFocusNodesForNodeShape } from '../src/components/D3NodeLink/utils/nodeShapeAssociations';

describe('getFocusNodesForNodeShape', () => {
  it('collects violating focus nodes for property shapes linked to a node shape', () => {
    const violationTypesMap = {
      v1: ['ns1', 't1'],
      v2: ['ns1'],
      v3: ['ns2'],
    };
    const violationMap = {
      v1: { nodes: ['n1', 'n2'] },
      v2: { nodes: ['n2', 'n3'] },
      v3: { nodes: ['n4'] },
    };

    const nodeShapeViolationMap = buildNodeShapeViolationMap(violationTypesMap);
    const result = getFocusNodesForNodeShape('ns1', nodeShapeViolationMap, violationMap);

    expect(result.violationIds.sort()).toEqual(['v1', 'v2'].sort());
    expect(result.focusNodeIds.sort()).toEqual(['n1', 'n2', 'n3'].sort());
  });
});
