// SettingsTab.tsx
import React from 'react';
import FilterSettings from './FilterSettings';
import Legend from '../Legend/Legend';
// import MissingEdgeSettings from './MissingEdgeSettings';
const MemoizedLegend = React.memo(Legend);

function SettingsTab() {
  return (
    <div className="settingsTab">
      <FilterSettings />
      <MemoizedLegend />
      {/* <MissingEdgeSettings /> */}
    </div>
  );
}

export default SettingsTab;
