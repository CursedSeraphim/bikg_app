import { ICsvData } from '../../types';

export interface FeatureCsvData {
  Id: string;
  [key: string]: string | undefined;
}

export interface BarPlotData {
  x: string[];
  y: number[];
  type: 'bar';
  name: string;
}

/**
 * A function that takes a feature (as it appears in the csv in csv slice) and a list of focus nodes as those stored in a list in the csv slice.
 * It then filters the csv data in the csv slice to only include the focus nodes and the feature. From this it generates the data expected by plotly to create a bar plot of this selection.
 * @param feature a string that is the name of a feature as it appears in the csv in the csv slice
 * @param focus_nodes a list of strings that are the names of focus nodes as they appear after user selection in the csv slice
 * @param samples all the data in the csv slice
 */
export function csvDataToBarPlotDataGivenFeature(feature: string, focus_nodes: string[], samples: ICsvData[]): BarPlotData {
  const counts: Record<string, number> = {};
  // if undefined return empty
  if (samples === undefined) {
    return {
      x: [],
      y: [],
      type: 'bar',
      name: feature,
    };
  }
  focus_nodes.forEach((nodeId) => {
    const nodeData = samples.find((entry) => entry.focus_node === nodeId);
    if (nodeData && nodeData[feature] !== undefined && nodeData[feature] !== null) {
      const value = nodeData[feature];
      counts[value] = (counts[value] || 0) + 1;
    }
  });

  return {
    x: Object.keys(counts),
    y: Object.values(counts),
    type: 'bar',
    name: feature,
  };
}

/**
 * A function that takes a feature (as it appears in the csv in csv slice) and generates the data expected by plotly to create a bar plot of this selection.
 * @param feature a string that is the name of a feature as it appears in the csv in the csv slice
 * @param samples all the data in the csv slice
 */
export function csvDataToBarPlotDataGivenFeatureOverallDistribution(feature: string, samples: ICsvData[]): BarPlotData {
  const counts: Record<string, number> = {};
  // if undefined return empty
  if (samples === undefined) {
    return {
      x: [],
      y: [],
      type: 'bar',
      name: feature,
    };
  }

  samples.forEach((nodeData) => {
    if (nodeData && nodeData[feature] !== undefined && nodeData[feature] !== null) {
      const value = nodeData[feature];
      counts[value] = (counts[value] || 0) + 1;
    }
  });

  return {
    x: Object.keys(counts),
    y: Object.values(counts),
    type: 'bar',
    name: feature,
  };
}
