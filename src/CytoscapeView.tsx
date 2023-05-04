import * as React from 'react';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import cytoscapeLasso from 'cytoscape-lasso';
import { selectCytoData } from './components/Store/RdfSlice';

cytoscape.use(cytoscapeLasso);
cytoscape.use(coseBilkent);

interface CytoscapeViewProps {
  rdfOntology: string;
}

function CytoscapeView({ rdfOntology }: CytoscapeViewProps) {
  const [cy, setCy] = React.useState<cytoscape.Core | null>(null);
  const [setCytoData] = React.useState(null);

  // Fetch and process RDF ontology
  React.useEffect(() => {
    if (rdfOntology) {
      selectCytoData({ rdf: { rdfString: rdfOntology } })
        .then((data) => {
          // TODO investigate this method call
          setCytoData(data);
        })
        .catch((error) => {
          console.error('Failed to generate Cytoscape data:', error);
        });
    }
    // because adding cytodata to the dependency array causes problems with the lasso selection:
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rdfOntology]);

  React.useEffect(() => {
    selectCytoData({ rdf: { rdfString: rdfOntology } })
      .then((data) => {
        const newCytoData = data;
        if (cy) {
          // Update the cytoData elements and layout
          cy.elements().remove();
          cy.add(newCytoData);
          cy.lassoSelectionEnabled(true);
          cy.fit();
          cy.layout({ name: 'cose-bilkent', idealEdgeLength: 100, nodeDimensionsIncludeLabels: true }).run();
          // could use (event) => if we want to do something with the event
          cy.on('boxend', () => {
            // get the selected nodes
            const selectedNodes = cy.nodes(':selected');

            // get the data of the selected nodes
            const selectedData = selectedNodes.map((node) => {
              return node.data();
            });

            // selectedData is of the shape [{'id': 'node1', 'label': 'Node 1'}, ...]
            // create a node list of ids
            const nodeList = selectedData.map((node) => {
              return node.id;
            });

            console.log('nodeList', nodeList);
          });
        } else {
          const newCy = cytoscape({
            container: document.getElementById('cy'), // container to render in
            wheelSensitivity: 0.2,
            elements: newCytoData,
            style: [
              // the stylesheet for the graph
              {
                selector: 'node',
                style: {
                  'background-color': 'lightgrey', // previously #666
                  label: 'data(id)',
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
                },
              },
            ],

            layout: {
              name: 'cose-bilkent',
              idealEdgeLength: 100,
              nodeDimensionsIncludeLabels: true,
            },
          });
          setCy(newCy);
        }
      })
      .catch((error) => {
        console.error('Failed to generate Cytoscape data:', error);
      });
  }, [cy, rdfOntology]);

  return <div id="cy" />;
}

export default CytoscapeView;
