import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectCsvDataForPlotly } from './Store/CombinedSlice';
import InteractiveScatterPlot from './EmbeddingView/InteractiveScatterPlot';
import LineUpView from './LineUp/LineUpView';

function Tabs() {
  // Inside your Tabs component function
  const [currentTab, setCurrentTab] = useState('1');
  const plotlyData = useSelector(selectCsvDataForPlotly);

  const MemoizedScatterPlot = React.memo(InteractiveScatterPlot);

  const tabs = useMemo(
    () => [
      {
        id: 1,
        tabTitle: 'Embedding View',
        title: 'Embedding View',
        content: <MemoizedScatterPlot data={plotlyData} />,
      },
      {
        id: 2,
        tabTitle: 'LineUp',
        title: 'LineUp',
        content: <LineUpView />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [plotlyData],
  );

  const handleTabClick = (e: React.MouseEvent<HTMLButtonElement, MouseEvent>) => {
    setCurrentTab(e.currentTarget.id);
  };
  return (
    <div className="tabsContainer">
      <div className="Embedding-Title">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            id={tab.id.toString()}
            type="button"
            onClick={handleTabClick}
            className={`tabButton ${currentTab === `${tab.id}` ? 'activeTab' : ''}`}
          >
            {tab.title}
          </button>
        ))}
      </div>
      <div className="Embedding-View">
        {tabs.map((tab) => (
          <div key={tab.id} style={{ display: currentTab === `${tab.id}` ? 'block' : 'none', height: '100%', width: '100%' }}>
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}

export default Tabs;
