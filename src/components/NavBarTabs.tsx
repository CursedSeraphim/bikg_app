// NavBarTabs.tsx
import React, { useState, useMemo } from 'react';
import Treeview from './Treeview/Treeview';
import SettingsTab from './SettingsTab/SettingsTab';
import LangchainComponent from './LangChain/LangChainView';

function NavBarTabs() {
  const [currentTab, setCurrentTab] = useState('1');

  const MemoizedTreeView = React.memo(Treeview);
  const MemoizedSettingsTab = React.memo(SettingsTab);
  const MemoizedLangChain = React.memo(LangchainComponent);

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
      {
        id: 3,
        tabTitle: 'LangChain',
        title: 'LangChain',
        content: <MemoizedLangChain />,
      },
    ],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
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
