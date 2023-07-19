// LineUpView.tsx
import * as React from 'react';
import NewWindow from 'react-new-window';
import { useSelector } from 'react-redux';
import * as LineUpJS from 'lineupjs';
import { selectCsvData } from '../Store/CombinedSlice';

export default function LineUpView() {
  const csvData = useSelector(selectCsvData);
  const lineupRef = React.useRef<any>();

  React.useEffect(() => {
    if (lineupRef.current) {
      console.log('csvData', csvData);
      const lineup = LineUpJS.asLineUp(lineupRef.current, csvData);
    }
  }, [lineupRef, csvData]);

  return (
    <div className="lineup-window">
      <NewWindow>
        <link href="https://unpkg.com/lineupjsx/build/LineUpJSx.css" rel="stylesheet" />
        <script src="https://unpkg.com/lineupjsx/build/LineUpJSx.js" />
        <div className="LineUpParent">
          <div
            style={{
              clear: 'both',
              position: 'absolute',
              top: '1px',
              bottom: 0,
              left: 0,
              right: 0,
              padding: 0,
            }}
            ref={lineupRef}
            id="lineup_view"
          />
        </div>
      </NewWindow>
    </div>
  );
}
