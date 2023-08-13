// treePositioning.tests.ts
// TODO this file is brand new: create more test cases, update factory code to allow for creation of trees that don't have same amount of nodes at each level, create test cases for these
import cytoscape, { Position } from 'cytoscape';
import { treeLayout, CytoscapeNodeFactory, getNodePositions } from '../src/CytoscapeNodeFactory';

// Define test cases with different trees and expected outcomes
const testCases = [
  {
    depth: 0,
    childrenPerNode: 0,
    spacing: {
      x: 10,
      y: 20,
    },
    expectedPositions: new Map<string, Position>([['node-0', { x: 0, y: 0 }]]),
  },
  {
    depth: 1,
    childrenPerNode: 1,
    spacing: {
      x: 10,
      y: 20,
    },
    expectedPositions: new Map<string, Position>([
      ['node-0', { x: 0, y: 0 }],
      ['node-1', { x: 0, y: 20 }],
      ['node-2', { x: 10, y: 20 }],
    ]),
  },
  // Add more test cases...
];

describe('Tree layout of nodes test suite', () => {
  let factory: CytoscapeNodeFactory;

  beforeEach(() => {
    // Create a tree using the factory code with parameters from the test case
    factory = new CytoscapeNodeFactory();
  });

  it('passes', () => {
    expect(true).toBe(true);
  });

  test.each(testCases)(
    'should correctly position nodes for a tree of depth $depth with $childrenPerNode children per node with spacing $spacing',
    (testCase) => {
      const tree = factory.createTree(testCase.depth, testCase.childrenPerNode);
      const cy = cytoscape({
        elements: tree,
      });

      // Get the collection that contains the root node
      const root = cy.getElementById('node-0');
      // Call the layout method
      treeLayout(root, testCase.spacing);

      // Call getNodePositions to get the resulting positions
      const actualPositions = getNodePositions(root);

      // Check the resulting positions with the expected positions from the test case
      actualPositions.forEach((value, key) => {
        console.log('key: ', key, 'value: ', value);
        expect(value).toEqual(testCase.expectedPositions.get(key));
      });
    },
  );
});
