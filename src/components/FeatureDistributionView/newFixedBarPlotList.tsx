// BarPlotList.tsx
import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { BarLoader } from 'react-spinners';
import BarPlotSample from './BarPlotSample';
import { selectBarPlotData } from '../Store/CombinedSlice';
import { fetchBarPlotDataGivenSelection, fetchViolationValueCountsGivenSelection } from '../../api';

interface IPlotlyData {
  [key: string]: any; // Replace `any` with the expected data structure if known.
}

interface IChiScore {
  [key: string]: number;
}

interface IData {
  plotlyData: IPlotlyData;
  chiScores: IChiScore;
}

/**
 * This function takes the list of all features in the CSV and creates a list of JSX elements from the BarPlotSample one below the other to which it hands the feature name as a prop.
 * The csvData does not explicitly have a features list, but it is implicitly there in each of the samples.
 * @returns {JSX.Element}
 */
function BarPlotList(): JSX.Element {
  const data = useSelector(selectBarPlotData);
  const [localBarPlotData, setLocalBarPlotData] = useState<IData>({ plotlyData: {}, chiScores: {} });
  const [localViolationValueCounts, setLocalViolationValueCounts] = useState<IData>({ plotlyData: {}, chiScores: {} });

  // List of filtered features
  const features = ['rdf:type'];

  useEffect(() => {
    fetchBarPlotDataGivenSelection(data.selectedNodes).then((d) => {
      setLocalBarPlotData(d);
    });
    fetchViolationValueCountsGivenSelection(data.selectedNodes).then((d) => {
      setLocalViolationValueCounts(d);
    });
  }, [data]);

  if (Object.keys(localBarPlotData.plotlyData).length === 0 || Object.keys(localViolationValueCounts.plotlyData).length === 0) {
    return <BarLoader color="steelblue" loading />;
  }

  // Create array of keys sorted by chiScores in descending order
  const sortedKeys = Object.keys(localBarPlotData.plotlyData).filter((key) => features.includes(key));

  return (
    <div className="bar-plot-list-container">
      <BarPlotSample
        key="violations"
        plotlyData={localViolationValueCounts.plotlyData.violations}
        chiScore={localViolationValueCounts.chiScores.violations}
        feature="violations"
      />
      {sortedKeys.map((key) => (
        <BarPlotSample key={key} plotlyData={localBarPlotData.plotlyData[key]} chiScore={localBarPlotData.chiScores[key]} feature={key} />
      ))}
    </div>
  );
}

export default BarPlotList;
