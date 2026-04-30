/**
 * LoadingSpinner.jsx — Reusable animated spinner component.
 *
 * Props:
 *   size    — pixel size of the spinner (default 40)
 *   message — optional text displayed below the spinner
 *   fullPage— if true, centres the spinner vertically in the viewport
 */

import React from 'react';

export default function LoadingSpinner({ size = 40, message = '', fullPage = false }) {
  const spinner = (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
      <div
        role="status"
        aria-label="Loading"
        style={{
          width: size,
          height: size,
          border: `${Math.max(2, size / 13)}px solid var(--color-border)`,
          borderTop: `${Math.max(2, size / 13)}px solid var(--color-primary)`,
          borderRadius: '50%',
          animation: 'spin 0.8s linear infinite',
        }}
      />
      {message && (
        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', textAlign: 'center' }}>
          {message}
        </p>
      )}
    </div>
  );

  if (fullPage) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '60vh',
        }}
      >
        {spinner}
      </div>
    );
  }

  return spinner;
}
