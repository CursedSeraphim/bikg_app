// useSubscribeCytoscape.ts
import React, { useEffect } from 'react';
import { Core } from 'cytoscape';
import { useStore } from 'react-redux';
import { IRootState } from '../../types';
import { getSuccessors } from '../../CytoscapeNodeFactory';
import { adjustLayout, getFilteredNodes, hideAllVisibleNodes, resetNodes, showCytoElements, styleAndDisplayNodes } from './TreeLayoutHelpers';

const extractSelectedData = (state) => {
  return {
    selectedTypes: state.combined.selectedTypes,
    selectedViolationExemplars: state.combined.selectedViolationExemplars,
    selectedViolations: state.combined.selectedViolations,
  };
};

const clearSelectedNodes = (cyInstance: Core) => {
  cyInstance.$(':selected').unselect();
};

const selectNodes = (cyInstance: Core, attribute: string, values: string[]) => {
  values.forEach((value) => {
    cyInstance.$(`node[${attribute}="${value}"]`).select();
  });
};

// const logSelectedNodes = (cyInstance: Core) => {
//   console.log('Print all selected nodes:');
//   cyInstance.$(':selected').forEach((node) => {
//     console.log(node.id());
//   });
// };

// Custom Hook
export const useSubscribeCytoscape = (cy: Core | null, initialNodeData, showAllPermanentEdges) => {
  const store = useStore<IRootState>();

  useEffect(() => {
    // Subscribe to changes
    const unsubscribe = store.subscribe(() => {
      console.time('cyto useeffect');
      const state = store.getState();
      const violationsTypesMap = state.combined.violationTypesMap;
      const { selectedTypes, selectedViolationExemplars, selectedViolations } = extractSelectedData(state);

      if (cy && initialNodeData.current && initialNodeData.current.size > 0) {
        console.log('');
        console.time('clear');
        clearSelectedNodes(cy);
        console.timeEnd('clear');
        console.time('show');
        showAllPermanentEdges();
        console.timeEnd('show');
        console.time('reset');
        resetNodes(cy, initialNodeData.current);
        console.timeEnd('reset');

        console.time('getfilter');
        const { violationNodes, typeNodes, otherNodes, exemplarNodes } = getFilteredNodes(
          cy,
          selectedViolations,
          violationsTypesMap,
          selectedTypes,
          selectedViolationExemplars,
        );
        console.timeEnd('getfilter');
        console.time('style&display');
        showCytoElements(violationNodes.union(otherNodes).union(typeNodes).union(exemplarNodes).union(exemplarNodes.outgoers().targets()));
        console.timeEnd('style&display');
        console.time('adjst');
        adjustLayout(cy, violationNodes, typeNodes, otherNodes, exemplarNodes);
        console.timeEnd('adjst');

        // TODO check why this triggers a selection of typeNodes with an empty array afterwards
        console.time('unionsel');
        violationNodes.union(typeNodes).union(otherNodes).union(exemplarNodes).union(getSuccessors(exemplarNodes)).select();
        console.timeEnd('unionsel');

        const ex = cy.edges().filter((edge) => edge.data('label').includes('ns1:hasExemplar') && edge.source().data('label').includes('hasStudyType'));
        console.log('ex.data("id")', ex.data('id'));
        console.log('ex.data("visible")', ex.data('visible'));
        console.log('ex.data("permanent")', ex.data('permanent'));
        console.log('ex.style().display', ex.style('display'));

        console.log('targets', ex.targets(), ex.targets());
        console.log('sources', ex.sources(), ex.sources());
      }
    });

    // Cleanup
    return () => {
      unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cy, initialNodeData]);
};
