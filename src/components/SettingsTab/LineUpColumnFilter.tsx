import { Button, Chip, TextField } from '@material-ui/core';
import Autocomplete from '@material-ui/lab/Autocomplete';
import React, { useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addHiddenLineupColumns, clearHiddenLineupColumns, removeHiddenLineupColumns, selectCsvData, selectHiddenLineupColumns } from '../Store/CombinedSlice';

function LineUpColumnFilter() {
  const dispatch = useDispatch();
  const hiddenColumns = useSelector(selectHiddenLineupColumns) as string[];
  const csvData = useSelector(selectCsvData) as any[];
  const [newColumn, setNewColumn] = useState('');

  const columnOptions = csvData && csvData.length > 0 ? Object.keys(csvData[0]) : [];

  const handleAddColumn = (_event: any, value: string | null) => {
    if (value && !hiddenColumns.includes(value)) {
      dispatch(addHiddenLineupColumns([value]));
      setNewColumn('');
    }
  };

  const handleRemoveColumn = (col: string) => {
    dispatch(removeHiddenLineupColumns([col]));
  };

  const handleClearAll = () => {
    dispatch(clearHiddenLineupColumns());
  };

  const options = ['', ...columnOptions];

  return (
    <div className="lineup-column-filter" style={{ padding: '16px' }}>
      <div style={{ marginBottom: '16px' }}>
        <Autocomplete
          value={newColumn}
          onChange={handleAddColumn}
          options={options}
          getOptionLabel={(option) => option}
          renderInput={(params) => <TextField {...params} label="Hide Column" variant="outlined" />}
        />
      </div>
      <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
        {hiddenColumns.map((col) => (
          <li key={col} style={{ marginBottom: '8px' }}>
            <Chip label={col} onDelete={() => handleRemoveColumn(col)} style={{ cursor: 'pointer', backgroundColor: '#f5f5f5' }} />
          </li>
        ))}
      </ul>
      <Button variant="contained" color="secondary" onClick={handleClearAll} style={{ marginTop: '16px' }}>
        Clear All
      </Button>
    </div>
  );
}

export default LineUpColumnFilter;
