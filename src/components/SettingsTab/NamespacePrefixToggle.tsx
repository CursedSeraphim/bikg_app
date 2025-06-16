import { Group, Switch, Tooltip } from '@mantine/core';
import React from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectHideNamespacePrefixCells,
  selectHideNamespacePrefixColumns,
  setHideNamespacePrefixCells,
  setHideNamespacePrefixColumns,
} from '../Store/CombinedSlice';

function NamespacePrefixToggle() {
  const dispatch = useDispatch();
  const hideColumns = useSelector(selectHideNamespacePrefixColumns);
  const hideCells = useSelector(selectHideNamespacePrefixCells);

  return (
    <Group direction="column" spacing="xs">
      <Tooltip label="Hide namespace prefixes from column labels." multiline withArrow w={220} transitionProps={{ duration: 300 }}>
        <Switch checked={hideColumns} onChange={(e) => dispatch(setHideNamespacePrefixColumns(e.currentTarget.checked))} label="Prefix in Columns" />
      </Tooltip>
      <Tooltip label="Also hide prefixes in cell values." multiline withArrow w={220} transitionProps={{ duration: 300 }}>
        <Switch checked={hideCells} onChange={(e) => dispatch(setHideNamespacePrefixCells(e.currentTarget.checked))} label="Prefix in Cells" />
      </Tooltip>
    </Group>
  );
}

export default NamespacePrefixToggle;
