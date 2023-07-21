import React, { useRef, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import NewWindow from 'react-new-window';

import * as LineUpJS from 'lineupjs';
import { selectCsvData, setSelectedFocusNodes, selectSelectedFocusNodes } from '../Store/CombinedSlice'; // Import the necessary actions and selectors from CombinedSlice

export default function LineUpView() {
  const dispatch = useDispatch();
  const selectedFocusNodes = useSelector(selectSelectedFocusNodes);
  // const [localSelectedFocusNodes, setLocalSelectedFocusNodes] = useState<string[]>([]);
  const csvData = useSelector(selectCsvData);
  const lineupRef = useRef<HTMLDivElement>(null);
  // const lineupInstanceRef = useRef<LineUpJS.Taggle | null>(null);
  const lineupInstanceRef = useRef<LineUpJS.LineUp | null>(null);
  // Ref for lineup instance
  // const allFocusNodes = csvData.map((row) => row.focus_node);

  // local selection changes -> update redux selection
  useEffect(() => {
    if (lineupRef.current && csvData.length > 0) {
      // TODO change to builder, look at builder.rowheight
      lineupInstanceRef.current = LineUpJS.asLineUp(lineupRef.current, csvData);
      // lineupInstanceRef.current = LineUpJS.asTaggle(lineupRef.current, csvData);
      // const builder = LineUpJS.builder(csvData); // .column(LineUpJS.buildCategoricalColumn('omics:hasCellType'));
      // for column in csv
      // for (const column of Object.keys(csvData[0])) {
      //   if (column !== 'focus_node') {
      //     builder.column(LineUpJS.buildCategoricalColumn(column));
      //   }
      // }

      // lineupInstanceRef.current = builder.build(lineupRef.current);

      lineupInstanceRef.current.on('selectionChanged', (selection) => {
        const selectedNodes = selection.map((index) => csvData[index].focus_node);

        // setLocalSelectedFocusNodes(selectedNodes);
        dispatch(setSelectedFocusNodes(selectedNodes));
      });
    }
  }, [lineupRef, csvData, dispatch]);

  // redux nodes change -> update local nodes
  useEffect(() => {
    if (lineupInstanceRef.current) {
      // Create a set from localSelectedFocusNodes for faster lookup
      const focusNodesSet = new Set(selectedFocusNodes);

      // Use the set instead of the array for checking if a focus_node is included
      const filteredCsvDataIndices = csvData.map((row, index) => (focusNodesSet.has(row.focus_node) ? index : -1)).filter((index) => index !== -1);

      if (filteredCsvDataIndices.length > 0) {
        lineupInstanceRef.current.data.setSelection(filteredCsvDataIndices);
      } else {
        lineupInstanceRef.current.data.clearSelection();
      }
      // const filteredCsvDataIndicesSet = new Set(filteredCsvDataIndices);
      // lineupInstanceRef.current.data.setFilter((row) => filteredCsvDataIndicesSet.has(row.i));
    }
  }, [selectedFocusNodes, csvData]);

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
