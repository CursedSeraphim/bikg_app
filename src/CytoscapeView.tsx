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

// Function to align nodes
function alignNodes(nodes, parentNodePosition, isChild) {
  const nodeLayoutOffsetX = 250;
  const distanceBetweenNodesY = 50;
  const totalHeight = distanceBetweenNodesY * (nodes.length - 1);
  const positionX = isChild ? parentNodePosition.x + nodeLayoutOffsetX : parentNodePosition.x - nodeLayoutOffsetX;

  nodes.data('visible', true);
  nodes.forEach((node, index) => {
    if (!node.data('permanent')) {
      node.position({
        x: positionX,
        y: parentNodePosition.y + distanceBetweenNodesY * index - totalHeight / 2,
      });
    }
  });
}

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

          // Function to display nodes and their connections to sourceNode
          const showNodes = (nodes, sourceNode) => {
            nodes.style('display', 'element');
            nodes.data('visible', true);

            // Display edges between sourceNode and nodes in the collection
            const connectedEdges = nodes.edgesWith(sourceNode);
            connectedEdges.style('display', 'element');
            connectedEdges.data('visible', true);
          };

          // Function to hide nodes and their connections to sourceNode
          const hideNodes = (nodes, sourceNode) => {
            nodes.forEach((node) => {
              const connectedEdge = sourceNode.edgesWith(node);

              // Only hide nodes that are not 'permanent'
              if (node.data('permanent') === false) {
                node.data('visible', false);
                node.style('display', 'none');

                // Hide edge if both nodes are not 'permanent'
                if (sourceNode.data('permanent') === false) {
                  connectedEdge.style('display', 'none');
                  connectedEdge.data('visible', false);
                }
              } else {
                connectedEdge.style('display', 'element');
              }
            });
          };

          // Event handlers for tap and cxttap events
          newCy.on('tap', 'node', (event) => {
            if (lassoSelectionInProgress) {
              return;
            }

            const node = event.target;
            const edges = node.connectedEdges();
            const children = edges.targets().filter((child) => child.id() !== node.id());
            const parentNodePosition = node.position();

            // If ctrlKey is pressed, show nodes and align children
            if (event.originalEvent.ctrlKey) {
              showNodes(children, node);
              alignNodes(children, parentNodePosition, true);
            } else if (event.originalEvent.shiftKey) {
              // If shiftKey is pressed, show nodes and align parents
              const incomers = node.incomers();
              showNodes(incomers, node);
              alignNodes(incomers, parentNodePosition, false);
            }
          });

          newCy.on('cxttap', 'node', (event) => {
            if (lassoSelectionInProgress) {
              return;
            }

            const node = event.target;
            const edges = node.connectedEdges();
            const children = edges.targets().filter((child) => child.id() !== node.id());

            // Hide nodes based on key press events
            if (event.originalEvent.ctrlKey) {
              hideNodes(children, node);
            } else if (event.originalEvent.shiftKey) {
              hideNodes(node.incomers(), node);
            } else {
              hideNodes(node, node);
            }
          });

          // Prevent the default context menu from appearing on right click
          newCy.on('cxttapstart cxttapend', (event) => event.originalEvent.preventDefault());

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
