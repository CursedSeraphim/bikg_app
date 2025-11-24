// src/components/branding/logos/PartnerLogosRow.tsx

import * as React from 'react';
import { BRANDING_CONFIG, type LogoTheme } from '../../../constants/branding';
import { BRAND_LOGOS } from './brandLogos.config';
import { LogoImage } from './LogoImage';

interface PartnerLogosRowProps {
  /** Theme controls which datavisyn logo variant is used. */
  theme: LogoTheme;
  /** Optional override for anonymization (per-instance). */
  anonymizeOverride?: boolean;
}

export function PartnerLogosRow({ theme, anonymizeOverride }: PartnerLogosRowProps) {
  const anonymize = anonymizeOverride ?? BRANDING_CONFIG.anonymizeLogos;

  return (
    <div style={{ display: 'flex', alignItems: 'center' }}>
      {BRAND_LOGOS.map((brand) => (
        <LogoImage key={brand.id} brand={brand} theme={theme} anonymize={anonymize} />
      ))}
    </div>
  );
}
