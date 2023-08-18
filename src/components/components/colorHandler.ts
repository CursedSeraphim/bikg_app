import { useState, useEffect } from 'react';
import colorbrewer from 'colorbrewer';
import { useSelector } from 'react-redux';
import { INamespaces } from '../../types';
import { selectNamespaces } from '../Store/CombinedSlice';

const initializeColorScale = (namespaces: INamespaces = {}) => {
  if (!namespaces || typeof namespaces !== 'object') {
    console.warn('Provided namespaces parameter is not an object. Defaulting to an empty object.');
    namespaces = {};
  }

  const numDataClasses = Object.keys(namespaces).length * 2;

  if (numDataClasses === 0) {
    return '#000000'; // Default color for zero data classes
  }

  if (colorbrewer?.Set3?.[numDataClasses]) {
    return colorbrewer.Set3[numDataClasses];
  }

  console.warn(`Cannot find a qualitative color scale for ${numDataClasses} data classes. Using default color.`);
  return '#000000'; // Default color if no matching color scale
};

const useColorHandler = () => {
  const namespaces: INamespaces = useSelector(selectNamespaces) || {};

  const [colorScale, setColorScale] = useState(initializeColorScale(namespaces));

  useEffect(() => {
    setColorScale(initializeColorScale(namespaces));
    // TODO the color scale is never updated correctly, namespaces just always stays {}
    console.log('updated color scale to', colorScale, 'using new namespaces', namespaces);
  }, [namespaces]);

  const getColorForNamespace = (namespace = '', isSelected = false) => {
    if (typeof namespace !== 'string') {
      console.warn('Provided namespace is not a string. Defaulting to an empty string.');
      namespace = '';
    }

    const namespaceIndex = Object.keys(namespaces).indexOf(namespace);

    if (namespaceIndex === -1) {
      console.warn(`Namespace ${namespace} not found. Using default color.`);
      return '#000000'; // Default color if namespace is not found
    }

    return colorScale?.[namespaceIndex * 2 + (isSelected ? 1 : 0)] || '#000000'; // Safely access colorScale and provide a default color
  };

  return { getColorForNamespace };
};

export { useColorHandler };
