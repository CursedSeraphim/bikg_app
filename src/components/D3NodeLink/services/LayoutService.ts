import { Simulation } from 'd3';
import { CanvasNode, CanvasEdge } from '../D3NldTypes';
import { ILayoutService } from './GraphInterfaces';

export class LayoutService implements ILayoutService {
  constructor(private simulationRef: React.MutableRefObject<Simulation<CanvasNode, CanvasEdge> | null>) {}

  freeze(): void {
    const sim = this.simulationRef.current;
    if (!sim) return;
    sim.alphaTarget(0).alpha(0);
    sim.nodes().forEach((n) => {
      // eslint-disable-next-line no-param-reassign
      n.fx = n.x;
      // eslint-disable-next-line no-param-reassign
      n.fy = n.y;
    });
  }

  unfreezeOnDragStart(): void {
    const sim = this.simulationRef.current;
    if (sim) {
      sim.nodes().forEach((n) => {
        // eslint-disable-next-line no-param-reassign
        n.fx = null;
        // eslint-disable-next-line no-param-reassign
        n.fy = null;
      });
      sim.alphaTarget(0.3).restart();
    }
  }

  attachDragListener(): void {
    // Provided externally via D3ForceGraph
  }
}

export default LayoutService;
