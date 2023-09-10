// CustomHeader.tsx
import React, { useState } from 'react';
import {
  SELECTED_TEXT_COLOR,
  SELECTED_TYPE_NODE_COLOR,
  UNSELECTED_TYPE_NODE_COLOR,
  SELECTED_EXEMPLAR_NODE_COLOR,
  UNSELECTED_EXEMPLAR_NODE_COLOR,
  MANTINE_HEADER_COLOR,
  SELECTED_CUMULATIVE_NODE_COLOR,
  UNSELECTED_CUMULATIVE_NODE_COLOR,
} from '../../constants';

export function CustomHeader({ onSelect, style, node }) {
  const [isHovered, setIsHovered] = useState(false);
  const [isActive, setIsActive] = useState(false);

  const iconClass = `fas fa-caret-right`;
  const iconStyle = { marginRight: '5px' };

  let newStyle = { ...style.base, transition: 'all 0.15s ease-in-out' };

  if (node.selected) {
    newStyle = { ...newStyle, color: SELECTED_TYPE_NODE_COLOR, fontWeight: 'bold' };
  } else {
    newStyle = { ...newStyle, color: UNSELECTED_TYPE_NODE_COLOR, fontWeight: 'normal' };
  }

  if (isHovered) {
    newStyle = { ...newStyle, backgroundColor: UNSELECTED_TYPE_NODE_COLOR, color: 'white' };
  }

  if (isActive) {
    newStyle = { ...newStyle, backgroundColor: SELECTED_TYPE_NODE_COLOR, color: 'white' };
  }
  console.log('node', node);
  // Determine the colors based on whether the count is actual or cumulative
  const selectedNodeCountColor = node.n_violating_nodes !== 0 ? SELECTED_EXEMPLAR_NODE_COLOR : SELECTED_CUMULATIVE_NODE_COLOR;
  const unselectedNodeCountColor = node.n_violating_nodes !== 0 ? UNSELECTED_EXEMPLAR_NODE_COLOR : UNSELECTED_CUMULATIVE_NODE_COLOR;
  const selectedTextDecoration = node.n_violating_nodes !== 0 ? 'underline' : 'none';
  const unselectedTextDecoration = node.n_violating_nodes !== 0 ? 'underline' : 'none';

  // Split the node name into two parts
  const [nodeName, countTotal] = node.name.split(' ');

  return (
    <div
      style={newStyle}
      onClick={onSelect}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onMouseDown={() => setIsActive(true)}
      onMouseUp={() => setIsActive(false)}
      onBlur={() => setIsActive(false)}
    >
      <div style={node.selected ? { ...style.title, fontWeight: 'bold' } : style.title}>
        <i className={iconClass} style={iconStyle} />
        <span style={{ color: isHovered ? SELECTED_TEXT_COLOR : node.selected ? SELECTED_TYPE_NODE_COLOR : UNSELECTED_TYPE_NODE_COLOR }}>{nodeName}</span>{' '}
        <span
          style={{
            color: isHovered ? selectedNodeCountColor : node.selected ? selectedNodeCountColor : unselectedNodeCountColor,
            textDecoration: isHovered ? selectedTextDecoration : node.selected ? selectedTextDecoration : unselectedTextDecoration,
          }}
        >
          {' '}
          {countTotal}
        </span>
      </div>
    </div>
  );
}
