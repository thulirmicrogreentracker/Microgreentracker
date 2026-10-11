import React from 'react';

interface ComingSoonProps {
  eyebrow: string;
  title: string;
  subtitle: string;
  icon: React.FC<{ className?: string }>;
  points: string[]; // what the screen will do
}

// A tab whose features are still being built: its heading and what it will do.
export default function ComingSoon({ eyebrow, title, subtitle, icon: Icon, points }: ComingSoonProps) {
  return (
    <div className="farm-stack">
      <div className="farm-heading">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h1>{title}</h1>
          <p>{subtitle}</p>
        </div>
      </div>
      <section className="farm-surface coming-soon">
        <span className="coming-soon-icon">
          <Icon />
        </span>
        <h2>Coming soon</h2>
        <ul>
          {points.map(p => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}
