// src/components/branding/logos/LogoImage.tsx

import * as React from 'react';
import type { LogoTheme } from '../../../constants/branding';
import type { BrandLogoConfig } from './brandLogos.config';
import { LogoPlaceholder } from './LogoPlaceholder';

interface LogoImageProps {
  brand: BrandLogoConfig;
  theme: LogoTheme;
  anonymize: boolean;
  height?: number;
}

export function LogoImage({ brand, theme, anonymize, height = 24 }: LogoImageProps) {
  const [loadError, setLoadError] = React.useState(false);

  if (anonymize) {
    return null;
  }

  if (loadError) {
    return <LogoPlaceholder label={brand.anonymizedLabel} href={brand.href} height={height} />;
  }

  const src = brand.getSrc(theme);

  return (
    <a href={brand.href} rel="noreferrer" target="_blank" style={{ display: 'inline-flex', marginRight: 24 }}>
      <img src={src} alt={brand.alt} style={{ height, display: 'block' }} onError={() => setLoadError(true)} />
    </a>
  );
}
