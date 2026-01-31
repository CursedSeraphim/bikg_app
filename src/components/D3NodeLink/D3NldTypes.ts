// File: src/components/D3NodeLink/D3NldTypes.ts

import type { NodeShape } from './D3NldUtils';

export type NodeSource = 'ontology' | 'instance' | 'violation' | 'unknown' | 'report';

export interface CanvasNode {
  id: string;
  label: string;
  color: string;
  shape: NodeShape;
  sources?: NodeSource[];
  x?: number;
  y?: number;
  fx?: number | null;
  fy?: number | null;
  /** Velocity components used by d3-force */
  vx?: number;
  vy?: number;
  /** When true the node is only shown as a semi transparent preview */
  ghost?: boolean;
  /** When true the node participates in the current coordinated selection */
  selected?: boolean;
  /** Convenience flags for node metadata */
  violation?: boolean;
  exemplar?: boolean;
  type?: boolean;
  /** rdf:type class for the node if known */
  isAClass?: string | null;
}

export interface CanvasEdge {
  id?: string;
  source: string | CanvasNode;
  target: string | CanvasNode;
  label?: string;
  visible: boolean;
  color?: string;
  /** Preview edges used for ghost nodes */
  ghost?: boolean;
  /** Marks edges that connect currently selected nodes */
  selected?: boolean;
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
