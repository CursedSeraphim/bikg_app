// Legend.tsx
import React from 'react';
import { SELECTED_EXEMPLAR_NODE_COLOR, SELECTED_TYPE_NODE_COLOR, SELECTED_VIOLATION_NODE_COLOR } from '../../constants';
import './Legend.css';

const SHAPES = {
  omics: 'circle',
  sh: 'rectangle',
  owl: 'diamond',
  cns: 'pentagon',
  xsd: 'hexagon',
  other: 'triangle',
};

const COLORS = {
  Ontology: SELECTED_TYPE_NODE_COLOR,
  'SHACL Constraint': SELECTED_VIOLATION_NODE_COLOR,
  'Constraint Violations': SELECTED_EXEMPLAR_NODE_COLOR,
};

function Legend() {
  return (
    <div className="legend-container">
      {/* Shape Legend */}
      <div className="legend-section">
        <h4 className="legend-title">Shape Legend</h4>
        <div className="shapes-section">
          {Object.entries(SHAPES).map(([key, shape]) => (
            <div key={key} className="legend-item">
              <div className={`shape ${shape}`} />
              <span>{key}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Color Legend */}
      <div className="legend-section">
        <h4 className="legend-title">Color Legend</h4>
        <div className="colors-section">
          {Object.entries(COLORS).map(([key, color]) => (
            <div key={key} className="legend-item">
              <div className="color" style={{ backgroundColor: color }} />
              <span>{key}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Legend;
