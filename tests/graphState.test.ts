import { GraphState, CytoscapeNode, CytoscapeEdge } from '../src/components/D3NodeLink/services/GraphServices';

describe('GraphState computeDelta', () => {
  const nodes: CytoscapeNode[] = [
    { data: { id: 'A', visible: true } },
    { data: { id: 'B', visible: false } },
    { data: { id: 'C', visible: true } },
  ];
  const edges: CytoscapeEdge[] = [
    { data: { id: 'e1', source: 'A', target: 'B', visible: false } },
    { data: { id: 'e2', source: 'B', target: 'C', visible: false } },
    { data: { id: 'e3', source: 'A', target: 'C', visible: true } },
  ];
  const adjacency = { A: ['B', 'C'], B: ['C'], C: [] };
  const revAdj = { B: ['A'], C: ['A', 'B'] };

  const state = new GraphState(nodes, edges, adjacency, revAdj);

  it('expands children when hidden', () => {
    const delta = state.computeDelta('A', 'children');
    expect(delta.nodesToShow).toEqual(['B']);
    expect(delta.edgesToShow).toContain('e1');
  });

  it('collapses when all children visible', () => {
    // first apply expansion
    state.applyDelta(state.computeDelta('A', 'children'));
    const delta = state.computeDelta('A', 'children');
    expect(delta.edgesToHide).toContain('e1');
    expect(delta.nodesToHide).toEqual([]);
  });
});
