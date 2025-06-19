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
