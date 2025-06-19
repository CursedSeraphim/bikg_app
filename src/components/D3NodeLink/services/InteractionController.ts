import { GraphDelta, ExpansionMode, IInteractionController, IPreviewService, ICommitService, ILayoutService, IGraphState } from './GraphInterfaces';

export class InteractionController implements IInteractionController {
  private lastDelta: GraphDelta | null = null;

  constructor(
    private state: IGraphState,
    private preview: IPreviewService,
    private commitService: ICommitService,
    private layout: ILayoutService,
  ) {}

  onHover(nodeId: string, modifiers: { ctrl: boolean; shift: boolean }): void {
    const mode: ExpansionMode | null = modifiers.ctrl ? 'children' : modifiers.shift ? 'parents' : null;
    if (!mode) return;
    const delta = this.state.computeDelta(nodeId, mode);
    this.lastDelta = delta;
    this.preview.showPreview(delta);
    this.layout.freeze();
  }

  onHoverEnd(): void {
    this.preview.clearPreview();
  }

  onDoubleClick(nodeId: string, modifiers: { ctrl: boolean; shift: boolean }): void {
    const mode: ExpansionMode | null = modifiers.ctrl ? 'children' : modifiers.shift ? 'parents' : null;
    if (!mode) return;
    if (!this.lastDelta || this.lastDelta.mode !== mode) {
      const delta = this.state.computeDelta(nodeId, mode);
      this.lastDelta = delta;
    }
    if (this.lastDelta) {
      this.commitService.commit(this.lastDelta);
      this.preview.clearPreview();
      this.layout.freeze();
    }
  }

  onDragStart(): void {
    this.preview.clearPreview();
    this.layout.unfreezeOnDragStart();
  }
}

export default InteractionController;
