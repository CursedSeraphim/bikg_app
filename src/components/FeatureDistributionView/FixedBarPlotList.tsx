import React from 'react';
import { useSelector } from 'react-redux';
import BarPlotSample from './BarPlotSample';
import { selectCsvData } from '../Store/CsvSlice';

/**
 * This function takes the list of all features in the CSV and creates a list of JSX elements frmo the BarPlotSample one below the other to which it hands the feature name as a prop.
 * The csvData does not explicitly have a features list, but it is implicitly there in each of the samples.
 * @returns {JSX.Element[]}
 */
function FixedBarPlotList(): any {
  const features = ['http://www.w3.org/1999/02/22-rdf-syntax-ns#type'];
  // TODO define style in a stylesheet etc
  return (
    <div style={{ backgroundColor: '#f2f2f2', width: '700px', height: '350px', overflow: 'auto', textAlign: 'justify', padding: '20px' }}>
      {features.map((feature) => (
        <BarPlotSample feature={feature} />
      ))}
    </div>
  );
}

export default FixedBarPlotList;
