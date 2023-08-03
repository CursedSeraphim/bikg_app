// LineUpView.tsx
import React, { useRef, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as LineUpJS from 'lineupjs';

import { selectCsvData, setSelectedFocusNodes, selectSelectedFocusNodes, selectFilterType, selectMissingEdgeOption } from '../Store/CombinedSlice';
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
  const missingEdgeOption = useSelector(selectMissingEdgeOption);

  // Local state to hold csvData
  const [csvData, setCsvData] = useState(reduxCsvData);
  const [currentCsvData, setCurrentCsvData] = useState(reduxCsvData);

  /**
   * Sets up a listener for selection changes in the lineup instance.
   *
   * When a selection change event is triggered, it dispatches the selected nodes to the redux store.
   *
   * @param lineupInstanceRef Reference to the current lineup instance.
   */
  const setupListener = (lineupInstanceRef): void => {
    lineupInstanceRef.current.on('selectionChanged', (selection) => {
      console.log('selectionChanged', selection);
      const selectedNodes = selection.map((index) => currentCsvData[index].focus_node);
      dispatch(setSelectedFocusNodes(selectedNodes));
    });
  };

  useEffect(() => {
    setCsvData(reduxCsvData);
  }, [reduxCsvData]);

  const lineupRef = useRef<HTMLDivElement>(null);
  const lineupInstanceRef = useRef<LineUpJS.Taggle | null>(null);

  // useEffect(() => {
  //   console.log('useEffect 1');
  //   if (lineupRef.current && csvData.length > 0) {
  //     setCurrentCsvData(csvData);
  //     // lineupInstanceRef.current = LineUpJS.asTaggle(lineupRef.current, currentCsvData);

  //     setupListener(lineupInstanceRef);
  //   }
  //   // eslint-disable-next-line react-hooks/exhaustive-deps
  // }, [lineupRef, csvData, dispatch]);

  // React effect hook: Updates the LineUp instance whenever the selected focus nodes, csv data, filter type or missing edge option change
  useEffect(() => {
    console.log('useEffect 2');
    // Ensure a LineUp instance is available before proceeding
    if (lineupInstanceRef.current) {
      // Create a Set of focus nodes for quick lookup
      const focusNodesSet = new Set(selectedFocusNodes);

      // Map through the csv data to find the indices of rows where the focus node is in the set
      const filteredCsvDataIndices = csvData.map((row, index) => (focusNodesSet.has(row.focus_node) ? index : -1)).filter((index) => index !== -1);

      // Only proceed if there are rows matching the focus nodes
      if (filteredCsvDataIndices.length > 0) {
        // Extract the rows from csv data that match the focus nodes
        // let filteredCsvData = filteredCsvDataIndices.map((index) => csvData[index]);

        // Apply filter to the data based on the filterType
        switch (filterType) {
          case 'unimodal':
            // Filters out columns that only contain one unique value
            setCurrentCsvData(filterAllUniModalColumns(filteredCsvDataIndices.map((index) => csvData[index])));
            break;
          case 'nan':
            // Filters out columns that only contain NaN values
            setCurrentCsvData(filterAllNanColumns(filteredCsvDataIndices.map((index) => csvData[index])));
            break;
          case 'none':
          default:
            // No filtering is applied
            setCurrentCsvData(filteredCsvDataIndices.map((index) => csvData[index]));
            break;
        }

        // Log the filtered data for debugging
        console.log('currentCsvData', currentCsvData);

        // Cleanup: Destroy the old LineUp instance before creating a new one
        if (lineupInstanceRef.current) {
          lineupInstanceRef.current.destroy();
        }

        // Create a new LineUp instance with the filtered data
        lineupInstanceRef.current = LineUpJS.asTaggle(lineupRef.current, currentCsvData);

        // Set up listener on the new LineUp instance
        setupListener(lineupInstanceRef);

        console.log('set new lineup instance');
      } else {
        // If no rows match the focus nodes, clear the selection and setup a LineUp instance with the original csv data
        lineupInstanceRef.current.data.clearSelection();

        // Cleanup: Destroy the old LineUp instance before creating a new one
        if (lineupInstanceRef.current) {
          lineupInstanceRef.current.destroy();
        }

        setCurrentCsvData(csvData);
        console.log('currentCsvData', currentCsvData);
        // Create a new LineUp instance with the original csv data
        // lineupInstanceRef.current = LineUpJS.asTaggle(lineupRef.current, currentCsvData);

        // Set up listener on the new LineUp instance
        setupListener(lineupInstanceRef);
      }
    }

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFocusNodes, csvData, filterType, missingEdgeOption]); // Depend on these values to re-run the effect

  useEffect(() => {
    if (lineupRef.current && currentCsvData.length > 0) {
      if (lineupInstanceRef.current) {
        lineupInstanceRef.current.destroy();
      }
      lineupInstanceRef.current = LineUpJS.asTaggle(lineupRef.current, currentCsvData);
      setupListener(lineupInstanceRef);
    } else {
      lineupInstanceRef.current = LineUpJS.asTaggle(lineupRef.current, csvData);
      setupListener(lineupInstanceRef);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentCsvData, csvData]);

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
