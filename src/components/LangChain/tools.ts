// tools.ts
import { DynamicTool } from 'langchain/tools';
import { setSelectedTypes, setSelectedViolationExemplars, setSelectedViolations } from '../Store/CombinedSlice';

const parseArrayString = (arrayString) => {
  const array = arrayString.replace(/[\[\]\s]/g, '').split(',');
  const lowerCaseFirstLetter = (str) => {
    // Remove surrounding quotes if present
    const strippedStr = str.replace(/^"|"$/g, '');
    // Convert first letter to lowercase and return
    return strippedStr.charAt(0).toLowerCase() + strippedStr.slice(1);
  };
  return array.filter((item) => item).map(lowerCaseFirstLetter);
};

const handleLLMSetTypes = (dispatch) => (a) => {
  const parsedArray = parseArrayString(a);
  dispatch(setSelectedTypes(parsedArray));
  return a;
};

const handleLLMSetViolations = (dispatch) => (violations) => {
  const parsedViolations = parseArrayString(violations);
  dispatch(setSelectedViolations(parsedViolations));
  return violations;
};

const handleLLMSetViolationExemplars = (dispatch) => (exemplars) => {
  const parsedExemplars = parseArrayString(exemplars);
  dispatch(setSelectedViolationExemplars(parsedExemplars));
  return exemplars;
};

// TODO
const getExistingTypes = (state) => {
  return state.types;
};

export function createTools(dispatch) {
  const tools = [
    new DynamicTool({
      name: 'select_types',
      func: handleLLMSetTypes(dispatch),
      description:
        'Useful for when you need to select an array of certain type or owl:Class nodes in the knowledge graph ontology, e.g., ["Omics:Donor", "Omics:Sample"]',
    }),
    new DynamicTool({
      name: 'select_violations',
      func: handleLLMSetViolations(dispatch),
      description: 'Selects a list of selected violations.',
    }),
    new DynamicTool({
      name: 'select_violation_exemplars',
      func: handleLLMSetViolationExemplars(dispatch),
      description: 'Selects a list of selected violation exemplars.',
    }),
    new DynamicTool({
      name: 'get_existing_types',
      func: getExistingTypes,
      description: 'Returns a list of existing type nodes.',
    }),
  ];
  return tools;
}
