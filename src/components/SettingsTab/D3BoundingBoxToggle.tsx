// src/components/SettingsTab/D3BoundingBoxToggle.tsx
import { Group, Switch, Tooltip } from '@mantine/core';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectD3BoundingBox, setD3BoundingBox } from '../Store/CombinedSlice';

function D3BoundingBoxToggle() {
  const dispatch = useDispatch();
  const d3BoundingBox = useSelector(selectD3BoundingBox);

  return (
    <Group>
      <Tooltip
        label="Controls whether the D3 force simulation limits nodes inside a bounding box or lets them spill outside the view."
        multiline
        withArrow
        w={220}
        transitionProps={{ duration: 300 }}
      >
        <Switch
          checked={d3BoundingBox === 'on'}
          onChange={(e) => dispatch(setD3BoundingBox(e.currentTarget.checked ? 'on' : 'off'))}
          label={d3BoundingBox === 'on' ? 'Bounding Box: On' : 'Bounding Box: Off'}
        />
      </Tooltip>
    </Group>
  );
}

export default D3BoundingBoxToggle;
