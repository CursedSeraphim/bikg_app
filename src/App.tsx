import * as React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import cytoscape from 'cytoscape';
import coseBilkent from 'cytoscape-cose-bilkent';
import cytoscapeLasso from 'cytoscape-lasso';
import { setRdfString, selectRdfData, selectCytoData } from './components/Store/RdfSlice';
import { setCsvData, selectCsvDataForPlotly } from './components/Store/CsvSlice';
import { loadNodes } from './components/Store/NodeSlice';
import { loadEdges } from './components/Store/EdgeSlice';
import { loadCytoData } from './components/Store/CytoSlice';
import InteractiveScatterPlot from './components/EmbeddingView/InteractiveScatterPlot';
import BarPlotList from './components/FeatureDistributionView/BarPlotList';
import FixedBarPlotList from './components/FeatureDistributionView/FixedBarPlotList';

import './styles.css';
import { fetchOntology, fetchCSVFile, fetchJSONFile, fetchJSONGivenNodes } from './api';

cytoscape.use(cytoscapeLasso);
cytoscape.use(coseBilkent);

export function App() {
  const dispatch = useDispatch();
  const plotlyData = useSelector(selectCsvDataForPlotly);
  const rdfOntology = useSelector(selectRdfData);
  const [cytoData, setCytoData] = React.useState(null);
  const [cy, setCy] = React.useState(null);
  const [spec, setSpec] = React.useState(null); // Add a new state for the Vega spec

  // Fetch ontology
  React.useEffect(() => {
    fetchOntology()
      .then((data) => {
        dispatch(setRdfString(data));
      })
      .catch((error) => {
        console.error('Failed to fetch ontology', error);
      });
  }, [dispatch]);

  // Fetch and process RDF ontology
  React.useEffect(() => {
    if (rdfOntology) {
      selectCytoData({ rdf: { rdfString: rdfOntology } })
        .then((data) => {
          setCytoData(data);
          console.log('cytoData has been set:', cytoData);
        })
        .catch((error) => {
          console.error('Failed to generate Cytoscape data:', error);
        });
    }
    // because adding cytodata to the dependency array causes problems with the lasso selection:
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rdfOntology]);

  // Fetch force directed node positions
  React.useEffect(() => {
    fetchCSVFile('force_directed_node_positions.csv')
      .then((data) => {
        dispatch(loadNodes(data));
      })
      .catch((error) => {
        console.error('Failed to fetch CSV file', error);
      });
  }, [dispatch]);

  // Fetch force directed edge vectors
  React.useEffect(() => {
    fetchCSVFile('force_directed_edge_vectors.csv')
      .then((data) => {
        dispatch(loadEdges(data));
      })
      .catch((error) => {
        console.error('Failed to fetch CSV file', error);
      });
  }, [dispatch]);

  // Fetch ex51 study data transformed to Cytoscape JSON
  React.useEffect(() => {
    fetchJSONFile('ex51_cytoscape.json')
      .then((data) => {
        dispatch(loadCytoData(data));
      })
      .catch((error) => {
        console.error('Failed to fetch RDF file', error);
      });
  }, [dispatch]);

  // Fetch ex51 tabular vfiolations data for Plotly
  React.useEffect(() => {
    fetchCSVFile('ex51_violations_metadata.csv')
      .then((data) => {
        const parsedData = JSON.parse(data);
        dispatch(setCsvData(parsedData.data));
      })
      .catch((error) => {
        console.error('Failed to fetch RDF file', error);
      });
  }, [dispatch]);

  React.useEffect(() => {
    selectCytoData({ rdf: { rdfString: rdfOntology } })
      .then((data) => {
        const newCytoData = data;
        if (cy) {
          // Update the cytoData elements and layout
          cy.elements().remove();
          // create a deep copy of the cytoData
          cy.add(newCytoData);
          cy.lassoSelectionEnabled(true);
          cy.fit();
          cy.layout({ name: 'cose-bilkent', idealEdgeLength: 100, nodeDimensionsIncludeLabels: true }).run();
          cy.on('boxend', (event) => {
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

            // fetch the JSON for the Vega spec
            fetchJSONGivenNodes('ex51_violations_metadata.csv', nodeList)
              .then((violationsData) => {
                setSpec(JSON.parse(violationsData));
                console.log('spec has been set:', spec);
              })
              .catch((error) => {
                console.error('Failed to fetch RDF file', error);
              });

            // log the selected data to the console
            // console.log(selectedData);
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
                  'background-color': '#666',
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
  }, [cy, rdfOntology, spec]);

  const handleDataSelected = (selectedData) => {
    console.log('Data selected in App component');
  };

  return (
    <div className="container">
      <div className="Extended-Ontology-View">
        Extended Ontology View
        <div id="cy" />
      </div>
      <div className="Feature-Distribution-View">
        Embedding View
        <InteractiveScatterPlot data={plotlyData} onDataSelected={handleDataSelected} />
      </div>
      <div className="Embedding-View">
        Feature Distribution View
        <BarPlotList />
      </div>
      <div className="Fixed-Feature-Distribution-View">
        Fixed Feature Distribution View
        <FixedBarPlotList />
      </div>
    </div>
  );
}
