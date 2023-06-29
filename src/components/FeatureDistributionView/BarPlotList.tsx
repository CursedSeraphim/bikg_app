// BarPlotList.tsx
import React, { useState, useCallback, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import BarPlotSample from './newBarPlotSample';
import { selectCsvData, setSelectedFocusNodes, selectBarPlotData } from '../Store/CombinedSlice';
import { fetchBarPlotDataGivenSelection } from '../../api';

/**
 * This function takes the list of all features in the CSV and creates a list of JSX elements from the BarPlotSample one below the other to which it hands the feature name as a prop.
 * The csvData does not explicitly have a features list, but it is implicitly there in each of the samples.
 * @returns {JSX.Element}
 */
function BarPlotList(): JSX.Element {
  const dispatch = useDispatch();
  const data = useSelector(selectBarPlotData);
  const csvData = useSelector(selectCsvData);
  const [chiSquareScores, setChiSquareScores] = useState({});
  const [localBarPlotData, setLocalBarPlotData] = useState({ plotly_data: [], chi_square_scores: {} });

  // List of filtered features
  const filteredFeatures = ['x', 'y'];

  const features = csvData && csvData[0] ? Object.keys(csvData[0]).filter((feature) => !filteredFeatures.includes(feature)) : [];

  const handleChiSquareScoreChange = useCallback((feature: string, chiSquareScore: number) => {
    setChiSquareScores((prevScores) => ({ ...prevScores, [feature]: chiSquareScore }));
  }, []);

  // Sort features by chi-square scores
  const sortedFeatures = [...features].sort((a, b) => (chiSquareScores[b] || 0) - (chiSquareScores[a] || 0));

  useEffect(() => {
    console.time('fetch barplot data from server');
    console.log('BarPlotList useEffect data changed');
    fetchBarPlotDataGivenSelection(data.selectedNodes).then((d) => {
      console.log('fetched:', d);
      console.timeEnd('fetch barplot data from server');
      setLocalBarPlotData(d);
    });
  }, [data]);
  console.log('localBarPlotData', localBarPlotData);
  if (localBarPlotData.plotly_data.length === 0) {
    return <div>Loading...</div>;
  }
  return (
    <div className="bar-plot-list-container">
      <BarPlotSample plotlyData={localBarPlotData.plotly_data['omics:hasDisease']} featureName="omics:hasDisease" />
      {/* {sortedFeatures.map((feature) => (
        <BarPlotSample key={feature} feature={feature} onChiSquareScoreChange={handleChiSquareScoreChange} />
      ))} */}
    </div>
  );
}

export default BarPlotList;
