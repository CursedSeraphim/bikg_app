// NavBarTabs.tsx
import React, { useState, useMemo } from 'react';
import { useSelector } from 'react-redux';
import { selectCsvDataForPlotly } from './Store/CombinedSlice';
import Treeview from './Treeview/Treeview';
import SettingsTab from './SettingsTab/SettingsTab';

function NavBarTabs() {
  const [currentTab, setCurrentTab] = useState('1');
  const plotlyData = useSelector(selectCsvDataForPlotly);

  const MemoizedTreeView = React.memo(Treeview);
  const MemoizedSettingsTab = React.memo(SettingsTab);

  const tabs = useMemo(
    () => [
      {
        id: 1,
        tabTitle: 'Tree View',
        title: 'Ontology Tree',
        content: <MemoizedTreeView />,
      },
      {
        id: 2,
        tabTitle: 'Settings',
        title: 'Settings',
        content: <MemoizedSettingsTab />,
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
      <div className="NavBarTabs-Title">
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
      <div className="treebeard-container">
        {tabs.map((tab) => (
          <div key={tab.id} style={{ display: currentTab === `${tab.id}` ? 'block' : 'none', height: '100%', width: '100%' }}>
            {tab.content}
          </div>
        ))}
      </div>
    </div>
  );
}

export default NavBarTabs;
