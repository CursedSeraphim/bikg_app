
export interface OntologyNode {
  name: string;
  children: OntologyNode[];
}

export type OntologyMap = { [key: string]: OntologyNode; };
