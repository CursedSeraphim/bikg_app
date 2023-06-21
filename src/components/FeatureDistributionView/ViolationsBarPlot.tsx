// ViolationsBarPlot.tsx
import React, { useState, useEffect } from 'react';
import Plotly from 'plotly.js-dist';
import createPlotlyComponent from 'react-plotly.js/factory';
import { Data, Layout } from 'plotly.js';
import { useDispatch, useSelector } from 'react-redux';
import { setSelectedFocusNodes, selectBarPlotData, selectViolations } from '../Store/CombinedSlice';
import { CsvData } from '../Store/types';

const Plot = createPlotlyComponent(Plotly);
// TODO control this with checkboxes and a data store
const showOverallDistribution = true;
const subSelection = false;

const shouldShowTickLabels = (num: number) => num <= 6;

const getBarPlotData = (selectedNodes: string[], samples: CsvData[], violationFeatures: string[]): Data[] => {
  if (samples === undefined) {
    return [
      {
        x: [],
        y: [],
        type: 'bar',
        marker: {
          color: 'steelblue',
        },
        name: 'violations',
      },
    ];
  }

  const countsByFeature: Record<string, Record<string, number>> = {};

  violationFeatures.forEach((feature) => {
    countsByFeature[feature] = {};
    selectedNodes.forEach((nodeId) => {
      const nodeData = samples.find((entry) => entry.focus_node === nodeId);
      if (nodeData && nodeData[feature]) {
        const value = nodeData[feature];
        countsByFeature[feature][value] = (countsByFeature[feature][value] || 0) + 1;
      }
    });
  });

  // turn all non empty features in countsByFeature into 2 arrays of x and y values
  const nonEmptyCountsByFeature = {};

  for (const [key, value] of Object.entries(countsByFeature)) {
    if (Object.keys(value).length > 0) {
      nonEmptyCountsByFeature[key] = value;
    }
  }

  const xValues = Object.keys(nonEmptyCountsByFeature);
  const yValues = Object.values(nonEmptyCountsByFeature).map((value) => value['1']);

  if (showOverallDistribution) {
    const overallCountsByFeature: Record<string, Record<string, number>> = {};

    violationFeatures.forEach((feature) => {
      overallCountsByFeature[feature] = {};
      samples.forEach((nodeData) => {
        if (nodeData && nodeData[feature]) {
          const value = nodeData[feature];
          overallCountsByFeature[feature][value] = (overallCountsByFeature[feature][value] || 0) + 1;
        }
      });
    });

    const overallXValues = Object.keys(overallCountsByFeature);
    const overallYValues = Object.values(overallCountsByFeature).map((value) => value['1']);

    return [
      {
        y: overallXValues,
        x: overallYValues,
        orientation: 'h',
        type: 'bar',
        marker: {
          color: 'lightgrey',
        },
        name: 'overall',
      },
      {
        y: xValues,
        x: yValues,
        orientation: 'h',
        type: 'bar',
        marker: {
          color: 'steelblue',
        },
        name: 'violations',
      },
    ];
  }

  return [
    {
      y: xValues,
      x: yValues,
      orientation: 'h',
      type: 'bar',
      marker: {
        color: 'steelblue',
      },
      name: 'violations',
    },
  ];
};

function ViolationsBarPlotSample() {
  const feature = 'Violations';
  const data = useSelector(selectBarPlotData);
  const violationFeatures = useSelector(selectViolations);
  const dispatch = useDispatch();
  const plotData = getBarPlotData(data.selectedNodes, data.samples, violationFeatures);
  const numberOfTicks = (plotData[0] as any)?.y?.length || 0;
  const [showTickLabels, setShowTickLabels] = useState(shouldShowTickLabels(numberOfTicks));
  const [dragMode, setDragMode] = React.useState<'zoom' | 'pan' | 'select' | 'lasso' | 'orbit' | 'turntable' | false>('zoom');
  const [xRange, setXRange] = React.useState([]);
  const [yRange, setYRange] = React.useState([]);

  React.useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Shift') {
        setDragMode('lasso');
      }
    };

    const handleKeyUp = (event) => {
      if (event.key === 'Shift') {
        setDragMode('zoom');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    // Clean up the event listeners when the component is unmounted
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, []);

  const handleRelayout = (eventData) => {
    if (eventData['xaxis.autorange']) {
      setXRange([eventData['xaxis.range[0]'], eventData['xaxis.range[1]']]);
    }
    if (eventData['yaxis.autorange']) {
      setYRange([eventData['yaxis.range[0]'], eventData['yaxis.range[1]']]);
      setShowTickLabels(shouldShowTickLabels(numberOfTicks));
    }
    if (eventData['xaxis.range[0]'] && eventData['xaxis.range[1]']) {
      setXRange([eventData['xaxis.range[0]'], eventData['xaxis.range[1]']]);
    }
    if (eventData['yaxis.range[0]'] && eventData['yaxis.range[1]']) {
      setYRange([eventData['yaxis.range[0]'], eventData['yaxis.range[1]']]);
      const numberOfTicksInZoom = Math.abs(eventData['yaxis.range[1]'] - eventData['yaxis.range[0]']);
      setShowTickLabels(shouldShowTickLabels(numberOfTicksInZoom));
    }
  };

  // const numBars = (plotData[0] as any)?.y?.length || 0;
  // const chartHeight = Math.max(70, Math.min(8 * 35, numBars * 35));

  const plotLayout: Partial<Layout> = {
    title: feature,
    titlefont: { size: 10 },
    xaxis: { title: null, titlefont: { size: 12 }, tickfont: { size: 10 }, range: xRange },
    yaxis: { title: null, titlefont: { size: 12 }, tickfont: { size: 10 }, range: yRange, showticklabels: showTickLabels },
    dragmode: dragMode,
    height: 150,
    margin: {
      l: 130,
      r: 20,
      b: 50,
      t: 30,
      pad: 0,
    },
    showlegend: false,
    barmode: 'overlay',
  };

  const handleSelection = (eventData) => {
    // Leave this empty for future implementation
    if (eventData?.points && eventData.points.length > 0) {
      const selectedValues = eventData.points.map((point) => point.y);

      // Create a list of all objects in data.samples that match the criteria
      const updatedSelectedNodes = selectedValues.reduce((accumulator, selectedValue) => {
        // first retrieve list of focus nodes that match the selected value
        const matchingFocusNodes = data.samples.filter((sample) => sample[selectedValue] === 1).map((sample) => sample.focus_node);

        if (!subSelection) {
          return accumulator.concat(matchingFocusNodes);
        }
        // then apply filter to selectedNodes to only include those that match the selected value
        const matchedSamples = data.selectedNodes.filter((node) => matchingFocusNodes.includes(node));
        return accumulator.concat(matchedSamples);
      }, []);

      dispatch(setSelectedFocusNodes(updatedSelectedNodes));
    }
  };

  return (
    <div className="bar-plot-container">
      <Plot
        data={plotData}
        layout={plotLayout}
        onSelected={handleSelection}
        onRelayout={handleRelayout}
        config={{ displayModeBar: false, responsive: true }}
        useResizeHandler
        style={{ width: '100%' }}
      />
    </div>
  );
}

export default ViolationsBarPlotSample;
