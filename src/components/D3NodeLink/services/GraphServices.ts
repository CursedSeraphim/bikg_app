export type ExpansionMode = 'children' | 'parents';

export interface GraphDelta {
  mode: ExpansionMode;
  nodesToShow: string[];
  nodesToHide: string[];
  edgesToShow: string[];
  edgesToHide: string[];
}

export interface IGraphState {
  getVisibleNodeIds(): Set<string>;
  getVisibleEdgeIds(): Set<string>;
  computeDelta(nodeId: string, mode: ExpansionMode): GraphDelta;
  applyDelta(delta: GraphDelta): void;
}

export interface IPreviewService {
  showPreview(delta: GraphDelta): void;
  clearPreview(): void;
}

export interface ICommitService {
  commit(delta: GraphDelta): void;
}

export interface ILayoutService {
  freeze(): void;
  unfreezeOnDragStart(): void;
  attachDragListener(): void;
}

export interface IInteractionController {
  onHover(nodeId: string, modifiers: { ctrl: boolean; shift: boolean }): void;
  onHoverEnd(): void;
  onDoubleClick(nodeId: string, modifiers: { ctrl: boolean; shift: boolean }): void;
  onDragStart(): void;
}

export interface CytoscapeNode { data: { id: string; label?: string; visible: boolean } }
export interface CytoscapeEdge { data: { id: string; source: string; target: string; label?: string; visible: boolean } }

export class GraphState implements IGraphState {
  private nodes: CytoscapeNode[];
  private edges: CytoscapeEdge[];
  private adjacency: Record<string, string[]>;
  private revAdj: Record<string, string[]>;

  constructor(nodes: CytoscapeNode[], edges: CytoscapeEdge[], adjacency: Record<string, string[]>, revAdj: Record<string, string[]>) {
    this.nodes = nodes;
    this.edges = edges;
    this.adjacency = adjacency;
    this.revAdj = revAdj;
  }

  getVisibleNodeIds(): Set<string> {
    return new Set(this.nodes.filter((n) => n.data.visible).map((n) => n.data.id));
  }

  getVisibleEdgeIds(): Set<string> {
    return new Set(this.edges.filter((e) => e.data.visible).map((e) => e.data.id));
  }

  computeDelta(nodeId: string, mode: ExpansionMode): GraphDelta {
    const neighborIds = mode === 'children' ? this.adjacency[nodeId] || [] : this.revAdj[nodeId] || [];
    const visible = this.getVisibleNodeIds();
    const visibleEdges = this.getVisibleEdgeIds();
    const nodesToShow: Set<string> = new Set();
    const nodesToHide: Set<string> = new Set();
    const edgesToShow: Set<string> = new Set();
    const edgesToHide: Set<string> = new Set();

    const anyHidden = neighborIds.some((nid) => !visible.has(nid));

    if (anyHidden) {
      // expansion preview
      neighborIds.forEach((nid) => {
        if (!visible.has(nid)) nodesToShow.add(nid);
      });
      this.edges.forEach((edge) => {
        const { id, source, target } = edge.data;
        if (nodesToShow.has(source) && visible.has(target)) edgesToShow.add(id);
        if (nodesToShow.has(target) && visible.has(source)) edgesToShow.add(id);
        if ((source === nodeId && nodesToShow.has(target)) || (target === nodeId && nodesToShow.has(source))) {
          edgesToShow.add(id);
        }
      });
    } else {
      // collapse preview
      neighborIds.forEach((nid) => {
        this.edges.forEach((edge) => {
          const { id, source, target } = edge.data;
          if ((source === nodeId && target === nid) || (target === nodeId && source === nid)) {
            edgesToHide.add(id);
          }
        });
        const stillConnected = this.edges.some((edge) => {
          const { id, source, target } = edge.data;
          if (!visibleEdges.has(id)) return false;
          if ((source === nodeId && target === nid) || (source === nid && target === nodeId)) return false;
          if (source === nid && visible.has(target)) return true;
          if (target === nid && visible.has(source)) return true;
          return false;
        });
        if (!stillConnected) nodesToHide.add(nid);
      });
    }

    return {
      mode,
      nodesToShow: Array.from(nodesToShow),
      nodesToHide: Array.from(nodesToHide),
      edgesToShow: Array.from(edgesToShow),
      edgesToHide: Array.from(edgesToHide),
    };
  }

  applyDelta(delta: GraphDelta) {
    const { nodesToShow, nodesToHide, edgesToShow, edgesToHide } = delta;
    this.nodes.forEach((n) => {
      if (nodesToShow.includes(n.data.id)) n.data.visible = true;
      if (nodesToHide.includes(n.data.id)) n.data.visible = false;
    });
    this.edges.forEach((e) => {
      if (edgesToShow.includes(e.data.id)) e.data.visible = true;
      if (edgesToHide.includes(e.data.id)) e.data.visible = false;
    });
  }
}
