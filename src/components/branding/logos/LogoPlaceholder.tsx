// src/components/branding/logos/LogoPlaceholder.tsx

import * as React from 'react';

interface LogoPlaceholderProps {
  label: string;
  href?: string;
  height?: number;
}

export function LogoPlaceholder({ label, href, height = 24 }: LogoPlaceholderProps) {
  const content = (
    <div
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height,
        minWidth: height * 2,
        padding: '0 8px',
        borderRadius: 4,
        border: '1px solid rgba(255, 255, 255, 0.3)',
        fontSize: 12,
        fontWeight: 500,
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </div>
  );

  if (href) {
    return (
      <a href={href} rel="noreferrer" target="_blank" style={{ textDecoration: 'none', marginRight: 24 }}>
        {content}
      </a>
    );
  }

  return content;
}
