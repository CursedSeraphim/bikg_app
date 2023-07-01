import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Treebeard } from 'react-treebeard';
import { selectRdfData } from '../Store/CombinedSlice';
import { getTreeDataFromN3Data } from './TreeviewGlue';
import { lightTheme } from './lightTheme';
import { BarLoader } from 'react-spinners';

export default function Treeview() {
  const [treeData, setTreeData] = useState(null);
  const ontology = useSelector(selectRdfData);

  useEffect(() => {
    if (ontology) {
      getTreeDataFromN3Data(ontology).then((processedData) => {
        setTreeData(processedData);
      });
    }
  }, [ontology]);

  const onToggle = (node, toggled) => {
    if (node.children) {
      node.toggled = toggled;
    }
    setTreeData({ ...treeData });
  };

  if (!treeData) {
    return <BarLoader color="steelblue" loading />;
  }

  // set root element to be default toggled
  treeData.toggled = true;

  return <Treebeard data={treeData} style={lightTheme} onToggle={onToggle} />;
}
