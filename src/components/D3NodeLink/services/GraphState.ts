import { ExpansionMode, GraphDelta, IGraphState } from './GraphInterfaces';

interface NodeData {
  id: string;
  visible: boolean;
}

interface EdgeData {
  id: string;
  source: string;
  target: string;
  visible: boolean;
}

/**
 * Basic implementation of IGraphState backed by cytoscape-like node/edge arrays.
 */
export class GraphState implements IGraphState {
  private nodes: NodeData[];

  private edges: EdgeData[];

  private adjacency: Record<string, string[]>;

  private revAdj: Record<string, string[]>;

  constructor(nodes: NodeData[], edges: EdgeData[], adjacency: Record<string, string[]>, revAdj: Record<string, string[]>) {
    this.nodes = nodes;
    this.edges = edges;
    this.adjacency = adjacency;
    this.revAdj = revAdj;
  }

  getVisibleNodeIds(): Set<string> {
    return new Set(this.nodes.filter((n) => n.visible).map((n) => n.id));
  }

  getVisibleEdgeIds(): Set<string> {
    return new Set(this.edges.filter((e) => e.visible).map((e) => e.id));
  }

  /** Helper to check if an edge should be visible based on node visibility */
  private edgeWouldBeVisible(edge: EdgeData, visible: Set<string>): boolean {
    return visible.has(edge.source) && visible.has(edge.target);
  }

  computeDelta(nodeId: string, mode: ExpansionMode): GraphDelta {
    const visibleNodes = this.getVisibleNodeIds();
    const visibleEdges = this.getVisibleEdgeIds();

    const neighborIds = mode === 'children' ? this.adjacency[nodeId] || [] : this.revAdj[nodeId] || [];

    const nodesToShow: string[] = [];
    const nodesToHide: string[] = [];
    const edgesToShow: string[] = [];
    const edgesToHide: string[] = [];

    const allVisible = neighborIds.every((id) => visibleNodes.has(id));

    if (!allVisible) {
      // expansion
      neighborIds.forEach((nid) => {
        if (!visibleNodes.has(nid)) {
          nodesToShow.push(nid);
        }
      });

      this.edges.forEach((e) => {
        if (!visibleEdges.has(e.id)) {
          const involves = neighborIds.includes(e.source) || neighborIds.includes(e.target);
          const connectsVisible = visibleNodes.has(e.source) || visibleNodes.has(e.target);
          if (involves && connectsVisible) {
            edgesToShow.push(e.id);
          }
        }
      });
    } else {
      // collapse
      neighborIds.forEach((nid) => {
        // remove edge between nodeId and neighbor
        this.edges.forEach((e) => {
          if (e.source === nodeId && e.target === nid) {
            edgesToHide.push(e.id);
          }
        });
        // check if neighbor would have any other visible edges left
        const stillConnected = this.edges.some((e) => {
          if (edgesToHide.includes(e.id)) return false;
          if (!visibleEdges.has(e.id)) return false;
          if (e.source === nodeId && e.target === nid) return false;
          const involvesNeighbor = e.source === nid || e.target === nid;
          return involvesNeighbor;
        });
        if (!stillConnected) {
          nodesToHide.push(nid);
        }
      });
    }

    return { mode, nodesToShow, nodesToHide, edgesToShow, edgesToHide };
  }

  applyDelta(delta: GraphDelta): void {
    const nodeMap: Record<string, NodeData> = {};
    this.nodes.forEach((n) => {
      nodeMap[n.id] = n;
    });
    delta.nodesToShow.forEach((id) => {
      const n = nodeMap[id];
      if (n) n.visible = true;
    });
    delta.nodesToHide.forEach((id) => {
      const n = nodeMap[id];
      if (n) n.visible = false;
    });

    const edgeMap: Record<string, EdgeData> = {};
    this.edges.forEach((e) => {
      edgeMap[e.id] = e;
    });
    delta.edgesToShow.forEach((id) => {
      const e = edgeMap[id];
      if (e) e.visible = true;
    });
    delta.edgesToHide.forEach((id) => {
      const e = edgeMap[id];
      if (e) e.visible = false;
    });
  }
}

export default GraphState;
