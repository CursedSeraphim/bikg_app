import React, { useEffect, useRef, useState } from 'react';
import Plotly from 'plotly.js-dist';
import createPlotlyComponent from 'react-plotly.js/factory';
import { BarLoader } from 'react-spinners';
import { useDispatch } from 'react-redux';
import _ from 'lodash';
import { setSelectedFocusNodes } from '../Store/CombinedSlice';
import { SPINNER_COLOR } from '../../constants';
import store from '../Store/Store';
import { IScatterPlotProps } from '../../types';
import { getPlotData, plotLayout } from './PlotlyHelpers';

const Plot = createPlotlyComponent(Plotly);

// TODO replace plotly with a faster library that can handle the updates
function InteractiveScatterPlot({ data }: IScatterPlotProps) {
  const dispatch = useDispatch();
  const selectedFocusNodesRef = useRef<string[]>([]);
  const plotData = getPlotData(selectedFocusNodesRef.current, data);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const currentState = store.getState();
      const newSelectedFocusNodes = currentState.combined.selectedNodes;
      if (!_.isEqual(selectedFocusNodesRef.current, newSelectedFocusNodes)) {
        selectedFocusNodesRef.current = newSelectedFocusNodes;
      }
    });

    return () => unsubscribe();
  }, []);

  const handleSelection = (eventData) => {
    if (eventData?.points) {
      const selectedPoints = eventData.points.map((point) => data[point.pointIndex]);
      const selectedNodes = selectedPoints.map((point) => point.text);
      selectedFocusNodesRef.current = selectedNodes;
      dispatch(setSelectedFocusNodes(selectedNodes));
    }
  };

  if (data.length === 0) {
    return <BarLoader color={SPINNER_COLOR} loading />;
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
