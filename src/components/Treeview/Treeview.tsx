import React from 'react';
import { useDispatch } from 'react-redux';
import { Treebeard, decorators } from 'react-treebeard';
import { BarLoader } from 'react-spinners';
import _ from 'lodash';
import { addSingleSelectedType, removeSingleSelectedType } from '../Store/CombinedSlice';
import { lightTheme } from './lightTheme';
import { CustomHeader } from './CustomHeader'; // Import CustomHeader
import { SPINNER_COLOR } from '../../constants';
import useTreeData from './useTreeData';

decorators.Header = CustomHeader;
export default function Treeview() {
  const dispatch = useDispatch();

  const [treeData, setTreeData] = useTreeData();

  const onToggle = (node, toggled) => {
    // Define function which will remove a node and its children from the list of selected types
    const removeNodeAndChildrenFromList = (n) => {
      const typeToRemove = n.name.split(' ')[0];
      dispatch(removeSingleSelectedType(typeToRemove));

      if (n.children) {
        n.children.forEach(removeNodeAndChildrenFromList);
      }
    };

    if (toggled) {
      // If the node is toggled, i.e., selected, add it to the list of selected types
      const typeToAdd = node.name.split(' ')[0];
      dispatch(addSingleSelectedType(typeToAdd));
    } else {
      // If the node is not toggled, i.e., not selected, remove it and its children from the list of selected types
      removeNodeAndChildrenFromList(node);
    }

    // Update the tree data to reflect the toggled state of the node
    if (node.children) {
      setTreeData((oldTreeData) => {
        const newTreeData = _.cloneDeep(oldTreeData);
        const traverseAndToggle = (n) => {
          if (n.children) {
            n.children.forEach(traverseAndToggle);
          }
          if (n.name === node.name) {
            // eslint-disable-next-line no-param-reassign
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
