import React, { useState, useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import NewWindow from 'react-new-window';

import * as LineUpJS from 'lineupjs';
import { selectCsvData, setSelectedFocusNodes, selectSelectedFocusNodes } from '../Store/CombinedSlice'; // Import the necessary actions and selectors from CombinedSlice

export default function LineUpView() {
  const dispatch = useDispatch();
  const selectedFocusNodes = useSelector(selectSelectedFocusNodes);
  const [localSelectedFocusNodes, setLocalSelectedFocusNodes] = useState<string[]>([]);
  const csvData = useSelector(selectCsvData);
  const lineupRef = useRef<any>();
  const lineupInstanceRef = useRef<any>(); // Ref for lineup instance

  useEffect(() => {
    if (lineupRef.current && csvData.length > 0) {
      console.time('create lineup instance');
      lineupInstanceRef.current = LineUpJS.asLineUp(lineupRef.current, csvData);
      console.timeEnd('create lineup instance');

      lineupInstanceRef.current.on('selectionChanged', (selection) => {
        console.time('selection map');
        const selectedNodes = selection.map((index) => csvData[index].focus_node);
        console.timeEnd('selection map');

        setLocalSelectedFocusNodes(selectedNodes);
        dispatch(setSelectedFocusNodes(selectedNodes));
      });
    }
  }, [lineupRef, csvData]);

  useEffect(() => {
    setLocalSelectedFocusNodes(selectedFocusNodes);
  }, [selectedFocusNodes, csvData]);

  if (lineupInstanceRef.current) {
    console.time('find indices');

    // Create a set from localSelectedFocusNodes for faster lookup
    const focusNodesSet = new Set(localSelectedFocusNodes);

    // Use the set instead of the array for checking if a focus_node is included
    const filteredCsvDataIndices = csvData.map((row, index) => (focusNodesSet.has(row.focus_node) ? index : -1)).filter((index) => index !== -1);

    console.timeEnd('find indices');
    // setFilter needs a parameter of the shape setFilter(filter: ((row: IDataRow) => boolean) | null)
    if (filteredCsvDataIndices.length > 0) {
      console.time('set selection');
      lineupInstanceRef.current.data.setSelection(filteredCsvDataIndices);
      console.timeEnd('set selection');
    } else {
      lineupInstanceRef.current.data.clearSelection();
    }
    const filteredCsvDataIndicesSet = new Set(filteredCsvDataIndices);
    console.time('set filter');
    lineupInstanceRef.current.data.setFilter((row) => filteredCsvDataIndicesSet.has(row.i));
    console.timeEnd('set filter');
  }

  return (
    <div className="lineup-window">
      <NewWindow>
        <link href="https://unpkg.com/lineupjsx/build/LineUpJSx.css" rel="stylesheet" />
        <script src="https://unpkg.com/lineupjsx/build/LineUpJSx.js" />
        <div className="LineUpParent">
          <div
            style={{
              clear: 'both',
              position: 'absolute',
              top: '1px',
              bottom: 0,
              left: 0,
              right: 0,
              padding: 0,
            }}
            ref={lineupRef}
            id="lineup_view"
          />
        </div>
      </NewWindow>
    </div>
  );
}
