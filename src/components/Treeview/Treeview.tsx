import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Treebeard } from 'react-treebeard';
import { loadOntology, selectOntology, RDFTuple, OntologySliceState } from '../Store/OntologySlice';

/**
 * Process the ontology data from the store into the data format that Treebeard expects
 * the data from the store is defined by the interfaces in the ontologySlice.ts file as
 * RDFTuple { subject: string; predicate: string; object: string; }
 * and OntologySliceState { tuples: RDFTuple[]; }
 */
function processTTL(ontologyData: OntologySliceState) {
  const ontologyMap: { [key: string]: { name: string; children: any[] } } = {};

  ontologyData.tuples.forEach((triple) => {
    ontologyMap[triple.subject] = ontologyMap[triple.subject] || { name: triple.subject, children: [] };
    ontologyMap[triple.object] = ontologyMap[triple.object] || { name: triple.object, children: [] };
    ontologyMap[triple.subject].children.push(ontologyMap[triple.object]);
  });

  const roots = Object.values(ontologyMap).filter((node) => !node.children.some((child) => child.name in ontologyMap));
  console.log('roots', roots);

  if (roots.length > 1) {
    let data = { name: 'root', children: roots };
    // append to children inside of data
    data.children = roots;
    if (roots.length > 1) {
      data = { name: 'root', children: roots };
    }
    return data;
  }

  return roots[0];
}

const data = {
  name: 'root',
  toggled: true,
  children: [
    {
      name: 'parent',
      children: [{ name: 'child1' }, { name: 'child2' }, { name: 'child3' }],
    },
  ],
};

// export default function Treeview() {
//   // TODO change this to use the ontology data from the store
//   const [treeData, setTreeData] = useState(data);

//   const onToggle = (node, toggled) => {
//     if (node.children) {
//       node.toggled = toggled;
//     }
//     setTreeData({ ...treeData });
//   };

//   return <Treebeard data={treeData} onToggle={onToggle} />;
// }

export default function Treeview() {
  const [treeData, setTreeData] = useState(null);
  const ontology = useSelector(selectOntology);

  useEffect(() => {
    if (ontology) {
      const processedData = processTTL(ontology);
      setTreeData(processedData);
    }
  }, [ontology]);

  const onToggle = (node, toggled) => {
    if (node.children) {
      node.toggled = toggled;
    }
    setTreeData({ ...treeData });
  };

  if (!treeData) {
    return <div>Loading...</div>;
  }

  return <Treebeard data={treeData} onToggle={onToggle} />;
}
