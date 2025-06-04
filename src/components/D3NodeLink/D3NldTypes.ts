// File: src/components/D3NodeLink/D3NldTypes.ts

export interface CanvasNode {
  id: string;
  label: string;
  color: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
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
};
