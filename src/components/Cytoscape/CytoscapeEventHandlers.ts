import { useEffect } from 'react';
import { Core } from 'cytoscape';
import { useDispatch } from 'react-redux';
import { ActionFunction } from '../../types';

export function useRegisterCytoscapeEventListeners(cy: Core | null, toggleChildren: ActionFunction) {
  const dispatch = useDispatch();

  useEffect(() => {
    if (!cy) {
      return () => {};
    }

    const handleDblClick = (evt) => {
      const node = evt.target;
      toggleChildren(node);
    };

    const handleMouseover = (event) => {
      const node = event.target;
      node.stop(); // Stop any ongoing animation

      node
        .animation({
          style: {
            // 'background-color': node.selected() ? determineDeselectColor(node) : determineSelectColor(node),
            'border-color': 'black',
            'border-width': '3px',
          },
          duration: 30,
        })
        .play();
    };

    const handleMouseout = (event) => {
      const node = event.target;
      node.stop(); // Stop any ongoing animation

      node
        .animation({
          style: {
            // 'background-color': node.selected() ? determineSelectColor(node) : determineDeselectColor(node),
            'border-color': 'black',
            'border-width': '0px',
          },
          duration: 30,
        })
        .play();
    };

    const handleDblClickEdge = (event) => {
      const edge = event.target;
      const currentLabelVisible = edge.data('labelVisible');

      if (currentLabelVisible) {
        // If the label is currently visible, hide it
        edge.data('labelVisible', false);
      } else {
        // If the label is currently hidden, show it
        edge.data('labelVisible', true);
      }
    };

    cy.on('dblclick', 'node', handleDblClick);
    // cy.on('select', 'node', handleSelect);
    cy.on('mouseover', 'node', handleMouseover);
    cy.on('mouseout', 'node', handleMouseout);
    cy.on('dblclick', 'edge', handleDblClickEdge);

    return () => {
      cy.off('dblclick', 'node', handleDblClick);
      // cy.off('select', 'node', handleSelect);
      cy.off('mouseover', 'node', handleMouseover);
      cy.off('mouseout', 'node', handleMouseout);
      cy.off('dblclick', 'edge', handleDblClickEdge);
    };
  }, [cy, toggleChildren, dispatch]);
}
