import React, { useState, useEffect } from 'react';
import Plotly from 'plotly.js-dist';
import createPlotlyComponent from 'react-plotly.js/factory';
import { Data, Layout } from 'plotly.js';
import { BarLoader } from 'react-spinners';
import { useDispatch, useSelector } from 'react-redux';
import { setSelectedFocusNodes, selectSelectedFocusNodes } from '../Store/CombinedSlice'; // Import the necessary actions and selectors from CombinedSlice

const Plot = createPlotlyComponent(Plotly);

interface ScatterNode {
  text: string;
  x: number;
  y: number;
}

interface InteractiveScatterPlotProps {
  data: ScatterNode[];
}

function InteractiveScatterPlot({ data }: InteractiveScatterPlotProps) {
  const dispatch = useDispatch();
  const selectedFocusNodes = useSelector(selectSelectedFocusNodes);
  const [localSelectedFocusNodes, setLocalSelectedFocusNodes] = useState<string[]>([]);

  const plotData: Data[] = [
    {
      x: data.map((d) => d.x),
      y: data.map((d) => d.y),
      mode: 'markers',
      type: 'scatter',
      text: data.map((d) => d.text),
      marker: {
        size: 3,
        color: data.map((d) => (localSelectedFocusNodes.includes(d.text) ? 'steelblue' : 'lightgrey')),
        opacity: 0.5,
      },
    },
  ];

  const plotLayout: Partial<Layout> = {
    hovermode: 'closest',
    dragmode: 'lasso',
    xaxis: {
      title: 'Embedding Dimension 1',
      showgrid: false,
      zeroline: false,
      showticklabels: false,
      showline: false,
      ticks: '',
    },
    yaxis: {
      title: 'Embedding Dimension 2',
      showgrid: false,
      zeroline: false,
      showticklabels: false,
      showline: false,
      ticks: '',
    },
  };

  const handleSelection = (eventData) => {
    if (eventData?.points && eventData.points.length > 0) {
      const selectedPoints = eventData.points.map((point) => data[point.pointIndex]);
      const selectedNodes = selectedPoints.map((point) => point.text); // Extract the focus_node from each selected point
      setLocalSelectedFocusNodes(selectedNodes); // Update the local selected focus nodes
      dispatch(setSelectedFocusNodes(selectedNodes)); // Update the selected focus nodes in the Redux store
    }
  };

  useEffect(() => {
    setLocalSelectedFocusNodes(selectedFocusNodes);
  }, [selectedFocusNodes]);

  if (data.length === 0) {
    return <BarLoader color="steelblue" loading />;
  }

  return (
    <div className="scatter-plot-container">
      <Plot
        data={plotData}
        layout={plotLayout}
        onSelected={handleSelection}
        config={{ displayModeBar: false, responsive: true }}
        useResizeHandler
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}

export default InteractiveScatterPlot;
