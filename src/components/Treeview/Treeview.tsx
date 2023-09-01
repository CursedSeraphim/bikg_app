import React from 'react';
import { useDispatch } from 'react-redux';
import { Treebeard, decorators } from 'react-treebeard';
import { BarLoader } from 'react-spinners';
import _ from 'lodash';
import { setSelectedTypes } from '../Store/CombinedSlice';
import { lightTheme } from './lightTheme';
import { CustomHeader } from './CustomHeader'; // Import CustomHeader
import { SPINNER_COLOR } from '../../constants';
import useTreeData from './useTreeData';

decorators.Header = CustomHeader;
export default function Treeview() {
  const dispatch = useDispatch();

  const [treeData, setTreeData, selectedTypesRef] = useTreeData(); // Use your new custom hook

  // This function will be called when a node is toggled
  const onToggle = (node, toggled) => {
    // create a copy of the selected types
    let newSelectedTypes = [...selectedTypesRef.current];

    // define function which will remove a node and its children from the list of selected types
    const removeNodeAndChildrenFromList = (n) => {
      newSelectedTypes = newSelectedTypes.filter((type) => type !== n.name.split(' ')[0]);
      if (n.children) {
        n.children.forEach(removeNodeAndChildrenFromList);
      }
    };

    if (toggled) {
      // if the node is toggled, i.e., selected, add it to the list of selected types
      newSelectedTypes.push(node.name.split(' ')[0]);
    } else {
      // if the node is not toggled, i.e., not selected, remove it and its children from the list of selected types
      removeNodeAndChildrenFromList(node);
    }

    // update the list of selected types in the redux store using the new list
    dispatch(setSelectedTypes(newSelectedTypes));

    // update the tree data to reflect the toggled state of the node
    if (node.children) {
      setTreeData((oldTreeData) => {
        const newTreeData = _.cloneDeep(oldTreeData);
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
  // Here we return the JSX that will be rendered
  return (
    <div className="treeview-container">
      <Treebeard data={treeData} style={lightTheme} onToggle={onToggle} decorator={decorators} />
    </div>
  );
}
