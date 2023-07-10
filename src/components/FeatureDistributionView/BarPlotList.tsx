// BarPlotList.tsx
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { BarLoader } from 'react-spinners';
import BarPlotSample from './BarPlotSample';
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
  const filteredFeatures = ['x', 'y', 'rdf:type'];

  useEffect(() => {
    fetchBarPlotDataGivenSelection(data.selectedNodes).then((d) => {
      setLocalBarPlotData(d);
    });
  }, [data]);
  if (localBarPlotData.plotlyData.length === 0) {
    return <BarLoader color="steelblue" loading />;
  }
  // Maximum number of values for a feature
  const MAX_VALUES = 100;

  // Create array of keys sorted by chiScores in descending order,
  // excluding those listed in filteredFeatures and those with more than MAX_VALUES
  const sortedKeys = Object.keys(localBarPlotData.plotlyData)
    .filter(
      (key) =>
        !filteredFeatures.includes(key) &&
        localBarPlotData.plotlyData[key].overall.y.length <= MAX_VALUES &&
        localBarPlotData.plotlyData[key].selected.y.length <= MAX_VALUES,
    )
    .sort((a, b) => localBarPlotData.chiScores[b] - localBarPlotData.chiScores[a]);

  return (
    <div className="bar-plot-list-container">
      {sortedKeys.map((key) => (
        <BarPlotSample key={key} plotlyData={localBarPlotData.plotlyData[key]} feature={key} /> // chiScore={localBarPlotData.chiScores[key]} feature={key} />
      ))}
    </div>
  );
}

export default BarPlotList;
