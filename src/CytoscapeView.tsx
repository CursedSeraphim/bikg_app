// CytoscapeView.tsx
import * as React from 'react';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import cytoscapeLasso from 'cytoscape-lasso';
import { useDispatch, useSelector } from 'react-redux';
import { selectSelectedViolations, selectCytoData, setSelectedTypes, selectSelectedTypes } from './components/Store/CombinedSlice';

cytoscape.use(cytoscapeLasso);
cytoscape.use(coseBilkent);

interface CytoscapeViewProps {
  rdfOntology: string;
}

const CY_LAYOUT = {
  name: 'cose-bilkent',
  idealEdgeLength: 500,
  nodeDimensionsIncludeLabels: true,
};

function CytoscapeView({ rdfOntology }: CytoscapeViewProps) {
  const [cy, setCy] = React.useState<cytoscape.Core | null>(null);
  const selectedTypes = useSelector(selectSelectedTypes);
  const selectedViolations = useSelector(selectSelectedViolations);
  const dispatch = useDispatch();

  React.useEffect(() => {
    if (cy && selectedTypes) {
      // Iterate over all nodes
      cy.nodes().forEach((node) => {
        const nodeType = node.data().id;

        if (selectedTypes.includes(nodeType)) {
          node.style('background-color', 'steelblue');
        } else {
          node.style('background-color', 'lightgrey');
        }
      });
    }
  }, [cy, selectedTypes]);

  React.useEffect(() => {
    selectCytoData({ combined: { rdfString: rdfOntology, samples: [], selectedNodes: [], selectedViolations, selectedTypes, violations: [] } })
      .then((data) => {
        const newCytoData = data;
        if (cy) {
          // Update the cytoData elements and layout
          cy.elements().remove();
          cy.add(newCytoData);
          cy.lassoSelectionEnabled(true);
          cy.fit();
          cy.layout({ ...CY_LAYOUT, eles: cy.elements(':visible') }).run();
        } else {
          const newCy = cytoscape({
            container: document.getElementById('cy'), // container to render in
            wheelSensitivity: 0.2,
            elements: newCytoData,
            style: [
              {
                selector: 'node',
                style: {
                  'background-color': 'lightgrey', // previously #666
                  label: 'data(id)',
                  display: (ele) => (ele.data('visible') ? 'element' : 'none'),
                },
              },
              {
                selector: 'node[?selected]', // previously 'node:selected' which works for the default selection
                style: {
                  'background-color': 'steelblue',
                  display: (ele) => (ele.data('visible') ? 'element' : 'none'),
                },
              },

              {
                selector: 'edge',
                style: {
                  width: 3,
                  'line-color': '#ccc',
                  'target-arrow-color': '#ccc',
                  'target-arrow-shape': 'triangle',
                  'curve-style': 'bezier',
                  // label: 'data(id)',
                },
              },
            ],

            layout: CY_LAYOUT,
          });

          let lassoSelectionInProgress = false;

          newCy.on('boxstart', () => {
            newCy.nodes(':selected').unselect();
          });

          newCy.on('boxend', () => {
            const selectedNodes = newCy.nodes(':selected');
            const selectedNodeTypes = selectedNodes.map((node) => node.data().id);

            // Filter out duplicates
            const uniqueSelectedNodeTypes = [...new Set(selectedNodeTypes)];

            if (selectedNodes.length === 0) {
              // If no nodes were selected in the lasso, deselect all types
              dispatch(setSelectedTypes([]));
            } else {
              // Dispatch setSelectedTypes action with the new list of selected types
              dispatch(setSelectedTypes(uniqueSelectedNodeTypes));
            }

            lassoSelectionInProgress = false;
          });

          newCy.on('tap', 'node', (event) => {
            if (lassoSelectionInProgress) {
              return;
            }
            const node = event.target;
            const edges = node.connectedEdges();
            const children = edges.targets().filter((child) => child.id() !== node.id());
            children.style('display', 'element');
            edges.style('display', 'element');
            node.predecessors().style('display', 'element');
            children.layout(CY_LAYOUT).run();
          });

          newCy.on('cxttap', 'node', (event) => {
            if (lassoSelectionInProgress) {
              return;
            }
            const node = event.target;
            node.successors().style('display', 'none');
          });

          // Prevent the default context menu from appearing on right click
          newCy.on('cxttapstart cxttapend', (event) => {
            event.originalEvent.preventDefault();
          });

          // in this version the left click shows all children if some are still hidden and hides all successors if all are visible
          // newCy.on('tap', 'node', (event) => {
          //   // Ignore the event if a lasso selection is in progress
          //   if (lassoSelectionInProgress) {
          //     return;
          //   }
          //   const node = event.target;
          //   const edges = node.connectedEdges();
          //   // get the children and filter out the current node if it's included
          //   const children = edges.targets().filter((child) => child.id() !== node.id());

          //   // Check whether all children are hidden
          //   const someChildrenHidden = children.some((child) => child.style('display') === 'none');
          //   if (someChildrenHidden) {
          //     children.style('display', 'element');
          //     edges.style('display', 'element');
          //     children.layout(CY_LAYOUT).run();
          //   } else {
          //     node.successors().style('display', 'none');
          //   }
          // });

          // newCy.on('unselect', 'node', (event) => {
          //   // Ignore the event if a lasso selection is in progress
          //   if (lassoSelectionInProgress) {
          //     return;
          //   }

          //   const nodeType = event.target.data().id;
          //   let newSelectedTypes = [...selectedTypes];

          //   // Remove the node type from the selectedTypes array
          //   newSelectedTypes = newSelectedTypes.filter((type) => type !== nodeType);

          //   // Dispatch setSelectedTypes action with the new list of selected types
          //   dispatch(setSelectedTypes(newSelectedTypes));
          // });

          setCy(newCy);
        }
      })
      .catch((error) => {
        console.error('Failed to generate Cytoscape data:', error);
      });
  }, [rdfOntology, selectedTypes, selectedViolations]);

  return <div id="cy" />;
}

export default CytoscapeView;
