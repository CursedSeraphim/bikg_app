import React, { useState, useEffect } from 'react';
import Plotly from 'plotly.js-dist';
import createPlotlyComponent from 'react-plotly.js/factory';
import { Data, Layout } from 'plotly.js';
import { useDispatch, useSelector } from 'react-redux';
import { setSelectedFocusNodes, selectBarPlotData } from '../Store/CombinedSlice';
import { CsvData } from '../Store/types';

import { csvDataToBarPlotDataGivenFeature, csvDataToBarPlotDataGivenFeatureOverallDistribution } from './csvToPlotlyFeatureData';
import { replacePrefixWithUrl, replaceUrlWithPrefix } from '../../utils';

const Plot = createPlotlyComponent(Plotly);
// TODO control this with checkboxes and a data store
const showOverallDistribution = true;
const subSelection = false;

const shouldShowTickLabels = (num: number) => num <= 6;

function calculateChiSquaredScore(observed, expected) {
  let chiSquared = 0;

  // Compute total for observed and expected
  const totalObserved = observed.reduce((a, b) => a + b, 0);
  const totalExpected = expected.reduce((a, b) => a + b, 0);

  for (let i = 0; i < observed.length; i++) {
    // Calculate relative frequencies
    const observedRelative = observed[i] / totalObserved;
    const expectedRelative = expected[i] / totalExpected;

    // Compute the chi-squared score using relative frequencies
    chiSquared += (observedRelative - expectedRelative) ** 2 / expectedRelative;
  }

  return chiSquared;
}

type BarPlotDataAndScore = {
  plotData: Data[];
  chiSquareScore: number;
};

function getBarPlotData(feature: string, selectedNodes: string[], samples: CsvData[]): BarPlotDataAndScore {
  const selectionBarPlotData = csvDataToBarPlotDataGivenFeature(feature, selectedNodes, samples);
  const overallBarPlotData = csvDataToBarPlotDataGivenFeatureOverallDistribution(feature, samples);

  // if feature is "cluster" print data
  if (feature === 'cluster') {
    console.log('selectionBarPlotData', selectionBarPlotData);
    console.log('overallBarPlotData', overallBarPlotData);
  }

  const chiSquareScore = calculateChiSquaredScore(selectionBarPlotData.y, overallBarPlotData.y);
  console.log(chiSquareScore);

  let plotData: Data[];

  if (showOverallDistribution) {
    plotData = [
      {
        y: overallBarPlotData.x,
        x: overallBarPlotData.y,
        type: 'bar',
        orientation: 'h',
        name: 'Overall Distribution',
        marker: {
          color: 'lightgrey',
        },
      },
      {
        y: selectionBarPlotData.x,
        x: selectionBarPlotData.y,
        type: 'bar',
        orientation: 'h',
        name: 'Selected Nodes',
        marker: {
          color: 'steelblue',
        },
      },
    ];
  } else {
    plotData = [
      {
        y: selectionBarPlotData.x,
        x: selectionBarPlotData.y,
        type: 'bar',
        orientation: 'h',
        name: 'Selected Nodes',
        marker: {
          color: 'steelblue',
        },
      },
    ];
  }

  return { plotData, chiSquareScore };
}

function BarPlotSample({ feature, onChiSquareScoreChange }) {
  const [dragMode, setDragMode] = useState<'zoom' | 'pan' | 'select' | 'lasso' | 'orbit' | 'turntable' | false>('zoom');
  const dispatch = useDispatch();
  const data = useSelector(selectBarPlotData);
  const [xRange, setXRange] = useState([]);
  const [yRange, setYRange] = useState([]);
  const [plotData, setPlotData] = useState<Data[]>([]);
  const numberOfTicks = (plotData[0] as any)?.y?.length || 0;
  const [showTickLabels, setShowTickLabels] = useState(shouldShowTickLabels(numberOfTicks));

  useEffect(() => {
    const { plotData: newPlotData, chiSquareScore } = getBarPlotData(feature, data.selectedNodes, data.samples);
    setPlotData(newPlotData);
    const newNumberOfTicks = (newPlotData[0] as any)?.y?.length || 0;
    setShowTickLabels(shouldShowTickLabels(newNumberOfTicks));
    onChiSquareScoreChange(feature, chiSquareScore);

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
  }, [feature, data, onChiSquareScoreChange]);

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
    title: replaceUrlWithPrefix(feature),
    titlefont: { size: 10 },
    dragmode: dragMode,
    height: 150,
    xaxis: { title: null, titlefont: { size: 12 }, tickfont: { size: 10 }, range: xRange },
    yaxis: { title: null, titlefont: { size: 12 }, tickfont: { size: 10 }, range: yRange, showticklabels: showTickLabels },
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
    if (eventData?.points && eventData.points.length > 0) {
      const selectedValues = eventData.points.map((point) => point.y);

      // Convert abbreviated values to their original form
      const originalSelectedValues = selectedValues.map((value) => replacePrefixWithUrl(value));

      // from all data samples get those where the feature value matches and retrieve their focus_node
      const matchingSamples = data.samples.filter((sample) => originalSelectedValues.includes(sample[feature]));
      const matchingFocusNodes = matchingSamples.map((sample) => sample.focus_node);

      if (!subSelection) {
        dispatch(setSelectedFocusNodes(matchingFocusNodes));
      } else {
        // further filter the data.selectedNodes to only those that match the focus_node
        const updatedSelectedNodes = data.selectedNodes.filter((node) => matchingFocusNodes.includes(node));
        dispatch(setSelectedFocusNodes(updatedSelectedNodes));
      }
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

export default BarPlotSample;
