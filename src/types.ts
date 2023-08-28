import { Core, NodeSingular } from 'cytoscape';

export type Position = { x: number; y: number };

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
    exemplar?: boolean;
    namespace: string;
    defaultColor?: string;
    selectedColor?: string;
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
    namespace: string;
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

export interface INamespaceInfo {
  namespace: string;
  node_count: number;
  edge_count: number;
}

export interface INamespaces {
  [prefix: string]: INamespaceInfo;
}

export type GetShapeForNamespaceFn = (namespace?: string) => string;

export interface UseShapeHandlerReturnType {
  getShapeForNamespace: GetShapeForNamespaceFn;
}

export interface IRootState {
  combined: ICombinedState;
}

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
  namespaces: INamespaces;
  types: string[];
}

export interface ITriple {
  s: string;
  p: string;
  o: string;
}

// Defines the signature of the function that performs an action
export type ActionFunction = (target: NodeSingular) => void;

// Defines what a menu item looks like
export type MenuItem = {
  id: string;
  content: string;
  selector: string;
  onClickFunction: (event: NodeSingular) => void;
};

// Defines what the context menu options look like
export type ContextMenuOptions = {
  menuItems: MenuItem[];
};

// Defines the shape of the 'actions' object passed to getContextMenuOptions
export type ContextMenuActions = Record<string, ActionFunction>;

export type SetCyFn = React.Dispatch<React.SetStateAction<Core | null>>;

export type SetLoadingFn = React.Dispatch<React.SetStateAction<boolean>>;
