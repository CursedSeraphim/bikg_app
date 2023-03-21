import React from 'react';
import Plotly from 'plotly.js-dist';
import createPlotlyComponent from 'react-plotly.js/factory';
import { Data, Layout } from 'plotly.js';
import { useSelector } from 'react-redux';

import { selectSelectedFocusNodes, selectBarPlotData } from '../Store/CsvSlice';
import { csvDataToBarPlotDataGivenFeature } from './csvToPlotlyFeatureData';
import { replaceUrlWithPrefix } from '../../utils';

const Plot = createPlotlyComponent(Plotly);

interface SampleDataItem {
  category: string;
  value: number;
}

interface BarPlotDataState {
  selectedNodes: any;
  samples: any;
}

const violationFeatures = [
  'http://data.boehringer.com/ontology/omics/TranscriptOmicsSampleShape-isPreparedByLibrary',
  'http://data.boehringer.com/ontology/omics/afb51f95-5b17-45a4-b62d-c58f4998f930',
  'http://data.boehringer.com/ontology/omics/0c2600b5-30b2-40c7-917a-b402e73f55ae',
  'http://data.boehringer.com/ontology/omics/TranscriptOmicsSampleShape-hasSequencingProtocol',
  'http://data.boehringer.com/ontology/omics/38c0a1c7-1c92-489a-a22e-87f5335ccb1a',
  'http://data.boehringer.com/ontology/omics/TranscriptOmicsSampleShape-isMeasuredOnPlatform',
  'http://data.boehringer.com/ontology/omics/OmicsStudyShape-isSequencedForIndication',
  'http://data.boehringer.com/ontology/omics/OmicsStudyShape-isPartOfProject',
  'http://data.boehringer.com/ontology/omics/248e9792-8549-4e0d-8665-06c42aff8ffc',
  'http://data.boehringer.com/ontology/omics/OmicsStudyShape-hasStudyType',
  'http://data.boehringer.com/ontology/omics/OmicsStudyShape-hasContactScientist',
  'http://data.boehringer.com/ontology/omics/ece15faa-30b3-471c-ae51-2d6d1f80e3a9',
  'http://data.boehringer.com/ontology/omics/af998a22-f11b-43ea-b0ac-44e728baeafb',
  'http://data.boehringer.com/ontology/omics/OmicsStudyShape-hasResponsibleSite',
  'http://data.boehringer.com/ontology/omics/9589ebf0-6f4f-4b80-9a5a-75aa25b5715f',
  'http://data.boehringer.com/ontology/omics/OmicsStudyShape-isSequencedForTherapeuticArea',
  'http://data.boehringer.com/ontology/omics/OmicsStudyShape-hasContactCompBio',
  'http://data.boehringer.com/ontology/omics/TranscriptOmicsSampleShape-hasStrandedness',
];

const getBarPlotData = (selectedNodes: any, samples: any): Data[] => {
  if (samples === undefined) {
    const barPlotData = {
      x: [],
      y: [],
      type: 'bar',
      name: 'violations',
    };
  }

  const countsByFeature: Record<string, Record<string, number>> = {};

  violationFeatures.forEach((feature) => {
    countsByFeature[feature] = {};
    selectedNodes.forEach((nodeId) => {
      const nodeData = samples.find((entry) => entry.focus_node === nodeId);
      if (nodeData && nodeData[feature]) {
        const value = replaceUrlWithPrefix(nodeData[feature]);
        countsByFeature[feature][value] = (countsByFeature[feature][value] || 0) + 1;
      }
    });
  });

  // find the list of features in countsByFeature that have are not 0 or empty
  const nonEmptyFeatures = Object.keys(countsByFeature).filter((feature) => Object.keys(countsByFeature[feature]).length > 0);

  // turn all non empty features in countsByFeature into 2 arrays of x and y values
  //   console.log('countsByFeature', countsByFeature);
  const nonEmptyCountsByFeature = {};

  for (const [key, value] of Object.entries(countsByFeature)) {
    if (Object.keys(value).length > 0) {
      nonEmptyCountsByFeature[key] = value;
    }
  }

  console.log(nonEmptyCountsByFeature);

  const xValues = Object.keys(nonEmptyCountsByFeature).map(replaceUrlWithPrefix);
  const yValues = Object.values(nonEmptyCountsByFeature).map((value) => value['1']);
  console.log('xValues', xValues);
  console.log('yValues', yValues);

  return [
    {
      x: replaceUrlWithPrefix(xValues),
      y: yValues,
      type: 'bar',
      marker: {
        color: 'steelblue',
      },
      name: 'violations',
    },
  ];
};

function ViolationsBarPlotSample() {
  const data = useSelector(selectBarPlotData) as BarPlotDataState;
  const plotData = getBarPlotData(data.selectedNodes, data.samples);
  console.log('violations plotData', plotData);
  const plotLayout: Partial<Layout> = {
    title: 'Violations',
    titlefont: { size: 12 },
    xaxis: { title: null, titlefont: { size: 12 }, tickfont: { size: 10 } },
    yaxis: { title: null, titlefont: { size: 12 }, tickfont: { size: 10 } },
    height: 100,
    margin: {
      l: 20,
      r: 20,
      b: 40,
      t: 20,
      pad: 0,
    },
  };

  return (
    <div className="bar-plot-container">
      <Plot data={plotData} layout={plotLayout} config={{ displayModeBar: false, responsive: true }} useResizeHandler style={{ width: '100%' }} />
    </div>
  );
}

export default ViolationsBarPlotSample;
