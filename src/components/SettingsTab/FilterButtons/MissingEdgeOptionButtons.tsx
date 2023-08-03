// MissingEdgeOptionButtons.tsx
import { useDispatch, useSelector } from 'react-redux';
import React from 'react';
import { selectMissingEdgeOption, setMissingEdgeOption } from '../../Store/CombinedSlice';

export function MissingEdgeOptionButtons() {
  const dispatch = useDispatch();
  const missingEdgeOption = useSelector(selectMissingEdgeOption);

  return (
    <div className="filterButtonsContainer">
      <label className={`filterLabel ${missingEdgeOption === 'remove' ? 'activeFilter' : ''}`}>
        <input type="radio" value="remove" checked={missingEdgeOption === 'remove'} onChange={() => dispatch(setMissingEdgeOption('remove'))} />
        Remove
      </label>

      <label className={`filterLabel ${missingEdgeOption === 'keep' ? 'activeFilter' : ''}`}>
        <input type="radio" value="keep" checked={missingEdgeOption === 'keep'} onChange={() => dispatch(setMissingEdgeOption('keep'))} />
        Keep
      </label>
    </div>
  );
}
