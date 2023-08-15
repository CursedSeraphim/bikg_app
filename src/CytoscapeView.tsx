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
import { treeLayout, getChildren, CytoscapeNodeFactory, getNodePositions } from './CytoscapeNodeFactory';

cytoscape.use(cytoscapeLasso);
cytoscape.use(dagre);
cytoscape.use(coseBilkent);

const CY_LAYOUT = {
  name: 'cose-bilkent',
  idealEdgeLength: 500,
  nodeDimensionsIncludeLabels: true,
};

const TREE_LAYOUT = {
  name: 'dagre',
  nodeSep: 20,
  rankSep: 10,
  acyclicer: 'greedy',
  animationDuration: 1000,
};

/**
 * Coordinates a recursive layout for hierarchical nodes in a Cytoscape instance.
 * Each node and its child nodes are positioned into columns recursively.
 * Nodes are first moved down their child tree until leaf nodes are found. These nodes become
 * the rightmost column with their parent node centralized in the left column.
 *
 * Parental node positioning continues leftward, with their accumulated child
 * bounding boxes stacking to their right.
 *
 * At the final top level, nodes receive additional offsetX and offsetY alterations
 * to translate the entire layout in the x and y direction respectively.
 *
 * @param {number} originX - Layout translation amount in the x-axis.
 * @param {number} originY - Layout translation amount in the y-axis.
 * @param {Array} topLevelNodes - Top-level nodes in our graph hierarchy. Each node must have children.
 * @param {Object} cy - The Cytoscape instance in which the visualisation is happening.
 * @return {Object} Computed bounding box for the layout recursively.
 * @throws {Error} If a top-level node does not have any children.
 */
const recursiveLayout = (originX, originY, topLevelNodes, cy) => {
  if (!cy) {
    throw new Error('Cytoscape instance must be defined.');
  }

  if (!topLevelNodes || topLevelNodes.length === 0) {
    return;
  }

  const defaultSeparation = { x: 200, y: 50 };
  const layout = { nodes: {} };
  const processed = new Set();

  const layoutSubgraph = (node, level) => {
    if (processed.has(node.data('id'))) return null;

    processed.add(node.data('id'));

    const children = getChildren(node);
    if (children.length === 0) {
      // leaf node
      const xPos = defaultSeparation.x * level;
      layout.nodes[node.data('id')] = { x: xPos + originX, y: originY };
      return { width: level * defaultSeparation.x, height: defaultSeparation.y, nodes: [node] };
    }
    // parent node
    let totalHeight = 0;

    const listOfChildYPositions = [];

    let nodes = [node];
    // add all children
    nodes = nodes.concat(children);

    children.forEach((childNode) => {
      const childReturn = layoutSubgraph(childNode, level + 1);
      if (childReturn === null) return;
      const childHeight = childReturn.height;
      for (let i = 0; i < childReturn.nodes.length; i++) {
        const child = childReturn.nodes[i];
        const childPosition = child.position();
        child.position({ x: childPosition.x, y: childPosition.y + totalHeight });
        totalHeight += childHeight;
      }
      nodes = nodes.concat(childReturn.nodes);
    });

    const xPos = defaultSeparation.x * level;
    const yPos = listOfChildYPositions.sort()[Math.floor(listOfChildYPositions.length / 2)];
    layout.nodes[node.data('id')] = { x: xPos + level * defaultSeparation.x, y: yPos, nodes };

    return { width: xPos, height: totalHeight - defaultSeparation.y, nodes };
  };

  topLevelNodes.forEach((node) => {
    layoutSubgraph(node, 0);
  });

  cy.batch(() => {
    Object.entries(layout.nodes).forEach(([nodeId, position]) => {
      const node = cy.getElementById(nodeId);
      node.position(position);
    });
  });

  cy.style().update();
};

/**
 * Coordinates a recursive layout for hierarchical nodes in a Cytoscape instance.
 * Each node and its child nodes are positioned into columns recursively.
 * Nodes are first moved down their child tree until leaf nodes are found. These nodes become
 * the rightmost column with their parent node centralized in the left column.
 *
 * Parental node positioning continues leftward, with their accumulated child
 * bounding boxes stacking to their right.
 *
 * At the final top level, nodes receive additional offsetX and offsetY alterations
 * to translate the entire layout in the x and y direction respectively.
 *
 * @param {number} originX - Layout translation amount in the x-axis.
 * @param {number} originY - Layout translation amount in the y-axis.
 * @param {Array} topLevelNodes - Top-level nodes in our graph hierarchy. Each node must have children.
 * @param {Object} cy - The Cytoscape instance in which the visualisation is happening.
 * @return {Object} Computed bounding box for the layout recursively.
 * @throws {Error} If a top-level node does not have any children.
 */
const oldRecursiveLayout = (originX, originY, topLevelNodes, cy) => {
  if (!cy) {
    throw new Error('Cytoscape instance must be defined.');
  }

  if (!topLevelNodes || topLevelNodes.length === 0) {
    return;
  }

  const defaultSeparation = { x: 200, y: 50 };
  const layout = { nodes: {} };
  const processed = new Set();

  const layoutSubgraph = (node, level) => {
    if (processed.has(node.data('id'))) return;
    const indent = '      '.repeat(level);

    processed.add(node.data('id'));

    if (!node.children || node.children.length === 0) {
      layout.nodes[node.data('id')] = { x: originX + level * defaultSeparation.x, y: originY };
      return;
    }

    let offsetY = (-defaultSeparation.y * (node.children.length - 1)) / 2;

    let targetClassNode = false;

    node
      .incomers()
      .edges()
      .forEach((edge) => {
        if (edge.data('id') === 'sh:targetClass') {
          targetClassNode = true;
          edge.sources().forEach((sourceNode) => {
            layout.nodes[sourceNode.data('id')] = { x: originX + level * defaultSeparation.x, y: originY + offsetY };
            offsetY += defaultSeparation.y;
            layoutSubgraph(sourceNode, level + 1);
          });
        }
      });
    if (!targetClassNode) {
      node
        .outgoers()
        .edges()
        .forEach((edge) => {
          edge.targets().forEach((targetNode) => {
            layout.nodes[targetNode.data('id')] = { x: originX + level * defaultSeparation.x, y: originY + offsetY };
            offsetY += defaultSeparation.y;
            layoutSubgraph(targetNode, level + 1);
          });
        });
    }
  };

  topLevelNodes.forEach((node) => {
    layoutSubgraph(node, 0);
  });

  cy.batch(() => {
    Object.entries(layout.nodes).forEach(([nodeId, position]) => {
      const node = cy.getElementById(nodeId);
      node.position(position);
    });
  });

  cy.style().update();
};

const applyLayout = (violationNodes, otherNodes, typeNodes, cy) => {
  cy.nodes().lock();
  violationNodes.unlock();
  otherNodes.unlock();
  typeNodes.unlock();

  // Get the current bounding box of the graph
  const currentBoundingBox = cy.nodes(':visible').boundingBox();

  // Calculate the number of columns and rows
  const numColumns = 3;
  const numRows = Math.max(violationNodes.length, otherNodes.length, typeNodes.length);

  // Define node size and padding
  const nodeSize = 20; // Assume nodes are 80x80
  const padding = 20; // Padding between nodes

  // Calculate the size of the new layout
  const layoutWidth = numColumns * (nodeSize + padding);
  const layoutHeight = numRows * (nodeSize + padding);

  // Calculate the new bounding box
  const newBoundingBox = {
    x1: currentBoundingBox.x2 + padding,
    y1: currentBoundingBox.y2 + padding,
    x2: currentBoundingBox.x2 + padding + layoutWidth,
    y2: currentBoundingBox.y2 + padding + layoutHeight,
  };

  const layout = cy.layout({
    name: 'grid',
    animate: true,
    boundingBox: newBoundingBox,
    animationDuration: 1500,
    animationEasing: 'ease-in-out',
    avoidOverlap: true,
    avoidOverlapPadding: 1,
    nodeDimensionsIncludeLabels: true,
    position: (node) => {
      let col;
      let row;

      if (typeNodes.has(node)) {
        col = 0;
        row = typeNodes.indexOf(node);
      } else if (otherNodes.has(node)) {
        col = 1;
        row = otherNodes.indexOf(node);
      } else if (violationNodes.has(node)) {
        col = 2;
        row = violationNodes.indexOf(node);
      }

      return { row, col };
    },
  });

  layout.run();

  layout.on('layoutstop', () => {
    cy.nodes().unlock();
  });
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

function getNameOfCollection(collection) {
  return collection.map((node) => node.data('id')).join(', ');
}

/**
 * Moves a collection of nodes to a specific position, translating them such that the top left corner
 * of their bounding box aligns with the specified x/y coordinates. The relative distances between the nodes
 * within the collection are preserved.
 *
 * @param {Collection} collection - A Cytoscape collection containing the nodes to be moved. This can be a group
 *                                  of nodes such as children, descendants, etc., of a particular node or a custom
 *                                  collection of nodes.
 * @param {number} x - The x-coordinate for the new top left corner of the collection's bounding box.
 * @param {number} y - The y-coordinate for the new top left corner of the collection's bounding box.
 *
 * @example
 * var targetCollection = cy.nodes("#n1").descendants();
 * moveToPosition(targetCollection, 100, 200);
 */
function moveBoundingBoxToPosition(collection, x, y) {
  // Get the bounding box of the collection
  const boundingBox = collection.boundingBox();

  // Determine the difference between the current position and the desired position
  const deltaX = x - boundingBox.x1;
  const deltaY = y - boundingBox.y1;

  // Apply the translation to each node in the collection
  collection.positions(function (ele) {
    return {
      x: ele.position('x') + deltaX,
      y: ele.position('y') + deltaY,
    };
  });
}

// Dummy function to check if the collection only has one node
function collectionOnlyHasOneNode(collection) {
  // TODO: Implement logic to check if collection contains only one node
  const children = getChildren(collection);
  // children.data('visible', true);
  return children.length === 0;
}

/**
 * Moves a collection of nodes to a specific position, translating them such that the top left corner
 * of their bounding box aligns with the specified x/y coordinates. The relative distances between the nodes
 * within the collection are preserved.
 *
 * @param {Collection} collection - A Cytoscape collection containing the nodes to be moved. This can be a group
 *                                  of nodes such as children, descendants, etc., of a particular node or a custom
 *                                  collection of nodes.
 * @param {number} x - The x-coordinate for the new top left corner of the collection's bounding box.
 * @param {number} y - The y-coordinate for the new top left corner of the collection's bounding box.
 *
 * @example
 * var targetCollection = cy.nodes("#n1").descendants();
 * moveToPosition(targetCollection, 100, 200);
 */
function moveToPosition(collection, x, y) {
  let x1;
  let y1;
  if (collectionOnlyHasOneNode(collection)) {
    x1 = collection.position('x');
    y1 = collection.position('y');
  } else {
    // Get the bounding box of the collection
    const boundingBox = collection.boundingBox();
    x1 = boundingBox.x1;
    y1 = boundingBox.y2;
  }

  // Determine the difference between the current position and the desired position
  const deltaX = x - x1;
  const deltaY = y - y1;

  // Apply the translation to each node in the collection
  collection.positions(function (ele) {
    return {
      x: ele.position('x') + deltaX,
      y: ele.position('y') + deltaY,
    };
  });
}

const offsetY = 50;
const offsetX = 500;

// Dummy function to translate a bounding box below the last one
function translateBoundingBoxBelowTheLastBoundingBox(collection, boundingBox, x, y) {
  moveToPosition(collection, x, y);
}

function positionCollection(collection, x, y) {
  if (collectionOnlyHasOneNode(collection)) {
    return { w: 50, h: 50 };
  }

  let lastHeight = 0;
  let totalHeight = 0;
  collection.forEach((child) => {
    lastHeight = totalHeight;
    const boundingBox = positionCollection(getChildren(child), x + offsetX, y + offsetY + totalHeight);
    translateBoundingBoxBelowTheLastBoundingBox(child, boundingBox, x, y + totalHeight);
    console.log('child position', child.position());
    console.log('bouinding box', boundingBox);
    totalHeight += boundingBox.h;
    // const childPosition = child.position();
    // child.position({ x: childPosition.x, y: lastHeight });
  });

  return collection.boundingBox(); // Returning the bounding box of the collection
}

//   return [width, totalHeight - offsetY2]; // Subtracting offsetY2 to account for the last child's offset
// }

// function alignNodes2(nodes, parentNodePosition, nodeLayoutOffsetX = 250, distanceBetweenNodesY = 50) {
//   if (!nodes || nodes.length === 0) {
//     return;
//   }
//   let totalHeight = 0;
//   if (nodes[0].isNode()) {
//     totalHeight = distanceBetweenNodesY * (nodes.length - 1);
//   } else {
//     for (let i = 0; i < nodes.length; i += 1) {
//       const bb = nodes[i];
//       totalHeight += bb.h + distanceBetweenNodesY;
//     }
//   }
//   const positionX = parentNodePosition.x + nodeLayoutOffsetX;

//   nodes.data('visible', true);
//   nodes.forEach((node, index) => {
//     moveToPosition(node, positionX, distanceBetweenNodesY * index);
//   });
//   moveToPosition(nodes.descendants(), positionX, parentNodePosition.y - totalHeight / 2);
//   // positionNodes(nodes, parentNodePosition, distanceBetweenNodesY, totalHeight);
// }

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

  React.useEffect(() => {
    if (cy && selectedViolations) {
      // hide everything again
      listOfNodesThatHaveBeenMadeVisible.current = hideVisibleNodes(listOfNodesThatHaveBeenMadeVisible);

      // reset positions
      const applyInitialPositions = (nodes) => {
        let nodesToHide = cy.collection();
        nodes.forEach((node) => {
          const pos = initialNodePositions.current.get(node.id());
          if (pos) {
            if (pos.x === 0 && pos.y === 0) {
              nodesToHide = nodesToHide.union(node);
            }
            node.position(pos);
          }
        });
        nodesToHide.style('display', 'none');
        nodesToHide.data('visible', false);
      };
      applyInitialPositions(cy.nodes());

      // select violationNodes, typeNodes, exemplarNodes, and otherNodes
      const violationNodes = getNodesFromIds(selectedViolations, cy);
      const connectedNodesIds = selectedViolations.flatMap((violation) => violationsTypesMap[violation]);

      const typeNodeIds = connectedNodesIds.filter((node) => selectedTypes.includes(node));
      const otherNodeIds = connectedNodesIds.filter((node) => !selectedTypes.includes(node));

      const typeNodes = getNodesFromIds(typeNodeIds, cy);
      const otherNodes = getNodesFromIds(otherNodeIds, cy);

      const exemplarNodes = getNodesFromIds(selectedViolationExemplars, cy);

      const allElementsBoundingBox = cy.elements().boundingBox();

      // unittesting
      // ------------------------------------------

      // factory code to create test fixture
      const factory = new CytoscapeNodeFactory();
      const tree = factory.createTree(2, 2);

      // add tree to cytoscape object
      cy.add(tree);

      const root = cy.getElementById('node-0');

      console.log('getNodePositions(root)', getNodePositions(root));

      // TODO code to select the tree nodes

      treeLayout(root);

      // color nodes, make selection visible
      styleCytoElements(violationNodes, 'element', 'orange');
      styleCytoElements(otherNodes, 'element', 'lightgrey');
      styleCytoElements(typeNodes, 'element', 'steelblue');
      styleCytoElements(exemplarNodes, 'element', 'purple');
      exemplarNodes.outgoers().targets().data('visible', true);
      exemplarNodes.outgoers().targets().style('display', 'element');

      // Add nodes to list of nodes that have been made visible
      listOfNodesThatHaveBeenMadeVisible.current.push(violationNodes, otherNodes, exemplarNodes, typeNodes); // , connectedNodesOfInterest);

      // at the moment this is a cheap solution to show exemplare nodes in the center column. next we want to show attribute nodes for each node, rather than a single connected attribute. then we can do this differently altogether
      // applyLayout(violationNodes, otherNodes.union(exemplarNodes), typeNodes, cy);
      // get bounding box of all nodes
      // const boundingBox = cy.elements().boundingBox();
      // recursiveLayout(boundingBox.w, boundingBox.h, typeNodes.union(exemplarNodes), cy);

      // const connectedEdges = violationNodes.edges().union(otherNodes.edges());

      positionCollection(exemplarNodes, 0, 0);
      moveToPosition(exemplarNodes.union(exemplarNodes.outgoers().targets()), allElementsBoundingBox.x2 + 100, allElementsBoundingBox.y2);

      const collectionIntoColumn = (collection) => {
        for (let i = 0; i < collection.length; i += 1) {
          // translate node down by 50px
          const n = collection[i];
          const nPos = n.position();
          n.position({ x: nPos.x, y: nPos.y + i * 50 });
        }
      };

      typeNodes.position({ x: allElementsBoundingBox.x2, y: allElementsBoundingBox.y2 });
      otherNodes.position({ x: allElementsBoundingBox.x2 + 100, y: allElementsBoundingBox.y2 });
      violationNodes.position({ x: allElementsBoundingBox.x2 + 200, y: allElementsBoundingBox.y2 });
      // exemplarNodes.position({ x: allElementsBoundingBox.x2 + 300, y: allElementsBoundingBox.y2 });
      collectionIntoColumn(typeNodes);
      collectionIntoColumn(violationNodes);
      collectionIntoColumn(otherNodes);
      // collectionIntoColumn(exemplarNodes);

      const boundingBox = typeNodes.union(otherNodes).union(violationNodes).boundingBox();
      console.log('bounding box', boundingBox);

      // moveToPosition(exemplarNodes.union(exemplarNodes.outgoers().targets()), boundingBox.x2, boundingBox.y2);

      // // define offset between groups
      // const offset = 100;
      // // counter to keep track of how far we've moved all the already processed groups
      // let totalH = 0;
      // exemplarNodes.forEach((node) => {
      //   // align exemplpar node and its children
      //   const nodePos = node.position();
      //   alignNodes2(node.outgoers().targets(), nodePos);
      //   for (let i = 0; i < node.outgoers().targets().length; i += 1) {
      //     // move children down by current totalH
      //     const n = node.outgoers().targets()[i];
      //     const nPos = n.position();
      //     n.position({ x: nPos.x, y: nPos.y + totalH + offset });
      //   }
      //   // move exemplar node down by current totalH
      //   node.position({ x: nodePos.x, y: nodePos.y + totalH + offset });
      //   // compute bounding box of this group
      //   const bb = node.union(node.outgoers().targets()).boundingBox();
      //   // add it to the totalH
      //   totalH += bb.h + offset;
      // });
      cy.style().update();
    }
  }, [cy, selectedViolations, selectedTypes, violationsTypesMap, violations, selectedViolationExemplars]);

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
