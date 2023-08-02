// LineUpView.tsx
import React, { useRef, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as LineUpJS from 'lineupjs';

import { selectCsvData, setSelectedFocusNodes, selectSelectedFocusNodes, selectFilterType } from '../Store/CombinedSlice';
import { ICsvData, CsvCell } from '../../types';
import { CSV_EDGE_NOT_IN_ONTOLOGY_SHORTCUT_STRING, CSV_EDGE_NOT_IN_ONTOLOGY_STRING } from '../../constants';

/**
 * Filters out columns that only contain one unique value.
 *
 * @param data The CSV data to be filtered.
 * @returns The CSV data without columns containing one unique value.
 */
const filterAllUniModalColumns = (data: ICsvData[]): ICsvData[] => {
  const uniqueValuesPerColumn = new Map<string, Set<CsvCell>>();
  const isUnimodalColumn = new Map<string, boolean>();

  // Iterate over all rows and columns
  data.forEach((row) => {
    for (const key in row) {
      if (key !== 'Id') {
        const value = row[key];
        let uniqueValues = uniqueValuesPerColumn.get(key);

        // if the unique values for this column hasn't been initialized, do so
        if (!uniqueValues) {
          uniqueValues = new Set();
          uniqueValuesPerColumn.set(key, uniqueValues);
          isUnimodalColumn.set(key, true);
        }

        // If the unique values set already has this value, continue to next column
        if (uniqueValues.has(value)) {
          continue;
        }

        // If the column is unimodal but a second unique value is found, mark as not unimodal
        if (isUnimodalColumn.get(key) && uniqueValues.size === 1) {
          isUnimodalColumn.set(key, false);
        }

        uniqueValues.add(value);
      }
    }
  });

  // Return a new array containing only rows with non-unimodal columns
  return data.map((row) => {
    const filteredRow: ICsvData = { Id: row.Id };

    for (const key in row) {
      if (key !== 'Id' && !isUnimodalColumn.get(key)) {
        filteredRow[key] = row[key];
      }
    }

    return filteredRow;
  });
};

/**
 * Filters out columns that only contain NaN values.
 *
 * @param data The CSV data to be filtered.
 * @returns The CSV data without columns containing only NaN values.
 */
const filterAllNanColumns = (data: ICsvData[]): ICsvData[] => {
  const nonDashColumns = new Map<string, boolean>();

  // Preprocess data and track columns with non-dash values
  const preprocessedData = data.map((sample) => {
    const processedSample: ICsvData = { Id: sample.Id };

    for (const key in sample) {
      if (key !== 'Id') {
        const value = sample[key] === CSV_EDGE_NOT_IN_ONTOLOGY_STRING ? CSV_EDGE_NOT_IN_ONTOLOGY_SHORTCUT_STRING : sample[key];

        processedSample[key] = value;

        // If the value is not "-", mark the column as having non-dash values
        if (value !== CSV_EDGE_NOT_IN_ONTOLOGY_SHORTCUT_STRING && !nonDashColumns.get(key)) {
          nonDashColumns.set(key, true);
        }
      }
    }

    return processedSample;
  });

  // Filter out columns that only contain "-"
  return preprocessedData.map((sample) => {
    const filteredSample: ICsvData = { Id: sample.Id };

    for (const key in sample) {
      if (key !== 'Id' && nonDashColumns.get(key)) {
        filteredSample[key] = sample[key];
      }
    }

    return filteredSample;
  });
};

/**
 * A LineUp view component for visualizing CSV data.
 *
 * Uses the redux state to select focus nodes and CSV data.
 *
 * @returns The LineUp view component.
 */
export default function LineUpView() {
  const dispatch = useDispatch();
  const selectedFocusNodes = useSelector(selectSelectedFocusNodes);
  const reduxCsvData = useSelector(selectCsvData);
  const filterType = useSelector(selectFilterType);

  // Local state to hold csvData
  const [csvData, setCsvData] = useState(reduxCsvData);

  /**
   * Sets up a listener for selection changes in the lineup instance.
   *
   * When a selection change event is triggered, it dispatches the selected nodes to the redux store.
   *
   * @param lineupInstanceRef Reference to the current lineup instance.
   */
  const setupListener = (lineupInstanceRef): any => {
    lineupInstanceRef.current.on('selectionChanged', (selection) => {
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
    if (lineupRef.current && csvData.length > 0) {
      lineupInstanceRef.current = LineUpJS.asTaggle(lineupRef.current, csvData);

      setupListener(lineupInstanceRef);
    }
  }, [lineupRef, csvData, dispatch]);

  useEffect(() => {
    if (lineupInstanceRef.current) {
      const focusNodesSet = new Set(selectedFocusNodes);
      const filteredCsvDataIndices = csvData.map((row, index) => (focusNodesSet.has(row.focus_node) ? index : -1)).filter((index) => index !== -1);

      if (filteredCsvDataIndices.length > 0) {
        // lineupInstanceRef.current.data.setSelection(filteredCsvDataIndices);

        let filteredCsvData = filteredCsvDataIndices.map((index) => csvData[index]);
        console.log('filterType', filterType);
        // Apply filter based on the filterType
        switch (filterType) {
          case 'unimodal':
            filteredCsvData = filterAllUniModalColumns(filteredCsvData);
            break;
          case 'nan':
            filteredCsvData = filterAllNanColumns(filteredCsvData);
            break;
          case 'none':
          default:
            break;
        }

        console.log('preprocessAndFilterData(filteredCsvData)', filteredCsvData);

        // cleanup old lineup instance
        if (lineupInstanceRef.current) {
          lineupInstanceRef.current.destroy();
        }

        lineupInstanceRef.current = LineUpJS.asTaggle(lineupRef.current, filteredCsvData);
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
  }, [selectedFocusNodes, csvData, filterType]); // add filterType to the dependencies

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
