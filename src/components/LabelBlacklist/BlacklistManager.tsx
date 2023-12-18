import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import Autocomplete from 'react-autocomplete';
import store from '../Store/Store';
import { addHiddenLabels, removeHiddenLabels } from '../Store/CombinedSlice';

function BlacklistManager() {
  const [blacklistedLabels, setBlacklistedLabels] = useState<string[]>([]);
  const [newLabel, setNewLabel] = useState('');
  const [isItemHighlighted, setIsItemHighlighted] = useState(false);
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

  const handleAddLabel = (label) => {
    if (label) {
      dispatch(addHiddenLabels([label]));
      setNewLabel(''); // Reset the input field
      setIsItemHighlighted(false); // Reset the highlighted state
    }
  };

  const handleRemoveLabel = (label: string) => {
    dispatch(removeHiddenLabels([label]));
  };

  const handleKeyDown = (event, highlightedItem) => {
    if (event.key === 'Enter') {
      handleAddLabel(isItemHighlighted ? highlightedItem : newLabel);
    }
  };

  return (
    <div className="blacklist-manager settingsSectionContainer">
      <div className="settingsTitle">Nodes Hidden by Label</div>
      <div className="add-blacklist-label">
        <Autocomplete
          value={newLabel}
          inputProps={{
            placeholder: 'Enter label to hide nodes',
          }}
          items={['abc', 'def', 'ghi']} // Replace with your items
          getItemValue={(item) => item}
          shouldItemRender={(item, value) => item.toLowerCase().indexOf(value.toLowerCase()) > -1}
          renderMenu={(children) => <div className="autocomplete-menu">{children}</div>}
          renderItem={(item, isHighlighted) => (
            <div
              key={item}
              className={`autocomplete-item ${isHighlighted ? 'item-highlighted' : ''}`}
              onMouseEnter={() => setIsItemHighlighted(true)}
              onMouseLeave={() => setIsItemHighlighted(false)}
            >
              {item}
            </div>
          )}
          onChange={(e) => setNewLabel(e.target.value)}
          onSelect={(value) => handleAddLabel(value)}
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
