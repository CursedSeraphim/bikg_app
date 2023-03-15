import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { Treebeard, theme } from 'react-treebeard';
import { loadOntology, selectOntology, RDFTuple, OntologySliceState } from '../Store/OntologySlice';
import { RdfState, setRdfString, selectRdfData, selectSubClassOfTuples, selectSubClassOrObjectPropertyTuples } from '../Store/RdfSlice';

const lightTheme = {
  ...theme,
  tree: {
    base: {
      listStyle: 'none',
      backgroundColor: '#fff',
      margin: 0,
      padding: 0,
      color: '#9DA5AB',
      fontFamily: 'lucida grande ,tahoma,verdana,arial,sans-serif',
      fontSize: '14px',
    },
    node: {
      base: {
        position: 'relative',
      },
      link: {
        cursor: 'pointer',
        position: 'relative',
        padding: '0px 5px',
        display: 'block',
      },
      activeLink: {
        background: '#31363F',
      },
      toggle: {
        base: {
          position: 'relative',
          display: 'inline-block',
          verticalAlign: 'top',
          marginLeft: '-5px',
          height: '24px',
          width: '24px',
        },
        wrapper: {
          position: 'absolute',
          top: '50%',
          left: '50%',
          margin: '-7px 0 0 -7px',
          height: '14px',
        },
        height: 14,
        width: 14,
        arrow: {
          fill: '#9DA5AB',
          strokeWidth: 0,
        },
      },
      header: {
        base: {
          display: 'inline-block',
          verticalAlign: 'top',
          color: '#9DA5AB',
        },
        connector: {
          width: '2px',
          height: '12px',
          borderLeft: 'solid 2px black',
          borderBottom: 'solid 2px black',
          position: 'absolute',
          top: '0px',
          left: '-21px',
        },
        title: {
          lineHeight: '24px',
          verticalAlign: 'middle',
        },
      },
      subtree: {
        listStyle: 'none',
        paddingLeft: '19px',
      },
      loading: {
        color: '#E2C089',
      },
    },
  },
};

/**
 * Glue that connects rdfslice selectSubClassOrObjectPropertyTuples return value to the Treebeard component
 * The data from selectSubClassOrObjectPropertyTuples is of the shape 
 * [
    {
        "termType": "Quad",
        "subject": {
            "termType": "NamedNode",
            "value": "http://data.boehringer.com/ontology/omics/TranscriptOmicsSample"
        },
        "predicate": {
            "termType": "NamedNode",
            "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"
        },
        "object": {
            "termType": "NamedNode",
            "value": "http://data.boehringer.com/ontology/omics/Sample"
        },
        "graph": {
            "termType": "DefaultGraph",
            "value": ""
        }
    },
    {
        "termType": "Quad",
        "subject": {
            "termType": "NamedNode",
            "value": "http://data.boehringer.com/ontology/omics/DiffExprAnalysis"
        },
        "predicate": {
            "termType": "NamedNode",
            "value": "http://www.w3.org/2000/01/rdf-schema#subClassOf"
        },
        "object": {
            "termType": "NamedNode",
            "value": "http://data.boehringer.com/ontology/omics/Analysis"
        },
        "graph": {
            "termType": "DefaultGraph",
            "value": ""
        }
    },
    ...
    otherwise does the same as processTTL
 */
function getTreeDataFromN3Data(ontology) {
  const ontologyMap: { [key: string]: { name: string; children: any[] } } = {};

  // console.log('ontology in getTreeDataFromN3Data', ontology);

  const rdfOntologyState: RdfState = {
    rdfString: ontology,
  };

  const quads = selectSubClassOfTuples({ rdf: rdfOntologyState });
  console.log('{ rdf: rdfOntologyState }', { rdf: rdfOntologyState });
  console.log('quads after selectSubClassOfTuples', quads);

  quads.forEach((triple) => {
    console.log('triple', triple);
    ontologyMap[triple.subject] = ontologyMap[triple.subject] || { name: triple.subject, children: [] };
    ontologyMap[triple.object] = ontologyMap[triple.object] || { name: triple.object, children: [] };
    ontologyMap[triple.object].children.push(ontologyMap[triple.subject]);
  });

  // Find nodes with no parents
  const roots = Object.values(ontologyMap).filter((node) => {
    // A node has no parents if no other node has it as a child
    return Object.values(ontologyMap).every((otherNode) => {
      return otherNode.children.indexOf(node) === -1;
    });
  });

  if (roots.length > 1) {
    const data = { name: 'root', children: roots };
    return data;
  }

  return roots[0];
}

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
    ontologyMap[triple.object].children.push(ontologyMap[triple.subject]);
  });

  // Find nodes with no parents
  const roots = Object.values(ontologyMap).filter((node) => {
    // A node has no parents if no other node has it as a child
    return Object.values(ontologyMap).every((otherNode) => {
      return otherNode.children.indexOf(node) === -1;
    });
  });

  if (roots.length > 1) {
    const data = { name: 'root', children: roots };
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
  // const ontology = useSelector(selectRdfData);

  useEffect(() => {
    if (ontology) {
      console.log('before getting tree data');
      const processedData = processTTL(ontology);
      // const processedData = getTreeDataFromN3Data(ontology);
      console.log('after getting tree data, before setting tree data', processedData);
      setTreeData(processedData);
      console.log('after setting tree data');
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

  return <Treebeard data={treeData} style={lightTheme} onToggle={onToggle} />;
}
