// src/components/SettingsTab/SettingsTab.tsx
import { Card, Divider, Title } from '@mantine/core';
import React from 'react';
import BlacklistManager from '../LabelBlacklist/BlacklistManager';
import Legend from '../Legend/Legend';
import D3BoundingBoxToggle from './D3BoundingBoxToggle';
import FilterSettings from './FilterSettings';
import MissingEdgeSettings from './MissingEdgeSettings';
import LineUpColumnFilter from './LineUpColumnFilter';

const MemoizedLegend = React.memo(Legend);

function SettingsTab() {
  return (
    <div className="settings-tab-container" style={{ padding: '16px' }}>
      {/* Filters Section */}
      <Card shadow="sm" padding="lg" withBorder>
        <Title order={4} mb="xs">
          Table Filter Settings
        </Title>
        <FilterSettings />
      </Card>

      <Divider my="md" />

      {/* LineUp Column Filter Section */}
      <Card shadow="sm" padding="lg" withBorder>
        <Title order={4} mb="xs">
          Hidden LineUp Columns
        </Title>
        <LineUpColumnFilter />
      </Card>

      <Divider my="md" />

      {/* Missing Edge Label Section */}
      <Card shadow="sm" padding="lg" withBorder>
        <Title order={4} mb="xs">
          Missing Edge Label
        </Title>
        <MissingEdgeSettings />
      </Card>

      <Divider my="md" />

      {/* D3 Bounding Box Toggle */}
      <Card shadow="sm" padding="lg" withBorder>
        <Title order={4} mb="xs">
          D3 Bounding Box
        </Title>
        <D3BoundingBoxToggle />
      </Card>

      <Divider my="md" />

      {/* Legend Section */}
      <Card shadow="sm" padding="lg" withBorder>
        <Title order={4} mb="xs">
          Legend
        </Title>
        <MemoizedLegend />
      </Card>

      <Divider my="md" />

      {/* Blacklist Manager Section */}
      <Card shadow="sm" padding="lg" withBorder>
        <Title order={4} mb="xs">
          Blacklist Manager
        </Title>
        <BlacklistManager />
      </Card>
    </div>
  );
}

export default SettingsTab;
