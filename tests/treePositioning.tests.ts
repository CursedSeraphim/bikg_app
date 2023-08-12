// // treePositioning.tests.ts
// // TODO this file is brand new: fix all syntax problems, replace positionCollection with import, fix import problems, create test cases with expected cases, doublecheck test code, update factory code to allow for creation of trees that don't have same amount of nodes at each level, create test cases for these
// import { CytoscapeNodeFactory, getNodePositions, getChildren } from '../src/CytoscapeNodeFactory'
// import cytoscape, { Position } from 'cytoscape';

// // Mocking the positionCollection function as described
// function positionCollection(collection: cytoscape.Collection, x: number, y: number) {
//   // Implementation for positioning the nodes of the collection in a tree-like structure
//   // This should be replaced with the actual implementation
// }

// // Define test cases with different trees and expected outcomes
// const testCases = [
//   {
//     depth: 3,
//     childrenPerNode: 2,
//     x: 100,
//     y: 200,
//     expectedPositions: new Map<string, Position>([
//       ['node-0', { x: 100, y: 200 }],
//       // Add other expected positions for this test case...
//     ])
//   },
//   // Add more test cases...
// ];

// describe('Positioning Nodes Test Suite', () => {
//   test.each(testCases)('should correctly position nodes for a tree of depth $depth with $childrenPerNode children per node', (testCase) => {
//     // Create a tree using the factory code with parameters from the test case
//     const factory = new CytoscapeNodeFactory();
//     const tree = factory.createTree(testCase.depth, testCase.childrenPerNode);
//     const cy = cytoscape({
//       elements: tree,
//     });

//     // Get the collection that contains the root node
//     const root = cy.getElementById('node-0');

//     // Call the positionCollection method with specific x/y coordinates from the test case
//     positionCollection(root, testCase.x, testCase.y);

//     // Call getNodePositions to get the resulting positions
//     const actualPositions = getNodePositions(root);

//     // Check the resulting positions with the expected positions from the test case
//     actualPositions.forEach((value, key) => {
//       expect(value).toEqual(testCase.expectedPositions.get(key));
//     });
//   });
// });
