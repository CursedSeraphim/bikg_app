// src/components/SettingsTab/D3CenteringSettings.tsx
import { Group, Slider, Stack, Switch, Text, Tooltip } from '@mantine/core';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { selectD3CenteringEnabled, selectD3CenteringStrength, setD3CenteringEnabled, setD3CenteringStrength } from '../Store/CombinedSlice';

const minStrength = 0;
const maxStrength = 0.3;
const stepStrength = 0.01;

function D3CenteringSettings() {
  const dispatch = useDispatch();
  const centeringEnabled = useSelector(selectD3CenteringEnabled);
  const centeringStrength = useSelector(selectD3CenteringStrength);

  return (
    <Stack spacing="xs">
      <Group>
        <Tooltip
          label="Enable or disable the central gravity force that nudges nodes toward the canvas center."
          multiline
          withArrow
          w={220}
          transitionProps={{ duration: 300 }}
        >
          <Switch
            checked={centeringEnabled}
            onChange={(event) => dispatch(setD3CenteringEnabled(event.currentTarget.checked))}
            label={centeringEnabled ? 'Centering Force: On' : 'Centering Force: Off'}
          />
        </Tooltip>
      </Group>
      <Stack spacing={4}>
        <Group position="apart">
          <Text size="sm" fw={500}>
            Centering Strength
          </Text>
          <Text size="sm" c="dimmed">
            {centeringStrength.toFixed(2)}
          </Text>
        </Group>
        <Slider
          min={minStrength}
          max={maxStrength}
          step={stepStrength}
          value={centeringStrength}
          onChange={(value) => dispatch(setD3CenteringStrength(value))}
          disabled={!centeringEnabled}
          aria-label="Centering force strength"
        />
      </Stack>
    </Stack>
  );
}

export default D3CenteringSettings;
