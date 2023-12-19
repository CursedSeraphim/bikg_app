import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import TextField from '@material-ui/core/TextField';
import Autocomplete from '@material-ui/lab/Autocomplete';
import store from '../Store/Store';
import { addHiddenLabels, removeHiddenLabels, selectNodeLabels } from '../Store/CombinedSlice';

function BlacklistManager() {
  const [blacklistedLabels, setBlacklistedLabels] = useState<string[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const dispatch = useDispatch();

  const nodeLabels = useSelector(selectNodeLabels);

  useEffect(() => {
    const unsubscribe = store.subscribe(() => {
      const currentState = store.getState();
      const newBlacklistedLabels = currentState.combined.hiddenLabels; // Adjust path according to your state structure

      if (newBlacklistedLabels !== blacklistedLabels) {
        setBlacklistedLabels(newBlacklistedLabels);
      }
    });

    return () => unsubscribe(); // Unsubscribe when the component is unmounted
  }, [blacklistedLabels]);

  const handleAddLabel = (event, value) => {
    if (value) {
      dispatch(addHiddenLabels([value]));
      setNewLabel(''); // Reset the input field
    }
  };

  const handleRemoveLabel = (label: string) => {
    dispatch(removeHiddenLabels([label]));
  };

  const options = ['', ...nodeLabels];

  return (
    <div className="blacklist-manager settingsSectionContainer">
      <div className="settingsTitle">Nodes Hidden by Label</div>
      <div className="add-blacklist-label">
        <Autocomplete
          value={newLabel}
          onChange={handleAddLabel}
          options={options}
          getOptionLabel={(option) => option}
          renderInput={(params) => <TextField {...params} label="Enter label to hide nodes" variant="outlined" />}
        />
      </div>
      <div className="blacklisted-labels-container">
        <ul className="blacklisted-labels-list">
          {blacklistedLabels.map((label) => (
            <li key={label} className="blacklist-item" onClick={() => handleRemoveLabel(label)}>
              {label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export default BlacklistManager;
