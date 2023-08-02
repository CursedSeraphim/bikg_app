// SettingsTab.tsx
import React from 'react';
import { FilterButtons } from '../FilterButtons/FilterButtons';

function SettingsTab() {
  return (
    <div className="settingsTab">
      <div className="filterSettingsTitle">LineUp Filter Settings</div>
      <div className="settingsContent">
        <div className="filterButtonsContainer">
          <FilterButtons />
        </div>
      </div>
    </div>
  );
}

export default SettingsTab;
