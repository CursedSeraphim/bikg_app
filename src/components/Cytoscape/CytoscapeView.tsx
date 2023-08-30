// CytoscopeView.tsx
import React, { useMemo, useState, useRef } from 'react';
import cytoscape, { Core } from 'cytoscape';
import { useSelector } from 'react-redux';
import coseBilkent from 'cytoscape-cose-bilkent';
import cytoscapeLasso from 'cytoscape-lasso';
import viewUtilities from 'cytoscape-view-utilities';
import contextMenus from 'cytoscape-context-menus';
import { selectTypes, selectViolations } from '../Store/CombinedSlice';
import { useShapeHandler } from '../components/namespaceHandler';
import { useViewUtilities } from './useCytoscapeViewHelpers';
import { useRegisterCytoscapeEventListeners } from './CytoscapeEventHandlers'; // Import the new hook
import { useSubscribeCytoscape } from './useSubscribeCytoscape';
import { useCytoscapeData } from './useCytoscapeData';

cytoscape.use(viewUtilities);
cytoscape.use(coseBilkent);
cytoscape.use(cytoscapeLasso);
cytoscape.use(contextMenus);

function CytoscapeView({ rdfOntology, onLoaded }) {
  console.time('Rendering CytoscapeView took');

  const [cy, setCy] = useState<Core | null>(null);
  const violations = useSelector(selectViolations);
  const types = useSelector(selectTypes);
  const { getShapeForNamespace } = useShapeHandler();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(true);
  const initialNodePositions = useRef<Map<string, { x: number; y: number; visible: boolean }>>(new Map());
  const { toggleChildren, toggleParents } = useViewUtilities(cy);
  const contextMenuActions = useMemo(
    () => ({
      'toggle-children': toggleChildren,
      'toggle-parents': toggleParents,
    }),
    [toggleChildren, toggleParents],
  );

  useCytoscapeData({
    rdfOntology,
    getShapeForNamespace,
    violations,
    types,
    cy,
    setCy,
    onLoaded,
    contextMenuActions,
    initialNodePositions,
    setLoading,
  });
  useRegisterCytoscapeEventListeners(cy, toggleChildren);
  useSubscribeCytoscape(cy, initialNodePositions);

  console.timeEnd('Rendering CytoscapeView took');
  return <div id="cy" />;
}

export default CytoscapeView;
