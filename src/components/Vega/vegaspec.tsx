import React, { useEffect } from 'react';
import { compile } from 'vega-lite';
import embed from 'vega-embed';
import { TopLevelSpec } from 'vega-lite';

function MyChart() {
  useEffect(() => {
    // Define your Vega-Lite specification
    const spec: TopLevelSpec = {
      data: { url: 'https://vega.github.io/vega-lite/examples/data/cars.json' },
      mark: { type: 'point' },
      encoding: {
        x: { field: 'Horsepower', type: 'quantitative' },
        y: { field: 'Miles_per_Gallon', type: 'quantitative' },
        color: { field: 'Origin', type: 'nominal' },
      },
    };

    // Compile the specification to a Vega specification
    const vegaSpec = compile(spec).spec;

    // Create a Vega chart from the specification
    embed('#myChart', vegaSpec, { actions: false });
  }, []);

  return <div id="myChart" />;
}

export default MyChart;
