// thunks.ts

import { Dispatch } from 'redux';
import { fetchCSVFile, fetchExemplarFocusNodeDict, fetchViolationList } from '../../api';
import { createViolationMap, setCsvData, setExemplarFocusNodeDict, setViolationMap, setViolations } from './CombinedSlice';
import { RootState } from './Store';

// In your actions.js or equivalent file
export const fetchAndInitializeData = () => async (dispatch: Dispatch, getState: () => RootState) => {
  const [csvData, violationList, exemplarFocusNodeDict] = await Promise.all([fetchCSVFile(), fetchViolationList(), fetchExemplarFocusNodeDict()]);

  dispatch(setCsvData(JSON.parse(csvData).data));
  dispatch(setViolations(violationList));
  dispatch(setExemplarFocusNodeDict(exemplarFocusNodeDict));

  // Here, we wait for the Redux state to get updated, and then read it.
  const state = getState().combined;
  const violationMap = createViolationMap(state.samples, state.violations, state.focusNodeExemplarDict);
  dispatch(setViolationMap(violationMap));
};
