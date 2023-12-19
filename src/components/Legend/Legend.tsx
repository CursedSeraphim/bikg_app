// Legend.tsx
import React from 'react';
import './Legend.css';
import { SELECTED_EXEMPLAR_NODE_COLOR, SELECTED_TYPE_NODE_COLOR, SELECTED_VIOLATION_NODE_COLOR } from '../../constants';

const SHAPES = {
  omics: 'triangle',
  sh: 'rectangle',
  owl: 'diamond',
  cns: 'pentagon',
  xsd: 'hexagon',
  other: 'circle',
};

const COLORS = {
  'Type / owl:Class': SELECTED_TYPE_NODE_COLOR,
  'Violation / sh:PropertyShape': SELECTED_VIOLATION_NODE_COLOR,
  'Focus Nodes / Exemplar': SELECTED_EXEMPLAR_NODE_COLOR,
};

function Legend() {
  return (
    <div className="legend-container">
      <div className="shapes-section">
        {Object.entries(SHAPES).map(([key, shape]) => (
          <div key={key} className="legend-item">
            <div className={`shape ${shape}`} />
            <span>{key}</span>
          </div>
        ))}
      </div>
      <div className="colors-section">
        {Object.entries(COLORS).map(([key, color]) => (
          <div key={key} className="legend-item">
            <div className="color" style={{ backgroundColor: color }} />
            <span>{key}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Legend;
