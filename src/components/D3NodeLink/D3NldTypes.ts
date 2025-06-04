// File: src/components/D3NodeLink/D3NldTypes.ts

export interface CanvasNode {
  id: string;
  label: string;
  color: string;
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  /** If true the node is only rendered as a semi transparent preview */
  ghost?: boolean;
  /**
   * When set to 'remove' the node will be highlighted to indicate that it would
   * be removed on toggle. Can be extended with additional highlight modes if
   * needed.
   */
  highlight?: 'remove';
}

export interface CanvasEdge {
  source: string | CanvasNode;
  target: string | CanvasNode;
  label?: string;
  visible: boolean;
  ghost?: boolean;
  highlight?: 'remove';
}

export type D3NLDViewProps = {
  rdfOntology: string;
  onLoaded?: () => void;
};
