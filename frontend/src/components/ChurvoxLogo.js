import React from "react";

export function ChurvoxLogo({ className = "", showText = true }) {
  return (
    <div className={`churvox-brand ${className}`.trim()}>
      <span className="churvox-brand-icon" aria-hidden="true">
        <svg width="40" height="40" viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <linearGradient id="cvBg" x1="12" y1="6" x2="84" y2="90" gradientUnits="userSpaceOnUse">
              <stop stopColor="#111827" />
              <stop offset="1" stopColor="#030712" />
            </linearGradient>

            <linearGradient id="cvFire" x1="25" y1="19" x2="73" y2="75" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FFE7D1" />
              <stop offset="0.42" stopColor="#FF7A1A" />
              <stop offset="1" stopColor="#E11D2E" />
            </linearGradient>

            <filter id="cvGlow" x="0" y="0" width="96" height="96" filterUnits="userSpaceOnUse">
              <feDropShadow dx="0" dy="10" stdDeviation="8" floodColor="#E11D2E" floodOpacity="0.22" />
            </filter>
          </defs>

          <rect x="6" y="6" width="84" height="84" rx="24" fill="url(#cvBg)" />

          <g filter="url(#cvGlow)">
            <path
              d="M48 14L75 25.6V44.2C75 62.6 64.2 76.8 48 83C31.8 76.8 21 62.6 21 44.2V25.6L48 14Z"
              fill="#0B1120"
              stroke="url(#cvFire)"
              strokeWidth="4"
              strokeLinejoin="round"
            />

            <path
              d="M65.8 30.5H42.2C34.4 30.5 28.8 36.1 28.8 43.8C28.8 51.5 34.4 57.1 42.2 57.1H61.8L56.2 66H41.8C28.6 66 18.8 56.2 18.8 43.8C18.8 31.4 28.6 21.6 41.8 21.6H71.8L65.8 30.5Z"
              fill="url(#cvFire)"
            />

            <path
              d="M42.4 39.2H68.2L62.8 47.8H37L42.4 39.2Z"
              fill="#FFFFFF"
            />

            <path
              d="M37.2 52.4H56.8L51.4 61H31.8L37.2 52.4Z"
              fill="#FED7AA"
            />
          </g>
        </svg>
      </span>

      {showText && (
        <span className="churvox-brand-copy">
          <strong>Churvox</strong>
          <small>TRADE OS</small>
        </span>
      )}
    </div>
  );
}

export default ChurvoxLogo;
