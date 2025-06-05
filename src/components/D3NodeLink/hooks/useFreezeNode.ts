import { useCallback } from 'react';
import * as d3 from 'd3';
import { CanvasNode, CanvasEdge } from '../D3NldTypes';

export function useFreezeNode(
  simulationRef: React.MutableRefObject<d3.Simulation<CanvasNode, CanvasEdge> | null>,
  nodeMapRef: React.MutableRefObject<Record<string, CanvasNode>>,
) {
  return useCallback(
    (
      id: string,
      otherDuration = 500,
      triggerDuration = 1000,
      alphaTarget = 0.1,
    ) => {
      const sim = simulationRef.current;
      if (!sim) return;

      const allNodes = Object.values(nodeMapRef.current);
      allNodes.forEach((node) => {
        if (otherDuration > 0 || node.id === id) {
          node.fx = node.x;
          node.fy = node.y;
        }
      });

      sim.alphaTarget(alphaTarget).restart();

      if (otherDuration > 0) {
        setTimeout(() => {
          allNodes.forEach((node) => {
            if (node.id !== id) {
              node.fx = null;
              node.fy = null;
            }
          });
        }, otherDuration);
      }

      setTimeout(() => {
        const triggerNode = nodeMapRef.current[id];
        if (triggerNode) {
          triggerNode.fx = null;
          triggerNode.fy = null;
        }
        sim.alphaTarget(0);
      }, triggerDuration);
    },
    [simulationRef, nodeMapRef],
  );
}
