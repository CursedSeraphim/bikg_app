// File: src/components/D3NodeLink/D3ForceGraph.tsx

import * as d3 from 'd3';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  clearAllSelections,
  selectCumulativeNumberViolationsPerNode,
  selectD3BoundingBox,
  selectExemplarMap,
  selectFocusNodeMap,
  selectHiddenLabels,
  selectSelectedNodes,
  selectSelectedTypes,
  selectSelectedViolationExemplars,
  selectSelectedViolations,
  selectTypeMap,
  selectTypes,
  selectTypesViolationMap,
  selectViolationMap,
  selectViolations,
  selectViolationTypesMap,
  setSelectedTypes,
  setSelectedViolationExemplars,
  setSelectedViolations,
} from '../Store/CombinedSlice';
import { useD3Data } from './useD3Data';

import { CanvasEdge, CanvasNode, D3NLDViewProps } from './D3NldTypes';
import { getNearNodeThreshold } from './hooks/hoverRadius';
import { useAdjacency } from './hooks/useAdjacency';
import { useCanvasDimensions } from './hooks/useCanvasDimensions';
import { useD3ContextMenu } from './hooks/useD3ContextMenu';
import useD3CumulativeCounts from './hooks/useD3CumulativeCounts';
import { useD3Force } from './hooks/useD3Force';
import { useD3ResetView } from './hooks/useD3ResetView';
import useExemplarHoverList from './hooks/useExemplarHoverList';
import { useNodeVisibility } from './hooks/useNodeVisibility';
import { useGraphConversion } from './hooks/useGraphConversion';
import { useCanvasAnonymizer, useLabelSanitizer } from './hooks/useLabelSanitizer';
import { usePreviewInteractions } from './hooks/usePreviewInteractions';
import { useSelectionSync } from './hooks/useSelectionSync';

/** Force‐directed graph view for the D3 based node‐link diagram. */
export default function D3ForceGraph({ rdfOntology, onLoaded, initialCentering = true }: D3NLDViewProps) {
  const dispatch = useDispatch();
  // Redux selectors
  const violations = useSelector(selectViolations);
  const types = useSelector(selectTypes);
  const cumulativeNumberViolationsPerType = useSelector(selectCumulativeNumberViolationsPerNode);
  const d3BoundingBox = useSelector(selectD3BoundingBox);
  const violationMap = useSelector(selectViolationMap);
  const typeMap = useSelector(selectTypeMap);
  const exemplarMap = useSelector(selectExemplarMap);
  const focusNodeMap = useSelector(selectFocusNodeMap);
  const violationTypesMap = useSelector(selectViolationTypesMap);
  const typesViolationMap = useSelector(selectTypesViolationMap);
  const hiddenLabels = useSelector(selectHiddenLabels);
  const selectedFocusNodes = useSelector(selectSelectedNodes);
  const selectedViolationIds = useSelector(selectSelectedViolations);
  const selectedTypeIds = useSelector(selectSelectedTypes);
  const selectedExemplarIds = useSelector(selectSelectedViolationExemplars);

  const { loading, cyDataNodes, cyDataEdges } = useD3Data({
    rdfOntology,
    violations,
    types,
    cumulativeNumberViolationsPerType,
    onLoaded,
  });
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const { dimensions } = useCanvasDimensions(canvasRef);
  const dpi = window.devicePixelRatio ?? 1;

  const [ghostNodesState, setGhostNodes] = useState<CanvasNode[]>([]);
  const [ghostEdgesState, setGhostEdges] = useState<CanvasEdge[]>([]);
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
  const previousVisibleNodeIdsRef = useRef<Set<string>>(new Set());

  useCanvasAnonymizer();

  const { anonymizeLabel, isIdBlacklisted, isLabelBlacklisted } = useLabelSanitizer({ hiddenLabels, cyDataNodes });

  const { convertData, d3Edges, d3Nodes, setD3Nodes, setD3Edges } = useGraphConversion({
    cyDataNodes,
    cyDataEdges,
    loading,
    hiddenLabels,
    anonymizeLabel,
    isLabelBlacklisted,
    hiddenNodesRef,
    originRef,
    nodeMapRef,
    savedPositionsRef,
  });

  useSelectionSync({
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
  });

  const recomputeEdgeVisibility = useCallback(() => {
    const visible = new Set(
      cyDataNodes.filter((n) => n.data.visible && !hiddenNodesRef.current.has(n.data.id) && !isLabelBlacklisted(n.data.label)).map((n) => n.data.id),
    );

    cyDataEdges.forEach((edge) => {
      const hidden = hiddenEdgesRef.current.has(edge.data.id);
      edge.data.visible = !hidden && visible.has(edge.data.source) && visible.has(edge.data.target);
    });
  }, [cyDataNodes, cyDataEdges, hiddenNodesRef, hiddenEdgesRef, isLabelBlacklisted]);

  const computeAssociations = useCallback(
    (nodeId: string) => {
      const assoc = new Set<string>();

      if (focusNodeMap[nodeId]) {
        focusNodeMap[nodeId].types.forEach((t: string) => assoc.add(t));
        focusNodeMap[nodeId].violations.forEach((v: string) => assoc.add(v));
        focusNodeMap[nodeId].exemplars.forEach((e: string) => assoc.add(e));
      }

      if (typeMap[nodeId]) {
        typeMap[nodeId].nodes.forEach((n: string) => assoc.add(n));
        typeMap[nodeId].violations.forEach((v: string) => assoc.add(v));
        typeMap[nodeId].exemplars.forEach((e: string) => assoc.add(e));
        const extra = typesViolationMap[nodeId] || [];
        extra.forEach((n: string) => assoc.add(n));
      }

      if (violationMap[nodeId]) {
        violationMap[nodeId].nodes.forEach((n: string) => assoc.add(n));
        violationMap[nodeId].types.forEach((t: string) => assoc.add(t));
        violationMap[nodeId].exemplars.forEach((e: string) => assoc.add(e));
      }

      if (exemplarMap[nodeId]) {
        exemplarMap[nodeId].nodes.forEach((n: string) => assoc.add(n));
        exemplarMap[nodeId].types.forEach((t: string) => assoc.add(t));
        exemplarMap[nodeId].violations.forEach((v: string) => assoc.add(v));
      }

      if (violationTypesMap[nodeId]) {
        violationTypesMap[nodeId].forEach((n: string) => assoc.add(n));
      }

      const allIds = new Set<string>([nodeId, ...Array.from(assoc)]);

      const visibleSet = new Set(
        cyDataNodes.filter((n) => n.data.visible && !hiddenNodesRef.current.has(n.data.id) && !isLabelBlacklisted(n.data.label)).map((n) => n.data.id),
      );

      const nodeIds: string[] = [];
      allIds.forEach((nid) => {
        if (isIdBlacklisted(nid)) return;
        const nodeData = cyDataNodes.find((n) => n.data.id === nid);
        if (nodeData && !visibleSet.has(nid)) {
          nodeIds.push(nid);
        }
      });

      const edges: { id: string; source: string; target: string; label?: string }[] = [];
      const added = new Set<string>();

      cyDataEdges.forEach((edge) => {
        const { source, target } = edge.data;
        if (isIdBlacklisted(source) || isIdBlacklisted(target)) return;

        const sourceIn = allIds.has(source);
        const targetIn = allIds.has(target);
        const sourceVisible = visibleSet.has(source);
        const targetVisible = visibleSet.has(target);

        if (
          (sourceIn && targetIn) ||
          (sourceIn && targetVisible) ||
          (targetIn && sourceVisible) ||
          (hiddenEdgesRef.current.has(edge.data.id) && (sourceIn || targetIn))
        ) {
          const sourceExists = cyDataNodes.some((n) => n.data.id === source);
          const targetExists = cyDataNodes.some((n) => n.data.id === target);
          if (sourceExists && targetExists) {
            const key = `${source}->${target}`;
            if (!added.has(key)) {
              added.add(key);
              edges.push({ id: edge.data.id, source, target, label: edge.data.label });
            }
          }
        }
      });

      return { nodeIds, allIds: Array.from(allIds), edges };
    },
    [focusNodeMap, typeMap, violationMap, exemplarMap, violationTypesMap, typesViolationMap, cyDataNodes, cyDataEdges, isLabelBlacklisted, isIdBlacklisted],
  );

  const showAssociated = useCallback(
    (nodeId: string) => {
      const { allIds, edges } = computeAssociations(nodeId);

      cyDataNodes.forEach((node) => {
        if (allIds.includes(node.data.id) && !isIdBlacklisted(node.data.id)) {
          if (!node.data.visible && originRef.current[node.data.id] === undefined) {
            originRef.current[node.data.id] = nodeId;
          }
          node.data.visible = true;
          hiddenNodesRef.current.delete(node.data.id);
        }
      });

      edges.forEach((edge) => {
        if (!isIdBlacklisted(edge.source) && !isIdBlacklisted(edge.target)) {
          hiddenEdgesRef.current.delete(edge.id);
        }
      });

      recomputeEdgeVisibility();
      convertData();
    },
    [computeAssociations, cyDataNodes, recomputeEdgeVisibility, convertData, isIdBlacklisted],
  );

  const hideAssociated = useCallback(
    (nodeId: string) => {
      const { allIds, edges } = computeAssociations(nodeId);
      allIds.forEach((nid) => {
        if (nid !== nodeId && originRef.current[nid] === nodeId) {
          hiddenNodesRef.current.add(nid);
        }
      });

      edges.forEach((edge) => {
        hiddenEdgesRef.current.add(edge.id);
      });

      recomputeEdgeVisibility();
      convertData();
    },
    [computeAssociations, recomputeEdgeVisibility, convertData],
  );

  const { transformRef, simulationRef, zoomBehaviorRef, redraw } = useD3Force(
    canvasRef,
    [...d3Nodes, ...ghostNodesState],
    [...d3Edges, ...ghostEdgesState],
    d3BoundingBox,
    dimensions,
    false,
    initialCentering,
  );

  useEffect(() => {
    redraw();
  }, [redraw, d3Nodes, d3Edges, ghostNodesState, ghostEdgesState]);

  useD3CumulativeCounts(d3Nodes, setD3Nodes, redraw);

  const runIncrementalLayout = useCallback(
    (options: { movableNodeIds?: string[]; pinAllExisting?: boolean; alphaTarget?: number; releaseAfter?: number | null }) => {
      const sim = simulationRef.current;
      if (!sim) return;

      const { movableNodeIds, pinAllExisting = false, alphaTarget = 0.3, releaseAfter = 1000 } = options;

      const movable = new Set(movableNodeIds ?? []);
      const allNodes = Object.values(nodeMapRef.current);

      allNodes.forEach((node) => {
        const nAny = node as any;
        const isMovable = movable.size > 0 && movable.has(node.id);

        if (pinAllExisting) {
          // Preview mode: pin everything in place
          nAny.fx = node.x;
          nAny.fy = node.y;
        } else if (movable.size > 0) {
          // Incremental layout: pin old nodes, let new ones move
          if (isMovable) {
            nAny.fx = null;
            nAny.fy = null;
          } else {
            nAny.fx = node.x;
            nAny.fy = node.y;
          }
        }

        // Reset velocities so the simulation actually reacts
        nAny.vx = 0;
        nAny.vy = 0;
      });

      sim.alphaTarget(alphaTarget).restart();

      // For “incremental layout” we want to eventually unpin everything again.
      if (releaseAfter && releaseAfter > 0) {
        setTimeout(() => {
          const stillSim = simulationRef.current;
          if (!stillSim) return;

          Object.values(nodeMapRef.current).forEach((node) => {
            const nAny = node as any;
            nAny.fx = null;
            nAny.fy = null;
          });

          stillSim.alphaTarget(0);
        }, releaseAfter);
      }
    },
    [simulationRef],
  );

  useEffect(() => {
    if (loading || !simulationRef.current) {
      return;
    }

    if (d3Nodes.length === 0) {
      previousVisibleNodeIdsRef.current = new Set();
      return;
    }

    const prev = previousVisibleNodeIdsRef.current;
    const currentIds = new Set(d3Nodes.map((n) => n.id));

    const newNodeIds: string[] = [];
    currentIds.forEach((id) => {
      if (!prev.has(id)) {
        newNodeIds.push(id);
      }
    });

    // Update snapshot for next comparison
    previousVisibleNodeIdsRef.current = currentIds;

    // Nothing newly visible → no incremental layout step
    if (newNodeIds.length === 0) {
      return;
    }

    // Incremental layout: freeze existing nodes, relax only the new ones
    runIncrementalLayout({
      movableNodeIds: newNodeIds,
      pinAllExisting: false,
      alphaTarget: 0.3,
      releaseAfter: 1000,
    });
  }, [d3Nodes, loading, runIncrementalLayout]);

  const {
    updateHoverPreview,
    clearPreview,
    toggleChildren,
    toggleParents,
    toggleAssociated,
    ghostNodes,
    ghostEdges,
    activePreviewRef,
  } = usePreviewInteractions({
    d3Nodes,
    ghostNodes: ghostNodesState,
    setGhostNodes,
    ghostEdges: ghostEdgesState,
    setGhostEdges,
    cyDataNodes,
    cyDataEdges,
    adjacencyRef,
    revAdjRef,
    hiddenNodesRef,
    hiddenEdgesRef,
    nodeMapRef,
    originRef,
    savedPositionsRef,
    computeExpansion,
    computeAssociations,
    showChildren,
    hideChildren,
    showParents,
    hideParents,
    showAssociated,
    hideAssociated,
    anonymizeLabel,
    isIdBlacklisted,
    isLabelBlacklisted,
    runIncrementalLayout,
    simulationRef,
    canvasRef,
    transformRef,
    setD3Edges,
    activePreviewRef,
  });

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

  const handleResetView = useCallback(() => {
    // Clear all selections in the global store so every view resets
    dispatch(clearAllSelections());
    // Then perform the local NLD reset (visibility, positions, etc.)
    resetView();
  }, [dispatch, resetView]);

  const handleSelectConnected = useCallback(
    (node: CanvasNode | null) => {
      if (!node) return;
      if (node.violation) {
        dispatch(setSelectedViolations([node.id]));
      } else if (node.exemplar) {
        dispatch(setSelectedViolationExemplars([node.id]));
      } else if (node.type) {
        dispatch(setSelectedTypes([node.id]));
      }
    },
    [dispatch],
  );

  const { menu: contextMenu } = useD3ContextMenu(canvasRef, d3Nodes, transformRef, centerView, handleResetView, handleSelectConnected);

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
      }) as any;
    })
    .on('start', (event: any) => {
      const sim = simulationRef.current;
      if (!sim) return;
      if (!event.active) sim.alphaTarget(0.3).restart();
      event.subject.fx = event.subject.x;
      event.subject.fy = event.subject.y;
    })
    .on('drag', (event: any) => {
      const [px, py] = d3.pointer(event, canvasRef.current);
      const [tx, ty] = transformRef.current.invert([px, py]);
      event.subject.fx = tx;
      event.subject.fy = ty;
    })
    .on('end', (event: any) => {
      const sim = simulationRef.current;
      if (!sim) return;
      if (!event.active) sim.alphaTarget(0);
      event.subject.fx = null;
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
          // Same behavior as context menu: expand associated AND select connected
          toggleAssociated(cid);
          handleSelectConnected(closest);
        } else if (event.ctrlKey) {
          toggleChildren(cid);
        } else if (event.shiftKey) {
          toggleParents(cid);
        }

        clearPreview();
      }
    },
    [d3Nodes, ghostNodes, transformRef, simulationRef, toggleChildren, toggleParents, clearPreview, toggleAssociated, handleSelectConnected],
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
