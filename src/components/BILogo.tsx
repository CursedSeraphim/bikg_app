import * as React from 'react';
// TODO dynamically import the logos from the assets folder of the node_modules
// TODO fix require error
import datavisynLogoWhite from './datavisyn_white.svg';
import datavisynLogoBlack from './datavisyn_black.svg';
import biLogo from './BILogo.svg';
import labLogo from './jku-vds-lab-logo.svg';

export function BILogo({ color }: { color: 'white' | 'black' }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      <a href="https://www.boehringer-ingelheim.at/de" rel="noreferrer" target="_blank">
        <img src={biLogo} alt="logo" style={{ height: '24px', marginRight: '24px' }} />
      </a>
      <a href="https://jku-vds-lab.at/" rel="noreferrer" target="_blank">
        <img src={labLogo} alt="logo" style={{ height: '24px', marginRight: '24px' }} />
      </a>
      <a href="https://datavisyn.io/" rel="noreferrer" target="_blank">
        <img src={color === 'white' ? datavisynLogoWhite : datavisynLogoBlack} alt="logo" style={{ height: '24px' }} />
      </a>
    </div>
  );
}
