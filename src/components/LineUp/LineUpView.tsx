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
      console.log('csvData', csvData);
      lineupInstanceRef.current = LineUpJS.asLineUp(lineupRef.current, csvData);

      lineupInstanceRef.current.on('selectionChanged', (selection) => {
        console.log('selectionChanged', selection);
        console.log('csvData', csvData);
        const selectedNodes = selection.map((index) => csvData[index].focus_node);
        console.log('selectedFocusNodes', selectedNodes);

        setLocalSelectedFocusNodes(selectedNodes);
        dispatch(setSelectedFocusNodes(selectedNodes));
      });
    }
  }, [lineupRef, csvData]);

  useEffect(() => {
    lineupInstanceRef.current?.data.clearFilters();
    setLocalSelectedFocusNodes(selectedFocusNodes);
  }, [selectedFocusNodes, csvData]);

  if (lineupInstanceRef.current) {
    console.time('find indices');
    const filteredCsvDataIndices = csvData.map((row, index) => (localSelectedFocusNodes.includes(row.focus_node) ? index : -1)).filter((index) => index !== -1);
    console.timeEnd('find indices');
    console.log('filteredCsvDataIndices', filteredCsvDataIndices);
    // setFilter needs a parameter of the shape setFilter(filter: ((row: IDataRow) => boolean) | null)
    lineupInstanceRef.current.data.setFilter((row) => filteredCsvDataIndices.includes(row.i));
    if (filteredCsvDataIndices.length > 0) {
      lineupInstanceRef.current.data.setSelection(filteredCsvDataIndices);
    } else {
      lineupInstanceRef.current.data.clearSelection();
    }
    lineupInstanceRef.current.data.setFilter((row) => filteredCsvDataIndices.includes(row.i));
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
