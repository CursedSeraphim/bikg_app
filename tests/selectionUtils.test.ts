import { deriveSelectionsFromViolations } from '../src/components/Store/selectionUtils';

describe('deriveSelectionsFromViolations', () => {
  it('collects focus nodes from initial violations and adds related metadata without expanding new violations', () => {
    const violationMap = {
      v1: { nodes: ['n1', 'n2'] },
      v2: { nodes: ['n3'] },
    };
    const focusNodeMap = {
      n1: { types: ['t1'], exemplars: ['e1'], violations: ['v2'] },
      n2: { types: ['t2'], exemplars: [], violations: [] },
      n3: { types: ['t3'], exemplars: ['e2'], violations: [] },
    };

    const result = deriveSelectionsFromViolations(['v1'], violationMap, focusNodeMap);

    expect(result.selectedNodes.sort()).toEqual(['n1', 'n2'].sort());
    expect(result.selectedTypes.sort()).toEqual(['t1', 't2'].sort());
    expect(result.selectedViolationExemplars.sort()).toEqual(['e1'].sort());
    expect(result.selectedViolations.sort()).toEqual(['v1', 'v2'].sort());
  });
});
