import { ImageResponse } from 'next/og';
import { siteConfig } from '@/config/site';

export const alt = `${siteConfig.name} — Actualités RDC et International`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: 'linear-gradient(135deg, #0c0c0f 0%, #1d3557 55%, #c41e3a 100%)',
          padding: '64px',
          fontFamily: 'system-ui, sans-serif',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '12px',
              height: '48px',
              background: '#c41e3a',
              borderRadius: '4px',
            }}
          />
          <span
            style={{
              fontSize: '28px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              color: 'rgba(255,255,255,0.75)',
            }}
          >
            Actualités RDC & International
          </span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <div
            style={{
              fontSize: '88px',
              fontWeight: 800,
              color: '#ffffff',
              lineHeight: 1,
              letterSpacing: '-0.02em',
            }}
          >
            {siteConfig.name}
          </div>
          <div
            style={{
              fontSize: '32px',
              color: 'rgba(255,255,255,0.85)',
              maxWidth: '900px',
              lineHeight: 1.35,
            }}
          >
            {siteConfig.description}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            fontSize: '24px',
            color: 'rgba(255,255,255,0.65)',
          }}
        >
          <span>wab-infos.com</span>
          <span>Information fiable en continu</span>
        </div>
      </div>
    ),
    { ...size }
  );
}
