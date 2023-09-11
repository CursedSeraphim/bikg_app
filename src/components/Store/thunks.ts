// thunks.ts

import { Dispatch } from 'redux';
import { fetchCSVFile, fetchClasses, fetchExemplarFocusNodeDict, fetchFocusNodeExemplarDict, fetchViolationList } from '../../api';
import {
  createMaps,
  setCsvData,
  setExemplarFocusNodeDict,
  setExemplarMap,
  setFocusNodeExemplarDict,
  setFocusNodeMap,
  setTypeMap,
  setTypes,
  setViolationMap,
  setViolations,
} from './CombinedSlice';
import { RootState } from './Store';

export const fetchAndInitializeData = () => async (dispatch: Dispatch, getState: () => RootState) => {
  const [csvData, violationList, types, focusNodeExemplarDict, exemplarFocusNodeDict] = await Promise.all([
    fetchCSVFile(),
    fetchViolationList(),
    fetchClasses(),
    fetchFocusNodeExemplarDict(),
    fetchExemplarFocusNodeDict(),
  ]);

  dispatch(setCsvData(JSON.parse(csvData).data));
  dispatch(setViolations(violationList));
  dispatch(setTypes(types));
  dispatch(setFocusNodeExemplarDict(focusNodeExemplarDict));
  dispatch(setExemplarFocusNodeDict(exemplarFocusNodeDict));
  // TODO update to also fetch and dispatch for the new parameters

  // Here, we wait for the Redux state to get updated, and then read it.
  const state = getState().combined;
  const { violationMap, typeMap, exemplarMap, focusNodeMap } = createMaps(
    state.samples,
    state.violations,
    state.types,
    state.focusNodeExemplarDict,
    state.exemplarFocusNodeDict,
  );
  dispatch(setViolationMap(violationMap));
  dispatch(setTypeMap(typeMap));
  dispatch(setExemplarMap(exemplarMap));
  dispatch(setFocusNodeMap(focusNodeMap));
};
