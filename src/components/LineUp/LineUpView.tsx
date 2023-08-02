import React, { useRef, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as LineUpJS from 'lineupjs';

import { selectCsvData, setSelectedFocusNodes, selectSelectedFocusNodes } from '../Store/CombinedSlice';
import { CsvData } from '../Store/types';

const preprocessAndFilterData = (data: CsvData[]): CsvData[] => {
  const nonDashColumns = new Map<string, boolean>();

  // Preprocess data and track columns with non-dash values
  const preprocessedData = data.map((sample) => {
    const processedSample: CsvData = { Id: sample.Id };

    for (const key in sample) {
      if (key !== 'Id') {
        const value = sample[key] === 'EdgeNotPresent' ? '-' : sample[key];

        processedSample[key] = value;

        // If the value is not "-", mark the column as having non-dash values
        if (value !== '-' && !nonDashColumns.get(key)) {
          nonDashColumns.set(key, true);
        }
      }
    }

    return processedSample;
  });

  // Filter out columns that only contain "-"
  return preprocessedData.map((sample) => {
    const filteredSample: CsvData = { Id: sample.Id };

    for (const key in sample) {
      if (key !== 'Id' && nonDashColumns.get(key)) {
        filteredSample[key] = sample[key];
      }
    }

    return filteredSample;
  });
};

export default function LineUpView() {
  const dispatch = useDispatch();
  const selectedFocusNodes = useSelector(selectSelectedFocusNodes);
  const reduxCsvData = useSelector(selectCsvData);

  // Local state to hold csvData
  const [csvData, setCsvData] = useState(reduxCsvData);

  const setupListener = (lineupInstanceRef): any => {
    lineupInstanceRef.current.on('selectionChanged', (selection) => {
      console.log('test selection changed', selection);
      const selectedNodes = selection.map((index) => csvData[index].focus_node);
      dispatch(setSelectedFocusNodes(selectedNodes));
    });
  };

  useEffect(() => {
    setCsvData(reduxCsvData);
  }, [reduxCsvData]);

  const lineupRef = useRef<HTMLDivElement>(null);
  const lineupInstanceRef = useRef<LineUpJS.Taggle | null>(null);

  useEffect(() => {
    console.log('lineup useeffect triggered');
    if (lineupRef.current && csvData.length > 0) {
      lineupInstanceRef.current = LineUpJS.asTaggle(lineupRef.current, csvData);
      // // iterate columns
      // lineupInstanceRef.current.data.getColumns().forEach((column: any) => {
      //   // print object type
      //   console.log(column);
      // });

      setupListener(lineupInstanceRef);
    }
  }, [lineupRef, csvData, dispatch]);

  useEffect(() => {
    console.log('lineup useeffect triggered');

    if (lineupInstanceRef.current) {
      const focusNodesSet = new Set(selectedFocusNodes);
      const filteredCsvDataIndices = csvData.map((row, index) => (focusNodesSet.has(row.focus_node) ? index : -1)).filter((index) => index !== -1);

      if (filteredCsvDataIndices.length > 0) {
        // lineupInstanceRef.current.data.setSelection(filteredCsvDataIndices);
        console.log('filteredCsvDataIndices', filteredCsvDataIndices);

        const filteredCsvData = filteredCsvDataIndices.map((index) => csvData[index]);
        const dataWithoutNanColumns = preprocessAndFilterData(filteredCsvData);
        console.log('preprocessAndFilterData(filteredCsvData)', dataWithoutNanColumns);
        // cleanup old lineup instance
        if (lineupInstanceRef.current) {
          lineupInstanceRef.current.destroy();
        }
        lineupInstanceRef.current = LineUpJS.asTaggle(lineupRef.current, dataWithoutNanColumns);
        setupListener(lineupInstanceRef);
        console.log('set new lineup instance');
      } else {
        lineupInstanceRef.current.data.clearSelection();
        // cleanup old lineup instance
        if (lineupInstanceRef.current) {
          lineupInstanceRef.current.destroy();
        }
        lineupInstanceRef.current = LineUpJS.asTaggle(lineupRef.current, csvData);
        setupListener(lineupInstanceRef);
      }
    }
  }, [selectedFocusNodes, csvData]);

  return (
    <div className="lineup-window">
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
    </div>
  );
}
