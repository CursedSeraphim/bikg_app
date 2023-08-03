// SVGTooltip.tsx
import React from 'react';
import PropTypes from 'prop-types';
import svgFile from './740-pill.svg';

function ImageComponent({ path, alt }) {
  const handleError = (e) => {
    console.log('error', e);
    e.target.onerror = null; // to prevent infinite loop in case of error in fallback image
    e.target.src = svgFile;
  };

  return (
    <img src={path} alt={alt} onError={handleError} style={{ height: '100%', width: '100%', position: 'absolute', bottom: '0', left: '0', zIndex: 101 }} />
  );
}

ImageComponent.propTypes = {
  path: PropTypes.string.isRequired,
  alt: PropTypes.string.isRequired,
};

export default ImageComponent;
