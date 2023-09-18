// InteractiveScatterPlot.tsx
import React, { useEffect, useRef } from 'react';
import { useDispatch } from 'react-redux';
import { BarLoader } from 'react-spinners';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import _ from 'lodash';
import { setSelectedFocusNodes } from '../Store/CombinedSlice';
import store from '../Store/Store';
import { SPINNER_COLOR, SELECTED_EXEMPLAR_NODE_COLOR, UNSELECTED_EXEMPLAR_NODE_COLOR } from '../../constants';

function InteractiveScatterPlot({ data }) {
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

  if (data.length === 0) {
    return <BarLoader color={SPINNER_COLOR} loading />;
  }

  return (
    <div className="scatter-plot-container">
      <ScatterChart width={400} height={300}>
        <XAxis dataKey="x" type="number" hide />
        <YAxis dataKey="y" type="number" hide />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
        <Scatter data={data}>
          {data.map((entry) => {
            const color = selectedFocusNodesRef.current.includes(entry.text) ? SELECTED_EXEMPLAR_NODE_COLOR : UNSELECTED_EXEMPLAR_NODE_COLOR;
            return <Cell key={entry.text} fill={color} />;
          })}
        </Scatter>
      </ScatterChart>
    </div>
  );
}

export default InteractiveScatterPlot;
