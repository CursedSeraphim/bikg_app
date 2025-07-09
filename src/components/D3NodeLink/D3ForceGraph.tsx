// File: src/components/D3NodeLink/D3ForceGraph.tsx

import * as d3 from 'd3';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  selectCumulativeNumberViolationsPerNode,
  selectD3BoundingBox,
  selectTypes,
  selectViolations,
  selectViolationMap,
  selectTypeMap,
  selectExemplarMap,
  selectFocusNodeMap,
} from '../Store/CombinedSlice';
import { useD3Data } from './useD3Data';

import { CanvasEdge, CanvasNode, D3NLDViewProps } from './D3NldTypes';
import { computeColorForId } from './D3NldUtils';
import store from '../Store/Store';
import useD3CumulativeCounts, { updateD3NodesGivenCounts } from './hooks/useD3CumulativeCounts';
import { useAdjacency } from './hooks/useAdjacency';
import { useCanvasDimensions } from './hooks/useCanvasDimensions';
import { useD3ContextMenu } from './hooks/useD3ContextMenu';
import { useD3Force } from './hooks/useD3Force';
import { useNodeVisibility } from './hooks/useNodeVisibility';
import { useD3ResetView } from './hooks/useD3ResetView';
import useExemplarHoverList from './hooks/useExemplarHoverList';
import { getNearNodeThreshold } from './hooks/hoverRadius';

/** Force‐directed graph view for the D3 based node‐link diagram. */
export default function D3ForceGraph({ rdfOntology, onLoaded, initialCentering = true }: D3NLDViewProps) {
  // Redux selectors
  const violations = useSelector(selectViolations);
  const types = useSelector(selectTypes);
  const cumulativeNumberViolationsPerType = useSelector(selectCumulativeNumberViolationsPerNode);
  const d3BoundingBox = useSelector(selectD3BoundingBox);
  const violationMap = useSelector(selectViolationMap);
  const typeMap = useSelector(selectTypeMap);
  const exemplarMap = useSelector(selectExemplarMap);
  const focusNodeMap = useSelector(selectFocusNodeMap);

  // Fetch Cytoscape‐like data used by the D3 view
  const { loading, cyDataNodes, cyDataEdges } = useD3Data({
    rdfOntology,
    violations,
    types,
    cumulativeNumberViolationsPerType,
    onLoaded,
  });

  const [d3Nodes, setD3Nodes] = useState<CanvasNode[]>([]);
  const [d3Edges, setD3Edges] = useState<CanvasEdge[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { dimensions } = useCanvasDimensions(canvasRef);
  const dpi = window.devicePixelRatio ?? 1;

  const [ghostNodes, setGhostNodes] = useState<CanvasNode[]>([]);
  const [ghostEdges, setGhostEdges] = useState<CanvasEdge[]>([]);
  const activePreviewRef = useRef<{ mode: 'children' | 'parents' | 'associated' | null; nodeId: string | null }>({
    mode: null,
    nodeId: null,
  });

  const { adjacencyRef, revAdjRef } = useAdjacency(cyDataEdges);

  const hiddenNodesRef = useRef<Set<string>>(new Set());
  const hiddenEdgesRef = useRef<Set<string>>(new Set());
  const originRef = useRef<Record<string, string | null>>({});
  const nodeMapRef = useRef<Record<string, CanvasNode>>({});
  const savedPositionsRef = useRef<Record<string, { x?: number; y?: number }>>({});

  const convertData = useCallback(() => {
    const visibleNodeData = cyDataNodes.filter((n) => n.data.visible && !hiddenNodesRef.current.has(n.data.id));
    const visibleIds = new Set(visibleNodeData.map((n) => n.data.id));

    const visibleEdgeData = cyDataEdges.filter((e) => e.data.visible && visibleIds.has(e.data.source) && visibleIds.has(e.data.target));

    const nextNodes: CanvasNode[] = [];

    visibleNodeData.forEach((n) => {
      const { id } = n.data;
      let node = nodeMapRef.current[id];
      if (!node) {
        const saved = savedPositionsRef.current[id];
        node = {
          id,
          label: n.data.label,
          color: computeColorForId(id),
          x: saved?.x,
          y: saved?.y,
        };
      } else {
        node.label = n.data.label;
        node.color = computeColorForId(id);
      }
      if (originRef.current[id] === undefined) {
        originRef.current[id] = null;
      }
      nodeMapRef.current[id] = node;
      nextNodes.push(node);
    });

    // Save positions for nodes that became hidden
    Object.keys(nodeMapRef.current).forEach((id) => {
      if (!visibleIds.has(id)) {
        const node = nodeMapRef.current[id];
        savedPositionsRef.current[id] = { x: node.x, y: node.y };
        delete nodeMapRef.current[id];
      }
    });

    const newEdges: CanvasEdge[] = visibleEdgeData.map((e) => ({
      source: e.data.source,
      target: e.data.target,
      label: e.data.label,
      visible: true,
    }));

    updateD3NodesGivenCounts(nextNodes, store.getState().combined.numberViolationsPerNode);
    setD3Nodes(nextNodes);
    setD3Edges(newEdges);
  }, [cyDataNodes, cyDataEdges]);

  useEffect(() => {
    if (!loading) {
      convertData();
    }
  }, [loading, convertData]);

  const { transformRef, simulationRef, zoomBehaviorRef, redraw } = useD3Force(
    canvasRef,
    [...d3Nodes, ...ghostNodes],
    [...d3Edges, ...ghostEdges],
    d3BoundingBox,
    dimensions,
    false,
    initialCentering,
  );

  useEffect(() => {
    redraw();
  }, [redraw, d3Nodes, d3Edges, ghostNodes, ghostEdges]);

  useD3CumulativeCounts(d3Nodes, setD3Nodes, redraw);

  const focusNodeTooltip = useExemplarHoverList(canvasRef, [...d3Nodes, ...ghostNodes], transformRef);

  const centerView = useCallback(() => {
    if (!zoomBehaviorRef.current || !canvasRef.current) return;

    const nodesToFit = [...d3Nodes, ...ghostNodes];
    if (nodesToFit.length === 0) return;

    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    nodesToFit.forEach((n) => {
      const x = n.x ?? 0;
      const y = n.y ?? 0;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    });

    const padding = 40;
    const boundsWidth = maxX - minX || 1;
    const boundsHeight = maxY - minY || 1;
    const scale = Math.min(dimensions.width / (boundsWidth + padding * 2), dimensions.height / (boundsHeight + padding * 2), 10);

    const cx = (minX + maxX) / 2;
    const cy = (minY + maxY) / 2;

    const transform = d3.zoomIdentity.translate(dimensions.width / 2 - scale * cx, dimensions.height / 2 - scale * cy).scale(scale);

    transformRef.current = transform;
    d3.select(canvasRef.current)
      .transition()
      .duration(300)
      .call(zoomBehaviorRef.current.transform, transform as any);
  }, [zoomBehaviorRef, canvasRef, d3Nodes, ghostNodes, dimensions, transformRef]);

  const { resetView } = useD3ResetView(cyDataNodes, cyDataEdges, hiddenNodesRef, hiddenEdgesRef, originRef, convertData);

  const { menu: contextMenu } = useD3ContextMenu(canvasRef, d3Nodes, transformRef, centerView, resetView);

  const { computeExpansion, showChildren, hideChildren, showParents, hideParents } = useNodeVisibility(
    cyDataNodes,
    cyDataEdges,
    adjacencyRef,
    revAdjRef,
    hiddenNodesRef,
    hiddenEdgesRef,
    originRef,
    convertData,
  );

  // Freeze nodes for a short period. By default, all currently visible nodes are
  // frozen for `otherDuration` milliseconds (500ms) while the triggering node
  // is frozen for `triggerDuration` milliseconds (1000ms). Passing `otherDuration`
  // as `0` skips freezing the other nodes. The `alphaTarget` parameter controls
  // the force simulation strength during the freeze.
  const freezeNode = useCallback(
    (id: string, otherDuration = 500, triggerDuration = 1000, alphaTarget = 0.1) => {
      const sim = simulationRef.current;
      if (!sim) return;

      const allNodes = Object.values(nodeMapRef.current);
      allNodes.forEach((node) => {
        if (otherDuration > 0 || node.id === id) {
          // eslint-disable-next-line no-param-reassign
          node.fx = node.x;
          // eslint-disable-next-line no-param-reassign
          node.fy = node.y;
        }
      });

      sim.alphaTarget(alphaTarget).restart();

      if (otherDuration > 0) {
        // Release other nodes after `otherDuration`
        setTimeout(() => {
          allNodes.forEach((node) => {
            if (node.id !== id) {
              // eslint-disable-next-line no-param-reassign
              node.fx = null;
              // eslint-disable-next-line no-param-reassign
              node.fy = null;
            }
          });
        }, otherDuration);
      }

      // Release the triggering node after `triggerDuration`
      setTimeout(() => {
        const triggerNode = nodeMapRef.current[id];
        if (triggerNode) {
          triggerNode.fx = null;
          triggerNode.fy = null;
        }
        sim.alphaTarget(0);
      }, triggerDuration);
    },
    [simulationRef],
  );

  const clearPreview = useCallback(() => {
    if (activePreviewRef.current.nodeId === null) {
      return;
    }
    setGhostNodes([]);
    setGhostEdges([]);
    // Reset any mutated edge references back to their id form so d3-force
    // rebinds them to the correct nodes next tick
    setD3Edges((edges) =>
      edges.map((e) => ({
        ...e,
        source: typeof e.source === 'object' ? e.source.id : e.source,
        target: typeof e.target === 'object' ? e.target.id : e.target,
      })),
    );
    Object.values(nodeMapRef.current).forEach((n) => {
      // eslint-disable-next-line no-param-reassign
      n.fx = null;
      // eslint-disable-next-line no-param-reassign
      n.fy = null;
      // eslint-disable-next-line no-param-reassign
      n.vx = 0;
      // eslint-disable-next-line no-param-reassign
      n.vy = 0;
    });
    const sim = simulationRef.current;
    if (sim) {
      sim.alpha(0);
      sim.alphaTarget(0);
    }
    activePreviewRef.current = { mode: null, nodeId: null };
  }, [simulationRef]);

  const toggleChildren = useCallback(
    (id: string) => {
      if (activePreviewRef.current.mode === 'children' && activePreviewRef.current.nodeId === id) {
        ghostNodes.forEach((gn) => {
          savedPositionsRef.current[gn.id] = { x: gn.x, y: gn.y };
        });
      }
      const childIds = adjacencyRef.current[id] || [];
      const allVisible =
        childIds.length > 0 &&
        childIds.every((childId) => {
          const node = cyDataNodes.find((n) => n.data.id === childId);
          if (!node || !node.data.visible || hiddenNodesRef.current.has(childId)) {
            return false;
          }

          return cyDataEdges.some(
            (e) =>
              !hiddenEdgesRef.current.has(e.data.id) &&
              ((e.data.source === id && e.data.target === childId) || (e.data.source === childId && e.data.target === id)),
          );
        });

      if (allVisible) {
        hideChildren(id);
      } else {
        showChildren(id);
        freezeNode(id, 500, 1000, 0.3);
      }
    },
    [freezeNode, showChildren, hideChildren, cyDataNodes, cyDataEdges, adjacencyRef, ghostNodes],
  );

  const toggleParents = useCallback(
    (id: string) => {
      if (activePreviewRef.current.mode === 'parents' && activePreviewRef.current.nodeId === id) {
        ghostNodes.forEach((gn) => {
          savedPositionsRef.current[gn.id] = { x: gn.x, y: gn.y };
        });
      }
      const parentIds = revAdjRef.current[id] || [];
      const allVisible =
        parentIds.length > 0 &&
        parentIds.every((parentId) => {
          const node = cyDataNodes.find((n) => n.data.id === parentId);
          if (!node || !node.data.visible || hiddenNodesRef.current.has(parentId)) {
            return false;
          }

          return cyDataEdges.some(
            (e) =>
              !hiddenEdgesRef.current.has(e.data.id) &&
              ((e.data.source === parentId && e.data.target === id) || (e.data.source === id && e.data.target === parentId)),
          );
        });

      if (allVisible) {
        hideParents(id);
      } else {
        showParents(id);
        freezeNode(id, 500, 1000, 0.3);
      }
    },
    [freezeNode, showParents, hideParents, cyDataNodes, cyDataEdges, revAdjRef, ghostNodes],
  );

  const recomputeEdgeVisibility = useCallback(() => {
    const visible = new Set(cyDataNodes.filter((n) => n.data.visible && !hiddenNodesRef.current.has(n.data.id)).map((n) => n.data.id));

    cyDataEdges.forEach((edge) => {
      const hidden = hiddenEdgesRef.current.has(edge.data.id);
      edge.data.visible = !hidden && visible.has(edge.data.source) && visible.has(edge.data.target);
    });
  }, [cyDataNodes, cyDataEdges, hiddenNodesRef, hiddenEdgesRef]);

  const computeAssociations = useCallback(
    (nodeId: string) => {
      const assoc = new Set<string>();
      if (focusNodeMap[nodeId]) {
        focusNodeMap[nodeId].types.forEach((t: string) => assoc.add(t));
        focusNodeMap[nodeId].violations.forEach((v: string) => assoc.add(v));
        focusNodeMap[nodeId].exemplars.forEach((e: string) => assoc.add(e));
      } else if (typeMap[nodeId]) {
        typeMap[nodeId].nodes.forEach((n: string) => assoc.add(n));
        typeMap[nodeId].violations.forEach((v: string) => assoc.add(v));
        typeMap[nodeId].exemplars.forEach((e: string) => assoc.add(e));
      } else if (violationMap[nodeId]) {
        violationMap[nodeId].nodes.forEach((n: string) => assoc.add(n));
        violationMap[nodeId].types.forEach((t: string) => assoc.add(t));
        violationMap[nodeId].exemplars.forEach((e: string) => assoc.add(e));
      } else if (exemplarMap[nodeId]) {
        exemplarMap[nodeId].nodes.forEach((n: string) => assoc.add(n));
        exemplarMap[nodeId].types.forEach((t: string) => assoc.add(t));
        exemplarMap[nodeId].violations.forEach((v: string) => assoc.add(v));
      }

      const visibleSet = new Set(cyDataNodes.filter((n) => n.data.visible && !hiddenNodesRef.current.has(n.data.id)).map((n) => n.data.id));

      const nodeIds: string[] = [];
      const edges: { id: string; source: string; target: string; label?: string }[] = [];
      const added = new Set<string>();

      assoc.forEach((nid) => {
        const nodeData = cyDataNodes.find((n) => n.data.id === nid);
        if (!nodeData) return;
        if (!visibleSet.has(nid)) {
          nodeIds.push(nid);
        }
      });

      const allIds = new Set<string>([nodeId, ...Array.from(assoc)]);
      cyDataEdges.forEach((edge) => {
        const { source, target } = edge.data;
        if (allIds.has(source) || allIds.has(target)) {
          const key = `${source}->${target}`;
          if (!added.has(key)) {
            added.add(key);
            edges.push({ id: edge.data.id, source, target, label: edge.data.label });
          }
        }
      });

      return { nodeIds, edges };
    },
    [focusNodeMap, typeMap, violationMap, exemplarMap, cyDataNodes, cyDataEdges],
  );

  const showAssociated = useCallback(
    (nodeId: string) => {
      const { nodeIds } = computeAssociations(nodeId);
      cyDataNodes.forEach((node) => {
        if (nodeIds.includes(node.data.id)) {
          if (!node.data.visible && originRef.current[node.data.id] === undefined) {
            originRef.current[node.data.id] = nodeId;
          }
          node.data.visible = true;
          hiddenNodesRef.current.delete(node.data.id);
        }
      });
      recomputeEdgeVisibility();
      convertData();
    },
    [computeAssociations, cyDataNodes, recomputeEdgeVisibility, convertData],
  );

  const hideAssociated = useCallback(
    (nodeId: string) => {
      const { nodeIds } = computeAssociations(nodeId);
      nodeIds.forEach((nid) => {
        hiddenNodesRef.current.add(nid);
      });
      recomputeEdgeVisibility();
      convertData();
    },
    [computeAssociations, recomputeEdgeVisibility, convertData],
  );

  const toggleAssociated = useCallback(
    (id: string) => {
      if (activePreviewRef.current.mode === 'associated' && activePreviewRef.current.nodeId === id) {
        ghostNodes.forEach((gn) => {
          savedPositionsRef.current[gn.id] = { x: gn.x, y: gn.y };
        });
      }
      const { nodeIds } = computeAssociations(id);
      const allVisible =
        nodeIds.length > 0 &&
        nodeIds.every((nid) => {
          const node = cyDataNodes.find((n) => n.data.id === nid);
          return node && node.data.visible && !hiddenNodesRef.current.has(nid);
        });

      if (allVisible) {
        hideAssociated(id);
      } else {
        showAssociated(id);
        freezeNode(id, 500, 1000, 0.3);
      }
    },
    [computeAssociations, showAssociated, hideAssociated, freezeNode, cyDataNodes, ghostNodes],
  );

  const rightDraggingRef = useRef(false);
  const rightMouseDownRef = useRef<{ x: number; y: number } | null>(null);

  // Drag handler now uses Alt + left‐click (button 0 + event.altKey)
  const handleDrag = d3
    .drag<HTMLCanvasElement, CanvasNode>()
    .filter((event) => event.button === 0 && event.altKey)
    .subject((event) => {
      const sim = simulationRef.current;
      if (!sim) return null;
      const [px, py] = d3.pointer(event, canvasRef.current);
      const [tx, ty] = transformRef.current.invert([px, py]);
      return d3.least([...d3Nodes, ...ghostNodes], (node: CanvasNode) => {
        const dx = (node.x ?? 0) - tx;
        const dy = (node.y ?? 0) - ty;
        return dx * dx + dy * dy;
      });
    })
    .on('start', (event) => {
      const sim = simulationRef.current;
      if (!sim) return;
      if (!event.active) sim.alphaTarget(0.3).restart();
      // eslint-disable-next-line no-param-reassign
      event.subject.fx = event.subject.x;
      // eslint-disable-next-line no-param-reassign
      event.subject.fy = event.subject.y;
    })
    .on('drag', (event) => {
      const [px, py] = d3.pointer(event, canvasRef.current);
      const [tx, ty] = transformRef.current.invert([px, py]);
      // eslint-disable-next-line no-param-reassign
      event.subject.fx = tx;
      // eslint-disable-next-line no-param-reassign
      event.subject.fy = ty;
    })
    .on('end', (event) => {
      const sim = simulationRef.current;
      if (!sim) return;
      if (!event.active) sim.alphaTarget(0);
      // eslint-disable-next-line no-param-reassign
      event.subject.fx = null;
      // eslint-disable-next-line no-param-reassign
      event.subject.fy = null;
    });

  const handleDoubleClick = useCallback(
    (event: MouseEvent) => {
      const sim = simulationRef.current;
      if (!sim) return;

      const [pxRaw, pyRaw] = d3.pointer(event, canvasRef.current);
      const transform = transformRef.current;
      const [px, py] = transform.invert([pxRaw, pyRaw]);

      // Compute "near‐node" threshold from node radius (and zoom level)
      const NEAR_NODE_DIST_SQ = getNearNodeThreshold(transform);

      let closest: CanvasNode | null = null;
      let minDist = Infinity;

      [...d3Nodes, ...ghostNodes].forEach((node) => {
        const dx = (node.x ?? 0) - px;
        const dy = (node.y ?? 0) - py;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < minDist) {
          minDist = dist2;
          closest = node;
        }
      });

      if (closest && minDist < NEAR_NODE_DIST_SQ) {
        const cid = closest.id;
        if (event.ctrlKey && event.shiftKey) {
          toggleAssociated(cid);
        } else if (event.ctrlKey) {
          toggleChildren(cid);
        } else if (event.shiftKey) {
          toggleParents(cid);
        }
        clearPreview();
      }
    },
    [d3Nodes, ghostNodes, transformRef, simulationRef, toggleChildren, toggleParents, clearPreview],
  );

  const updateHoverPreview = useCallback(
    (event: MouseEvent) => {
      if (!event.ctrlKey && !event.shiftKey) {
        clearPreview();
        return;
      }
      const [pxRaw, pyRaw] = d3.pointer(event, canvasRef.current);
      const transform = transformRef.current;
      const [px, py] = transform.invert([pxRaw, pyRaw]);

      const NEAR_NODE_DIST_SQ = getNearNodeThreshold(transform);

      let closest: CanvasNode | null = null;
      let minDist = Infinity;

      d3Nodes.forEach((node) => {
        const dx = (node.x ?? 0) - px;
        const dy = (node.y ?? 0) - py;
        const dist2 = dx * dx + dy * dy;
        if (dist2 < minDist) {
          minDist = dist2;
          closest = node;
        }
      });

      if (!closest || minDist >= NEAR_NODE_DIST_SQ) {
        clearPreview();
        return;
      }

      const mode: 'children' | 'parents' | 'associated' = event.ctrlKey && event.shiftKey ? 'associated' : event.ctrlKey ? 'children' : 'parents';
      if (activePreviewRef.current.mode === mode && activePreviewRef.current.nodeId === closest.id) {
        return;
      }
      const { nodeIds, edges: expansionEdges } = mode === 'associated' ? computeAssociations(closest.id) : computeExpansion(closest.id, mode);
      const hasHiddenEdges = expansionEdges.some((e) => hiddenEdgesRef.current.has(e.id));
      const allVisible = nodeIds.length === 0 && !hasHiddenEdges;

      const newGhostNodes: CanvasNode[] = [];
      const newGhostEdges: CanvasEdge[] = [];
      const addedEdgeKeys = new Set<string>();

      if (allVisible) {
        const visibleIds = mode === 'children' ? adjacencyRef.current[closest.id] || [] : revAdjRef.current[closest.id] || [];
        visibleIds.forEach((nid) => {
          const edgeData = cyDataEdges.find(
            (e) => e.data.source === (mode === 'children' ? closest.id : nid) && e.data.target === (mode === 'children' ? nid : closest.id),
          );
          if (edgeData) {
            const key = `${edgeData.data.source}->${edgeData.data.target}`;
            if (!addedEdgeKeys.has(key)) {
              addedEdgeKeys.add(key);
              newGhostEdges.push({
                source: edgeData.data.source,
                target: edgeData.data.target,
                label: edgeData.data.label,
                visible: true,
                previewRemoval: true,
              });
            }
          }
        });
      } else {
        nodeIds.forEach((nid) => {
          const nodeData = cyDataNodes.find((n) => n.data.id === nid);
          if (!nodeData) return;
          newGhostNodes.push({
            id: nid,
            label: nodeData.data.label,
            color: computeColorForId(nid),
            x: closest?.x,
            y: closest?.y,
            ghost: true,
          });
        });
        expansionEdges.forEach((edge) => {
          const key = `${edge.source}->${edge.target}`;
          if (!addedEdgeKeys.has(key)) {
            addedEdgeKeys.add(key);
            newGhostEdges.push({
              source: edge.source,
              target: edge.target,
              label: edge.label,
              visible: true,
              ghost: true,
            });
          }
        });
      }

      const hasRemovalEdges = newGhostEdges.some((e) => e.previewRemoval);
      const hasAdditionEdges = newGhostEdges.some((e) => !e.previewRemoval);

      if (newGhostNodes.length > 0 || hasRemovalEdges || hasAdditionEdges) {
        activePreviewRef.current = { mode, nodeId: closest.id };
        Object.values(nodeMapRef.current).forEach((n) => {
          // eslint-disable-next-line no-param-reassign
          n.fx = n.x;
          // eslint-disable-next-line no-param-reassign
          n.fy = n.y;
          // eslint-disable-next-line no-param-reassign
          n.vx = 0;
          // eslint-disable-next-line no-param-reassign
          n.vy = 0;
        });
        setGhostNodes(newGhostNodes);
        setGhostEdges(newGhostEdges);
        simulationRef.current?.alphaTarget(0.3).restart();
      } else {
        clearPreview();
      }
    },
    [
      d3Nodes,
      transformRef,
      adjacencyRef,
      revAdjRef,
      cyDataNodes,
      cyDataEdges,
      hiddenEdgesRef,
      simulationRef,
      clearPreview,
      computeExpansion,
      computeAssociations,
    ],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const selection = d3.select(canvas);

    if (zoomBehaviorRef.current) {
      selection.call(zoomBehaviorRef.current as any);
    }
    selection.on('dblclick.zoom', null);

    // Apply the new drag behavior (Alt+left) here
    selection.call(handleDrag as any);

    const onMouseDown = (event: MouseEvent) => {
      if (event.button === 2) {
        rightDraggingRef.current = false;
        rightMouseDownRef.current = { x: event.clientX, y: event.clientY };
      }
    };
    const onMouseMove = (event: MouseEvent) => {
      // eslint-disable-next-line no-bitwise
      if ((event.buttons & 2) === 2 && rightMouseDownRef.current) {
        const dx = event.clientX - rightMouseDownRef.current.x;
        const dy = event.clientY - rightMouseDownRef.current.y;
        if (dx * dx + dy * dy > 16) {
          rightDraggingRef.current = true;
        }
      }
      updateHoverPreview(event);
    };

    canvas.addEventListener('mousedown', onMouseDown);
    canvas.addEventListener('mousemove', onMouseMove);
    canvas.addEventListener('mouseleave', clearPreview);
    canvas.addEventListener('dblclick', handleDoubleClick);

    return () => {
      selection.on('.zoom', null);
      selection.on('.drag', null);
      canvas.removeEventListener('mousedown', onMouseDown);
      canvas.removeEventListener('mousemove', onMouseMove);
      canvas.removeEventListener('mouseleave', clearPreview);
      canvas.removeEventListener('dblclick', handleDoubleClick);
    };
  }, [handleDrag, handleDoubleClick, zoomBehaviorRef, updateHoverPreview, clearPreview]);

  useEffect(() => {
    if (ghostNodes.length === 0 && ghostEdges.some((e) => (e as any).previewRemoval)) {
      const sim = simulationRef.current;
      if (sim) {
        sim.alpha(0.001);
        sim.alphaTarget(0).restart();
      }
    }
  }, [ghostNodes.length, ghostEdges, simulationRef]);

  useEffect(() => {
    if (ghostNodes.length === 0 && ghostEdges.length === 0) {
      const sim = simulationRef.current;
      if (sim) {
        sim.alphaTarget(0);
        sim.alpha(0);
      }
    }
  }, [ghostNodes.length, ghostEdges.length, simulationRef]);

  useEffect(() => {
    window.addEventListener('keyup', clearPreview);
    return () => {
      window.removeEventListener('keyup', clearPreview);
    };
  }, [clearPreview]);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <canvas
        ref={canvasRef}
        width={dimensions.width * dpi}
        height={dimensions.height * dpi}
        style={{
          width: '100%',
          height: '100%',
          border: '1px solid #ccc',
          display: 'block',
        }}
      />
      {contextMenu}
      {focusNodeTooltip}
    </div>
  );
}
