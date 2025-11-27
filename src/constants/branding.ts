// src/constants/branding.ts

export type LogoTheme = 'light' | 'dark';

export interface BrandingConfig {
  /** Hides real company logos and names if true. */
  anonymizeLogos: boolean;
}

/**
 * Global branding configuration.
 * Can be toggled per deployment or overridden by environment variables.
 */
export const BRANDING_CONFIG: BrandingConfig = {
  anonymizeLogos: false,
};
