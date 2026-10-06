import React from 'react';

// The app's logo, the same drawing as the home-screen icon (public/icon-192.svg), so it stays sharp at any size.
const AppLogo: React.FC<{ className?: string }> = ({ className }) => (
  <svg viewBox="0 0 192 192" className={className} role="img" aria-label="Thulir MicroGreen Tracker logo">
    <rect width="192" height="192" rx="42" fill="#059669" />
    <path d="M96 140 C96 100 70 80 48 72 C48 104 70 128 96 140 Z" fill="#a7f3d0" />
    <path d="M96 140 C96 100 122 80 144 72 C144 104 122 128 96 140 Z" fill="#6ee7b7" />
    <path d="M96 140 L96 84" stroke="#059669" strokeWidth="4" strokeLinecap="round" />
    <circle cx="96" cy="60" r="8" fill="#047857" />
  </svg>
);

export default AppLogo;
