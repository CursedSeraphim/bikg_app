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

  return (
    <div className="blacklist-manager">
      <div className="add-blacklist-label">
        <input type="text" value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="Enter label to hide nodes" />
        <button type="button" onClick={handleAddLabel}>
          Add to Blacklist
        </button>
      </div>
      <ul className="blacklisted-labels-list">
        {blacklistedLabels.map((label) => (
          <li key={label}>
            {' '}
            {/* Use label as key */}
            {label}
            <button type="button" onClick={() => handleRemoveLabel(label)}>
              Remove
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default BlacklistManager;
