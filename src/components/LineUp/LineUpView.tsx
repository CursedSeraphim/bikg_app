import * as LineUpJS from 'lineupjs';
import React, { useEffect, useRef, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
// import './LineUpOverrides.sass';
import { buildBooleanColumn, buildCategoricalColumn, buildDateColumn, buildNumberColumn, buildStringColumn } from 'lineupjs';
import { CSV_EDGE_NOT_IN_ONTOLOGY_STRING, MISSING_EDGE_COLOR } from '../../constants';
import { ICanvasOwner, ICsvData } from '../../types';
import {
  selectCsvData,
  selectFilterType,
  selectHiddenLineupColumns,
  selectHideNamespacePrefixCells,
  selectHideNamespacePrefixColumns,
  selectMissingEdgeLabel,
  selectMissingEdgeOption,
  selectSelectedFocusNodes,
  setSelectedFocusNodes,
} from '../Store/CombinedSlice';
import ColoredUpSetCellRenderer from './ColoredUpSetCellRenderer';
import { anonymizeLabel, applyAnonymizationToCells, applyPrefixToCells, FocusRow, getOriginalFocusNodeId, removePrefix } from './focusNodeLabels';
import { filterAllNanColumns, filterAllUniModalColumns } from './lineUpHelpers';

const columnTypes: { [key: string]: string } = {};

type DataType = {
  [key: string]: number | string | boolean | null | string[];
};

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
  const initialColumnsRef = useRef<any[] | null>(null);

  // Local state to hold csvData used for rendering in LineUp
  const [csvData, setCsvData] = useState<ICsvData[]>(reduxCsvData);

  /**
   * Set up a listener for selection changes in the lineup instance.
   * Uses the original focus node id for coordination with the store.
   */
  const setupListener = (lineupInstanceRef: React.MutableRefObject<LineUpJS.Taggle | null>): void => {
    lineupInstanceRef.current?.on('selectionChanged', (selection: number[]) => {
      const selectedNodes = selection.map((index) => {
        const row = csvData[index] as FocusRow;
        return getOriginalFocusNodeId(row);
      });
      dispatch(setSelectedFocusNodes(selectedNodes));
    });
  };

  function inferType(data: DataType[], column: string) {
    const columnValues = data.map((row) => row[column]);
    const uniqueValues = [...new Set(columnValues)];

    if (columnValues.some((value) => Array.isArray(value))) return 'set';

    const allBooleans = columnValues.every(
      (value) =>
        value === missingEdgeLabel ||
        (typeof value === 'string' && (value.toLowerCase() === 'true' || value.toLowerCase() === 'false')) ||
        (Number.isInteger(value) && (value === 0 || value === 1)),
    );
    if (allBooleans) return 'boolean';

    const allLinks = columnValues.every((value) => typeof value === 'string' && (value.startsWith('http://') || value.startsWith('https://')));
    if (allLinks) return 'link';

    const allNumbers = columnValues.every((value) => value === missingEdgeLabel || !Number.isNaN(Number(value)));
    if (allNumbers && uniqueValues.length > 2) return 'number';

    const allDates = columnValues.every((value) => {
      if (value === missingEdgeLabel || value == null) {
        return true;
      }
      if (typeof value === 'string' || typeof value === 'number') {
        const d = new Date(value);
        return !Number.isNaN(d.getTime());
      }
      return false;
    });
    if (allDates) return 'date';

    if (uniqueValues.length <= 10) return 'categorical';

    return 'string';
  }

  function getTextWidthFromCanvas(text: string, font: string): number {
    const canvasOwner = getTextWidthFromCanvas as ICanvasOwner;
    if (!canvasOwner.canvas) {
      canvasOwner.canvas = document.createElement('canvas');
    }
    const context = canvasOwner.canvas.getContext('2d')!;
    context.font = font;
    const metrics = context.measureText(text);
    return metrics.width;
  }

  function calculatePixelWidthFromLabel(column: string) {
    const padding = 50;
    return getTextWidthFromCanvas(column, '16px Roboto') + padding;
  }

  function safelyParseStringifiedArray(value: string): string[] | null {
    try {
      if (value.startsWith('[') && value.endsWith(']')) {
        const elements = value.substring(1, value.length - 1).split(',');
        return elements.map((element) => element.trim().replace(/^['"]|['"]$/g, ''));
      }
    } catch {
      // ignore parse errors
    }
    return null;
  }

  type BuilderFunction = (column: string, data: DataType[], width: number, colorMap?: { [key: string]: string }) => LineUpJS.ColumnBuilder;

  function buildBooleanColumnWithSettings(column: string, _data: DataType[], width: number): LineUpJS.ColumnBuilder {
    return buildBooleanColumn(column).trueMarker('1').falseMarker('0').width(width);
  }

  function buildNumberColumnWithSettings(column: string, _data: DataType[], width: number): LineUpJS.ColumnBuilder {
    return buildNumberColumn(column).width(width);
  }

  function buildDateColumnWithSettings(column: string, _data: DataType[], width: number): LineUpJS.ColumnBuilder {
    return buildDateColumn(column).width(width);
  }

  function buildCategoricalColumnWithSettings(column: string, data: DataType[], width: number, colorMap?: { [key: string]: string }): LineUpJS.ColumnBuilder {
    const uniqueCategories = data.reduce<Set<string>>((acc, row) => acc.add(String(row[column])), new Set<string>());

    const categories = Array.from(uniqueCategories).map((cat) => {
      const entry: { name: string; color?: string } = { name: cat };
      if (cat === missingEdgeLabel || cat === CSV_EDGE_NOT_IN_ONTOLOGY_STRING) {
        entry.color = MISSING_EDGE_COLOR;
      } else if (colorMap && colorMap[cat]) {
        entry.color = colorMap[cat];
      }
      return entry;
    });

    const isBoolean = uniqueCategories.has('True') && uniqueCategories.has('False');

    categories.sort((a, b) => {
      if (a.name === missingEdgeLabel || a.name === CSV_EDGE_NOT_IN_ONTOLOGY_STRING) return -1;
      if (b.name === missingEdgeLabel || b.name === CSV_EDGE_NOT_IN_ONTOLOGY_STRING) return 1;
      if (isBoolean) {
        if (a.name === 'True' && b.name !== 'True') return -1;
        if (b.name === 'True' && a.name !== 'True') return 1;
        if (a.name === 'False' && b.name !== 'False') return -1;
        if (b.name === 'False' && a.name !== 'False') return 1;
      }
      return a.name.localeCompare(b.name);
    });

    return buildCategoricalColumn(column, categories).width(width);
  }

  function buildSetColumnWithSettings(column: string, data: DataType[], width: number, colorMap?: { [key: string]: string }): LineUpJS.ColumnBuilder {
    const uniqueCategories = new Set<string>();
    data.forEach((row) => {
      const values = row[column];
      if (typeof values === 'string') {
        const parsedValues = safelyParseStringifiedArray(values);
        if (parsedValues) {
          parsedValues.forEach((value) => uniqueCategories.add(value));
        } else {
          uniqueCategories.add(values);
        }
      } else if (Array.isArray(values)) {
        values.forEach((value) => uniqueCategories.add(String(value)));
      } else if (values !== null && values !== undefined) {
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

    return buildCategoricalColumn(column, categories).width(width).asSet().renderer('upset');
  }

  function buildStringColumnWithSettings(column: string, _data: DataType[], width: number): LineUpJS.ColumnBuilder {
    return buildStringColumn(column).width(width);
  }

  const builderMap: { [key: string]: BuilderFunction } = {
    boolean: buildBooleanColumnWithSettings,
    number: buildNumberColumnWithSettings,
    date: buildDateColumnWithSettings,
    categorical: buildCategoricalColumnWithSettings,
    string: buildStringColumnWithSettings,
    set: buildSetColumnWithSettings,
  };

  function buildColumns(data: DataType[]): LineUpJS.DataBuilder {
    const builder = LineUpJS.builder(data);
    builder.registerRenderer('upset', new ColoredUpSetCellRenderer());

    const columns = Object.keys(data[0]);

    columns.forEach((column) => {
      const type = inferType(data, column);
      const rawLabel = hideColumnPrefixes ? removePrefix(column) : column;
      const label = anonymizeLabel(rawLabel);
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

  function createLineUpWithBuilder(
    lineupInstanceRef: React.MutableRefObject<LineUpJS.Taggle | null>,
    lineupRef: React.RefObject<HTMLDivElement>,
    data: ICsvData[],
  ) {
    const builder = buildColumns(data as unknown as DataType[]);
    // eslint-disable-next-line no-param-reassign
    lineupInstanceRef.current = builder.buildTaggle(lineupRef.current);
  }

  function createLineUpWithListener(
    lineupInstanceRef: React.MutableRefObject<LineUpJS.Taggle | null>,
    lineupRef: React.RefObject<HTMLDivElement>,
    data: ICsvData[],
  ) {
    if (lineupInstanceRef.current) {
      lineupInstanceRef.current.destroy();
    }
    createLineUpWithBuilder(lineupInstanceRef, lineupRef, data);
    setupListener(lineupInstanceRef);
  }

  function filterColumns(csvFromFocusNodes: ICsvData[], allData: ICsvData[]): ICsvData[] {
    let filteredCsvData = [...allData];

    switch (filterType) {
      case 'unimodal': {
        const unimodalData = filterAllUniModalColumns(csvFromFocusNodes);
        const unimodalColumns = new Set(Object.keys(unimodalData[0]));
        filteredCsvData = filteredCsvData.map((row) => {
          const filteredRow: ICsvData = { Id: row.Id };
          for (const key in row) {
            if (unimodalColumns.has(key)) {
              filteredRow[key] = row[key];
            }
          }
          return filteredRow;
        });
        break;
      }
      case 'nan': {
        const nanData = filterAllNanColumns(csvFromFocusNodes, missingEdgeLabel);
        const nanColumns = new Set(Object.keys(nanData[0]));
        filteredCsvData = filteredCsvData.map((row) => {
          const filteredRow: ICsvData = { Id: row.Id };
          for (const key in row) {
            if (nanColumns.has(key)) {
              filteredRow[key] = row[key];
            }
          }
          return filteredRow;
        });
        break;
      }
      default:
        break;
    }

    return filteredCsvData;
  }

  function createLineUpFromColumnAndFocusNodeFiltering(
    lineupInstanceRef: React.MutableRefObject<LineUpJS.Taggle | null>,
    focusNodes: string[],
    allData: ICsvData[],
  ) {
    const focusNodesSet = new Set(focusNodes);
    const csvDataFromFocusNodeSet = allData.filter((row) => focusNodesSet.has(getOriginalFocusNodeId(row as FocusRow)));

    const filteredCsvData = filterColumns(csvDataFromFocusNodeSet, allData);
    const remainingCols = Object.keys(filteredCsvData[0]);

    const ranking = lineupInstanceRef.current!.data.getFirstRanking();
    const rankingColumns = ranking.children; // public accessor

    // Hide all columns starting from index 3
    for (let i = 3; i < rankingColumns.length; i += 1) {
      rankingColumns[i].hide();
    }

    // Show only those columns whose original column name is still present
    for (let i = 3; i < rankingColumns.length; i += 1) {
      const columnDesc = rankingColumns[i].desc as { column?: string };
      if (columnDesc.column && remainingCols.includes(columnDesc.column)) {
        rankingColumns[i].show();
      }
    }

    const csvDataIndexMap = new Map<string, number>(allData.map((row, index) => [getOriginalFocusNodeId(row as FocusRow), index]));
    const filteredCsvDataIndices = csvDataFromFocusNodeSet.map((row) => csvDataIndexMap.get(getOriginalFocusNodeId(row as FocusRow)));
    const filteredCsvDataIndicesSet = new Set(filteredCsvDataIndices);

    // Narrow the data provider to something that has setFilter
    interface FilterableDataProvider {
      setFilter(predicate: (row: { i: number }) => boolean): void;
    }

    const dataProvider = lineupInstanceRef.current!.data as unknown as FilterableDataProvider;

    dataProvider.setFilter((row) => filteredCsvDataIndicesSet.has(row.i));
  }

  function preprocessColumnTypes(data: DataType[]) {
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

  useEffect(() => {
    if (reduxCsvData && reduxCsvData.length > 0) {
      const booleanData = turnBooleanIntoFalseTrue(reduxCsvData);
      const anonymizedData = applyAnonymizationToCells(booleanData);
      const prefixedData = applyPrefixToCells(anonymizedData, hideCellPrefixes);

      setCsvData(prefixedData);
      preprocessColumnTypes(prefixedData as unknown as DataType[]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reduxCsvData, hideCellPrefixes]);

  const lineupRef = useRef<HTMLDivElement>(null);
  const lineupInstanceRef = useRef<LineUpJS.Taggle | null>(null);

  useEffect(() => {
    if (lineupRef.current && csvData.length > 0) {
      createLineUpWithListener(lineupInstanceRef, lineupRef, csvData);
      const initialColumns = lineupInstanceRef.current!.data.getFirstRanking().children.map((col) => col);
      initialColumnsRef.current = initialColumns;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lineupRef, csvData, hiddenLineupColumns, hideColumnPrefixes, dispatch]);

  useEffect(() => {
    if (lineupInstanceRef.current) {
      if (selectedFocusNodes.length > 0) {
        createLineUpFromColumnAndFocusNodeFiltering(lineupInstanceRef, selectedFocusNodes, csvData);
      } else {
        const allFocusNodes = csvData.map((row) => getOriginalFocusNodeId(row as FocusRow));
        createLineUpFromColumnAndFocusNodeFiltering(lineupInstanceRef, allFocusNodes, csvData);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedFocusNodes, csvData, filterType, missingEdgeOption, hiddenLineupColumns, hideColumnPrefixes]);

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
