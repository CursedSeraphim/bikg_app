// File: src/components/D3NodeLink/D3NldTypes.ts

export interface CanvasNode {
  id: string;
  label: string;
  color: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
}

export interface CanvasEdge {
  source: string | CanvasNode;
  target: string | CanvasNode;
  label?: string;
  visible: boolean;
}

export type D3NLDViewProps = {
  rdfOntology: string;
  onLoaded?: () => void;
};
