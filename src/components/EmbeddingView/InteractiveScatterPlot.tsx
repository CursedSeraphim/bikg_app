import React, { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist';
import createPlotlyComponent from 'react-plotly.js/factory';
import { BarLoader } from 'react-spinners';
import { useDispatch } from 'react-redux';
import _ from 'lodash';
import { setSelectedFocusNodes } from '../Store/CombinedSlice'; // Import the necessary actions from CombinedSlice
import { SPINNER_COLOR } from '../../constants';
import store from '../Store/Store'; // Import your store
import { IScatterPlotProps } from '../../types';
import { getPlotData, plotLayout } from './PlotlyHelpers';

const Plot = createPlotlyComponent(Plotly);

function InteractiveScatterPlot({ data }: IScatterPlotProps) {
  console.time('Rendering scatter plot took');

  const dispatch = useDispatch();
  const selectedFocusNodesRef = useRef<string[]>([]);

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
    if (eventData?.points && eventData.points.length > 0) {
      const selectedPoints = eventData.points.map((point) => data[point.pointIndex]);
      const selectedNodes = selectedPoints.map((point) => point.text);
      selectedFocusNodesRef.current = selectedNodes;
      dispatch(setSelectedFocusNodes(selectedNodes));
    }
  };

  const plotData = getPlotData(selectedFocusNodesRef.current, data);

  if (data.length === 0) {
    return <BarLoader color={SPINNER_COLOR} loading />;
  }

  console.timeEnd('Rendering scatter plot took');
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
