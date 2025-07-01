import React from 'react';
import ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { useNodeVisibility } from '../src/components/D3NodeLink/hooks/useNodeVisibility';

interface NodeData {
  data: { id: string; label: string; visible: boolean };
}
interface EdgeData {
  data: { id: string; source: string; target: string; label?: string; visible: boolean };
}

describe('hover preview logic', () => {
  it('only creates addition preview when child edge is hidden', () => {
    const cyDataNodes: NodeData[] = [
      { data: { id: 'A', label: 'A', visible: true } },
      { data: { id: 'B', label: 'B', visible: true } },
    ];
    const cyDataEdges: EdgeData[] = [
      { data: { id: 'e1', source: 'A', target: 'B', label: 'e1', visible: true } },
    ];

    const adjacencyRef = { current: { A: ['B'], B: [] } } as any;
    const revAdjRef = { current: { B: ['A'], A: [] } } as any;
    const hiddenNodesRef = { current: new Set<string>() };
    const hiddenEdgesRef = { current: new Set<string>(['e1']) };
    const originRef = { current: {} };

    let computeExpansion: any;
    function Test() {
      const hooks = useNodeVisibility(
        cyDataNodes as any,
        cyDataEdges as any,
        adjacencyRef,
        revAdjRef,
        hiddenNodesRef,
        hiddenEdgesRef,
        originRef,
        () => {}
      );
      computeExpansion = hooks.computeExpansion;
      return null;
    }

    const div = document.createElement('div');
    act(() => {
      ReactDOM.render(<Test />, div);
    });

    const { nodeIds, edges } = computeExpansion('A', 'children');
    const edgesToAdd = edges.filter((e: any) => hiddenEdgesRef.current.has(e.id));
    const edgesToRemove = edges.filter((e: any) => !hiddenEdgesRef.current.has(e.id));

    expect(nodeIds.length).toBe(0);
    expect(edgesToAdd.length).toBe(1);
    expect(edgesToRemove.length).toBe(0);
  });
});
