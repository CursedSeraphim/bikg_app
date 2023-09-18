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

  const handleMouseUp = (e, payload) => {
    // TODO: Perform lasso-like logic here to determine selected points
    // Update Redux store based on the selected points
    // For demonstration, selecting points with x and y > 50
    const selectedNodes = data.filter((d) => d.x > 50 && d.y > 50).map((d) => d.text);
    dispatch(setSelectedFocusNodes(selectedNodes));
  };

  if (data.length === 0) {
    return <BarLoader color={SPINNER_COLOR} loading />;
  }

  return (
    <div className="scatter-plot-container">
      <ScatterChart width={400} height={300}>
        <XAxis dataKey="x" type="number" hide />
        <YAxis dataKey="y" type="number" hide />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
        <Scatter data={data} onMouseUp={handleMouseUp}>
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
