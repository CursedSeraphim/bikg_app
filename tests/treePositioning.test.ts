// treePositioning.tests.ts
// TODO last test case center align, update factory code to allow for creation of trees that don't have same amount of nodes at each level, test these
import cytoscape, { Position } from 'cytoscape';
import { treeLayout, treeLayoutLeftAlign, CytoscapeNodeFactory, getNodePositions } from '../src/CytoscapeNodeFactory';

const testCasesCenterAlign = [
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
    ]),
  },
  {
    depth: 2,
    childrenPerNode: 1,
    spacing: {
      x: 10,
      y: 20,
    },
    expectedPositions: new Map<string, Position>([
      ['node-0', { x: 0, y: 0 }],
      ['node-1', { x: 0, y: 20 }],
      ['node-2', { x: 0, y: 40 }],
    ]),
  },
  {
    depth: 2,
    childrenPerNode: 2,
    spacing: {
      x: 10,
      y: 20,
    },
    expectedPositions: new Map<string, Position>([
      ['node-0', { x: 17.5, y: 0 }],
      ['node-1', { x: 5, y: 20 }],
      ['node-2', { x: 0, y: 40 }],
      ['node-3', { x: 10, y: 40 }],
      ['node-4', { x: 30, y: 20 }],
      ['node-5', { x: 25, y: 40 }],
      ['node-6', { x: 35, y: 40 }],
    ]),
  },
  // TODO fix node positions for deeper tree test case
  // {
  //   depth: 3,
  //   childrenPerNode: 2,
  //   spacing: {
  //     x: 10,
  //     y: 20,
  //   },
  //   expectedPositions: new Map<string, Position>([
  //     ['node-0', { x: 17.5, y: 0 }],
  //     ['node-1', { x: 5, y: 20 }],
  //     ['node-2', { x: 0, y: 40 }],
  //     ['node-3', { x: 10, y: 40 }],
  //     ['node-4', { x: 30, y: 20 }],
  //     ['node-5', { x: 25, y: 40 }],
  //     ['node-6', { x: 35, y: 40 }],
  //     ['node-7', { x: 35, y: 40 }],
  //     ['node-8', { x: 35, y: 40 }],
  //     ['node-9', { x: 35, y: 40 }],
  //     ['node-10', { x: 35, y: 40 }],
  //     ['node-11', { x: 35, y: 40 }],
  //     ['node-12', { x: 35, y: 40 }],
  //     ['node-13', { x: 35, y: 40 }],
  //     ['node-14', { x: 35, y: 40 }],
  //   ]),
  // },
];

// Define test cases with different trees and expected outcomes
const testCasesLeftAlign = [
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
    ]),
  },
  {
    depth: 2,
    childrenPerNode: 1,
    spacing: {
      x: 10,
      y: 20,
    },
    expectedPositions: new Map<string, Position>([
      ['node-0', { x: 0, y: 0 }],
      ['node-1', { x: 0, y: 20 }],
      ['node-2', { x: 0, y: 40 }],
    ]),
  },
  {
    depth: 2,
    childrenPerNode: 2,
    spacing: {
      x: 10,
      y: 20,
    },
    expectedPositions: new Map<string, Position>([
      ['node-0', { x: 0, y: 0 }],
      ['node-1', { x: 0, y: 20 }],
      ['node-2', { x: 0, y: 40 }],
      ['node-3', { x: 10, y: 40 }],
      ['node-4', { x: 20, y: 20 }],
      ['node-5', { x: 20, y: 40 }],
      ['node-6', { x: 30, y: 40 }],
    ]),
  },
  {
    depth: 2,
    childrenPerNode: 3,
    spacing: {
      x: 10,
      y: 10,
    },
    expectedPositions: new Map<string, Position>([
      ['node-0', { x: 0, y: 0 }],
      ['node-1', { x: 0, y: 10 }],
      ['node-2', { x: 0, y: 20 }],
      ['node-3', { x: 10, y: 20 }],
      ['node-4', { x: 20, y: 20 }],
      ['node-5', { x: 30, y: 10 }],
      ['node-6', { x: 30, y: 20 }],
      ['node-7', { x: 40, y: 20 }],
      ['node-8', { x: 50, y: 20 }],
      ['node-9', { x: 60, y: 10 }],
      ['node-10', { x: 60, y: 20 }],
      ['node-11', { x: 70, y: 20 }],
      ['node-12', { x: 80, y: 20 }],
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

  test.each(testCasesLeftAlign)(
    'should have same amount of nodes as expected for a tree of depth $depth with $childrenPerNode children per node',
    (testCase) => {
      const tree = factory.createTree(testCase.depth, testCase.childrenPerNode);
      const cy = cytoscape({
        elements: tree,
      });

      // Get the collection that contains the root node
      const root = cy.getElementById('node-0');
      // Call the layout method
      treeLayoutLeftAlign(root, testCase.spacing);

      // Call getNodePositions to get the resulting positions
      const actualPositions = getNodePositions(root);

      // Check whether the resulting positions map has as many entries as the expected positions map
      expect(actualPositions.size).toEqual(testCase.expectedPositions.size);
    },
  );

  test.each(testCasesLeftAlign)(
    'should correctly position nodes for a tree of depth $depth with $childrenPerNode children per node with spacing $spacing',
    (testCase) => {
      const tree = factory.createTree(testCase.depth, testCase.childrenPerNode);
      const cy = cytoscape({
        elements: tree,
      });

      // Get the collection that contains the root node
      const root = cy.getElementById('node-0');
      // Call the layout method
      treeLayoutLeftAlign(root, testCase.spacing);

      // Call getNodePositions to get the resulting positions
      const actualPositions = getNodePositions(root);

      expect(actualPositions).toEqual(testCase.expectedPositions);
    },
  );

  test.each(testCasesCenterAlign)(
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

      expect(actualPositions).toEqual(testCase.expectedPositions);
    },
  );
});
