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

          const showNodes = (nodes) => {
            nodes.style('display', 'element');
            nodes.data('visible', true);
          };
          const hideNodes = (nodes) => {
            for (const node of nodes) {
              if (!node.data('permanent')) {
                node.data('visible', false);
                node.style('display', 'none');
              }
            }
          };

          newCy.on('tap', 'node', (event) => {
            if (lassoSelectionInProgress) {
              return;
            }
            const node = event.target;
            const edges = node.connectedEdges();
            const children = edges.targets().filter((child) => child.id() !== node.id());
            edges.style('display', 'element');

            const parentNodePosition = node.position();

            if (event.originalEvent.ctrlKey) {
              showNodes(children);
              const totalHeightChildren = 50 * (children.length - 1);

              children.data('visible', true);
              // TODO remove print each child
              children.forEach((child, index) => {
                console.log(child);
              });

              // Align the children
              children.forEach((child, index) => {
                if (!child.data('permanent')) {
                  child.position({
                    x: parentNodePosition.x + 250,
                    y: parentNodePosition.y + 50 * index - totalHeightChildren / 2,
                  });
                }
              });
            } else if (event.originalEvent.shiftKey) {
              const predecessors = node.predecessors();
              const totalHeightPredecessors = 50 * (predecessors.length - 1);
              showNodes(predecessors);
              // Align the parents
              predecessors.forEach((pred, index) => {
                pred.position({
                  x: parentNodePosition.x - 250,
                  y: parentNodePosition.y + 50 * index - totalHeightPredecessors / 2,
                });
              });
            }
          });

          newCy.on('cxttap', 'node', (event) => {
            if (lassoSelectionInProgress) {
              return;
            }
            const node = event.target;
            const edges = node.connectedEdges();
            const children = edges.targets().filter((child) => child.id() !== node.id());
            if (event.originalEvent.ctrlKey) {
              hideNodes(children);
            } else if (event.originalEvent.shiftKey) {
              hideNodes(node.predecessors());
            } else {
              hideNodes(node);
            }
          });

          // Prevent the default context menu from appearing on right click
          newCy.on('cxttapstart cxttapend', (event) => {
            event.originalEvent.preventDefault();
          });

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
