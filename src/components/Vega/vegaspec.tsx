import React, { useEffect } from 'react';
import { compile } from 'vega-lite';
import embed from 'vega-embed';
import { TopLevelSpec } from 'vega-lite';

function MyChart() {
  // http://data.boehringer.com/ontology/omics/hasCellType
  // http://www.w3.org/1999/02/22-rdf-syntax-ns#type
  useEffect(() => {
    // Define your Vega-Lite specification
    const spec: TopLevelSpec = {
      data: { url: 'https://vega.github.io/vega-lite/examples/data/cars.json' },
      layer: [
        {
          mark: 'bar',
          encoding: {
            x: { field: 'Horsepower', type: 'quantitative' },
            y: { field: 'Origin', type: 'nominal' },
            color: { value: 'blue' },
          },
        },
        {
          mark: 'bar',
          encoding: {
            x: { field: 'Acceleration', type: 'quantitative' },
            y: { field: 'Origin', type: 'nominal' },
            color: { value: 'grey' },
          },
        },
      ],
    };

    // Compile the specification to a Vega specification
    const vegaSpec = compile(spec).spec;

    // Create a Vega chart from the specification
    embed('#myChart', vegaSpec, { actions: false });
  }, []);

  return <div id="myChart" />;
}

export default MyChart;
