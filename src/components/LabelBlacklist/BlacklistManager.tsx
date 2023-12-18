import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import store from '../Store/Store';
import { addHiddenLabels, removeHiddenLabels } from '../Store/CombinedSlice';

function BlacklistManager() {
  const [blacklistedLabels, setBlacklistedLabels] = useState<string[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const dispatch = useDispatch();

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

  const handleAddLabel = () => {
    if (newLabel) {
      dispatch(addHiddenLabels([newLabel]));
      setNewLabel('');
    }
  };

  const handleRemoveLabel = (label: string) => {
    dispatch(removeHiddenLabels([label]));
  };

  const handleKeyDown = (event) => {
    if (event.key === 'Enter' && newLabel) {
      handleAddLabel();
    }
  };

  return (
    <div className="blacklist-manager settingsSectionContainer">
      <div className="settingsTitle">Nodes Hidden by Label</div>
      <div className="add-blacklist-label">
        <input
          type="text"
          value={newLabel}
          onChange={(e) => setNewLabel(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Enter label to hide nodes"
          className="blacklist-input"
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
