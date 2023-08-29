// testTreebeard.tsx
import React, { useState } from 'react';
import { Treebeard } from 'react-treebeard';

const initialData = {
  name: 'root',
  toggled: true,
  children: [
    {
      name: 'parent',
      children: [{ name: 'child1' }, { name: 'child2' }],
    },
  ],
};

function App() {
  console.log('function App()');
  const [data, setData] = useState(initialData);

  const onToggle = (node, toggled) => {
    if (node.children) {
      node.toggled = toggled;
    }
    setData({ ...data });
  };

  const addNode = () => {
    data.children.push({ name: 'new parent', children: [{ name: 'new child' }] });
    setData({ ...data });
  };

  return (
    <div>
      <Treebeard data={data} onToggle={onToggle} />
      <button onClick={addNode} type="button">
        Add Node
      </button>
    </div>
  );
}

export default App;
