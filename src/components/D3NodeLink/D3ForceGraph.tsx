// File: src/components/D3NodeLink/D3ForceGraph.tsx

import * as d3 from 'd3';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  clearAllSelections,
  selectCumulativeNumberViolationsPerNode,
  selectD3BoundingBox,
  selectD3CenteringEnabled,
  selectD3CenteringStrength,
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
  setCoordinatedSelections,
  setSelectedTypes,
  setSelectedViolationExemplars,
  setSelectedViolations,
} from '../Store/CombinedSlice';
import type { RootState } from '../Store/Store';
import { useD3Data } from './useD3Data';

import { getViolationCountsForNode } from '../../utils/violations';
import { CanvasEdge, CanvasNode, D3NLDViewProps } from './D3NldTypes';
import { getNodeColorForNode, getNodeShapeForId } from './D3NldUtils';
import { getNearNodeThreshold } from './hooks/hoverRadius';
import { useAdjacency } from './hooks/useAdjacency';
import { useCanvasDimensions } from './hooks/useCanvasDimensions';
import { useD3ContextMenu } from './hooks/useD3ContextMenu';
import { updateD3NodesGivenCounts, useD3CumulativeCounts } from './hooks/useD3CumulativeCounts';
import { useD3Force } from './hooks/useD3Force';
import { useD3ResetView } from './hooks/useD3ResetView';
// import useExemplarHoverList from './hooks/useExemplarHoverList';
import { useLassoSelection } from './hooks/useLassoSelection';
import { useNodeVisibility } from './hooks/useNodeVisibility';
import { computeSelectionScope } from './utils/selectionScope';
import { buildNodeShapeViolationMap, getFocusNodesForNodeShape, isNodeShapeClass } from './utils/nodeShapeAssociations';

/** Force‐directed graph view for the D3 based node‐link diagram. */
export default function D3ForceGraph({ rdfOntology, onLoaded }: D3NLDViewProps) {
  const dispatch = useDispatch();
  // Redux selectors
  const violations = useSelector(selectViolations);
  const types = useSelector(selectTypes);
  const cumulativeNumberViolationsPerType = useSelector(selectCumulativeNumberViolationsPerNode);
  const d3BoundingBox = useSelector(selectD3BoundingBox);
  const d3CenteringEnabled = useSelector(selectD3CenteringEnabled);
  const d3CenteringStrength = useSelector(selectD3CenteringStrength);
  const violationMap = useSelector(selectViolationMap);
  const typeMap = useSelector(selectTypeMap);
  const exemplarMap = useSelector(selectExemplarMap);
  const focusNodeMap = useSelector(selectFocusNodeMap);
  const numberViolationsPerNode = useSelector((state: RootState) => state.combined.numberViolationsPerNode);
  const violationTypesMap = useSelector(selectViolationTypesMap);
  const typesViolationMap = useSelector(selectTypesViolationMap);
  const nodeShapeViolationMap = useMemo(() => buildNodeShapeViolationMap(violationTypesMap), [violationTypesMap]);
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

  const [d3Nodes, setD3Nodes] = useState<CanvasNode[]>([]);
  const [d3Edges, setD3Edges] = useState<CanvasEdge[]>([]);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const lassoOverlayRef = useRef<SVGSVGElement | null>(null);
  const { dimensions } = useCanvasDimensions(canvasRef);
  const dpi = window.devicePixelRatio ?? 1;

  const [ghostNodes, setGhostNodes] = useState<CanvasNode[]>([]);
  const [ghostEdges, setGhostEdges] = useState<CanvasEdge[]>([]);
  const activePreviewRef = useRef<{ mode: 'children' | 'parents' | null; nodeId: string | null }>({
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
  const lassoSelectionRef = useRef<{ nodeIds: Set<string>; signature: string } | null>(null);

  // --- Helpers --------------------------------------------------------------

  const stripDecorations = useCallback((label: string | undefined) => {
    if (!label) return '';
    // remove a trailing " (…)" count suffix and a trailing "*"
    return label.replace(/\s*\([^)]*\)\s*$/, '').replace(/\*$/, '');
  }, []);

  // for figure purposes: anonymize any occurrence of "boehringer" for display strings
  const anonymizeLabel = useCallback((value: string | undefined): string => {
    if (!value) return '';
    return value.replace(/boehringer/gi, 'anonymized');
  }, []);

  // Figure-only: force anonymization at the canvas API level as a last line of defense.
  // This guarantees that any text drawn anywhere on any canvas will be sanitized.
  useEffect(() => {
    const proto = CanvasRenderingContext2D.prototype as CanvasRenderingContext2D & { __biAnonymizePatched?: boolean };
    if (proto.__biAnonymizePatched) return;

    const re = /boehringer/gi;
    const sanitize = (t: unknown) => String(t ?? '').replace(re, 'anonymized');

    const origFill = proto.fillText;
    const origStroke = proto.strokeText;
    const origMeasure = proto.measureText;

    function fillTextPatched(this: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth?: number) {
      const s = sanitize(text);
      return maxWidth !== undefined ? origFill.call(this, s, x, y, maxWidth) : origFill.call(this, s, x, y);
    }
    function strokeTextPatched(this: CanvasRenderingContext2D, text: string, x: number, y: number, maxWidth?: number) {
      const s = sanitize(text);
      return maxWidth !== undefined ? origStroke.call(this, s, x, y, maxWidth) : origStroke.call(this, s, x, y);
    }
    function measureTextPatched(this: CanvasRenderingContext2D, text: string) {
      const s = sanitize(text);
      return origMeasure.call(this, s);
    }

    proto.fillText = fillTextPatched;
    proto.strokeText = strokeTextPatched;
    proto.measureText = measureTextPatched;

    proto.__biAnonymizePatched = true;
  }, []);

  const isLabelBlacklisted = useCallback(
    (label: string | undefined) => {
      if (!hiddenLabels || hiddenLabels.length === 0) return false;
      const base = stripDecorations(label);
      return hiddenLabels.includes(base);
    },
    [hiddenLabels, stripDecorations],
  );

  const isIdBlacklisted = useCallback(
    (id: string) => {
      // prefer matching by base label; fall back to id match
      const n = cyDataNodes.find((x) => x.data.id === id);
      return (n ? isLabelBlacklisted(n.data.label) : false) || hiddenLabels.includes(id);
    },
    [cyDataNodes, hiddenLabels, isLabelBlacklisted],
  );

  // -------------------------------------------------------------------------

  const buildSelectionSignature = useCallback((focusNodes: string[], typeIds: string[], violationIds: string[], exemplarIds: string[]) => {
    const normalize = (values: string[]) => Array.from(new Set(values)).sort();
    return JSON.stringify({
      focusNodes: normalize(focusNodes),
      types: normalize(typeIds),
      violations: normalize(violationIds),
      exemplars: normalize(exemplarIds),
    });
  }, []);

  const convertData = useCallback(() => {
    // filter nodes: must be visible, not in hiddenNodesRef, and not blacklisted
    const visibleNodeData = cyDataNodes.filter((n) => n.data.visible && !hiddenNodesRef.current.has(n.data.id) && !isLabelBlacklisted(n.data.label));
    const visibleIds = new Set(visibleNodeData.map((n) => n.data.id));

    // edges: visible flag + both ends in visibleIds (which already excludes blacklisted nodes)
    const visibleEdgeData = cyDataEdges.filter((e) => e.data.visible && visibleIds.has(e.data.source) && visibleIds.has(e.data.target));

    const nextNodes: CanvasNode[] = [];
    const nodeInfoMap = new Map<string, { sources: string[]; isAClass: string | null }>();

    visibleNodeData.forEach((n) => {
      const { id } = n.data;
      const display = anonymizeLabel(n.data.label ?? n.data.id); // sanitize (fallback to id)
      let node = nodeMapRef.current[id];
      if (!node) {
        const saved = savedPositionsRef.current[id];
        const sources = n.data.sources ?? ['unknown'];
        const isAClass = n.data.isAClass ?? null;
        node = {
          id,
          label: display,
          color: getNodeColorForNode({ sources, isAClass }),
          shape: getNodeShapeForId(id),
          sources,
          x: saved?.x,
          y: saved?.y,
          selected: Boolean(n.data.selected),
          violation: Boolean(n.data.violation),
          exemplar: Boolean(n.data.exemplar),
          type: Boolean(n.data.type),
          isAClass,
        };
        nodeInfoMap.set(id, { sources, isAClass });
      } else {
        node.label = display;
        node.shape = getNodeShapeForId(id);
        node.sources = n.data.sources ?? ['unknown'];
        node.selected = Boolean(n.data.selected);
        node.violation = Boolean(n.data.violation);
        node.exemplar = Boolean(n.data.exemplar);
        node.type = Boolean(n.data.type);
        node.isAClass = n.data.isAClass ?? null;
        node.color = getNodeColorForNode({ sources: node.sources, isAClass: node.isAClass });
        nodeInfoMap.set(id, { sources: node.sources ?? ['unknown'], isAClass: node.isAClass ?? null });
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

    const newEdges: CanvasEdge[] = visibleEdgeData.map((e) => {
      const sourceInfo = nodeInfoMap.get(e.data.source);
      const fallbackId = `${e.data.source}->${e.data.target}`;
      return {
        id: e.data.id ?? fallbackId,
        source: e.data.source,
        target: e.data.target,
        label: anonymizeLabel(e.data.label ?? e.data.id), // sanitize
        visible: true,
        selected: Boolean(e.data.selected),
        color: getNodeColorForNode({ sources: sourceInfo?.sources ?? ['unknown'], isAClass: sourceInfo?.isAClass ?? null }),
      };
    });

    updateD3NodesGivenCounts(nextNodes);
    setD3Nodes(nextNodes);
    setD3Edges(newEdges);
  }, [cyDataNodes, cyDataEdges, isLabelBlacklisted, anonymizeLabel]);

  const applyDirectSelection = useCallback(
    (selectedNodeIds: Set<string>) => {
      const selectedEdgeIds = new Set<string>();
      cyDataEdges.forEach((edge) => {
        const sourceId = edge.data.source;
        const targetId = edge.data.target;
        if (selectedNodeIds.has(sourceId) && selectedNodeIds.has(targetId)) {
          selectedEdgeIds.add(edge.data.id);
        }
      });

      let needsRefresh = false;

      cyDataNodes.forEach((node) => {
        const mutableNode = node;
        const shouldSelect = selectedNodeIds.has(mutableNode.data.id);
        if (mutableNode.data.selected !== shouldSelect) {
          mutableNode.data.selected = shouldSelect;
          needsRefresh = true;
        }
      });

      cyDataEdges.forEach((edge) => {
        const mutableEdge = edge;
        const shouldSelect = selectedEdgeIds.has(mutableEdge.data.id);
        if (mutableEdge.data.selected !== shouldSelect) {
          mutableEdge.data.selected = shouldSelect;
          needsRefresh = true;
        }
      });

      if (needsRefresh) {
        convertData();
      }
    },
    [cyDataNodes, cyDataEdges, convertData],
  );

  const isNodeShapeNode = useCallback((node?: CanvasNode | null) => isNodeShapeClass(node?.isAClass ?? null), []);

  const buildLassoSelections = useCallback(
    (selectedIds: string[]) => {
      const lassoSelectedFocusNodes = new Set<string>();
      const selectedTypes = new Set<string>();
      const selectedViolations = new Set<string>();
      const selectedExemplars = new Set<string>();

      const addFocusNode = (focusId: string) => {
        if (focusNodeMap[focusId]) {
          lassoSelectedFocusNodes.add(focusId);
        }
      };

      const selectedNodeIds = new Set(selectedIds);
      selectedIds.forEach((id) => {
        const node = nodeMapRef.current[id];
        if (!node) {
          return;
        }
        if (isNodeShapeNode(node)) {
          const { violationIds, focusNodeIds } = getFocusNodesForNodeShape(id, nodeShapeViolationMap, violationMap);
          violationIds.forEach((violationId) => selectedViolations.add(violationId));
          focusNodeIds.forEach((focusId) => addFocusNode(focusId));
          return;
        }
        if (node.type) {
          selectedTypes.add(id);
          typeMap[id]?.nodes.forEach((focusId: string) => addFocusNode(focusId));
          return;
        }
        if (node.violation) {
          selectedViolations.add(id);
          violationMap[id]?.nodes.forEach((focusId: string) => addFocusNode(focusId));
          return;
        }
        if (node.exemplar) {
          selectedExemplars.add(id);
          exemplarMap[id]?.nodes.forEach((focusId: string) => addFocusNode(focusId));
          return;
        }
        addFocusNode(id);
      });

      lassoSelectedFocusNodes.forEach((focusId) => {
        const focusEntry = focusNodeMap[focusId];
        if (!focusEntry) return;
        focusEntry.types.forEach((typeId: string) => selectedTypes.add(typeId));
        focusEntry.violations.forEach((violationId: string) => selectedViolations.add(violationId));
        focusEntry.exemplars.forEach((exemplarId: string) => selectedExemplars.add(exemplarId));
      });

      return {
        selectedFocusNodes: Array.from(lassoSelectedFocusNodes),
        selectedTypes: Array.from(selectedTypes),
        selectedViolations: Array.from(selectedViolations),
        selectedExemplars: Array.from(selectedExemplars),
        selectedNodeIds,
      };
    },
    [exemplarMap, focusNodeMap, typeMap, violationMap, nodeShapeViolationMap, isNodeShapeNode],
  );

  useEffect(() => {
    if (!loading) {
      // also sanitize the source data in place so any other consumer reads anonymized labels
      cyDataNodes.forEach((node) => {
        const mutableNode = node;
        mutableNode.data.label = anonymizeLabel(mutableNode.data.label ?? mutableNode.data.id);
      });
      cyDataEdges.forEach((edge) => {
        const mutableEdge = edge;
        mutableEdge.data.label = anonymizeLabel(mutableEdge.data.label ?? mutableEdge.data.id);
      });
      convertData();
    }
  }, [loading, convertData, hiddenLabels, cyDataNodes, cyDataEdges, anonymizeLabel]);

  const { transformRef, simulationRef, zoomBehaviorRef, redraw } = useD3Force(
    canvasRef,
    [...d3Nodes, ...ghostNodes],
    [...d3Edges, ...ghostEdges],
    d3BoundingBox,
    dimensions,
    d3CenteringEnabled,
    d3CenteringStrength,
    false,
  );

  useEffect(() => {
    redraw();
  }, [redraw, d3Nodes, d3Edges, ghostNodes, ghostEdges]);

  useD3CumulativeCounts(d3Nodes, setD3Nodes, redraw);

  const runIncrementalLayout = useCallback(
    (options: { movableNodeIds?: string[]; pinAllExisting?: boolean; alphaTarget?: number; releaseAfter?: number | null }) => {
      const sim = simulationRef.current;
      if (!sim) return;

      const { movableNodeIds, pinAllExisting = false, alphaTarget = 0.3, releaseAfter = 1000 } = options;

      const movable = new Set(movableNodeIds ?? []);
      const allNodes = Object.values(nodeMapRef.current);

      allNodes.forEach((node) => {
        const mutableNode = node;
        const isMovable = movable.size > 0 && movable.has(node.id);

        if (pinAllExisting) {
          // Preview mode: pin everything in place
          mutableNode.fx = node.x ?? null;
          mutableNode.fy = node.y ?? null;
        } else if (movable.size > 0) {
          // Incremental layout: pin old nodes, let new ones move
          if (isMovable) {
            mutableNode.fx = null;
            mutableNode.fy = null;
          } else {
            mutableNode.fx = node.x ?? null;
            mutableNode.fy = node.y ?? null;
          }
        }

        // Reset velocities so the simulation actually reacts
        mutableNode.vx = 0;
        mutableNode.vy = 0;
      });

      sim.alphaTarget(alphaTarget).restart();

      // For “incremental layout” we want to eventually unpin everything again.
      if (releaseAfter && releaseAfter > 0) {
        setTimeout(() => {
          const stillSim = simulationRef.current;
          if (!stillSim) return;

          Object.values(nodeMapRef.current).forEach((node) => {
            const mutableNode = node;
            mutableNode.fx = null;
            mutableNode.fy = null;
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d3Nodes, loading, runIncrementalLayout]);

  useEffect(() => {
    if (loading || cyDataNodes.length === 0) {
      return;
    }

    const selectionSignature = buildSelectionSignature(selectedFocusNodes, selectedTypeIds, selectedViolationIds, selectedExemplarIds);
    const lassoSelection = lassoSelectionRef.current;
    if (lassoSelection && lassoSelection.signature === selectionSignature) {
      applyDirectSelection(lassoSelection.nodeIds);
      return;
    }
    lassoSelectionRef.current = null;

    // 1) Selection scope: everything that should be unfolded / made visible
    const { idsToSelect, visibleEdgeIds } = computeSelectionScope({
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
      cyDataEdges,
    });

    // 2) DoI-based branch seeds: nodes that actually have selected violations
    const getSelectedCount = (id: string) => {
      return getViolationCountsForNode(id).cumulativeSelected;
    };

    const highlightableIds = new Set<string>();
    idsToSelect.forEach((id) => {
      if (getSelectedCount(id) > 0) {
        highlightableIds.add(id);
      }
    });

    // Always highlight directly selected focus nodes / violations / exemplars
    selectedFocusNodes.forEach((id) => highlightableIds.add(id));
    selectedViolationIds.forEach((id) => highlightableIds.add(id));
    selectedExemplarIds.forEach((id) => highlightableIds.add(id));
    selectedExemplarIds.forEach((exemplarId) => {
      // children = outgoing edges' targets from the exemplar node
      const childIds = adjacencyRef.current[exemplarId] || [];
      childIds.forEach((childId: string) => {
        if (!isIdBlacklisted(childId)) {
          highlightableIds.add(childId);
        }
      });
    });

    // 3) Ancestor expansion, restricted to the current selection scope
    const expandHighlightToAncestors = (sourceIds: Set<string>, allowedScope: Set<string>): Set<string> => {
      const result = new Set<string>(sourceIds);
      const queue: string[] = Array.from(sourceIds);
      const visited = new Set<string>(queue);

      while (queue.length > 0) {
        const current = queue.shift() as string;
        const parents = (revAdjRef.current[current] || []).filter((pid) => {
          if (isIdBlacklisted(pid)) return false;
          // Only pull in parents that are actually part of the selection scope
          return allowedScope.has(pid);
        });

        parents.forEach((pid) => {
          if (!visited.has(pid)) {
            visited.add(pid);
            result.add(pid);
            queue.push(pid);
          }
        });
      }

      return result;
    };

    const highlightIdsWithAncestors = expandHighlightToAncestors(highlightableIds, idsToSelect);

    // 4) Edges: visible vs highlighted
    const selectedEdgeIds = new Set<string>();
    cyDataEdges.forEach((edge) => {
      const sourceId = edge.data.source;
      const targetId = edge.data.target;

      // Highlighting: only edges fully inside the highlighted branch+ancestors
      if (highlightIdsWithAncestors.has(sourceId) && highlightIdsWithAncestors.has(targetId)) {
        selectedEdgeIds.add(edge.data.id);
      }
    });

    let needsRefresh = false;

    // 5) Nodes: decouple show vs highlight
    cyDataNodes.forEach((node) => {
      const mutableNode = node;
      const { id } = mutableNode.data;
      const shouldHighlight = highlightIdsWithAncestors.has(id);
      const shouldShow = idsToSelect.has(id);

      if (mutableNode.data.selected !== shouldHighlight) {
        mutableNode.data.selected = shouldHighlight;
        needsRefresh = true;
      }

      if (shouldShow && mutableNode.data.visible === false) {
        mutableNode.data.visible = true;
        needsRefresh = true;
      }
      if (shouldShow) {
        hiddenNodesRef.current.delete(id);
      }
    });

    // 6) Edges: same split
    cyDataEdges.forEach((edge) => {
      const mutableEdge = edge;
      const { id } = mutableEdge.data;
      const shouldHighlight = selectedEdgeIds.has(id);
      const shouldShow = visibleEdgeIds.has(id);

      if (mutableEdge.data.selected !== shouldHighlight) {
        mutableEdge.data.selected = shouldHighlight;
        needsRefresh = true;
      }

      if (shouldShow && mutableEdge.data.visible === false) {
        mutableEdge.data.visible = true;
        needsRefresh = true;
      }
      if (shouldShow) {
        hiddenEdgesRef.current.delete(id);
      }
    });

    if (needsRefresh) {
      convertData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    numberViolationsPerNode,
    hiddenNodesRef,
    hiddenEdgesRef,
    convertData,
    revAdjRef,
    isIdBlacklisted,
    applyDirectSelection,
    buildSelectionSignature,
  ]);

  // const focusNodeTooltip = useExemplarHoverList(canvasRef, [...d3Nodes, ...ghostNodes], transformRef);

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
    d3.select(canvasRef.current).transition().duration(300).call(zoomBehaviorRef.current.transform, transform);
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
      } else if (isNodeShapeNode(node)) {
        const { violationIds } = getFocusNodesForNodeShape(node.id, nodeShapeViolationMap, violationMap);
        if (violationIds.length > 0) {
          dispatch(setSelectedViolations(violationIds));
        }
      } else if (node.exemplar) {
        dispatch(setSelectedViolationExemplars([node.id]));
      } else if (node.type) {
        dispatch(setSelectedTypes([node.id]));
      }
    },
    [dispatch, isNodeShapeNode, nodeShapeViolationMap, violationMap],
  );

  const { menu: contextMenu } = useD3ContextMenu(canvasRef, d3Nodes, transformRef, centerView, handleResetView, handleSelectConnected);

  const { computeExpansion, showChildren, showParents } = useNodeVisibility(
    cyDataNodes,
    cyDataEdges,
    adjacencyRef,
    revAdjRef,
    hiddenNodesRef,
    hiddenEdgesRef,
    originRef,
    convertData,
  );

  // Freeze nodes for a short period…
  const freezeNode = useCallback(
    (id: string, otherDuration = 500, triggerDuration = 1000, alphaTarget = 0.1) => {
      const sim = simulationRef.current;
      if (!sim) return;

      const allNodes = Object.values(nodeMapRef.current);
      allNodes.forEach((node) => {
        if (otherDuration > 0 || node.id === id) {
          const mutableNode = node;
          mutableNode.fx = node.x ?? null;
          mutableNode.fy = node.y ?? null;
        }
      });

      sim.alphaTarget(alphaTarget).restart();

      if (otherDuration > 0) {
        setTimeout(() => {
          allNodes.forEach((node) => {
            if (node.id !== id) {
              const mutableNode = node;
              mutableNode.fx = null;
              mutableNode.fy = null;
            }
          });
        }, otherDuration);
      }

      setTimeout(() => {
        const triggerNode = nodeMapRef.current[id];
        if (triggerNode) {
          const mutableNode = triggerNode;
          mutableNode.fx = null;
          mutableNode.fy = null;
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
    setD3Edges((edges) =>
      edges.map((edge) => {
        const source = typeof edge.source === 'object' ? edge.source.id : edge.source;
        const target = typeof edge.target === 'object' ? edge.target.id : edge.target;
        return {
          ...edge,
          source,
          target,
        };
      }),
    );
    Object.values(nodeMapRef.current).forEach((n) => {
      const mutableNode = n;
      mutableNode.fx = null;
      mutableNode.fy = null;
      mutableNode.vx = 0;
      mutableNode.vy = 0;
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
      const childIds = (adjacencyRef.current[id] || []).filter((cid) => !isIdBlacklisted(cid));
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
        return;
      }

      showChildren(id);
      freezeNode(id, 500, 1000, 0.3);
    },
    [freezeNode, showChildren, cyDataNodes, cyDataEdges, adjacencyRef, ghostNodes, isIdBlacklisted],
  );

  const toggleParents = useCallback(
    (id: string) => {
      if (activePreviewRef.current.mode === 'parents' && activePreviewRef.current.nodeId === id) {
        ghostNodes.forEach((gn) => {
          savedPositionsRef.current[gn.id] = { x: gn.x, y: gn.y };
        });
      }
      const parentIds = (revAdjRef.current[id] || []).filter((pid) => !isIdBlacklisted(pid));
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
        return;
      }

      showParents(id);
      freezeNode(id, 500, 1000, 0.3);
    },
    [freezeNode, showParents, cyDataNodes, cyDataEdges, revAdjRef, ghostNodes, isIdBlacklisted],
  );

  const recomputeEdgeVisibility = useCallback(() => {
    const visible = new Set(
      cyDataNodes.filter((n) => n.data.visible && !hiddenNodesRef.current.has(n.data.id) && !isLabelBlacklisted(n.data.label)).map((n) => n.data.id),
    );

    cyDataEdges.forEach((edge) => {
      const mutableEdge = edge;
      const hidden = hiddenEdgesRef.current.has(mutableEdge.data.id);
      mutableEdge.data.visible = !hidden && visible.has(mutableEdge.data.source) && visible.has(mutableEdge.data.target);
    });
  }, [cyDataNodes, cyDataEdges, hiddenNodesRef, hiddenEdgesRef, isLabelBlacklisted]);

  const rightDraggingRef = useRef(false);
  const rightMouseDownRef = useRef<{ x: number; y: number } | null>(null);

  type DragEvent = d3.D3DragEvent<HTMLCanvasElement, CanvasNode, CanvasNode>;

  // Drag handler now uses Alt + left‐click (button 0 + event.altKey)
  const handleDrag = d3
    .drag<HTMLCanvasElement, CanvasNode>()
    .filter((event) => event.button === 0 && event.altKey)
    .subject((event: DragEvent) => {
      const sim = simulationRef.current;
      if (!sim) return null;
      const [px, py] = d3.pointer(event, canvasRef.current);
      const [tx, ty] = transformRef.current.invert([px, py]);
      const closest = d3.least([...d3Nodes, ...ghostNodes], (node: CanvasNode) => {
        const dx = (node.x ?? 0) - tx;
        const dy = (node.y ?? 0) - ty;
        return dx * dx + dy * dy;
      });
      return closest ?? null;
    })
    .on('start', (event: DragEvent) => {
      const sim = simulationRef.current;
      if (!sim) return;

      if (!event.active) sim.alpha(0.45).restart();
      sim.alphaTarget(0); // allow cooling while holding

      const { subject } = event;
      subject.fx = subject.x ?? null;
      subject.fy = subject.y ?? null;

      subject.vx = 0;
      subject.vy = 0;
    })
    .on('drag', (event: DragEvent) => {
      const sim = simulationRef.current;
      if (!sim) return;

      const [px, py] = d3.pointer(event, canvasRef.current);
      const [tx, ty] = transformRef.current.invert([px, py]);

      const { subject } = event;
      subject.fx = tx;
      subject.fy = ty;

      subject.vx = 0;
      subject.vy = 0;

      sim.alpha(Math.max(sim.alpha(), 0.18));
    })
    .on('end', (event: DragEvent) => {
      const sim = simulationRef.current;
      if (!sim) return;

      const { subject } = event;
      subject.fx = null;
      subject.fy = null;

      if (!event.active) sim.alphaTarget(0);
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

        if (event.ctrlKey) {
          toggleChildren(cid);
        } else if (event.shiftKey) {
          toggleParents(cid);
        }

        clearPreview();
      }
    },
    [d3Nodes, ghostNodes, transformRef, simulationRef, toggleChildren, toggleParents, clearPreview],
  );

  const handleLassoSelection = useCallback(
    (selectedIds: string[]) => {
      const {
        selectedFocusNodes: nextFocusNodes,
        selectedTypes: nextTypes,
        selectedViolations: nextViolations,
        selectedExemplars,
        selectedNodeIds,
      } = buildLassoSelections(selectedIds);

      const selectionSignature = buildSelectionSignature(nextFocusNodes, nextTypes, nextViolations, selectedExemplars);
      lassoSelectionRef.current = { nodeIds: selectedNodeIds, signature: selectionSignature };

      applyDirectSelection(selectedNodeIds);
      dispatch(
        setCoordinatedSelections({
          selectedNodes: nextFocusNodes,
          selectedTypes: nextTypes,
          selectedViolations: nextViolations,
          selectedViolationExemplars: selectedExemplars,
        }),
      );
    },
    [applyDirectSelection, buildLassoSelections, buildSelectionSignature, dispatch],
  );

  const { lassoActiveRef } = useLassoSelection({
    canvasRef,
    overlayRef: lassoOverlayRef,
    nodes: d3Nodes,
    transformRef,
    onSelection: handleLassoSelection,
  });

  const updateHoverPreview = useCallback(
    (event: MouseEvent) => {
      if (lassoActiveRef.current) {
        return;
      }
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

      const mode: 'children' | 'parents' = event.ctrlKey ? 'children' : 'parents';
      if (activePreviewRef.current.mode === mode && activePreviewRef.current.nodeId === closest.id) {
        return;
      }
      const { nodeIds, edges: expansionEdges } = computeExpansion(closest.id, mode);

      // apply blacklist to preview targets
      const filteredNodeIds = nodeIds.filter((nid) => !isIdBlacklisted(nid));
      const filteredExpansionEdges = expansionEdges.filter((e) => !isIdBlacklisted(e.source) && !isIdBlacklisted(e.target));

      const hasHiddenEdges = filteredExpansionEdges.some((e) => hiddenEdgesRef.current.has(e.id));
      const allVisible = filteredNodeIds.length === 0 && !hasHiddenEdges;
      if (allVisible) {
        clearPreview();
        return;
      }

      const newGhostNodes: CanvasNode[] = [];
      const newGhostEdges: CanvasEdge[] = [];
      const addedEdgeKeys = new Set<string>();
      const getEdgeColorForSource = (sourceId: string) => {
        const nodeData = cyDataNodes.find((n) => n.data.id === sourceId);
        return getNodeColorForNode({ sources: nodeData?.data.sources ?? ['unknown'], isAClass: nodeData?.data.isAClass ?? null });
      };

      filteredNodeIds.forEach((nid) => {
        const nodeData = cyDataNodes.find((n) => n.data.id === nid);
        if (!nodeData) return;
        newGhostNodes.push({
          id: nid,
          label: anonymizeLabel(nodeData.data.label ?? nodeData.data.id),
          color: getNodeColorForNode({ sources: nodeData.data.sources ?? ['unknown'], isAClass: nodeData.data.isAClass ?? null }),
          shape: getNodeShapeForId(nid),
          x: closest?.x,
          y: closest?.y,
          ghost: true,
        });
      });
      filteredExpansionEdges.forEach((edge) => {
        const key = `${edge.source}->${edge.target}`;
        if (!addedEdgeKeys.has(key)) {
          addedEdgeKeys.add(key);
          newGhostEdges.push({
            id: edge.id ?? key,
            source: edge.source,
            target: edge.target,
            label: anonymizeLabel(edge.label ?? edge.id),
            visible: true,
            color: getEdgeColorForSource(edge.source),
            ghost: true,
          });
        }
      });

      if (newGhostNodes.length > 0 || newGhostEdges.length > 0) {
        activePreviewRef.current = { mode, nodeId: closest.id };
        setGhostNodes(newGhostNodes);
        setGhostEdges(newGhostEdges);

        // Preview: pin all existing nodes and run a short simulation
        runIncrementalLayout({
          pinAllExisting: true,
          alphaTarget: 0.3,
          releaseAfter: null, // unpinned explicitly in clearPreview
        });
      } else {
        clearPreview();
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      d3Nodes,
      transformRef,
      adjacencyRef,
      revAdjRef,
      cyDataNodes,
      cyDataEdges,
      hiddenEdgesRef,
      lassoActiveRef,
      clearPreview,
      computeExpansion,
      isIdBlacklisted,
      isLabelBlacklisted,
      anonymizeLabel,
      runIncrementalLayout,
    ],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return () => {};
    }
    const selection = d3.select(canvas);

    if (zoomBehaviorRef.current) {
      selection.call(zoomBehaviorRef.current);
    }
    selection.on('dblclick.zoom', null);

    // Apply the new drag behavior (Alt+left) here
    selection.call(handleDrag);

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

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Delete' && event.key !== 'Backspace') {
        return;
      }

      const target = event.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) {
        return;
      }

      const selectedNodeIds = new Set(cyDataNodes.filter((node) => node.data.selected).map((node) => node.data.id));
      const selectedEdgeIds = new Set(cyDataEdges.filter((edge) => edge.data.selected).map((edge) => edge.data.id));

      if (selectedNodeIds.size === 0 && selectedEdgeIds.size === 0) {
        return;
      }

      cyDataNodes.forEach((node) => {
        if (selectedNodeIds.has(node.data.id)) {
          const mutableNode = node;
          mutableNode.data.visible = false;
          mutableNode.data.selected = false;
          hiddenNodesRef.current.add(mutableNode.data.id);
        }
      });

      cyDataEdges.forEach((edge) => {
        if (selectedEdgeIds.has(edge.data.id)) {
          const mutableEdge = edge;
          mutableEdge.data.visible = false;
          mutableEdge.data.selected = false;
          hiddenEdgesRef.current.add(mutableEdge.data.id);
        }
      });

      recomputeEdgeVisibility();
      convertData();
      lassoSelectionRef.current = null;
      dispatch(clearAllSelections());
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [cyDataNodes, cyDataEdges, dispatch, convertData, recomputeEdgeVisibility]);

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
      <svg
        ref={lassoOverlayRef}
        width={dimensions.width}
        height={dimensions.height}
        style={{
          position: 'absolute',
          inset: 0,
          pointerEvents: 'none',
        }}
      />
      {contextMenu}
      {/* {focusNodeTooltip} */}
    </div>
  );
}
