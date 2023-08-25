// useCytoData.ts
import { useSelector } from 'react-redux';
import { useEffect, useState } from 'react';
import { selectViolations, selectCytoData } from '../../Store/CombinedSlice';

export function useCytoData(rdfOntology: any, getShapeForNamespace: Function) {
  const [data, setData] = useState(null);
  const violations = useSelector(selectViolations);

  useEffect(() => {
    console.log('useeffect in useCytoData');
    // Assuming `selectCytoData` is an async function
    async function fetchData() {
      try {
        const newData = await selectCytoData(rdfOntology, getShapeForNamespace, violations);
        setData(newData);
      } catch (error) {
        console.error('Failed to generate Cytoscape data:', error);
      }
    }

    fetchData();
  }, [rdfOntology, violations, getShapeForNamespace]);
  return data;
}
