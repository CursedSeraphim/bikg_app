// CytoscopeView.tsx
import cytoscape, { Core } from 'cytoscape';
import contextMenus from 'cytoscape-context-menus';
import coseBilkent from 'cytoscape-cose-bilkent';
import cytoscapeLasso from 'cytoscape-lasso';
import viewUtilities from 'cytoscape-view-utilities';
import React, { useRef, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectCumulativeNumberViolationsPerNode, selectTypes, selectViolations } from '../Store/CombinedSlice';

import useCytoCumulativeCounts from '../../useCytoCumulativeCounts';
import { useShapeHandler } from '../components/namespaceHandler';
import { useRegisterCytoscapeEventListeners } from './CytoscapeEventHandlers'; // Import the new hook
import useCytoscapeContextMenu from './useContextMenu';
import { useCytoscapeData } from './useCytoscapeData';
import { useCytoViewHelpers } from './useCytoscapeViewHelpers';
import { useSubscribeCytoscape } from './useSubscribeCytoscape';

cytoscape.use(viewUtilities);
cytoscape.use(coseBilkent);
cytoscape.use(cytoscapeLasso);
cytoscape.use(contextMenus);

function CytoscapeView({ rdfOntology, onLoaded }) {
  const [cy, setCy] = useState<Core | null>(null);
  const violations = useSelector(selectViolations);
  const types = useSelector(selectTypes);
  const { getShapeForNamespace } = useShapeHandler();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(true);
  const initialNodeData = useRef<Map<string, { x: number; y: number; visible: boolean }>>(new Map());
  const blacklistedLabelsRef = useRef<string[]>([]); // Ref to track previous blacklisted labels
  const cumulativeNumberViolationsPerType = useSelector(selectCumulativeNumberViolationsPerNode);

  const viewHelpers = useCytoViewHelpers(cy);
  useCytoscapeData({
    rdfOntology,
    getShapeForNamespace,
    violations,
    types,
    cy,
    setCy,
    onLoaded,
    initialNodeData,
    setLoading,
    cumulativeNumberViolationsPerType,
  });
  useRegisterCytoscapeEventListeners(cy, viewHelpers);
  const subScribeCytoscape = useSubscribeCytoscape(cy, initialNodeData, blacklistedLabelsRef);
  useCytoscapeContextMenu(cy, viewHelpers, subScribeCytoscape);
  useCytoCumulativeCounts(cy);

  return <div id="cy" />;
}

export default CytoscapeView;
