// FilterButtons.tsx
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectD3BoundingBox, selectFilterType, setD3BoundingBox, setFilterType } from '../../Store/CombinedSlice';

export function FilterButtons() {
  const dispatch = useDispatch();
  const filterType = useSelector(selectFilterType);
  const d3BoundingBox = useSelector(selectD3BoundingBox);

  return (
    <div className="filterButtonsContainer">
      <label className={`filterLabel ${filterType === 'unimodal' ? 'activeFilter' : ''}`}>
        <input type="radio" value="unimodal" checked={filterType === 'unimodal'} onChange={() => dispatch(setFilterType('unimodal'))} />
        {/* {filterType === 'unimodal' ? 'Unimodal Filtering Active' : 'Activate Unimodal Filtering'} */}
        Filter Single-Value Cols
      </label>

      <label className={`filterLabel ${filterType === 'nan' ? 'activeFilter' : ''}`}>
        <input type="radio" value="nan" checked={filterType === 'nan'} onChange={() => dispatch(setFilterType('nan'))} />
        {/* {filterType === 'nan' ? 'NaN Filtering Active' : 'Activate NaN Filtering'} */}
        Filter Empty Cols
      </label>

      <label className={`filterLabel ${filterType === 'none' ? 'activeFilter' : ''}`}>
        <input type="radio" value="none" checked={filterType === 'none'} onChange={() => dispatch(setFilterType('none'))} />
        {/* {filterType === 'none' ? 'No Filtering Active' : 'Deactivate Filtering'} */}
        No Filter
      </label>

      <label className={`d3BoundingBox ${d3BoundingBox === 'off' ? 'd3BoundingBox' : ''}`}>
        <input type="radio" value="off" checked={d3BoundingBox === 'off'} onChange={() => dispatch(setD3BoundingBox('off'))} />
        D3 Bounding Box Off
      </label>

      <label className={`d3BoundingBox ${d3BoundingBox === 'on' ? 'd3BoundingBox' : ''}`}>
        <input type="radio" value="on" checked={d3BoundingBox === 'on'} onChange={() => dispatch(setD3BoundingBox('on'))} />
        D3 Bounding Box On
      </label>
    </div>
  );
}
