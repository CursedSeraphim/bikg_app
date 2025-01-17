// src/ui/HideablePanel.tsx
import { ActionIcon, Tooltip } from '@mantine/core';
import { IconArrowBarDown, IconArrowBarLeft, IconArrowBarRight, IconArrowBarUp } from '@tabler/icons-react';
import React from 'react';
import { Panel, PanelProps } from 'react-resizable-panels';

// We extend PanelProps to support an orientation prop
// so we know if it's vertical or horizontal
interface HideablePanelProps extends PanelProps {
  orientation?: 'horizontal' | 'vertical';
}

// A small helper function to clamp a numeric size
function clampSize(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

const HideablePanel: React.FC<HideablePanelProps> = ({ orientation = 'horizontal', style, children, ...rest }) => {
  const [isHidden, setIsHidden] = React.useState(false);
  const [lastSize, setLastSize] = React.useState(rest.defaultSize ?? 50);

  // If we’re horizontal, we hide the panel to width=0,
  // if vertical, we hide the panel to height=0.
  const hidePanel = () => {
    // Remember the last size
    setLastSize(rest.defaultSize ?? 50);
    setIsHidden(true);
  };

  const showPanel = () => {
    setIsHidden(false);
  };

  // Panel size logic:
  const computedSize = isHidden ? 0 : lastSize;

  // We render a button for toggling hide/expand if desired.
  // For a horizontal layout, we show left/right icons.
  // For a vertical layout, up/down icons.

  // For convenience, we place the toggle button as an absolutely
  // positioned small button. Alternatively, you can place it
  // in a different spot if you prefer a “hover tab”.
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <Panel
        {...rest}
        // We pass a numeric defaultSize for dynamic resizing
        // (react-resizable-panels supports numeric or string)
        defaultSize={clampSize(computedSize as number, rest.minSize ?? 0, rest.maxSize ?? 100)}
        style={{ ...style, overflow: 'hidden' }}
      >
        {children}
      </Panel>

      {/* If panel is not hidden, show a "hide" button. If hidden, show an "expand" button. */}
      {!isHidden ? (
        <div
          style={{
            position: 'absolute',
            top: orientation === 'horizontal' ? '50%' : '0.5rem',
            right: orientation === 'horizontal' ? '0.5rem' : '50%',
            transform: orientation === 'horizontal' ? 'translateY(-50%)' : 'translateX(50%)',
            zIndex: 10,
          }}
        >
          <Tooltip label="Hide panel" position="bottom" withArrow>
            <ActionIcon variant="light" onClick={hidePanel}>
              {orientation === 'horizontal' ? <IconArrowBarLeft size={16} /> : <IconArrowBarUp size={16} />}
            </ActionIcon>
          </Tooltip>
        </div>
      ) : (
        <div
          style={{
            position: 'absolute',
            top: orientation === 'horizontal' ? '50%' : '0.5rem',
            right: orientation === 'horizontal' ? '-1rem' : '50%',
            transform: orientation === 'horizontal' ? 'translateY(-50%)' : 'translateX(50%)',
            zIndex: 10,
          }}
        >
          <Tooltip label="Expand panel" position="bottom" withArrow>
            <ActionIcon variant="filled" onClick={showPanel}>
              {orientation === 'horizontal' ? <IconArrowBarRight size={16} /> : <IconArrowBarDown size={16} />}
            </ActionIcon>
          </Tooltip>
        </div>
      )}
    </div>
  );
};

export default HideablePanel;
