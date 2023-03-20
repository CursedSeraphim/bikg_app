import React, { useState, useEffect } from 'react';
import Plotly from 'plotly.js-dist';
import createPlotlyComponent from 'react-plotly.js/factory';
import { Data, Layout } from 'plotly.js';
import { useDispatch, useSelector } from 'react-redux';
import { setSelectedFocusNodes, selectSelectedFocusNodes } from '../Store/CsvSlice'; // Import the necessary actions and selectors from CsvSlice

const Plot = createPlotlyComponent(Plotly);

interface InteractiveScatterPlotProps {
  data: any[];
  onDataSelected?: (data: any[]) => void;
}

function InteractiveScatterPlot({ data, onDataSelected }: InteractiveScatterPlotProps) {
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
        size: 6,
        color: data.map((d) => (localSelectedFocusNodes.includes(d.text) ? 'steelblue' : 'grey')),
        opacity: 0.5,
      },
    },
  ];

  const plotLayout: Partial<Layout> = {
    hovermode: 'closest',
    dragmode: 'lasso',
    xaxis: { title: 'X-axis' },
    yaxis: { title: 'Y-axis' },
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
    if (localSelectedFocusNodes.length) {
      // Process the selected focus nodes or pass them to a callback function
      if (onDataSelected) {
        onDataSelected(localSelectedFocusNodes);
      }
    }
  }, [localSelectedFocusNodes, onDataSelected]);

  return <Plot data={plotData} layout={plotLayout} onSelected={handleSelection} config={{ displayModeBar: false }} />;
}

export default InteractiveScatterPlot;
