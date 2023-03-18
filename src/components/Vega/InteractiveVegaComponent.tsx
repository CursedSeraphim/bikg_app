// // InteractiveVegaComponent.tsx
// import React, { useState, useEffect } from 'react';
// import { Vega } from 'react-vega';
// import { Handler } from 'vega-tooltip';
// import * as vegaLite from 'vega-lite';
// import { TopLevelUnitSpec } from 'vega-lite/build/src/spec/unit';
// import { TypedFieldDef } from 'vega-lite/build/src/channeldef';

// function InteractiveVegaComponent(props: { data: any[]; onDataSelected?: (data: any[]) => void }) {
//   const [selectedData, setSelectedData] = useState([]);

//   const vegaLiteSpec: TopLevelUnitSpec<TypedFieldDef<string>> = {
//     $schema: 'https://vega.github.io/schema/vega-lite/v5.json',
//     data: { values: props.data },
//     mark: 'point',
//     selection: {
//       brush: {
//         type: 'interval',
//         resolve: 'global',
//         on: '[mousedown[event.shiftKey], window:mouseup] > window:mousemove!',
//         translate: 'window:mousemove!',
//         zoom: 'wheel![event.shiftKey]',
//       },
//       click: { type: 'single', fields: ['_id'] },
//     },
//     encoding: {
//       x: { field: 'x', type: 'quantitative' },
//       y: { field: 'y', type: 'quantitative' },
//       color: { condition: { selection: 'click', value: 'steelblue' }, value: 'grey' },
//     },
//   };

//   const vegaSpec = vegaLite.compile(vegaLiteSpec).spec;

//   const handleSignalChange = (name: string, value: any) => {
//     if (name === 'click_tuple') {
//       const selectedDatum = value ? value.datum : null;
//       setSelectedData(selectedDatum ? [selectedDatum] : []);
//     }
//   };

//   useEffect(() => {
//     if (selectedData.length) {
//       // Process the selected data or pass it to a callback function
//       console.log('Selected data:', selectedData);
//       if (props.onDataSelected) {
//         props.onDataSelected(selectedData);
//       }
//     }
//   }, [selectedData, props]);

//   return <Vega spec={vegaSpec} data={{ table: props.data }} signalListeners={{ click_tuple: handleSignalChange }} tooltip={new Handler().call} />;
// }

// export default InteractiveVegaComponent;
