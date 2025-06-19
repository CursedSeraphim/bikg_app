import { CanvasEdge, CanvasNode } from '../D3NldTypes';
import { GraphDelta, IPreviewService } from './GraphInterfaces';

/** Simple preview service that exposes ghost node/edge arrays. */
export class PreviewService implements IPreviewService {
  ghostNodes: CanvasNode[] = [];

  ghostEdges: CanvasEdge[] = [];

  private nodeMap: Record<string, CanvasNode>;

  private edgeMap: Record<string, CanvasEdge>;

  constructor(nodeMap: Record<string, CanvasNode>, edgeMap: Record<string, CanvasEdge>) {
    this.nodeMap = nodeMap;
    this.edgeMap = edgeMap;
  }

  showPreview(delta: GraphDelta): void {
    this.ghostNodes = delta.nodesToShow.map((id) => {
      const base = this.nodeMap[id];
      return { ...(base || { id, label: id, color: '#888' }), ghost: true };
    });
    this.ghostEdges = delta.edgesToShow.map((id) => {
      const base = this.edgeMap[id];
      return base ? { ...base, ghost: true } : { source: '', target: '', label: '', visible: true, ghost: true };
    });
    delta.edgesToHide.forEach((id) => {
      const base = this.edgeMap[id];
      if (base) this.ghostEdges.push({ ...base, previewRemoval: true });
    });
  }

  clearPreview(): void {
    this.ghostNodes = [];
    this.ghostEdges = [];
  }
}

export default PreviewService;
