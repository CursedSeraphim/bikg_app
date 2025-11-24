// src/components/branding/logos/brandLogos.config.ts

import type { LogoTheme } from '../../../constants/branding';

import biLogo from '../../assets/logos/BILogo.svg';
import datavisynLogoBlack from '../../assets/logos/datavisyn_black.svg';
import datavisynLogoWhite from '../../assets/logos/datavisyn_white.svg';
import labLogo from '../../assets/logos/jku-vds-lab-logo.svg';

export type BrandId = 'bi' | 'lab' | 'datavisyn';

export interface BrandLogoConfig {
  id: BrandId;
  href: string;
  label: string;
  anonymizedLabel: string;
  getSrc(theme: LogoTheme): string;
  alt: string;
}

export const BRAND_LOGOS: BrandLogoConfig[] = [
  {
    id: 'bi',
    href: 'https://www.boehringer-ingelheim.at/de',
    label: 'Boehringer Ingelheim',
    anonymizedLabel: 'Partner 1',
    getSrc: () => biLogo,
    alt: 'Boehringer Ingelheim logo',
  },
  {
    id: 'lab',
    href: 'https://jku-vds-lab.at/',
    label: 'JKU VDS-Lab',
    anonymizedLabel: 'Partner 2',
    getSrc: () => labLogo,
    alt: 'JKU VDS-Lab logo',
  },
  {
    id: 'datavisyn',
    href: 'https://datavisyn.io/',
    label: 'datavisyn',
    anonymizedLabel: 'Partner 3',
    getSrc: (theme: LogoTheme) => (theme === 'light' ? datavisynLogoBlack : datavisynLogoWhite),
    alt: 'datavisyn logo',
  },
];
