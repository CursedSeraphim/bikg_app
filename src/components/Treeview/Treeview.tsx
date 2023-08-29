import React from 'react';
import { useDispatch } from 'react-redux';
import { Treebeard, decorators } from 'react-treebeard';
import { BarLoader } from 'react-spinners';
import { setSelectedTypes } from '../Store/CombinedSlice';
import { lightTheme } from './lightTheme';
import { CustomHeader } from './CustomHeader'; // Import CustomHeader
import { SPINNER_COLOR } from '../../constants';
import useTreeData from './useTreeData';

decorators.Header = CustomHeader;

export default function Treeview() {
  console.time('Rendering Treeview took');

  const dispatch = useDispatch();

  const [treeData, setTreeData, selectedTypesRef] = useTreeData(); // Use your new custom hook

  // This function will be called when a node is toggled
  const onToggle = (node, toggled) => {
    let newSelectedTypes = [...selectedTypesRef.current];

    const removeNodeAndChildrenFromList = (n) => {
      newSelectedTypes = newSelectedTypes.filter((type) => type !== n.name);
      if (n.children) {
        n.children.forEach(removeNodeAndChildrenFromList);
      }
    };

    if (toggled) {
      newSelectedTypes.push(node.name);
    } else {
      removeNodeAndChildrenFromList(node);
    }

    dispatch(setSelectedTypes(newSelectedTypes));

    if (node.children) {
      setTreeData((oldTreeData) => {
        const newTreeData = JSON.parse(JSON.stringify(oldTreeData));
        const traverseAndToggle = (n) => {
          if (n.children) {
            n.children.forEach(traverseAndToggle);
          }
          if (n.name === node.name) {
            n.toggled = toggled;
          }
        };
        traverseAndToggle(newTreeData);
        return newTreeData;
      });
    }
  };

  // This will show a spinner while the treeview is loading
  if (!treeData) {
    return <BarLoader color={SPINNER_COLOR} loading />;
  }

  // This will expand the treeview by default
  treeData.toggled = true;

  console.timeEnd('Rendering Treeview took');
  // Here we return the JSX that will be rendered
  return (
    <div className="treeview-container">
      <Treebeard data={treeData} style={lightTheme} onToggle={onToggle} decorator={decorators} />
    </div>
  );
}
