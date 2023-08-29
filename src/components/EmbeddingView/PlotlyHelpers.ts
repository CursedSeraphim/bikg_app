// PlotlyHelpers.ts
import { Data, Layout } from 'plotly.js';
import { IScatterNode } from '../../types';
import { SELECTED_EXEMPLAR_NODE_COLOR, UNSELECTED_EXEMPLAR_NODE_COLOR } from '../../constants';

export function getPlotData(selectedNodes: string[], data: IScatterNode[]): Data[] {
  return [
    {
      x: data.map((d) => d.x),
      y: data.map((d) => d.y),
      mode: 'markers',
      type: 'scatter',
      text: data.map((d) => d.text),
      marker: {
        size: 3,
        // TODO change color to selected and unselected focus node color from constants.ts
        color: data.map((d) => (selectedNodes.includes(d.text) ? SELECTED_EXEMPLAR_NODE_COLOR : UNSELECTED_EXEMPLAR_NODE_COLOR)),
        opacity: 0.5,
      },
    },
  ];
}

export const plotLayout: Partial<Layout> = {
  hovermode: 'closest',
  dragmode: 'lasso',
  autosize: true,
  margin: {
    l: 0, // left margin
    r: 0, // right margin
    b: 0, // bottom margin
    t: 0, // top margin
    pad: 0, // padding
  },
  xaxis: {
    // title: 'Embedding Dimension 1',
    showgrid: false,
    zeroline: false,
    showticklabels: false,
    showline: false,
    ticks: '',
  },
  yaxis: {
    // title: 'Embedding Dimension 2',
    showgrid: false,
    zeroline: false,
    showticklabels: false,
    showline: false,
    ticks: '',
  },
};
