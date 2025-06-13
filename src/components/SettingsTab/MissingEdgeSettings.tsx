// MissingEdgeSettings.tsx
import React from 'react';
import { TextInput } from '@mantine/core';
import { useDispatch, useSelector } from 'react-redux';
import { MissingEdgeOptionButtons } from './FilterButtons/MissingEdgeOptionButtons';
import { selectMissingEdgeLabel, setMissingEdgeLabel } from '../Store/CombinedSlice';

function MissingEdgeSettings() {
  const dispatch = useDispatch();
  const label = useSelector(selectMissingEdgeLabel);

  return (
    <div className="settingsSectionContainer">
      <div className="settingsTitle">Missing Edge Settings</div>
      <MissingEdgeOptionButtons />
      <TextInput label="Placeholder" value={label} onChange={(e) => dispatch(setMissingEdgeLabel(e.currentTarget.value))} placeholder="-" size="xs" />
    </div>
  );
}

export default MissingEdgeSettings;
