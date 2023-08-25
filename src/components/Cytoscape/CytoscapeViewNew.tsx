// CytoscapeViewNew.tsx
import * as React from 'react';
import cytoscape from 'cytoscape';
import { useDispatch, useSelector } from 'react-redux';
import coseBilkent from 'cytoscape-cose-bilkent';
import cytoscapeLasso from 'cytoscape-lasso';
import { selectCytoData, selectViolations } from '../Store/CombinedSlice';
import { CY_LAYOUT } from './constants';
import { useShapeHandler } from '../components/namespaceHandler';

cytoscape.use(coseBilkent);
cytoscape.use(cytoscapeLasso);

function CytoscapeView({ rdfOntology, onLoaded }) {
  const [cy, setCy] = React.useState<cytoscape.Core | null>(null);
  const violations = useSelector(selectViolations);
  const { getShapeForNamespace } = useShapeHandler();
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = React.useState(true);
  const initialNodePositions = React.useRef(new Map());

  React.useEffect(() => {
    selectCytoData(rdfOntology, getShapeForNamespace, violations)
      .then((data) => {
        const newCytoData = { ...data };
        newCytoData.nodes = newCytoData.nodes.map((node) => ({
          ...node,
          data: {
            ...node.data,
          },
        }));
        if (cy) {
          console.log('if cy');
          // Update the cytoData elements and layout
          cy.elements().remove();
          cy.add(newCytoData);
          cy.lassoSelectionEnabled(true);
          cy.nodes().forEach((node) => {
            const pos = node.position();
            initialNodePositions.current.set(node.data('id'), { x: pos.x, y: pos.y });
          });
          cy.layout({ ...CY_LAYOUT, eles: cy.elements(':visible') }).run();
          cy.ready(() => {
            onLoaded();
            setLoading(false);
            cy.fit();
          });
        } else {
          const newCy = cytoscape({
            container: document.getElementById('cy'), // container to render in
            wheelSensitivity: 0.2,
            elements: newCytoData,
            style: [],
            layout: CY_LAYOUT,
          });

          setCy(newCy);
          newCy.ready(() => {
            onLoaded();
            setLoading(false);
            newCy.fit();
          });
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
