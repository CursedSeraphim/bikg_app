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

function getBarPlotData(feature: string, selectedNodes: string[], samples: CsvData[]): Data[] {
  const selectionBarPlotData = csvDataToBarPlotDataGivenFeature(feature, selectedNodes, samples);
  if (showOverallDistribution) {
    const overallBarPlotData = csvDataToBarPlotDataGivenFeatureOverallDistribution(feature, samples);

    return [
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
  }
  return [
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

function BarPlotSample(props) {
  const { feature } = props;
  const [dragMode, setDragMode] = useState<'zoom' | 'pan' | 'select' | 'lasso' | 'orbit' | 'turntable' | false>('zoom');
  const dispatch = useDispatch();
  const data = useSelector(selectBarPlotData);
  const [xRange, setXRange] = useState([]);
  const [yRange, setYRange] = useState([]);

  useEffect(() => {
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

  const plotData = getBarPlotData(feature, data.selectedNodes, data.samples);
  const plotLayout: Partial<Layout> = {
    title: replaceUrlWithPrefix(feature),
    titlefont: { size: 12 },
    dragmode: dragMode,
    height: 200,
    margin: {
      l: 20,
      r: 20,
      b: 40,
      t: 20,
      pad: 0,
    },
    showlegend: false,
    barmode: 'overlay',
    xaxis: {
      range: xRange,
    },
    yaxis: {
      range: yRange,
    },
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
        onRelayout={(eventData) => {
          if (eventData['xaxis.range[0]'] && eventData['xaxis.range[1]']) {
            setXRange([eventData['xaxis.range[0]'], eventData['xaxis.range[1]']]);
          }
          if (eventData['yaxis.range[0]'] && eventData['yaxis.range[1]']) {
            setYRange([eventData['yaxis.range[0]'], eventData['yaxis.range[1]']]);
          }
        }}
        config={{ displayModeBar: false, responsive: true }}
        useResizeHandler
        style={{ width: '100%' }}
      />
    </div>
  );
}

export default BarPlotSample;
