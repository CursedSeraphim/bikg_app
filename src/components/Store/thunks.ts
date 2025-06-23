// thunks.ts

import { Dispatch } from 'redux';
import { fetchCSVFile, fetchClasses, fetchGroupFocusNodeDict, fetchFocusNodeGroupDict, fetchViolationList } from '../../api';
import {
  createMaps,
  setCsvData,
  setGroupFocusNodeDict,
  setGroupMap,
  setFocusNodeGroupDict,
  setFocusNodeMap,
  setTypeMap,
  setTypes,
  setViolationMap,
  setViolations,
} from './CombinedSlice';
import { RootState } from './Store';

export const fetchAndInitializeData = () => async (dispatch: Dispatch, getState: () => RootState) => {
  const [csvData, violationList, types, focusNodeGroupDict, groupFocusNodeDict] = await Promise.all([
    fetchCSVFile(),
    fetchViolationList(),
    fetchClasses(),
    fetchFocusNodeGroupDict(),
    fetchGroupFocusNodeDict(),
  ]);

  dispatch(setCsvData(JSON.parse(csvData)));
  dispatch(setViolations(violationList));
  dispatch(setTypes(types));
  dispatch(setFocusNodeGroupDict(focusNodeGroupDict));
  dispatch(setGroupFocusNodeDict(groupFocusNodeDict));

  // Here, we wait for the Redux state to get updated, and then read it.
  const state = getState().combined;
  const { violationMap, typeMap, groupMap, focusNodeMap } = createMaps(
    state.samples,
    state.violations,
    state.types,
    state.focusNodeGroupDict,
    state.groupFocusNodeDict,
  );

  dispatch(setViolationMap(violationMap));
  dispatch(setTypeMap(typeMap));
  dispatch(setGroupMap(groupMap));
  dispatch(setFocusNodeMap(focusNodeMap));
};
