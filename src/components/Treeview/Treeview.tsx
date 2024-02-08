import React from 'react';
import { useDispatch } from 'react-redux';
import { Treebeard, decorators } from 'react-treebeard';
import { BarLoader } from 'react-spinners';
import _ from 'lodash';
import { addSingleSelectedType, removeMultipleSelectedTypes, removeSingleSelectedType } from '../Store/CombinedSlice';
import { lightTheme } from './lightTheme';
import { CustomHeader } from './CustomHeader'; // Import CustomHeader
import { SPINNER_COLOR } from '../../constants';
import useTreeData from './useTreeData';

decorators.Header = CustomHeader;
export default function Treeview() {
  const dispatch = useDispatch();

  const [treeData, setTreeData] = useTreeData();

  const onToggle = (node, toggled) => {
    const collectTypesToRemove = (n, types = []) => {
      const typeToRemove = n.name.split(' ')[0];
      types.push(typeToRemove);

      if (n.children) {
        n.children.forEach((child) => collectTypesToRemove(child, types));
      }

      return types;
    };

    if (toggled) {
      const typeToAdd = node.name.split(' ')[0];
      dispatch(addSingleSelectedType(typeToAdd));
    } else {
      const typesToRemove = collectTypesToRemove(node);
      dispatch(removeMultipleSelectedTypes(typesToRemove)); // Dispatch a single action with all types to remove
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
