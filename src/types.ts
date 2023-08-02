export interface OntologyNode {
  name: string;
  children: OntologyNode[];
}

export type OntologyMap = { [key: string]: OntologyNode };

export type CsvCell = string | number | undefined;

export interface CsvData {
  Id: string;
  x?: number;
  y?: number;
  focus_node?: string;
  [key: string]: CsvCell;
}

export interface CytoNode {
  data: {
    id: string;
    label?: string;
    selected?: boolean;
    visible?: boolean;
    permanent?: boolean;
    violation?: boolean;
  };
  position?: {
    x: number;
    y: number;
  };
  grabbable?: boolean;
  locked?: boolean;
}
export interface CytoEdge {
  data: {
    id: string;
    source: string;
    target: string;
    label?: string;
    visible?: boolean;
    permanent?: boolean;
  };
}
export interface CytoData {
  nodes: CytoNode[];
  edges: CytoEdge[];
}

export interface RdfState {
  rdfString: string;
}

export interface CombinedState {
  samples: CsvData[];
  selectedNodes: string[];
  selectedTypes: string[];
  selectedViolations: string[];
  rdfString: string;
  violations: string[]; // list of possible violation source shapes
  violationTypesMap: { [key: string]: string[] }; // map of violation sh:PropertyShapes to their corresponding owl:Class and the sh:NodeShapes in between
  typesViolationMap: { [key: string]: string[] }; // map of owl:Classes to their corresponding sh:PropertyShapes and the sh:NodeShapes in between
}

export interface Triple {
  s: string;
  p: string;
  o: string;
}
