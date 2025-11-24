// src/components/Treeview/CustomHeader.tsx
import React, { useState } from 'react';
import {
    SELECTED_CUMULATIVE_NODE_COLOR,
    SELECTED_EXEMPLAR_NODE_COLOR,
    SELECTED_TYPE_NODE_COLOR,
    UNSELECTED_CUMULATIVE_NODE_COLOR,
    UNSELECTED_EXEMPLAR_NODE_COLOR,
    UNSELECTED_TYPE_NODE_COLOR,
} from '../../constants/constants';

interface CustomHeaderProps {
  onSelect: () => void;
  style: any;
  node: any;
}

export function CustomHeader({ onSelect, style, node }: CustomHeaderProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const iconClass = 'fas fa-caret-right';
  const iconStyle: React.CSSProperties = { marginRight: '5px' };

  let baseStyle = { ...style.base, transition: 'all 0.15s ease-in-out' };

  if (node.selected) {
    baseStyle = {
      ...baseStyle,
      color: SELECTED_TYPE_NODE_COLOR,
      fontWeight: 'bold',
    };
  } else {
    baseStyle = {
      ...baseStyle,
      color: UNSELECTED_TYPE_NODE_COLOR,
      fontWeight: 'normal',
    };
  }

  if (isHovered || isActive) {
    baseStyle = {
      ...baseStyle,
      backgroundColor: SELECTED_TYPE_NODE_COLOR,
      color: 'white',
    };
  }

  // Distinguish groups vs. cumulative
  const selectedNodeCountColor = node.nViolatingNodes !== 0 ? SELECTED_EXEMPLAR_NODE_COLOR : SELECTED_CUMULATIVE_NODE_COLOR;
  const unselectedNodeCountColor = node.nViolatingNodes !== 0 ? UNSELECTED_EXEMPLAR_NODE_COLOR : UNSELECTED_CUMULATIVE_NODE_COLOR;

  const selectedTextDecoration = node.nViolatingNodes !== 0 ? 'underline' : 'none';
  const unselectedTextDecoration = node.nViolatingNodes !== 0 ? 'underline' : 'none';

  // Split the node name
  const [nodeName, countTotal] = node.name.split(' ');

  return (
    <div
      style={baseStyle}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      onBlur={() => setIsActive(false)}
    >
      <div style={node.selected ? { ...style.title, fontWeight: 'bold' } : style.title}>
        <i className={iconClass} style={iconStyle} />
        <span
          style={{
            color: isHovered || isActive ? 'white' : node.selected ? SELECTED_TYPE_NODE_COLOR : UNSELECTED_TYPE_NODE_COLOR,
          }}
        >
          {nodeName}
        </span>{' '}
        <span
          style={{
            color: isHovered ? selectedNodeCountColor : node.selected ? selectedNodeCountColor : unselectedNodeCountColor,
            textDecoration: node.selected ? selectedTextDecoration : unselectedTextDecoration,
          }}
        >
          {countTotal ? ` ${countTotal}` : ''}
        </span>
      </div>
    </div>
  );
}
