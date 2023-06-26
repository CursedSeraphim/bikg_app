// CytoscapeView.tsx
import * as React from 'react';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import cytoscapeLasso from 'cytoscape-lasso';
import { useDispatch, useSelector } from 'react-redux';
import { selectCytoData, setSelectedTypes, selectSelectedTypes } from './components/Store/CombinedSlice';

cytoscape.use(cytoscapeLasso);
cytoscape.use(coseBilkent);

interface CytoscapeViewProps {
  rdfOntology: string;
}

function CytoscapeView({ rdfOntology }: CytoscapeViewProps) {
  const [cy, setCy] = React.useState<cytoscape.Core | null>(null);
  const [setCytoData] = React.useState(null);
  const selectedTypes = useSelector(selectSelectedTypes);
  const dispatch = useDispatch();

  React.useEffect(() => {
    if (cy && selectedTypes) {
      // Iterate over all nodes
      cy.nodes().forEach((node) => {
        const nodeType = node.data().id;
        const nodeTypeUrl = nodeType;

        // If the node's type (in URL format) is in selectedTypes, select the node and set its color to 'steelblue'
        if (selectedTypes.includes(nodeTypeUrl)) {
          // node.select(); removing this call such that the user interaction event doesn't get triggered. TODO if the selected nodes are important this has to be implemented differently
          node.style('background-color', 'steelblue');
        } else {
          // If the node's type (in URL format) is not in selectedTypes, unselect the node and set its color back to 'lightgrey'
          // node.unselect(); removing this call such that the user interaction event doesn't get triggered. TODO if the selected nodes are important this has to be implemented differently
          node.style('background-color', 'lightgrey');
        }
      });
    }
  }, [cy, selectedTypes]);

  React.useEffect(() => {
    selectCytoData({ rdf: { rdfString: rdfOntology } })
      .then((data) => {
        const newCytoData = data;
        if (cy) {
          // Update the cytoData elements and layout
          cy.elements().remove();
          cy.add(newCytoData);
          cy.lassoSelectionEnabled(true);
          cy.fit();
          cy.layout({ name: 'cose-bilkent', idealEdgeLength: 500, nodeDimensionsIncludeLabels: true }).run();
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
                },
              },
              {
                selector: 'node[?selected]', // previously 'node:selected' which works for the default selection
                style: {
                  'background-color': 'steelblue',
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
                  label: 'data(id)',
                },
              },
            ],

            layout: {
              name: 'cose-bilkent',
              idealEdgeLength: 500,
              nodeDimensionsIncludeLabels: true,
            },
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

          newCy.on('select', 'node', (event) => {
            // Ignore the event if a lasso selection is in progress
            if (lassoSelectionInProgress) {
              return;
            }

            const nodeType = event.target.data().id;

            // Dispatch setSelectedTypes action with the new selected type
            dispatch(setSelectedTypes([nodeType]));
          });

          newCy.on('unselect', 'node', (event) => {
            // Ignore the event if a lasso selection is in progress
            if (lassoSelectionInProgress) {
              return;
            }

            const nodeType = event.target.data().id;
            let newSelectedTypes = [...selectedTypes];

            // Remove the node type from the selectedTypes array
            newSelectedTypes = newSelectedTypes.filter((type) => type !== nodeType);

            // Dispatch setSelectedTypes action with the new list of selected types
            dispatch(setSelectedTypes(newSelectedTypes));
          });

          setCy(newCy);
        }
      })
      .catch((error) => {
        console.error('Failed to generate Cytoscape data:', error);
      });
  }, [cy, rdfOntology]);

  return <div id="cy" />;
}

export default CytoscapeView;
