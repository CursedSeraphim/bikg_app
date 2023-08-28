// useCytoViewHelpers.ts
import { Core, NodeSingular, NodeCollection } from 'cytoscape';
import { NODE_LAYOUT_OFFSET_X, DISTANCE_BETWEEN_NODES_Y } from '../../constants';
import { Position } from '../../types';

export const useViewUtilities = (cy: Core | null) => {
  if (!cy) return {};

  const viewUtilities = cy.viewUtilities({
    neighbor(node): NodeCollection {
      return node.closedNeighborhood();
    },
    neighborSelectTime: 500,
  });

  const toggleVisibility = (nodes: NodeCollection, shouldShow: boolean) => {
    const nodesToToggle = nodes.filter((node) => !node.data('permanent'));
    shouldShow ? viewUtilities.show(nodesToToggle) : viewUtilities.hide(nodesToToggle);
  };

  const alignNodes = (nodes: NodeCollection, parentNode: NodeSingular, isChild: boolean): void => {
    const parentNodePosition: Position = parentNode.position();
    const totalHeight = DISTANCE_BETWEEN_NODES_Y * (nodes.length - 1);
    const positionX = isChild ? parentNodePosition.x + NODE_LAYOUT_OFFSET_X : parentNodePosition.x - NODE_LAYOUT_OFFSET_X;

    nodes.forEach((node) => node.data('visible', true));

    nodes
      .filter((node) => !node.data('permanent'))
      .forEach((node, index) => {
        node.position({
          x: positionX,
          y: parentNodePosition.y + DISTANCE_BETWEEN_NODES_Y * index - totalHeight / 2,
        });
      });
  };

  const toggleChildren = (node: NodeSingular): void => {
    const children = node.outgoers().targets();
    const anyChildHidden = children.some((child) => child.hidden());
    toggleVisibility(children, anyChildHidden);
    if (anyChildHidden) alignNodes(children, node, true);
  };

  const toggleParents = (node: NodeSingular): void => {
    const parents = node.incomers().sources();
    const anyParentHidden = parents.some((parent) => parent.hidden());
    toggleVisibility(parents, anyParentHidden);
    if (anyParentHidden) alignNodes(parents, node, false);
  };

  return {
    toggleChildren,
    toggleParents,
  };
};
