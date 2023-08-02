// FilterButtons.tsx
import { useDispatch, useSelector } from 'react-redux';
import React from 'react';
import { selectFilterType, setFilterType } from '../Store/CombinedSlice';

export function FilterButtons() {
  const dispatch = useDispatch();
  const filterType = useSelector(selectFilterType);

  return (
    <div className="filterButtonsContainer">
      <button type="button" onClick={() => dispatch(setFilterType('unimodal'))} disabled={filterType === 'unimodal'}>
        {filterType === 'unimodal' ? 'Unimodal Filtering Active' : 'Activate Unimodal Filtering'}
      </button>
      <button type="button" onClick={() => dispatch(setFilterType('nan'))} disabled={filterType === 'nan'}>
        {filterType === 'nan' ? 'NaN Filtering Active' : 'Activate NaN Filtering'}
      </button>
      <button type="button" onClick={() => dispatch(setFilterType('none'))} disabled={filterType === 'none'}>
        {filterType === 'none' ? 'No Filtering Active' : 'Deactivate Filtering'}
      </button>
    </div>
  );
}
