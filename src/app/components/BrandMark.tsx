import { Zap } from 'lucide-react';
import { useTenantConfig } from '../core/TenantConfigContext';

export function BrandMark({ size = 38, showText = true }: { size?: number; showText?: boolean }) {
  const config = useTenantConfig();
  const iconSize = Math.max(12, Math.round(size * 0.5));

  return (
    <span
      aria-label={`${config.site.name} Logo`}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: Math.max(8, Math.round(size * 0.28)),
        color: '#fff',
        textDecoration: 'none',
        lineHeight: 1,
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: size,
          height: size,
          display: 'grid',
          placeItems: 'center',
          border: '1px solid rgba(255,255,255,.24)',
          background: 'rgba(255,255,255,.06)',
          boxShadow: '0 0 28px rgba(255,45,85,.24)',
        }}
      >
        <Zap size={iconSize} />
      </span>
      {showText && (
        <span
          style={{
            fontFamily: "'Orbitron', sans-serif",
            fontSize: Math.max(11, Math.round(size * 0.38)),
            fontWeight: 900,
            letterSpacing: Math.max(2, Math.round(size * 0.1)),
            textTransform: 'uppercase',
            whiteSpace: 'nowrap',
          }}
        >
          {config.site.name}
        </span>
      )}
    </span>
  );
}
