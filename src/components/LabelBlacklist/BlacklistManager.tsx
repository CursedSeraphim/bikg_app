import { Button, Chip, TextField } from '@material-ui/core';
import Autocomplete from '@material-ui/lab/Autocomplete';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { addHiddenLabels, clearHiddenLabels, removeHiddenLabels, selectNodeLabels } from '../Store/CombinedSlice';

function BlacklistManager() {
  const dispatch = useDispatch();

  // Pull the blacklisted labels directly from Redux
  const blacklistedLabels = useSelector((state: any) => state.combined.hiddenLabels);
  const nodeLabels = useSelector(selectNodeLabels);

  // Only used to temporarily hold the user’s new label input
  const [newLabel, setNewLabel] = useState('');

  // Called when the user selects an option from the Autocomplete
  const handleAddLabel = (_event: any, value: string | null) => {
    if (value && !blacklistedLabels.includes(value)) {
      dispatch(addHiddenLabels([value]));
      setNewLabel('');
    }
  };

  const handleRemoveLabel = (label: string) => {
    dispatch(removeHiddenLabels([label]));
  };

  // Clear button to remove all blacklisted labels
  const handleClearAll = () => {
    dispatch(clearHiddenLabels());
  };

  // Provide an empty string as the first option to allow free typing
  const options = ['', ...nodeLabels];

  return (
    <div className="blacklist-manager settingsSectionContainer" style={{ padding: '16px' }}>
      <div className="add-blacklist-label" style={{ marginBottom: '16px' }}>
        <Autocomplete
          value={newLabel}
          onChange={handleAddLabel}
          options={options}
          getOptionLabel={(option) => option}
          renderInput={(params) => <TextField {...params} label="Enter label to hide nodes" variant="outlined" />}
        />
      </div>
      <div className="blacklisted-labels-container">
        <ul
          className="blacklisted-labels-list"
          style={{
            listStyle: 'none',
            padding: 0,
            margin: 0,
            display: 'block',
          }}
        >
          {blacklistedLabels.map((label: string) => (
            <li key={label} className="blacklist-item" style={{ marginBottom: '8px' }}>
              <Chip label={label} onDelete={() => handleRemoveLabel(label)} style={{ cursor: 'pointer', backgroundColor: '#f5f5f5' }} />
            </li>
          ))}
        </ul>
      </div>
      <Button variant="contained" color="secondary" onClick={handleClearAll} style={{ marginTop: '16px' }}>
        Clear All
      </Button>
    </div>
  );
}

export default BlacklistManager;
