// FilterSettings.tsx
import React from 'react';
import { FilterButtons } from './FilterButtons/FilterButtons';

function FilterSettings() {
  return (
    <div className="settingsSectionContainer">
      <div className="settingsTitle">LineUp Filter Settings</div>
      <FilterButtons />
    </div>
  );
}

export default FilterSettings;
