// File: src/components/D3NodeLink/D3NldContextMenu.tsx

import React from 'react';
import { CanvasNode } from './D3NldTypes';

interface ContextMenuProps {
  menuX: number;
  menuY: number;
  node: CanvasNode | null;
  show: boolean;
  onClose: () => void;
  onToggleChildren: (nodeId: string) => void;
  onToggleParents: (nodeId: string) => void;
  onHideNode: (nodeId: string) => void;
  onCenterView: () => void;
}

export function ContextMenu({ menuX, menuY, node, show, onClose, onToggleChildren, onToggleParents, onHideNode, onCenterView }: ContextMenuProps) {
  if (!show || !node) {
    return null;
  }

  return (
    <div
      style={{
        position: 'absolute',
        top: menuY,
        left: menuX,
        padding: '6px',
        backgroundColor: '#fff',
        border: '1px solid #ccc',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        zIndex: 9999,
      }}
    >
      <style>
        {`
          .d3-context-menu {
            list-style: none;
            margin: 0;
            padding: 0;
            width: 160px;
          }
          .d3-context-menu-item {
            margin: 4px 0;
            cursor: pointer;
            padding: 4px 8px;
          }
          .d3-context-menu-item:hover {
            background-color: #eee;
          }
        `}
      </style>
      <div style={{ fontWeight: 'bold', marginBottom: '5px' }}>Node: {node.label}</div>
      <ul className="d3-context-menu">
        <li
          className="d3-context-menu-item"
          onClick={() => {
            onToggleChildren(node.id);
            onClose();
          }}
        >
          Toggle Hide/Show Children
        </li>
        <li
          className="d3-context-menu-item"
          onClick={() => {
            onToggleParents(node.id);
            onClose();
          }}
        >
          Toggle Hide/Show Parents
        </li>
        <li
          className="d3-context-menu-item"
          onClick={() => {
            onHideNode(node.id);
            onClose();
          }}
        >
          Hide Node
        </li>
        <li
          className="d3-context-menu-item"
          onClick={() => {
            onCenterView();
            onClose();
          }}
        >
          Center View
        </li>
      </ul>
    </div>
  );
}
