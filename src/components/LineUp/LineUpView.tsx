// LineUpView.tsx
import * as LineUpJS from 'lineupjs';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
// import './LineUpOverrides.sass';
import { buildBooleanColumn, buildCategoricalColumn, buildDateColumn, buildNumberColumn, buildStringColumn } from 'lineupjs';
import ColoredUpSetCellRenderer from './ColoredUpSetCellRenderer';
import { CSV_EDGE_NOT_IN_ONTOLOGY_STRING, MISSING_EDGE_COLOR } from '../../constants';
import { ICanvasOwner, ICsvData } from '../../types';
import {
  selectCsvData,
  selectFilterType,
  selectMissingEdgeOption,
  selectMissingEdgeLabel,
  selectSelectedFocusNodes,
  setSelectedFocusNodes,
  selectHiddenLineupColumns,
  selectHideNamespacePrefixColumns,
  selectHideNamespacePrefixCells,
} from '../Store/CombinedSlice';
import { filterAllNanColumns, filterAllUniModalColumns } from './LineUpHelpers';

const columnTypes = {};

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
  const missingEdgeLabel = useSelector(selectMissingEdgeLabel);
  const hiddenLineupColumns = useSelector(selectHiddenLineupColumns) as string[];
  const hideColumnPrefixes = useSelector(selectHideNamespacePrefixColumns);
  const hideCellPrefixes = useSelector(selectHideNamespacePrefixCells);
  const initialColumnsRef = useRef(null);

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

    // Directly check if any value in the column is an array
    const isSet = columnValues.some((value) => Array.isArray(value));
    if (isSet) {
      return 'set';
    }

    // Check if all non-null values are boolean (true, false, 0, or 1)
    const allBooleans = columnValues.every(
      (value) =>
        value === missingEdgeLabel ||
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
    const allNumbers = columnValues.every((value) => value === missingEdgeLabel || !Number.isNaN(Number(value)));
    if (allNumbers && uniqueValues.length > 2) {
      return 'number';
    }

    // Check if all non-null values can be parsed as dates
    const allDates = columnValues.every((value) => value === missingEdgeLabel || !Number.isNaN(new Date(value).getTime()));
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

  /**
   * Measures the width of a text string when rendered in a certain font, using a canvas element.
   * The canvas element is created once and then re-used for subsequent measurements for better performance.
   *
   * @param {string} text - The text string to measure.
   * @param {string} font - The CSS font property to use for text measurement.
   * @returns {number} The measured width of the text.
   */
  function getTextWidthFromCanvas(text: string, font: string): number {
    const canvasOwner = getTextWidthFromCanvas as ICanvasOwner;

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
  function removePrefix(text: string) {
    const parts = text.split(':');
    if (parts.length > 1) {
      return parts[1].trim();
    }
    return text;
  }

  type DataType = { [key: string]: number | string | boolean | null | Array<string> }; // TODO check whether this should alawys be string

  function safelyParseStringifiedArray(value: string): Array<string> | null {
    try {
      // Basic check to see if it looks like an array
      if (value.startsWith('[') && value.endsWith(']')) {
        // Remove the brackets and split the string into an array
        const elements = value.substring(1, value.length - 1).split(',');
        // Further processing might be needed depending on the format of elements
        // For example, trimming whitespace and removing quotes if necessary
        return elements.map((element) => element.trim().replace(/^['"]|['"]$/g, ''));
      }
    } catch (e) {
      // Log errors or handle them as needed
      console.error('Error parsing stringified array:', e);
    }
    return null; // Return null if parsing fails
  }

  // function buildSetColumnDescriptor(column: string, data: DataType[]): any {
  //   const uniqueValues = new Set<string>();
  //   data.forEach((row) => {
  //     const values = row[column];
  //     if (typeof values === 'string') {
  //       // Attempt to parse stringified arrays
  //       const parsedValues = safelyParseStringifiedArray(values);
  //       if (parsedValues) {
  //         // If parsing was successful, add each value to the set of unique values
  //         parsedValues.forEach((value) => uniqueValues.add(value));
  //       } else {
  //         // If parsing failed, treat it as a single value
  //         uniqueValues.add(values);
  //       }
  //     } else if (Array.isArray(values)) {
  //       // If the value is an array, add each element to the set of unique values
  //       values.forEach((value) => uniqueValues.add(value));
  //     } else if (values !== null && values !== undefined) {
  //       // Treat non-string, non-array values as single values
  //       uniqueValues.add(String(values));
  //     }
  //   });
  //   const numUniqueValues = uniqueValues.size;
  //   const categoryString = numUniqueValues < 6 ? 'set' : numUniqueValues < 30 ? 'upset' : 'string';

  //   const categories = Array.from(uniqueValues).map((value, index) => ({
  //     name: value,
  //     label: value,
  //     color: `hsl(${360 * (index / uniqueValues.size)}, 100%, 70%)`,
  //   }));

  //   // Wrap the descriptor within a 'desc' object to match expected structure
  //   const setColumnConfig = {
  //     type: 'set',
  //     label: column,
  //     column,
  //     categories,
  //     renderer: categoryString,
  //     groupRenderer: 'categorical',
  //     summaryRenderer: 'categorical',
  //   };

  //   if (numUniqueValues >= 30) {
  //     setColumnConfig.summaryRenderer = 'None';
  //   }

  //   return setColumnConfig;
  // }

  type BuilderFunction = (column: string, data: DataType[], width: number, colorMap?: { [key: string]: string }) => LineUpJS.ColumnBuilder;

  function buildBooleanColumnWithSettings(column: string, data: DataType[], width: number): LineUpJS.ColumnBuilder {
    return buildBooleanColumn(column).trueMarker('1').falseMarker('0').width(width);
  }

  function buildNumberColumnWithSettings(column: string, data: DataType[], width: number): LineUpJS.ColumnBuilder {
    return buildNumberColumn(column).width(width);
  }

  function buildDateColumnWithSettings(column: string, data: DataType[], width: number): LineUpJS.ColumnBuilder {
    return buildDateColumn(column).width(width);
  }

  function buildCategoricalColumnWithSettings(column: string, data: DataType[], width: number, colorMap?: { [key: string]: string }): LineUpJS.ColumnBuilder {
    const uniqueCategories = data.reduce<Set<string>>((acc, row) => acc.add(String(row[column])), new Set());

    const categories = [] as { name: string; color?: string }[];

    uniqueCategories.forEach((cat) => {
      const entry: { name: string; color?: string } = { name: cat };
      if (cat === missingEdgeLabel || cat === CSV_EDGE_NOT_IN_ONTOLOGY_STRING) {
        entry.color = MISSING_EDGE_COLOR;
      } else if (colorMap && colorMap[cat]) {
        entry.color = colorMap[cat];
      }
      categories.push(entry);
    });

    categories.sort((a, b) => {
      if (a.name === missingEdgeLabel || a.name === CSV_EDGE_NOT_IN_ONTOLOGY_STRING) return -1;
      if (b.name === missingEdgeLabel || b.name === CSV_EDGE_NOT_IN_ONTOLOGY_STRING) return 1;
      return 0;
    });

    return buildCategoricalColumn(column, categories).width(width);
  }

  function buildSetColumnWithSettings(column: string, data: DataType[], width: number, colorMap?: { [key: string]: string }): LineUpJS.ColumnBuilder {
    // const uniqueCategories = data.reduce<Set<string>>((acc, row) => acc.add(String(row[column])), new Set());
    const uniqueCategories = new Set<string>();
    data.forEach((row) => {
      const values = row[column];
      if (typeof values === 'string') {
        // Attempt to parse stringified arrays
        const parsedValues = safelyParseStringifiedArray(values);
        if (parsedValues) {
          // If parsing was successful, add each value to the set of unique values
          parsedValues.forEach((value) => uniqueCategories.add(value));
        } else {
          // If parsing failed, treat it as a single value
          uniqueCategories.add(values);
        }
      } else if (Array.isArray(values)) {
        // If the value is an array, add each element to the set of unique values
        values.forEach((value) => uniqueCategories.add(value));
      } else if (values !== null && values !== undefined) {
        // Treat non-string, non-array values as single values
        uniqueCategories.add(String(values));
      }
    });

    if (uniqueCategories.size > 29) {
      return buildStringColumn(column).width(width);
    }

    const categories = Array.from(uniqueCategories).map((category) => {
      const entry: { name: string; color?: string } = { name: category };
      if (category === missingEdgeLabel || category === CSV_EDGE_NOT_IN_ONTOLOGY_STRING) {
        entry.color = MISSING_EDGE_COLOR;
      } else if (colorMap && colorMap[category]) {
        entry.color = colorMap[category];
      }
      return entry;
    });

    categories.sort((a, b) => {
      if (a.name === missingEdgeLabel || a.name === CSV_EDGE_NOT_IN_ONTOLOGY_STRING) return -1;
      if (b.name === missingEdgeLabel || b.name === CSV_EDGE_NOT_IN_ONTOLOGY_STRING) return 1;
      return 0;
    });

    return buildCategoricalColumn(column, categories)
      .width(width)
      .asSet()
      .renderer('upset');
  }

  function buildStringColumnWithSettings(column: string, data: DataType[], width: number): LineUpJS.ColumnBuilder {
    return buildStringColumn(column).width(width);
  }

  // Existing builderMap remains unchanged
  const builderMap: { [key: string]: BuilderFunction } = {
    boolean: buildBooleanColumnWithSettings,
    number: buildNumberColumnWithSettings,
    date: buildDateColumnWithSettings,
    categorical: buildCategoricalColumnWithSettings,
    string: buildStringColumnWithSettings,
    set: buildSetColumnWithSettings,
  };

  // Existing buildColumns remains mostly unchanged
  function buildColumns(data: DataType[]): LineUpJS.DataBuilder {
    const builder = LineUpJS.builder(data);
    builder.registerRenderer('upset', new ColoredUpSetCellRenderer());
    const columns = Object.keys(data[0]).filter((c) => !hiddenLineupColumns.includes(c));

    columns.forEach((column) => {
      const type = inferType(data, column);
      const label = hideColumnPrefixes ? removePrefix(column) : column;
      const width = calculatePixelWidthFromLabel(label);

      if (type === 'boolean') {
        const booleanColors = { True: '#1f77b4', False: '#ff7f0e' };
        const builtColumn = buildCategoricalColumnWithSettings(column, data, width, booleanColors).label(label);
        builder.column(builtColumn);
        return;
      }

      const builderFunction = builderMap[type];

      if (builderFunction) {
        const builtColumn = builderFunction(column, data, width).label(label);
        builder.column(builtColumn);
      } else if (type === 'link') {
        builder.column(LineUpJS.buildColumn(type, column).label(label).width(width));
      }
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
        const nanData = filterAllNanColumns(csvFromFocusNodes, missingEdgeLabel);
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
    // names of columns that are left afte filtering
    const remainingCols = Object.keys(filteredCsvData[0]);
    // console.log('remainingCols', remainingCols);

    const initialColumns = initialColumnsRef.current;
    const ranking = lineupInstanceRef.current.data.getFirstRanking();

    for (let i = 3; i < initialColumns.length; i++) {
      ranking.columns[i].hide();
    }

    for (let i = 3; i < initialColumns.length; i++) {
      // if col is in the remainingCols, add it to the ranking
      if (remainingCols.includes(initialColumns[i].desc.column)) {
        ranking.columns[i].show();
      }
    }

    // but we still need all of this below
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

  function turnBooleanIntoFalseTrue(data: ICsvData[]): ICsvData[] {
    return data.map((row) => {
      const transformedRow: ICsvData = { ...row };
      for (const [key, value] of Object.entries(row)) {
        if (value === 0 || value === 1 || value === '0' || value === '1') {
          const numeric = Number(value);
          transformedRow[key] = numeric === 1 ? 'True' : 'False';
        } else if (typeof value === 'string' && (value.toLowerCase() === 'true' || value.toLowerCase() === 'false')) {
          transformedRow[key] = value.toLowerCase() === 'true' ? 'True' : 'False';
        }
      }
      return transformedRow;
    });
  }

  function applyPrefixToCells(data: ICsvData[], hide: boolean): ICsvData[] {
    if (!hide) return data.map((row) => ({ ...row }));
    return data.map((row) => {
      const transformedRow: ICsvData = { ...row };
      Object.keys(row).forEach((k) => {
        const val = row[k];
        if (typeof val === 'string' && k !== 'focus_node') {
          transformedRow[k] = removePrefix(val);
        }
      });
      return transformedRow;
    });
  }

  useEffect(() => {
    if (reduxCsvData && reduxCsvData.length > 0) {
      const booleanData = turnBooleanIntoFalseTrue(reduxCsvData);
      const transformedData = applyPrefixToCells(booleanData, hideCellPrefixes);
      setCsvData(transformedData);
      preprocessColumnTypes(reduxCsvData);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduxCsvData, hideCellPrefixes]);

  const lineupRef = useRef<HTMLDivElement>(null);
  const lineupInstanceRef = useRef<LineUpJS.Taggle | null>(null);

  useEffect(() => {
    if (lineupRef.current && csvData.length > 0) {
      createLineUpWithListener(lineupInstanceRef, lineupRef, csvData);

      // Clone and store the initial columns configuration in the ref
      const initialColumns = lineupInstanceRef.current.data.getFirstRanking().children.map((col) => col);
      initialColumnsRef.current = initialColumns; // Store the columns in the ref
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineupRef, csvData, hiddenLineupColumns, hideColumnPrefixes, dispatch]);

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
  }, [selectedFocusNodes, csvData, filterType, missingEdgeOption, hiddenLineupColumns, hideColumnPrefixes]); // add filterType to the dependencies

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
