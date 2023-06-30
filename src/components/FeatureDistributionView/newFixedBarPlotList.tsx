// BarPlotList.tsx
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import BarPlotSample from './newBarPlotSample';
import { selectBarPlotData } from '../Store/CombinedSlice';
import { fetchBarPlotDataGivenSelection } from '../../api';

/**
 * This function takes the list of all features in the CSV and creates a list of JSX elements from the BarPlotSample one below the other to which it hands the feature name as a prop.
 * The csvData does not explicitly have a features list, but it is implicitly there in each of the samples.
 * @returns {JSX.Element}
 */
function BarPlotList(): JSX.Element {
  const data = useSelector(selectBarPlotData);
  const [localBarPlotData, setLocalBarPlotData] = useState({ plotlyData: [], chiScores: {} });

  // List of filtered features
  const features = ['rdf:type'];

  useEffect(() => {
    fetchBarPlotDataGivenSelection(data.selectedNodes).then((d) => {
      setLocalBarPlotData(d);
    });
  }, [data]);
  if (localBarPlotData.plotlyData.length === 0) {
    return <div>Loading...</div>;
  }
  // Create array of keys sorted by chiScores in descending order
  const sortedKeys = Object.keys(localBarPlotData.plotlyData).filter((key) => features.includes(key));

  return (
    <div className="bar-plot-list-container">
      {sortedKeys.map((key) => (
        <BarPlotSample key={key} plotlyData={localBarPlotData.plotlyData[key]} chiScore={localBarPlotData.chiScores[key]} featureName={key} />
      ))}
    </div>
  );
}

export default BarPlotList;
