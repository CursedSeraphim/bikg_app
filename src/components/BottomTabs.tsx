import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectCsvDataForPlotly } from './Store/CombinedSlice';
import InteractiveScatterPlot from './EmbeddingView/InteractiveScatterPlot';
import LineUpView from './LineUp/LineUpView';
import LangchainComponent from './LangChain/LangChainView';

function BottomTabs() {
  const [currentTab, setCurrentTab] = useState('1');
  const plotlyData = useSelector(selectCsvDataForPlotly);

  const MemoizedScatterPlot = React.memo(InteractiveScatterPlot);
  const MemoizedLangChain = React.memo(LangchainComponent);

  const tabs = useMemo(
    () => [
      {
        id: 1,
        tabTitle: 'Embedding View',
        title: 'Embedding of Violating Shapes',
        content: <MemoizedScatterPlot data={plotlyData} />,
      },
      {
        id: 2,
        tabTitle: 'LineUp',
        title: 'Tabular View of Joined Violation and Instance Data',
        content: <LineUpView />,
      },
      {
        id: 3,
        tabTitle: 'LangChain',
        title: 'LangChain',
        content: <MemoizedLangChain />,
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
            className={`tab-button ${currentTab === `${tab.id}` ? 'activeTab' : ''}`}
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

export default BottomTabs;
