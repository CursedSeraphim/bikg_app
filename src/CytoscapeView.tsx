// CytoscapeView.tsx
import * as React from 'react';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import dagre from 'cytoscape-dagre';
import cytoscapeLasso from 'cytoscape-lasso';
import { useDispatch, useSelector } from 'react-redux';
import chroma from 'chroma-js';
import {
  selectSelectedViolations,
  selectCytoData,
  setSelectedTypes,
  selectSelectedTypes,
  selectViolationsTypeMap,
  selectViolations,
  selectSelectedViolationExemplars,
  setSelectedViolationExemplars,
} from './components/Store/CombinedSlice';
import { treeLayout, getSuccessors, rotateNodes, findRootNodes, moveCollectionToCoordinates } from './CytoscapeNodeFactory';

cytoscape.use(cytoscapeLasso);
cytoscape.use(dagre);
cytoscape.use(coseBilkent);

const CY_LAYOUT = {
  name: 'cose-bilkent',
  idealEdgeLength: 500,
  nodeDimensionsIncludeLabels: true,
};

// Function to align nodes
function alignNodes(nodes, parentNodePosition, isChild) {
  const nodeLayoutOffsetX = 500;
  const distanceBetweenNodesY = 70;
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

// Helper function to hide nodes
const hideVisibleNodes = (nodeList) => {
  nodeList.current.forEach((nodeCollection) => {
    nodeCollection.forEach((node) => {
      if (node.data('permanent') === false) {
        node.style('display', 'none');
        node.data('visible', false);
      }
    });
  });

  // return empty to clear nodeList.current
  return [];
};

// Helper function to apply styles to nodes
const styleCytoElements = (element, display, color) => {
  element.style({
    display,
    'background-color': color,
  });
  element.data('visible', true);
};

// Helper function to get nodes from ids
const getNodesFromIds = (ids, cy) => {
  let nodes = cy.collection();
  ids.forEach((id) => {
    nodes = nodes.union(cy.getElementById(id));
  });
  return nodes;
};

function CytoscapeView({ rdfOntology, onLoaded }) {
  const [cy, setCy] = React.useState<cytoscape.Core | null>(null);
  const selectedTypes = useSelector(selectSelectedTypes);
  const selectedViolationExemplars = useSelector(selectSelectedViolationExemplars);
  const selectedViolations = useSelector(selectSelectedViolations);
  const violationsTypesMap = useSelector(selectViolationsTypeMap);
  const violations = useSelector(selectViolations);
  const dispatch = useDispatch();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = React.useState(true); // setLoading wouldn't work if we removed loading
  const initialNodePositions = React.useRef(new Map());

  function handleNodeSelection(newCy: cytoscape.Core) {
    const selectedNodes = newCy.nodes(':selected');
    const selectedNodeTypes = selectedNodes.map((node) => node.data().id);

    // Filter out duplicates
    const uniqueSelectedNodeTypes = [...new Set(selectedNodeTypes)];

    if (selectedNodes.length === 0) {
      // If no nodes were selected in the lasso, deselect all types
      dispatch(setSelectedTypes([]));
      dispatch(setSelectedViolationExemplars([]));
    } else {
      // Dispatch setSelectedTypes action with the new list of selected types
      dispatch(setSelectedTypes(uniqueSelectedNodeTypes));
    }
  }

  // TODO can be implemented with hash map of selected nodes, and of type->node for efficiency
  React.useEffect(() => {
    if (cy && selectedTypes) {
      // Iterate over all nodes
      cy.nodes().forEach((node) => {
        const nodeType = node.data().id;
        if (selectedTypes.includes(nodeType)) {
          node.style('background-color', 'steelblue');
        } else if (violations.includes(nodeType)) {
          node.style('background-color', 'orange');
        } else {
          node.style('background-color', 'lightgrey');
        }
      });
    }
  }, [cy, selectedTypes, violations]);

  const listOfNodesThatHaveBeenMadeVisible = React.useRef([]);

  /**
   * Add a virtual root to the collection and connect it to the provided roots.
   * @param {Collection} roots - The roots to which the virtual root should be connected.
   * @returns {Node} The added virtual root node.
   */
  function addVirtualRoot(roots) {
    const virtualRoot = cy.add({
      group: 'nodes',
      data: { id: 'virtualRoot' },
    });
    roots.forEach((node) => {
      cy.add({
        group: 'edges',
        data: {
          source: virtualRoot.id(),
          target: node.id(),
          label: 'virtualParent',
        },
      });
    });
    return virtualRoot;
  }

  /**
   * Resets the positions of nodes to their initial state and hides nodes with (0,0) positions.
   * @param {Collection} nodes - The collection of nodes to reset.
   */
  function resetNodePositions(nodes) {
    let nodesToHide = cy.collection();

    nodes.forEach((node) => {
      const pos = initialNodePositions.current.get(node.id());
      if (pos) {
        node.position(pos);

        if (pos.x === 0 && pos.y === 0) {
          nodesToHide = nodesToHide.union(node);
        }
      }
    });

    nodesToHide.style('display', 'none');
    nodesToHide.data('visible', false);
  }

  /**
   * Fetch and categorize nodes based on violations, types, and exemplars.
   * @returns {Object} An object containing categorized nodes: violationNodes, typeNodes, otherNodes, and exemplarNodes.
   */
  function getFilteredNodes() {
    const violationNodes = getNodesFromIds(selectedViolations, cy);
    const connectedNodesIds = selectedViolations.flatMap((violation) => violationsTypesMap[violation]);

    const typeNodeIds = connectedNodesIds.filter((node) => selectedTypes.includes(node));
    const otherNodeIds = connectedNodesIds.filter((node) => !selectedTypes.includes(node));

    return {
      violationNodes,
      typeNodes: getNodesFromIds(typeNodeIds, cy),
      otherNodes: getNodesFromIds(otherNodeIds, cy),
      exemplarNodes: getNodesFromIds(selectedViolationExemplars, cy),
    };
  }

  /**
   * Apply styles and display settings to nodes based on their categorization.
   * @param {Collection} violationNodes - Nodes representing violations.
   * @param {Collection} typeNodes - Nodes representing types.
   * @param {Collection} otherNodes - Other nodes.
   * @param {Collection} exemplarNodes - Nodes representing exemplars.
   */
  function styleAndDisplayNodes(violationNodes, typeNodes, otherNodes, exemplarNodes) {
    styleCytoElements(violationNodes, 'element', 'orange');
    styleCytoElements(otherNodes, 'element', 'lightgrey');
    styleCytoElements(typeNodes, 'element', 'steelblue');
    styleCytoElements(exemplarNodes, 'element', 'purple');

    exemplarNodes.outgoers().targets().data('visible', true);
    exemplarNodes.outgoers().targets().style('display', 'element');

    listOfNodesThatHaveBeenMadeVisible.current.push(violationNodes, otherNodes, exemplarNodes, typeNodes);
  }

  /**
   * Adjust the layout of nodes for better visibility and organization.
   * @param {Collection} violationNodes - Nodes representing violations.
   * @param {Collection} typeNodes - Nodes representing types.
   * @param {Collection} otherNodes - Other nodes.
   * @param {Collection} exemplarNodes - Nodes representing exemplars.
   */
  function adjustLayout(violationNodes, typeNodes, otherNodes, exemplarNodes) {
    const potentialRoots = typeNodes.union(otherNodes);
    const everything = typeNodes.union(otherNodes).union(violationNodes).union(exemplarNodes).union(getSuccessors(exemplarNodes));
    const roots = findRootNodes(potentialRoots);
    const layoutSpacing = { x: 70, y: 500 };

    if (roots?.length > 1) {
      const virtualRoot = addVirtualRoot(roots);
      treeLayout(virtualRoot, layoutSpacing, virtualRoot.union(everything));
      cy.remove(virtualRoot);
    } else if (roots?.length === 1) {
      const root = roots[0];
      treeLayout(root, layoutSpacing, everything);
    }

    rotateNodes(everything, -90);
    const bb = cy.nodes().difference(everything).boundingBox();
    moveCollectionToCoordinates(everything, bb.x2);
  }

  /**
   * Hide all nodes that have previously been made visible. Convenience function using the listOfNodesThatHaveBeenMadeVisible ref.
   */
  function hideAllVisibleNodes() {
    listOfNodesThatHaveBeenMadeVisible.current = hideVisibleNodes(listOfNodesThatHaveBeenMadeVisible);
  }

  React.useEffect(() => {
    if (!cy || !selectedViolations) return;

    hideAllVisibleNodes();
    resetNodePositions(cy.nodes());

    const { violationNodes, typeNodes, otherNodes, exemplarNodes } = getFilteredNodes();

    styleAndDisplayNodes(violationNodes, typeNodes, otherNodes, exemplarNodes);
    adjustLayout(violationNodes, typeNodes, otherNodes, exemplarNodes);

    cy.style().update();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cy, selectedViolations, selectedTypes, violationsTypesMap, selectedViolationExemplars]);

  React.useEffect(() => {
    selectCytoData(rdfOntology)
      .then((data) => {
        const newCytoData = { ...data };
        newCytoData.nodes = newCytoData.nodes.map((node) => ({
          ...node,
          data: {
            ...node.data,
            violation: violations.includes(node.data.id),
          },
        }));
        if (cy) {
          // Update the cytoData elements and layout
          cy.elements().remove();
          cy.add(newCytoData);
          cy.lassoSelectionEnabled(true);
          cy.fit();
          cy.layout({ ...CY_LAYOUT, eles: cy.elements(':visible') }).run();
          cy.ready(() => {
            onLoaded();
            setLoading(false);
            cy.nodes().forEach((node) => {
              const pos = node.position();
              initialNodePositions.current.set(node.data('id'), { x: pos.x, y: pos.y });
            });
            // find a cleaner solution
            setTimeout(() => cy.fit(cy.elements(), 50), 1000); // Add a delay of 1 second before fitting the view
          });
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
                  label: 'data(label)',
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
                selector: 'node[?violation]',
                style: {
                  'background-color': 'orange',
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
                  label: (ele) => (ele.data('labelVisible') ? ele.data('label') : ''),
                },
              },
            ],

            layout: CY_LAYOUT,
          });

          let lassoSelectionInProgress = false;

          newCy.on('tap', 'edge', (event) => {
            const edge = event.target;
            const currentLabelVisible = edge.data('labelVisible');

            if (currentLabelVisible) {
              // If the label is currently visible, hide it
              edge.data('labelVisible', false);
            } else {
              // If the label is currently hidden, show it
              edge.data('labelVisible', true);
            }
          });

          newCy.on('boxstart', () => {
            lassoSelectionInProgress = true;
            newCy.nodes(':selected').unselect();
          });

          newCy.on('mousemove', (event) => {
            if (lassoSelectionInProgress) {
              event.originalEvent.preventDefault();
            }
          });

          newCy.on('mouseover', 'node', (event) => {
            const node = event.target;
            const currentColor = node.style('background-color');

            if (!node.data('original-color')) {
              // store the current color in the node's data so we can retrieve it later
              node.data('original-color', currentColor);
            }

            const darkerColor = chroma(currentColor).darken().hex(); // darken the current color

            node
              .animation({
                style: { 'background-color': darkerColor },
                duration: 50,
              })
              .play();
          });

          newCy.on('mouseout', 'node', (event) => {
            const node = event.target;
            const originalColor = node.data('original-color'); // get the original color from data

            node
              .animation({
                style: { 'background-color': originalColor },
                duration: 50,
              })
              .play();
          });

          newCy.on('boxend', () => {
            // TODO differentiate handling type nodes and violation nodes
            handleNodeSelection(newCy);
            lassoSelectionInProgress = false;
          });

          // Function to display nodes and their connections to sourceNode
          const showNodesGivenSource = (nodes, sourceNode) => {
            nodes.style('display', 'element');
            nodes.data('visible', true);

            // Display edges between sourceNode and nodes in the collection
            const connectedEdges = nodes.edgesWith(sourceNode);
            connectedEdges.style('display', 'element');
            connectedEdges.data('visible', true);
          };

          // Function to hide nodes and their connections to sourceNode
          const hideNodesGivenSource = (nodes, sourceNode) => {
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
              showNodesGivenSource(children, node);
              alignNodes(children, parentNodePosition, true);
            } else if (event.originalEvent.shiftKey) {
              // If shiftKey is pressed, show nodes and align parents
              const incomers = node.incomers().sources();
              showNodesGivenSource(incomers, node);
              alignNodes(incomers, parentNodePosition, false);
            } else {
              // Check if there is a predecessor with an edge having the label 'rdfs:subClassOf' to this node. If not, return
              const successors = node.successors();
              const hasPredecessorWithSubClassOf = successors
                .edges()
                .some((edge) => edge.data('label') === 'rdfs:subClassOf' && edge.data('source') === node.id());
              if (!hasPredecessorWithSubClassOf) {
                return;
              }
              node.stop(); // Stop any animation that is currently running
              node.removeData('original-color');
              newCy.nodes().unselect();
              node.select();
              setTimeout(() => handleNodeSelection(newCy), 0);
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
              hideNodesGivenSource(children, node);
            } else if (event.originalEvent.shiftKey) {
              hideNodesGivenSource(node.incomers(), node);
            } else {
              hideNodesGivenSource(node, node);
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

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rdfOntology]);

  return <div id="cy" />;
}

export default CytoscapeView;
