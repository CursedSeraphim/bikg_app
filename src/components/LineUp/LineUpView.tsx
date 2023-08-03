// LineUpView.tsx
import React, { useRef, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as LineUpJS from 'lineupjs';
import { selectCsvData, setSelectedFocusNodes, selectSelectedFocusNodes, selectFilterType, selectMissingEdgeOption } from '../Store/CombinedSlice';
import { ICsvData, CsvCell } from '../../types';
import { CSV_EDGE_NOT_IN_ONTOLOGY_SHORTCUT_STRING, CSV_EDGE_NOT_IN_ONTOLOGY_STRING } from '../../constants';

/**
 * Filter out columns that only contain a single unique value.
 *
 * @param {ICsvData[]} data - The CSV data to be processed.
 * @returns {ICsvData[]} The CSV data without columns containing a single unique value.
 */
const filterAllUniModalColumns = (data: ICsvData[]): ICsvData[] => {
  const uniqueValuesPerColumn = new Map<string, Set<CsvCell>>();
  const isUnimodalColumn = new Map<string, boolean>();

  // Iterate over all rows and columns
  data.forEach((row) => {
    if (row.Id !== null) {
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
 * Filter out columns that exclusively contain NaN values.
 *
 * @param {ICsvData[]} data - The CSV data to be processed.
 * @returns {ICsvData[]} The CSV data with columns exclusively containing NaN values removed.
 */
const filterAllNanColumns = (data: ICsvData[]): ICsvData[] => {
  const notMissingEdgeColumns = new Map<string, boolean>();

  // Preprocess data and track columns with non-dash values
  const preprocessedData = data.map((sample) => {
    const processedSample: ICsvData = { Id: sample.Id };

    for (const key in sample) {
      if (sample.Id !== null) {
        if (key !== 'Id') {
          const value = sample[key] === CSV_EDGE_NOT_IN_ONTOLOGY_STRING ? CSV_EDGE_NOT_IN_ONTOLOGY_SHORTCUT_STRING : sample[key];

          processedSample[key] = value;

          // If the value is not "-", mark the column as having non-dash values
          if (value !== CSV_EDGE_NOT_IN_ONTOLOGY_SHORTCUT_STRING && !notMissingEdgeColumns.get(key)) {
            notMissingEdgeColumns.set(key, true);
          }
        }
      }
    }

    return processedSample;
  });

  // Filter out columns that only contain missing edges
  return preprocessedData.map((sample) => {
    const filteredSample: ICsvData = { Id: sample.Id };

    for (const key in sample) {
      if (key !== 'Id' && notMissingEdgeColumns.get(key)) {
        filteredSample[key] = sample[key];
      }
    }

    return filteredSample;
  });
};

/**
 * LineUpView component for visualizing CSV data.
 * It uses the Redux state to select focus nodes and to retrieve CSV data.
 *
 * @returns {React.Element} A rendered LineUp view component.
 */
export default function LineUpView() {
  const dispatch = useDispatch();
  const selectedFocusNodes = useSelector(selectSelectedFocusNodes);
  const reduxCsvData = useSelector(selectCsvData);
  const filterType = useSelector(selectFilterType);
  const missingEdgeOption = useSelector(selectMissingEdgeOption);

  // Local state to hold csvData
  const [csvData, setCsvData] = useState(reduxCsvData);

  /**
   * Set up a listener for selection changes in the lineup instance.
   * On triggering a selection change event, it dispatches the selected nodes to the redux store.
   *
   * @param {LineUpJS.Taggle} lineupInstanceRef - Reference to the current lineup instance.
   */
  const setupListener = (lineupInstanceRef): void => {
    lineupInstanceRef.current.on('selectionChanged', (selection) => {
      const selectedNodes = selection.map((index) => csvData[index].focus_node);
      dispatch(setSelectedFocusNodes(selectedNodes));
    });
  };

  /**
   * Create a new LineUp instance with an event listener for selection changes.
   *
   * This function first destroys the previous LineUp instance, if it exists, then creates a new one
   * using the provided data. It also sets up a selection change listener for the new LineUp instance.
   *
   * @param {React.RefObject<LineUpJS.Taggle>} lineupInstanceRef - A reference to the current LineUp instance.
   * @param {React.RefObject<HTMLDivElement>} lineupRef - A reference to the HTMLDivElement for the LineUp component.
   * @param {ICsvData[]} data - The CSV data to be visualized in the LineUp instance.
   */
  function createLineUpWithListener(lineupInstanceRef, lineupRef, data) {
    // cleanup old lineup instance
    if (lineupInstanceRef.current) {
      lineupInstanceRef.current.destroy();
    }

    // creating a new one and returning it would be too expensive
    // eslint-disable-next-line no-param-reassign
    lineupInstanceRef.current = LineUpJS.asTaggle(lineupRef.current, data);
    setupListener(lineupInstanceRef);
  }

  /**
   * Filter columns from the provided CSV data based on the selected filter type.
   *
   * @param {ICsvData[]} csvFromFocusNodes - The CSV data containing only focus nodes.
   * @param {ICsvData[]} allData - The complete CSV data set.
   * @returns {ICsvData[]} Filtered CSV data based on the selected filter type.
   */
  function filterColumns(csvFromFocusNodes: ICsvData[], allData: ICsvData[]): ICsvData[] {
    let filteredCsvData = [...allData]; // copy the csvData to avoid mutating the original

    switch (filterType) {
      case 'unimodal': {
        // get unimodal columns
        const unimodalData = filterAllUniModalColumns(csvFromFocusNodes);
        const unimodalColumns = new Set(Object.keys(unimodalData[0]));

        filteredCsvData = filteredCsvData.map((row) => {
          const filteredRow: ICsvData = { Id: row.Id };

          for (const key in row) {
            if (unimodalColumns.has(key)) {
              filteredRow[key] = row[key]; // remove unimodal columns
            }
          }

          return filteredRow;
        });
        break;
      }
      case 'nan': {
        // get nan columns
        const nanData = filterAllNanColumns(csvFromFocusNodes);
        const nanColumns = new Set(Object.keys(nanData[0]));

        filteredCsvData = filteredCsvData.map((row) => {
          const filteredRow: ICsvData = { Id: row.Id };

          for (const key in row) {
            if (nanColumns.has(key)) {
              filteredRow[key] = row[key]; // remove nan columns
            }
          }

          return filteredRow;
        });
        break;
      }
      default:
        break; // if filterType is 'none', return the csvData as is
    }

    return filteredCsvData;
  }

  /**
   * Create LineUp instance after filtering out unnecessary columns and focus nodes.
   *
   * @param {LineUpJS.Taggle} lineupInstanceRef - Reference to the current lineup instance.
   * @param {HTMLDivElement} lineupRef - HTMLDivElement for the LineUp component.
   * @param {string[]} focusNodes - Selected focus nodes.
   * @param {ICsvData[]} allData - Complete CSV data set.
   */
  function createLineUpFromColumnAndFocusNodeFiltering(lineupInstanceRef, lineupRef, focusNodes, allData) {
    const focusNodesSet = new Set(focusNodes);
    const csvDataFromFocusNodeSet = allData.filter((row) => focusNodesSet.has(row.focus_node));

    // Call a function that takes the allDataFromFocusNodeSet and the allData, and returns allData without the columns based on column filter criteria in csvDataFromFocusNodeSet
    const filteredCsvData = filterColumns(csvDataFromFocusNodeSet, allData);

    // Set up the lineup instance with the filtered allData
    createLineUpWithListener(lineupInstanceRef, lineupRef, filteredCsvData);

    // Precompute a map for focus_node to index mapping for fast lookup
    const csvDataIndexMap = new Map(allData.map((row, index) => [row.focus_node, index]));
    const filteredCsvDataIndices = csvDataFromFocusNodeSet.map((row) => csvDataIndexMap.get(row.focus_node));
    const filteredCsvDataIndicesSet = new Set(filteredCsvDataIndices);

    // Set the filter to subselect the focus nodes
    lineupInstanceRef.current.data.setFilter((row) => filteredCsvDataIndicesSet.has(row.i));
  }

  useEffect(() => {
    setCsvData(reduxCsvData);
  }, [reduxCsvData]);

  const lineupRef = useRef<HTMLDivElement>(null);
  const lineupInstanceRef = useRef<LineUpJS.Taggle | null>(null);

  useEffect(() => {
    if (lineupRef.current && csvData.length > 0) {
      createLineUpWithListener(lineupInstanceRef, lineupRef, csvData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineupRef, csvData, dispatch]);

  useEffect(() => {
    if (lineupInstanceRef.current) {
      if (selectedFocusNodes.length > 0) {
        createLineUpFromColumnAndFocusNodeFiltering(lineupInstanceRef, lineupRef, selectedFocusNodes, csvData);
      } else {
        // create fake list of focusnodes where everything is selected from the csvData
        const allFocusNodes = csvData.map((row) => row.focus_node);
        createLineUpFromColumnAndFocusNodeFiltering(lineupInstanceRef, lineupRef, allFocusNodes, csvData);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFocusNodes, csvData, filterType, missingEdgeOption]); // add filterType to the dependencies

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
