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

  // const getOntologyTree = async (input: string): Promise<string> => {
  //   const state = store.getState();
  //   const { ontologyTree } = state.combined;
  //   return JSON.stringify(ontologyTree);
  // };

  const getSelectedTypes = async (): Promise<string> => {
    const state = store.getState();
    const { selectedTypes } = state.combined;
    return JSON.stringify(selectedTypes);
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
      name: 'select_violations',
      func: handleLLMSetViolations,
      description: 'Selects a list of selected violations.',
    }),
    new DynamicTool({
      name: 'select_violation_exemplars',
      func: handleLLMSetViolationExemplars,
      description: 'Selects a list of selected violation exemplars.',
    }),
    new DynamicTool({
      name: 'get_existing_types',
      func: getExistingTypes,
      description: 'Returns a list of type nodes in the ontology',
    }),
    new DynamicTool({
      name: 'get_existing_violations',
      func: getExistingViolations,
      description: 'Returns a list of violations in the ontology',
    }),
    new DynamicTool({
      name: 'get_existing_exemplars',
      func: getExistingExemplars,
      description: 'Returns a list of violation exemplars in the ontology',
    }),
    // new DynamicTool({
    //   name: 'find_node_by_id_substring',
    //   func: findNodeByIdSubstring,
    //   description: 'Returns the node and its parents and children in the ontology tree given a substring of the node id',
    // }),
    new DynamicTool({
      name: 'get_selected_types',
      func: getSelectedTypes,
      description: 'Returns the types that are currently selected in this vis tool',
    }),
    new DynamicTool({
      name: 'get_selected_violations',
      func: getSelectedViolations,
      description: 'Returns the violations that are currently selected in this vis tool',
    }),
    new DynamicTool({
      name: 'get_selected_violation_exemplars',
      func: getSelectedViolationExemplars,
      description: 'Returns the violation exemplars that are currently selected in this vis tool',
    }),
    new DynamicTool({
      name: 'get_number_violations_per_node',
      func: getNumberViolationsPerNode,
      description: 'Returns the number of violations per node in the ontology tree',
    }),
  ];
};

export default useTools;
