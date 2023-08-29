// LineUpView.tsx
import React, { useRef, useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import * as LineUpJS from 'lineupjs';
import { selectCsvData, setSelectedFocusNodes, selectSelectedFocusNodes, selectFilterType, selectMissingEdgeOption } from '../Store/CombinedSlice';
import { ICsvData, CsvCell } from '../../types';
import { CSV_EDGE_NOT_IN_ONTOLOGY_SHORTCUT_STRING, CSV_EDGE_NOT_IN_ONTOLOGY_STRING } from '../../constants';

const columnTypes = {};

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
  console.time('Rendering LU took');

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

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  function createLineUpAsTaggle(lineupInstanceRef, lineupRef, data) {
    // eslint-disable-next-line no-param-reassign
    lineupInstanceRef.current = LineUpJS.asTaggle(lineupRef.current, data);
  }

  /**
   * Infers the data type for the provided column.
   * If a column contains NaN or other non-parsable values, it doesn't affect the type of the column.
   *
   * @param {Object[]} data - The data set.
   * @param {string} column - The column from the data set.
   * @returns {string} - The inferred data type for the column.
   */
  function inferType(data, column) {
    const columnValues = data.map((row) => row[column]);
    const uniqueValues = [...new Set(columnValues)];

    // Check if all non-null values are boolean (true, false, 0, or 1)
    const allBooleans = columnValues.every(
      (value) =>
        value === CSV_EDGE_NOT_IN_ONTOLOGY_SHORTCUT_STRING ||
        (typeof value === 'string' && (value.toLowerCase() === 'true' || value.toLowerCase() === 'false')) ||
        (Number.isInteger(value) && (value === 0 || value === 1)),
    );

    if (allBooleans) {
      return 'boolean';
    }

    // Check if all non-null values are links
    const allLinks = columnValues.every((value) => typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://')));

    if (allLinks) {
      return 'link';
    }

    // Check if all non-null values can be parsed as numbers
    const allNumbers = columnValues.every((value) => value === CSV_EDGE_NOT_IN_ONTOLOGY_SHORTCUT_STRING || !Number.isNaN(Number(value)));
    if (allNumbers && uniqueValues.length > 2) {
      return 'number';
    }

    // Check if all non-null values can be parsed as dates
    const allDates = columnValues.every((value) => value === CSV_EDGE_NOT_IN_ONTOLOGY_SHORTCUT_STRING || !Number.isNaN(new Date(value).getTime()));
    if (allDates) {
      return 'date';
    }

    // Check if the values are categorical (all can be parsed as strings, and number of unique values is low)
    if (uniqueValues.length <= 10) {
      return 'categorical';
    }

    // If the column values are none of the above, assume string type
    return 'string';
  }

  interface CanvasOwner {
    canvas?: HTMLCanvasElement;
  }

  /**
   * Measures the width of a text string when rendered in a certain font, using a canvas element.
   * The canvas element is created once and then re-used for subsequent measurements for better performance.
   *
   * @param {string} text - The text string to measure.
   * @param {string} font - The CSS font property to use for text measurement.
   * @returns {number} The measured width of the text.
   */
  function getTextWidthFromCanvas(text: string, font: string): number {
    const canvasOwner = getTextWidthFromCanvas as CanvasOwner;

    if (!canvasOwner.canvas) {
      canvasOwner.canvas = document.createElement('canvas');
    }

    const context = canvasOwner.canvas.getContext('2d');
    context.font = font;
    const metrics = context.measureText(text);
    return metrics.width;
  }

  /**
   * Calculates the pixel width for the provided column.
   *
   * @param {string} column - The column from the data set.
   * @returns {number} - The calculated pixel width for the column.
   */
  function calculatePixelWidthFromLabel(column) {
    const padding = 50;
    return getTextWidthFromCanvas(column, '16px Roboto') + padding;
  }

  /**
   * Removes the prefix before a colon in the provided column name.
   *
   * @param {string} column - The column from the data set.
   * @returns {string} - The column name without the prefix.
   */
  function removePrefix(column) {
    // Remove any prefix before a colon
    const parts = column.split(':');
    if (parts.length > 1) {
      // If there's a colon, return the part after the colon
      return parts[1].trim();
    }
    // If there's no colon, return the column as is
    return column;
  }

  /**
   * This function constructs a LineUpJS builder with columns built according to the provided data.
   * For each column, it infers the type, calculates the pixel width based on the label, removes any prefix from the label,
   * and finally adds a column to the builder with the processed column data.
   *
   * @param {Object[]} data - An array of objects that represents the data for the LineUpJS builder. Each object should correspond to a row.
   * @returns {Object} A LineUpJS builder with the constructed columns.
   */
  function buildColumns(data) {
    const builder = LineUpJS.builder(data);
    const columns = Object.keys(data[0]);
    columns.forEach((column) => {
      const type = inferType(data, column);
      const width = calculatePixelWidthFromLabel(column);
      const label = removePrefix(column);
      builder.column(LineUpJS.buildColumn(type, column).label(label).width(width));
    });
    builder.rowHeight(21);
    return builder;
  }

  /**
   * This function creates a LineUp instance with a builder built from the provided data.
   * After building the columns, it constructs a ranking and sets it as the default ranking for the builder.
   * The constructed builder is then used to build a LineUp instance at the provided DOM element.
   *
   * @param {Object} lineupInstanceRef - A reference to the LineUp instance to be created.
   * @param {Object} lineupRef - A reference to the DOM element where the LineUp instance will be created.
   * @param {Object[]} data - An array of objects that represents the data for the LineUpJS builder. Each object should correspond to a row.
   */
  function createLineUpWithBuilder(lineupInstanceRef, lineupRef, data) {
    const builder = buildColumns(data);
    // eslint-disable-next-line no-param-reassign
    lineupInstanceRef.current = builder.buildTaggle(lineupRef.current);
  }

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

    createLineUpWithBuilder(lineupInstanceRef, lineupRef, data);
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

  function preprocessColumnTypes(data) {
    const firstRow = data[0];
    const columns = Object.keys(firstRow);

    columns.forEach((column) => {
      columnTypes[column] = inferType(data, column);
    });
  }

  useEffect(() => {
    if (reduxCsvData && reduxCsvData.length > 0) {
      setCsvData(reduxCsvData);
      preprocessColumnTypes(reduxCsvData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

  console.timeEnd('Rendering LU took');
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
