import { CsvData } from '../../types';

export interface ScatterCsvData {
  x: number;
  y: number;
  focus_node: string;
}

export interface ScatterData {
  x: number;
  y: number;
  text: string;
}

export function dataToScatterDataArray(samples: CsvData[]): ScatterData[] {
  const scatterDataArray: ScatterData[] = [];

  if (samples) {
    samples.forEach((sample) => {
      if (sample.x !== undefined && sample.y !== undefined && sample.focus_node !== undefined) {
        scatterDataArray.push({
          x: sample.x,
          y: sample.y,
          text: sample.focus_node,
        });
      }
    });
  }

  return scatterDataArray;
}
