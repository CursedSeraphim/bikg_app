// src/components/SettingsTab/FilterSettings.tsx
import { Radio, Stack } from '@mantine/core';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { FilterType } from '../../types';
import { selectFilterType, setFilterType } from '../Store/CombinedSlice';

function FilterSettings() {
  const dispatch = useDispatch();
  const filterType: FilterType = useSelector(selectFilterType);

  const handleFilterChange = (value: FilterType) => {
    dispatch(setFilterType(value));
  };

  return (
    <Stack spacing="xs">
      <Radio.Group value={filterType} onChange={(value) => handleFilterChange(value as FilterType)}>
        <Stack spacing="sm">
          <Radio value="unimodal" label="Filter Single-Value Columns" />
          <Radio value="nan" label="Filter Empty Columns" />
          <Radio value="none" label="No Filter" />
        </Stack>
      </Radio.Group>
    </Stack>
  );
}

export default FilterSettings;
