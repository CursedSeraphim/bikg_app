// tools.ts
import { DynamicTool } from 'langchain/tools';
import { useDispatch, useStore } from 'react-redux';
import { IRootState } from '../../types';
import { setSelectedTypes, setSelectedViolationExemplars, setSelectedViolations } from '../Store/CombinedSlice';

const parseArrayString = (arrayString) => {
  const array = arrayString.replace(/[[\]\s]/g, '').split(',');
  const lowerCaseFirstLetter = (str) => {
    // Remove surrounding quotes if present
    const strippedStr = str.replace(/^"|"$/g, '');
    // Convert first letter to lowercase and return
    return strippedStr.charAt(0).toLowerCase() + strippedStr.slice(1);
  };
  return array.filter((item) => item).map(lowerCaseFirstLetter);
};

const useTools = () => {
  const dispatch = useDispatch();
  const store = useStore<IRootState>();

  const handleLLMSetTypes = (a) => {
    const parsedArray = parseArrayString(a);
    dispatch(setSelectedTypes(parsedArray));
    return a;
  };

  const handleLLMSetViolations = (violations) => {
    const parsedViolations = parseArrayString(violations);
    dispatch(setSelectedViolations(parsedViolations));
    return violations;
  };

  const handleLLMSetViolationExemplars = (exemplars) => {
    const parsedExemplars = parseArrayString(exemplars);
    dispatch(setSelectedViolationExemplars(parsedExemplars));
    return exemplars;
  };

  const getExistingTypes = async (): Promise<string> => {
    const state = store.getState();
    const { types } = state.combined;
    return JSON.stringify(types);
  };

  const getExistingViolations = async (): Promise<string> => {
    const state = store.getState();
    const { violations } = state.combined;
    return JSON.stringify(violations);
  };

  const getExistingExemplars = async (): Promise<string> => {
    const state = store.getState();
    const { exemplarMap } = state.combined;
    const exemplarKeys = Object.keys(exemplarMap);
    return JSON.stringify(exemplarKeys);
  };

  const getRDFOntology = async (): Promise<string> => {
    const state = store.getState();
    const { rdfString } = state.combined;
    return JSON.stringify(rdfString);
  };

  const getOriginalInstanceData = async (): Promise<string> => {
    const state = store.getState();
    const { originalInstanceData } = state.combined;
    return JSON.stringify(originalInstanceData);
  };

  const getOriginalViolationReport = async (): Promise<string> => {
    const state = store.getState();
    const { originalViolationReport } = state.combined;
    return JSON.stringify(originalViolationReport);
  };

  const getSelectedTypes = async (): Promise<string> => {
    const state = store.getState();
    const { selectedTypes } = state.combined;
    return JSON.stringify(selectedTypes);
  };

  const getFocusNodeByName = async (input: string): Promise<string> => {
    const state = store.getState();
    const { samples } = state.combined;
    const samplesFiltered = samples.filter((sample) => sample.focus_node === input);
    console.log(samplesFiltered);
    return JSON.stringify(samplesFiltered);
  };

  const getSelectedViolations = async (): Promise<string> => {
    const state = store.getState();
    const { selectedViolations } = state.combined;
    return JSON.stringify(selectedViolations);
  };

  const getSelectedViolationExemplars = async (): Promise<string> => {
    const state = store.getState();
    const { selectedViolationExemplars } = state.combined;
    return JSON.stringify(selectedViolationExemplars);
  };

  const getNumberViolationsPerNode = async (): Promise<string> => {
    const state = store.getState();
    const { numberViolationsPerNode } = state.combined;
    let ret = '';
    Object.keys(numberViolationsPerNode).forEach((key) => {
      ret += `${key}: ${numberViolationsPerNode[key].violations}\n`;
    });
    return ret;
  };

  // const findNodeByIdSubstring = (tree, substr) => {
  //   let path = [];

  //   function traverse(node, currentPath) {
  //     if (node.id.includes(substr)) {
  //       path = [...currentPath, node.id];
  //       return node;
  //     }

  //     for (const child of node.children || []) {
  //       const result = traverse(child, [...currentPath, node.id]);
  //       if (result) {
  //         return result;
  //       }
  //     }

  //     return null;
  //   }

  //   const foundNode = traverse(tree, []);

  //   if (!foundNode) {
  //     return 'Node not found';
  //   }

  //   let output = `Node ID: ${foundNode.id}\n`;

  //   if (path.length > 1) {
  //     output += `Parents: ${path.slice(0, -1).join(' -> ')}\n`;
  //   } else {
  //     output += 'No parents\n';
  //   }

  //   if (foundNode.children && foundNode.children.length) {
  //     output += `Children: ${foundNode.children.map((child) => child.id).join(', ')}\n`;
  //   } else {
  //     output += 'No children\n';
  //   }

  //   return output;
  // };

  return [
    new DynamicTool({
      name: 'select_types',
      func: handleLLMSetTypes,
      description: 'Selects an array of type or owl:Class nodes in the knowledge graph ontology, e.g., ["Omics:Donor", "Omics:Sample"]',
    }),
    new DynamicTool({
      name: 'select_constraints',
      func: handleLLMSetViolations,
      description: 'Selects a list of selected SHACL constraints.',
    }),
    new DynamicTool({
      name: 'select_reported_violations',
      func: handleLLMSetViolationExemplars,
      description: 'Selects a list of reported violations that appear in the data.',
    }),
    new DynamicTool({
      name: 'get_existing_types/classes',
      func: getExistingTypes,
      description: 'Returns a list of types/classes in the ontology',
    }),
    new DynamicTool({
      name: 'get_existing_constraints',
      func: getExistingViolations,
      description: 'Returns a list of SHACL constraints in the ontology',
    }),
    new DynamicTool({
      name: 'get_reported_violations',
      func: getExistingExemplars,
      description: 'Returns a list of violation exemplars in the ontology',
    }),
    // new DynamicTool({
    //   name: 'find_node_by_id_substring',
    //   func: findNodeByIdSubstring,
    //   description: 'Returns the node and its parents and children in the ontology tree given a substring of the node id',
    // }),
    new DynamicTool({
      name: 'get_selected_classes',
      func: getSelectedTypes,
      description: 'Returns the types/classes that are currently selected in this vis tool',
    }),
    new DynamicTool({
      name: 'get_selected_constraints',
      func: getSelectedViolations,
      description: 'Returns the SHACL constraints that are currently selected in this vis tool',
    }),
    new DynamicTool({
      name: 'get_selected_reported_violations',
      func: getSelectedViolationExemplars,
      description: 'Returns the reported violations that are currently selected in this vis tool',
    }),
    new DynamicTool({
      name: 'get_number_violations_per_node',
      func: getNumberViolationsPerNode,
      description: 'Returns the number of violations per node in the ontology tree',
    }),
    new DynamicTool({
      name: 'get_rdf_ontology',
      func: getRDFOntology,
      description: 'Returns the entire ontology graph including SHACL constraints as RDF text',
    }),
    new DynamicTool({
      name: 'get_original_instance_data',
      func: getOriginalInstanceData,
      description: 'Returns the entire original instance data RDF as text',
    }),
    new DynamicTool({
      name: 'get_original_violation_report',
      func: getOriginalViolationReport,
      description: 'Returns the entire original violation report RDF as text',
    }),
    new DynamicTool({
      name: 'get_focus_node_by_name',
      func: getFocusNodeByName,
      description: 'Takes the name of a focus node and returns the detailed information about that node',
    }),
  ];
};

export default useTools;
