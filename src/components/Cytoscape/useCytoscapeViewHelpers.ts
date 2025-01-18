// src/components/Cytoscape/useCytoscapeViewHelpers.ts
import { Core, NodeCollection, NodeSingular } from 'cytoscape';
import { DISTANCE_BETWEEN_NODES_Y, NODE_LAYOUT_OFFSET_X } from '../../constants';
import { Position } from '../../types';

export const showAllEdges = (cy: Core) => {
  const edges = cy.edges();
  edges.removeClass('hidden').addClass('visible');
  edges.data('visible', true);
};

export const useCytoViewHelpers = (cy: Core | null) => {
  if (!cy) return {};

  const toggleVisibility = (nodes: NodeCollection, shouldShow: boolean) => {
    const nodesToToggle = nodes.filter((node) => !node.data('permanent'));
    shouldShow ? nodesToToggle.removeClass('hidden').addClass('visible') : nodesToToggle.removeClass('visible').addClass('hidden');
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

  const hideNode = (node: NodeSingular): void => {
    if (!node.data('permanent')) {
      node.data('visible', false);
      node.removeClass('visible');
      node.addClass('hidden');
    }
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
    hideNode,
  };
};
