import React, { useState, useEffect } from 'react';
import Plotly from 'plotly.js-dist';
import createPlotlyComponent from 'react-plotly.js/factory';
import { Layout } from 'plotly.js';
import { useDispatch } from 'react-redux';
import { setSelectedFocusNodesUsingFeatureCategories } from '../Store/CombinedSlice';
import { fetchSelectedNodesAndValueCountsGivenFeatureCategorySelection, fetchSelectedNodesAndValueCountsGivenViolationSelection } from '../../api';

const Plot = createPlotlyComponent(Plotly);
// TODO control this with checkboxes and a data store
// const showOverallDistribution = true;
// const subSelection = false;

const shouldShowTickLabels = (num: number) => num <= 6;

function BarPlotSample({ plotlyData, feature }) {
  // TODO handle ifShowOverallDistribution
  const { selected, overall } = plotlyData;
  const [dragMode, setDragMode] = useState<'zoom' | 'pan' | 'select' | 'lasso' | 'orbit' | 'turntable' | false>('zoom');
  const dispatch = useDispatch();
  const [xRange, setXRange] = useState([]);
  const [yRange, setYRange] = useState([]);
  const plotData = [overall, selected];
  const numberOfTicks = overall?.y?.length || 0;
  const [showTickLabels, setShowTickLabels] = useState(shouldShowTickLabels(numberOfTicks));

  useEffect(() => {
    // const { plotData: newPlotData, chiSquareScore } = getBarPlotData(feature, data.selectedNodes, data.samples);
    const newNumberOfTicks = overall?.y?.length || 0;
    setShowTickLabels(shouldShowTickLabels(newNumberOfTicks));

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // [feature, data, onChiSquareScoreChange]);

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

  const plotLayout: Partial<Layout> = {
    title: feature,
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
      if (feature === 'violations') {
        fetchSelectedNodesAndValueCountsGivenViolationSelection(feature, selectedValues).then((d) => {
          dispatch(setSelectedFocusNodesUsingFeatureCategories(d));
        });
      } else {
        fetchSelectedNodesAndValueCountsGivenFeatureCategorySelection(feature, selectedValues).then((d) => {
          dispatch(setSelectedFocusNodesUsingFeatureCategories(d));
        });
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
