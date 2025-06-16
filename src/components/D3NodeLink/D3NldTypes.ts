// File: src/components/D3NodeLink/D3NldTypes.ts

export interface CanvasNode {
  id: string;
  label: string;
  color: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  /** Velocity components used by d3-force */
  vx?: number;
  vy?: number;
  /** When true the node is only shown as a semi transparent preview */
  ghost?: boolean;
}

export interface CanvasEdge {
  source: string | CanvasNode;
  target: string | CanvasNode;
  label?: string;
  visible: boolean;
  /** Preview edges used for ghost nodes */
  ghost?: boolean;
  /** Highlight existing edge that would be removed on confirm */
  previewRemoval?: boolean;
}

export type D3NLDViewProps = {
  rdfOntology: string;
  onLoaded?: () => void;
  /**
   * When true or a number, centers the force simulation on initialization.
   * A numeric value specifies the delay in milliseconds before the centering
   * force is removed. Defaults to ~1000ms when set to true.
   */
  initialCentering?: boolean | number;
};
