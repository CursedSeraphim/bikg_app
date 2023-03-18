import React, { useState, useEffect } from 'react';
import Plotly from 'plotly.js-dist';
import createPlotlyComponent from 'react-plotly.js/factory';
import { Data, Layout } from 'plotly.js';
import { useDispatch, useSelector } from 'react-redux';
import { setSelectedFocusNodes, selectSelectedFocusNodes } from '../Store/CsvSlice';

const Plot = createPlotlyComponent(Plotly);

interface InteractiveScatterPlotProps {
  data: any[];
  onDataSelected?: (data: any[]) => void;
}

function InteractiveScatterPlot({ data, onDataSelected }: InteractiveScatterPlotProps) {
  const dispatch = useDispatch();
  const selectedFocusNodes = useSelector(selectSelectedFocusNodes);
  const [plotData, setPlotData] = useState<Data[]>([]);

  useEffect(() => {
    console.log('selectedFocusNodes', selectedFocusNodes);
    setPlotData([
      {
        x: data.map((d) => d.x),
        y: data.map((d) => d.y),
        mode: 'markers',
        type: 'scatter',
        text: data.map((d) => d.text),
        marker: {
          size: 6,
          color: data.map((d) => (selectedFocusNodes.includes(d.text) ? 'red' : 'steelblue')),
        },
      },
    ]);
  }, [selectedFocusNodes, data]);

  const plotLayout: Partial<Layout> = {
    hovermode: 'closest',
    dragmode: 'lasso',
    xaxis: { title: 'X-axis' },
    yaxis: { title: 'Y-axis' },
  };

  const handleSelection = (eventData) => {
    if (eventData?.points) {
      const selectedPoints = eventData.points.map((point) => data[point.pointIndex]);
      const selectedNodes = selectedPoints.map((point) => point.text); // Extract the focus_node from each selected point
      dispatch(setSelectedFocusNodes(selectedNodes)); // Update the selected focus nodes in the Redux store
    }
  };

  useEffect(() => {
    if (selectedFocusNodes.length) {
      // Process the selected focus nodes or pass them to a callback function
      if (onDataSelected) {
        onDataSelected(selectedFocusNodes);
      }
    }
  }, [selectedFocusNodes, onDataSelected]);

  return <Plot data={plotData} layout={plotLayout} onSelected={handleSelection} config={{ displayModeBar: false }} />;
}

export default InteractiveScatterPlot;
