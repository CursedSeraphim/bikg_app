// LineUpHelpers.tsx

import { CSV_EDGE_NOT_IN_ONTOLOGY_STRING } from '../../constants/constants';
import { CsvCell, ICsvData } from '../../types';

/**
 * Filter out columns that only contain a single unique value.
 *
 * @param {ICsvData[]} data - The CSV data to be processed.
 * @returns {ICsvData[]} The CSV data without columns containing a single unique value.
 */
export function filterAllUniModalColumns(data: ICsvData[]) {
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
}

/**
 * Filter out columns that exclusively contain NaN values.
 *
 * @param {ICsvData[]} data - The CSV data to be processed.
 * @returns {ICsvData[]} The CSV data with columns exclusively containing NaN values removed.
 */
export function filterAllNanColumns(data: ICsvData[], missingEdgeLabel: string) {
  const notMissingEdgeColumns = new Map<string, boolean>();

  // Preprocess data and track columns with non-empty / non-missing-edge values
  const preprocessedData = data.map((sample) => {
    const processedSample: ICsvData = { Id: sample.Id };

    for (const key in sample) {
      if (sample.Id !== null) {
        if (key !== 'Id') {
          const value = sample[key] === CSV_EDGE_NOT_IN_ONTOLOGY_STRING ? missingEdgeLabel : sample[key];

          processedSample[key] = value;

          // If the value is not "-", mark the column as having non-dash values
          if (value !== missingEdgeLabel && !notMissingEdgeColumns.get(key)) {
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
}
