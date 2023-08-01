import React, { useRef, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as LineUpJS from 'lineupjs';

import { selectCsvData, setSelectedFocusNodes, selectSelectedFocusNodes } from '../Store/CombinedSlice';
import { CsvData } from '../Store/types';

const preprocessAndFilterData = (data: CsvData[]): { filteredData: CsvData[]; removedColumns: string[] } => {
  // Initially add all columns to the map
  const nonDashColumns = new Map<string, boolean>();
  if (data.length > 0) {
    Object.keys(data[0]).forEach((key) => {
      if (key !== 'Id') {
        nonDashColumns.set(key, true);
      }
    });
  }

  // Preprocess data and track columns with non-dash values
  const preprocessedData = data.map((sample) => {
    const processedSample: CsvData = { Id: sample.Id };

    for (const key in sample) {
      if (key !== 'Id') {
        const value = sample[key] === 'EdgeNotPresent' ? '-' : sample[key];

        processedSample[key] = value;

        // If the value is not "-", remove the column from the map
        if (value !== '-' && nonDashColumns.get(key)) {
          nonDashColumns.delete(key);
        }
      }
    }

    return processedSample;
  });

  // Filter out columns that only contain "-"
  const filteredData = preprocessedData.map((sample) => {
    const filteredSample: CsvData = { Id: sample.Id };

    for (const key in sample) {
      if (key !== 'Id' && !nonDashColumns.get(key)) {
        filteredSample[key] = sample[key];
      }
    }

    return filteredSample;
  });

  // Get list of removed columns
  const removedColumns = Array.from(nonDashColumns.keys());

  // Return filtered data and removed columns
  return {
    filteredData,
    removedColumns,
  };
};

export default function LineUpView() {
  const dispatch = useDispatch();
  const selectedFocusNodes = useSelector(selectSelectedFocusNodes);
  const reduxCsvData = useSelector(selectCsvData);

  // Local state to hold csvData
  const [csvData, setCsvData] = useState(reduxCsvData);

  const removeColumnsByName = (lineupInstanceRef, colNames) => {
    const ranking = lineupInstanceRef.current.data.getRankings()[0];
    const cols = [];

    console.time('find');
    colNames.forEach((colName) => {
      const col = lineupInstanceRef.current.data.find((c) => {
        return c.desc.label.toLowerCase() === colName.toLowerCase();
      });
      if (col) cols.push(col);
    });
    console.timeEnd('find');

    console.log('cols before removing', cols);

    console.time('remove');
    cols.forEach((col) => {
      ranking.remove(col);
    });
    console.timeEnd('remove');
  };

  useEffect(() => {
    setCsvData(reduxCsvData);
  }, [reduxCsvData]);

  const lineupRef = useRef<HTMLDivElement>(null);
  const lineupInstanceRef = useRef<LineUpJS.Taggle | null>(null);

  useEffect(() => {
    if (lineupRef.current && csvData.length > 0) {
      lineupInstanceRef.current = LineUpJS.asTaggle(lineupRef.current, csvData);
      lineupInstanceRef.current.on('selectionChanged', (selection) => {
        const selectedNodes = selection.map((index) => csvData[index].focus_node);
        dispatch(setSelectedFocusNodes(selectedNodes));
      });
    }
  }, [lineupRef, csvData, dispatch]);

  useEffect(() => {
    console.log('lineup useeffect triggered');

    if (lineupInstanceRef.current) {
      const focusNodesSet = new Set(selectedFocusNodes);
      const filteredCsvDataIndices = csvData.map((row, index) => (focusNodesSet.has(row.focus_node) ? index : -1)).filter((index) => index !== -1);

      if (filteredCsvDataIndices.length > 0) {
        lineupInstanceRef.current.data.setSelection(filteredCsvDataIndices);

        console.time('get filtered csv dat aindices');
        const filteredData = filteredCsvDataIndices.map((index) => csvData[index]);
        console.timeEnd('get filtered csv dat aindices');

        console.time('preprocess and filter data');
        const { filteredData: preprocessedData, removedColumns } = preprocessAndFilterData(filteredData);
        console.timeEnd('preprocess and filter data');
        console.log('preprocessedData', preprocessedData);
        console.log('removedColumns', removedColumns);
        console.time('remove columns');
        removeColumnsByName(lineupInstanceRef, removedColumns);
        console.timeEnd('remove columns');
      } else {
        lineupInstanceRef.current.data.clearSelection();
        // Create a new lineup taggle instance using the original data
        console.time('create new temp taggle');
        const tempLineupInstance = LineUpJS.asTaggle(document.createElement('div'), reduxCsvData);
        console.timeEnd('create new temp taggle');
        // Get its ranking
        console.time('get its ranking');
        const tempRanking = tempLineupInstance.data.getRankings()[0];
        console.timeEnd('get its ranking');
        // Overwrite the current lineupinstanceref's ranking with that one
        console.time('clear old rankings');
        lineupInstanceRef.current.data.clearRankings();
        console.timeEnd('clear old rankings');
        console.time('push new ranking');
        lineupInstanceRef.current.data.pushRanking(tempRanking);
        console.timeEnd('push new ranking');
      }
    }
  }, [selectedFocusNodes, csvData, reduxCsvData]);

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
