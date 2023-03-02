import React, { useEffect, useRef } from 'react';
import { compile } from 'vega-lite';
import embed from 'vega-embed';
import { TopLevelSpec } from 'vega-lite';

interface VegaProps {
  spec: TopLevelSpec;
}

function Vega({ spec }: VegaProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chartRef.current) {
      // Compile the specification to a Vega specification
      const vegaSpec = compile(spec).spec;

      // Create a Vega chart from the specification
      embed(chartRef.current, vegaSpec, { actions: false });
    }
  }, [spec]);

  return <div ref={chartRef} />;
}

export default Vega;
