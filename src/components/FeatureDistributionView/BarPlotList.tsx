// BarPlotList.tsx
import React, { useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import BarPlotSample from './BarPlotSample';
import { selectCsvData } from '../Store/CombinedSlice';

/**
 * This function takes the list of all features in the CSV and creates a list of JSX elements from the BarPlotSample one below the other to which it hands the feature name as a prop.
 * The csvData does not explicitly have a features list, but it is implicitly there in each of the samples.
 * @returns {JSX.Element}
 */
function BarPlotList(): JSX.Element {
  const csvData = useSelector(selectCsvData);
  const [chiSquareScores, setChiSquareScores] = useState({});

  const features = csvData && csvData[0] ? Object.keys(csvData[0]) : [];

  const handleChiSquareScoreChange = useCallback((feature: string, chiSquareScore: number) => {
    setChiSquareScores((prevScores) => ({ ...prevScores, [feature]: chiSquareScore }));
  }, []);

  // Sort features by chi-square scores
  const sortedFeatures = [...features].sort((a, b) => (chiSquareScores[b] || 0) - (chiSquareScores[a] || 0));

  return (
    <div className="bar-plot-list-container">
      {sortedFeatures.map((feature) => (
        <BarPlotSample key={feature} feature={feature} onChiSquareScoreChange={handleChiSquareScoreChange} />
      ))}
    </div>
  );
}

export default BarPlotList;
