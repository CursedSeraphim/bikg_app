// useCytoscape.ts
import cytoscape, { Core, ElementsDefinition } from 'cytoscape';
import { useEffect, useState } from 'react';
import cytoscapeLasso from 'cytoscape-lasso';
import coseBilkent from 'cytoscape-cose-bilkent';
import { CY_LAYOUT } from '../constants';

cytoscape.use(cytoscapeLasso);
cytoscape.use(coseBilkent);

interface UseCytoscapeProps {
  containerId: string;
  initialElements: ElementsDefinition;
}

export function useCytoscape({ containerId, initialElements }: UseCytoscapeProps) {
  const [cy, setCy] = useState<Core | null>(null);

  useEffect(() => {
    console.log('useEffect in useCytoscape');
    const container = document.getElementById(containerId);

    if (!container) {
      console.error('Cytoscape container not found');
      return;
    }

    const newCy = cytoscape({
      container,
      elements: initialElements,
      style: [],
      layout: CY_LAYOUT,
    });

    setCy(newCy);

    // if (newCy) {
    //   const layout = newCy.layout(CY_LAYOUT);
    //   layout.run();
    //   newCy.fit();
    // }
  }, [containerId, initialElements]);

  return { cy };
}
