import { useEffect, useRef } from 'react';
import { Core } from 'cytoscape';
import { useDispatch } from 'react-redux';
import { ActionFunction } from '../../types';
import { setSelectedTypes, setSelectedViolationExemplars, setSelectedViolations } from '../Store/CombinedSlice';

export function useRegisterCytoscapeEventListeners(cy: Core | null, toggleChildren: ActionFunction) {
  const dispatch = useDispatch();
  // const prevSelectedTypes = useRef([]);
  // const prevSelectedViolations = useRef([]);
  // const prevSelectedExemplars = useRef([]);

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

      console.log('ndoe selected?', node.selected());

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

    // const handleSelect = (evt) => {
    //   console.log('selected');
    //   const selectedTypes = [];
    //   const selectedViolations = [];
    //   const selectedExemplars = [];

    //   cy.$(':selected').forEach((selectedNode) => {
    //     if (selectedNode.data('type')) {
    //       selectedTypes.push(selectedNode.id());
    //     }
    //     if (selectedNode.data('violation')) {
    //       selectedViolations.push(selectedNode.id());
    //     }
    //     if (selectedNode.data('exemplar')) {
    //       selectedExemplars.push(selectedNode.id());
    //     }
    //   });

    //   const selectedTypesStr = JSON.stringify(selectedTypes.sort());
    //   const selectedViolationsStr = JSON.stringify(selectedViolations.sort());
    //   const selectedExemplarsStr = JSON.stringify(selectedExemplars.sort());

    //   if (selectedTypesStr !== JSON.stringify(prevSelectedTypes.current)) {
    //     console.log('types: ', selectedTypes);
    //     console.log('prev types: ', prevSelectedTypes.current);
    //     dispatch(setSelectedTypes(selectedTypes));
    //     prevSelectedTypes.current = selectedTypes;
    //   }
    //   if (selectedViolationsStr !== JSON.stringify(prevSelectedViolations.current)) {
    //     dispatch(setSelectedViolations(selectedViolations));
    //     prevSelectedViolations.current = selectedViolations;
    //   }
    //   if (selectedExemplarsStr !== JSON.stringify(prevSelectedExemplars.current)) {
    //     dispatch(setSelectedViolationExemplars(selectedExemplars));
    //     prevSelectedExemplars.current = selectedExemplars;
    //   }
    // };

    cy.on('dblclick', 'node', handleDblClick);
    // cy.on('select', 'node', handleSelect);
    cy.on('mouseover', 'node', handleMouseover);

    cy.on('mouseout', 'node', handleMouseout);

    return () => {
      cy.off('dblclick', 'node', handleDblClick);
      // cy.off('select', 'node', handleSelect);
      cy.off('mouseover', 'node', handleMouseover);
      cy.off('mouseout', 'node', handleMouseout);
    };
  }, [cy, toggleChildren, dispatch]); // Only re-run the effect if cy, toggleChildren, or dispatch changes
}
