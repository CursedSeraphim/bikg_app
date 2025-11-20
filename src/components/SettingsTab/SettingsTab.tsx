// src/components/SettingsTab/SettingsTab.tsx
import { Accordion, Stack } from '@mantine/core';
import React from 'react';
import BlacklistManager from '../LabelBlacklist/BlacklistManager';
import Legend from '../Legend/Legend';
import D3BoundingBoxToggle from './D3BoundingBoxToggle';
import FilterSettings from './FilterSettings';
import LineUpColumnFilter from './LineUpColumnFilter';
import MissingEdgeSettings from './MissingEdgeSettings';
import NamespacePrefixToggle from './NamespacePrefixToggle';
import './SettingsTab.css';

const MemoizedLegend = React.memo(Legend);

function SettingsTab() {
  return (
    <div className="settings-tab-container">
      <Accordion multiple defaultValue={['graph-view-settings']} className="settings-accordion" variant="separated" radius="md">
        <Accordion.Item value="graph-view-settings">
          <Accordion.Control>Graph View Settings</Accordion.Control>
          <Accordion.Panel>
            <Stack spacing="md">
              <Accordion multiple variant="filled" radius="sm">
                <Accordion.Item value="legend">
                  <Accordion.Control>Legend</Accordion.Control>
                  <Accordion.Panel>
                    <MemoizedLegend />
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item value="node-label-blacklist">
                  <Accordion.Control>Node Label Blacklist</Accordion.Control>
                  <Accordion.Panel>
                    <BlacklistManager />
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item value="d3-bounding-box">
                  <Accordion.Control>D3 Bounding Box</Accordion.Control>
                  <Accordion.Panel>
                    <D3BoundingBoxToggle />
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        <Accordion.Item value="table-view-settings">
          <Accordion.Control>Table View (LineUp) Settings</Accordion.Control>
          <Accordion.Panel>
            <Stack spacing="md">
              <Accordion multiple variant="filled" radius="sm">
                <Accordion.Item value="table-filters">
                  <Accordion.Control>Column Content Filters</Accordion.Control>
                  <Accordion.Panel>
                    <FilterSettings />
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item value="hidden-columns">
                  <Accordion.Control>Hidden Columns</Accordion.Control>
                  <Accordion.Panel>
                    <LineUpColumnFilter />
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item value="namespace-display">
                  <Accordion.Control>Namespace Display in Table</Accordion.Control>
                  <Accordion.Panel>
                    <NamespacePrefixToggle />
                  </Accordion.Panel>
                </Accordion.Item>
                <Accordion.Item value="missing-edge-label">
                  <Accordion.Control>Label for Missing Predicates</Accordion.Control>
                  <Accordion.Panel>
                    <MissingEdgeSettings />
                  </Accordion.Panel>
                </Accordion.Item>
              </Accordion>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </div>
  );
}

export default SettingsTab;
