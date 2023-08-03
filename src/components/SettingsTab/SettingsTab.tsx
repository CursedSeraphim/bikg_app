// SettingsTab.tsx
import React from 'react';
import FilterSettings from './FilterSettings';
import MissingEdgeSettings from './MissingEdgeSettings';

function SettingsTab() {
  return (
    <div className="settingsTab">
      <FilterSettings />
      <MissingEdgeSettings />
    </div>
  );
}


export default SettingsTab;
