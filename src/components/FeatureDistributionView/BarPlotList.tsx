import React from 'react';
import { useSelector } from 'react-redux';
import BarPlotSample from './BarPlotSample';
import { selectCsvData } from '../Store/CombinedSlice';

/**
 * This function takes the list of all features in the CSV and creates a list of JSX elements frmo the BarPlotSample one below the other to which it hands the feature name as a prop.
 * The csvData does not explicitly have a features list, but it is implicitly there in each of the samples.
 * @returns {JSX.Element}
 */
function BarPlotList(): JSX.Element {
  const csvData = useSelector(selectCsvData);

  const features = csvData && csvData[0] ? Object.keys(csvData[0]) : [];
  return (
    <div className="bar-plot-list-container">
      {features.map((feature) => (
        <BarPlotSample key={feature} feature={feature} />
      ))}
    </div>
  );
}

export default BarPlotList;
