export interface CsvData {
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
      scatterDataArray.push({
        x: sample.x,
        y: sample.y,
        text: sample.focus_node,
      });
    });
  }

  return scatterDataArray;
}
