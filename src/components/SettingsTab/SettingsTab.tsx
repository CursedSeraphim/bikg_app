// src/components/SettingsTab/SettingsTab.tsx
import { Accordion } from '@mantine/core';
import React from 'react';
import BlacklistManager from '../LabelBlacklist/BlacklistManager';
import Legend from '../Legend/Legend';
import D3BoundingBoxToggle from './D3BoundingBoxToggle';
import FilterSettings from './FilterSettings';
import MissingEdgeSettings from './MissingEdgeSettings';
import LineUpColumnFilter from './LineUpColumnFilter';
import NamespacePrefixToggle from './NamespacePrefixToggle';
import './SettingsTab.css';

const MemoizedLegend = React.memo(Legend);

function SettingsTab() {
  return (
    <div className="settings-tab-container">
      <Accordion multiple className="settings-accordion" variant="separated" radius="md">
        <Accordion.Item value="filter-settings">
          <Accordion.Control>Table Filter Settings</Accordion.Control>
          <Accordion.Panel>
            <FilterSettings />
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="lineup-column-filter">
          <Accordion.Control>Hidden LineUp Columns</Accordion.Control>
          <Accordion.Panel>
            <LineUpColumnFilter />
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="missing-edge-label">
          <Accordion.Control>Missing Edge Label</Accordion.Control>
          <Accordion.Panel>
            <MissingEdgeSettings />
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="d3-bounding-box">
          <Accordion.Control>D3 Bounding Box</Accordion.Control>
          <Accordion.Panel>
            <D3BoundingBoxToggle />
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="namespace-display">
          <Accordion.Control>Namespace Display</Accordion.Control>
          <Accordion.Panel>
            <NamespacePrefixToggle />
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="legend">
          <Accordion.Control>Legend</Accordion.Control>
          <Accordion.Panel>
            <MemoizedLegend />
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="blacklist-manager">
          <Accordion.Control>Blacklist Manager</Accordion.Control>
          <Accordion.Panel>
            <BlacklistManager />
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </div>
  );
}

export default SettingsTab;
