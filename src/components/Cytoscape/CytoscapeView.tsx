// CytoscopeView.tsx
import React, { useMemo, useState, useRef } from 'react';
import cytoscape, { Core, NodeSingular } from 'cytoscape';
import { useSelector, useDispatch } from 'react-redux';
import coseBilkent from 'cytoscape-cose-bilkent';
import cytoscapeLasso from 'cytoscape-lasso';
import viewUtilities from 'cytoscape-view-utilities';
import contextMenus from 'cytoscape-context-menus';
import { setSelectedTypes, setSelectedViolations, setSelectedViolationExemplars, selectTypes, selectViolations } from '../Store/CombinedSlice';

import { useShapeHandler } from '../components/namespaceHandler';
import { useCytoViewHelpers } from './useCytoscapeViewHelpers';
import { useRegisterCytoscapeEventListeners } from './CytoscapeEventHandlers'; // Import the new hook
import { resetCyto, useSubscribeCytoscape } from './useSubscribeCytoscape';
import { useCytoscapeData } from './useCytoscapeData';
import { useCytoscapeContextMenu } from './olduseCytoscapeContextMenu';
import { getContextMenuOptions } from './CytoscapeContextMenu';

cytoscape.use(viewUtilities);
cytoscape.use(coseBilkent);
cytoscape.use(cytoscapeLasso);
cytoscape.use(contextMenus);

function CytoscapeView({ rdfOntology, onLoaded }) {
  const dispatch = useDispatch();

  const [cy, setCy] = useState<Core | null>(null);
  const violations = useSelector(selectViolations);
  const types = useSelector(selectTypes);
  const { getShapeForNamespace } = useShapeHandler();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(true);
  const initialNodeData = useRef<Map<string, { x: number; y: number; visible: boolean }>>(new Map());
  const { toggleChildren, toggleParents } = useCytoViewHelpers(cy);

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
  });
  useRegisterCytoscapeEventListeners(cy, toggleChildren);
  useSubscribeCytoscape(cy, initialNodeData);

  return <div id="cy" />;
}

export default CytoscapeView;
