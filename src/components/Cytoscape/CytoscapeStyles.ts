// CytoscapeStyles.ts
import {
  SELECTED_DEFAULT_COLOR,
  SELECTED_EXEMPLAR_NODE_COLOR,
  SELECTED_TYPE_NODE_COLOR,
  SELECTED_VIOLATION_NODE_COLOR,
  UNSELECTED_DEFAULT_COLOR,
  UNSELECTED_EXEMPLAR_NODE_COLOR,
  UNSELECTED_TYPE_NODE_COLOR,
  UNSELECTED_VIOLATION_NODE_COLOR,
} from '../../constants';

export function nodeStyleBase(getShapeForNamespace) {
  return {
    shape: (ele) => getShapeForNamespace(ele.data('namespace')),
    'background-color': UNSELECTED_DEFAULT_COLOR,
    label: 'data(label)',
    display: (ele) => (ele.data('visible') ? 'element' : 'none'),
  };
}

export function edgeStyleBase() {
  return {
    width: 3,
    'line-color': UNSELECTED_DEFAULT_COLOR, // '#ccc',
    'target-arrow-color': UNSELECTED_DEFAULT_COLOR, // '#ccc',
    'target-arrow-shape': 'triangle',
    'curve-style': 'bezier',
  };
}

export function getStyle(getShapeForNamespace) {
  return [
    // Base node style
    {
      selector: 'node',
      style: nodeStyleBase(getShapeForNamespace),
    },
    // General selected node style
    {
      selector: 'node:selected',
      style: {
        ...nodeStyleBase(getShapeForNamespace),
        'background-color': SELECTED_DEFAULT_COLOR,
      },
    },
    {
      selector: 'node[?violation]',
      style: {
        ...nodeStyleBase(getShapeForNamespace),
        'background-color': UNSELECTED_VIOLATION_NODE_COLOR,
      },
    },
    {
      selector: 'node[?violation]:selected',
      style: {
        ...nodeStyleBase(getShapeForNamespace),
        'background-color': SELECTED_VIOLATION_NODE_COLOR,
      },
    },
    {
      selector: 'node[?exemplar]',
      style: {
        ...nodeStyleBase(getShapeForNamespace),
        'background-color': UNSELECTED_EXEMPLAR_NODE_COLOR,
      },
    },
    {
      selector: 'node[?exemplar]:selected',
      style: {
        ...nodeStyleBase(getShapeForNamespace),
        'background-color': SELECTED_EXEMPLAR_NODE_COLOR,
      },
    },
    {
      selector: 'node[?type]',
      style: {
        ...nodeStyleBase(getShapeForNamespace),
        'background-color': UNSELECTED_TYPE_NODE_COLOR,
      },
    },
    {
      selector: 'node[?type]:selected',
      style: {
        ...nodeStyleBase(getShapeForNamespace),
        'background-color': SELECTED_TYPE_NODE_COLOR,
      },
    },
    // Base edge style
    {
      selector: 'edge',
      style: {
        ...edgeStyleBase(),
        label: '',
      },
    },
    // Selected edge style
    {
      selector: 'edge:selected',
      style: {
        ...edgeStyleBase(),
        label: (ele) => ele.data('label'),
      },
    },
  ];
}
