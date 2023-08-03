// MissingEdgeSettings.tsx
import React from 'react';
import { MissingEdgeOptionButtons } from './FilterButtons/MissingEdgeOptionButtons';

function MissingEdgeSettings() {
  return (
    <div className="settingsSectionContainer">
      <div className="settingsTitle">Missing Edge Settings</div>
      <MissingEdgeOptionButtons />
    </div>
  );
}

export default MissingEdgeSettings;
