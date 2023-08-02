// FilterButtons.tsx
import { useDispatch, useSelector } from 'react-redux';
import React from 'react';
import { selectFilterType, setFilterType } from '../Store/CombinedSlice';

export function FilterButtons() {
  const dispatch = useDispatch();
  const filterType = useSelector(selectFilterType);

  return (
    <div className="filterButtonsContainer">
      <label className={`filterLabel ${filterType === 'unimodal' ? 'activeFilter' : ''}`}>
        <input type="radio" value="unimodal" checked={filterType === 'unimodal'} onChange={() => dispatch(setFilterType('unimodal'))} />
        {/* {filterType === 'unimodal' ? 'Unimodal Filtering Active' : 'Activate Unimodal Filtering'} */}
        Unimodal Filtering
      </label>

      <label className={`filterLabel ${filterType === 'nan' ? 'activeFilter' : ''}`}>
        <input type="radio" value="nan" checked={filterType === 'nan'} onChange={() => dispatch(setFilterType('nan'))} />
        {/* {filterType === 'nan' ? 'NaN Filtering Active' : 'Activate NaN Filtering'} */}
        NaN Filtering
      </label>

      <label className={`filterLabel ${filterType === 'none' ? 'activeFilter' : ''}`}>
        <input type="radio" value="none" checked={filterType === 'none'} onChange={() => dispatch(setFilterType('none'))} />
        {/* {filterType === 'none' ? 'No Filtering Active' : 'Deactivate Filtering'} */}
        No Filtering
      </label>
    </div>
  );
}
