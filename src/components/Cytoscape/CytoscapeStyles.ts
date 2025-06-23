// CytoscapeStyles.ts
import {
  MANTINE_HEADER_COLOR,
  SELECTED_DEFAULT_COLOR,
  SELECTED_GROUP_NODE_COLOR,
  SELECTED_TYPE_NODE_COLOR,
  SELECTED_VIOLATION_NODE_COLOR,
  UNSELECTED_DEFAULT_COLOR,
  UNSELECTED_GROUP_NODE_COLOR,
  UNSELECTED_TYPE_NODE_COLOR,
  UNSELECTED_VIOLATION_NODE_COLOR,
} from '../../constants';

export function nodeStyleBase(getShapeForNamespace) {
  return {
    shape: (ele) => getShapeForNamespace(ele.data('namespace')),
    'background-color': UNSELECTED_DEFAULT_COLOR,
    label: 'data(label)',
    display: (ele) => (ele.data('permanent') ? 'element' : 'none'),
  };
}

export function edgeStyleBase() {
  return {
    width: 3,
    'line-color': UNSELECTED_DEFAULT_COLOR, // '#ccc',
    'target-arrow-color': UNSELECTED_DEFAULT_COLOR, // '#ccc',
    'target-arrow-shape': 'triangle',
    'curve-style': 'bezier',
    label: (ele) => (ele.data('labelVisible') ? ele.data('label') : ''),
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
        'background-color': SELECTED_DEFAULT_COLOR,
      },
    },
    {
      selector: 'node[?violation]',
      style: {
        'background-color': UNSELECTED_VIOLATION_NODE_COLOR,
      },
    },
    {
      selector: 'node[?violation]:selected',
      style: {
        'background-color': SELECTED_VIOLATION_NODE_COLOR,
      },
    },
    {
      selector: 'node[?group]',
      style: {
        'background-color': UNSELECTED_GROUP_NODE_COLOR,
      },
    },
    {
      selector: 'node[?group]:selected',
      style: {
        'background-color': SELECTED_GROUP_NODE_COLOR,
      },
    },
    {
      selector: 'node[?type]',
      style: {
        'background-color': UNSELECTED_TYPE_NODE_COLOR,
      },
    },
    {
      selector: 'node[?type]:selected',
      style: {
        'background-color': SELECTED_TYPE_NODE_COLOR,
      },
    },
    {
      selector: 'node.hidden',
      style: {
        display: 'none',
      },
    },
    {
      selector: 'node.visible',
      style: {
        display: 'element',
      },
    },
    {
      selector: 'node[?violation].hidden',
      style: {
        display: 'none',
      },
    },
    {
      selector: 'node[?violation].visible',
      style: {
        display: 'element',
      },
    },
    {
      selector: 'node[?group].hidden',
      style: {
        display: 'none',
      },
    },
    {
      selector: 'node[?group].visible',
      style: {
        display: 'element',
      },
    },
    {
      selector: 'node[?type].hidden',
      style: {
        display: 'none',
      },
    },
    {
      selector: 'node[?type].visible',
      style: {
        display: 'element',
      },
    },
    {
      selector: 'node[?blacklistedLabel]',
      style: {
        display: 'none',
      },
    },
    {
      selector: 'node[?blacklistedLabel].visible',
      style: {
        display: 'none',
      },
    },

    // Base edge style
    {
      selector: 'edge',
      style: {
        ...edgeStyleBase(),
      },
    },
    {
      selector: 'edge.hidden',
      style: {
        display: 'none',
        label: '',
      },
    },
    {
      selector: 'edge.visible',
      style: {
        display: 'element',
      },
    },
    // Selected edge style
    {
      selector: 'edge:selected',
      style: {
        'line-color': MANTINE_HEADER_COLOR,
        width: 5,
        'target-arrow-color': MANTINE_HEADER_COLOR,
        'arrow-scale': 1.5,
      },
    },
    {
      selector: 'edge:selected.hidden',
      style: {
        display: 'none',
      },
    },
    {
      selector: 'edge:selected.visible',
      style: {
        display: 'element',
      },
    },
  ];
}
