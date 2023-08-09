export interface IOntologyNode {
  name: string;
  children: IOntologyNode[];
}

export type OntologyMap = { [key: string]: IOntologyNode };

export type CsvCell = string | number | undefined;

export interface ICsvData {
  Id: string;
  x?: number;
  y?: number;
  focus_node?: string;
  [key: string]: CsvCell;
}

export interface ICytoNode {
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
export interface ICytoEdge {
  data: {
    id: string;
    source: string;
    target: string;
    label?: string;
    visible?: boolean;
    permanent?: boolean;
  };
}
export interface ICytoData {
  nodes: ICytoNode[];
  edges: ICytoEdge[];
}

export interface IRdfState {
  rdfString: string;
}

export type EdgeCountDict = {
  [url: string]: {
    [edgeString: string]: number;
  };
};

export type FocusNodeExemplarDict = {
  [focusNodeUrl: string]: string[];
};

export type ExemplarFocusNodeDict = {
  [exemplarUrl: string]: string[];
};

export type FilterType = 'none' | 'unimodal' | 'nan';

export type MissingEdgeOptionType = 'remove' | 'keep';

// export interface IPrefixes {
//   [key: string]: string; // The key is the prefix, and the value is the corresponding URI
// }

export interface ICombinedState {
  samples: ICsvData[];
  originalSamples: ICsvData[];
  selectedNodes: string[];
  selectedTypes: string[];
  selectedViolations: string[];
  rdfString: string;
  violations: string[]; // list of possible violation source shapes
  violationTypesMap: { [key: string]: string[] }; // map of violation sh:PropertyShapes to their corresponding owl:Class and the sh:NodeShapes in between
  typesViolationMap: { [key: string]: string[] }; // map of owl:Classes to their corresponding sh:PropertyShapes and the sh:NodeShapes in between
  filterType: FilterType;
  missingEdgeOption: MissingEdgeOptionType;
  edgeCountDict: EdgeCountDict;
  focusNodeExemplarDict: FocusNodeExemplarDict;
  exemplarFocusNodeDict: ExemplarFocusNodeDict;
  selectedViolationExemplars: string[];
  // prefixes: IPrefixes;
}

export interface ITriple {
  s: string;
  p: string;
  o: string;
}
