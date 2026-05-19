interface StatItemProps {
  target: number;
  suffix: string;
  label: string;
}

function StatItem({ target, suffix, label }: StatItemProps) {
  return (
    <div className="gs-stat flex flex-col items-center">
      <div className="flex items-baseline justify-center gap-1">
        <span
          className="public-huge-text text-white font-bold gs-stat-num"
          data-target={target}
        >
          0
        </span>
        <span className="public-huge-text text-[var(--color-public-tint)] font-bold">
          {suffix}
        </span>
      </div>
      <p className="public-label-mono text-white/60 text-sm tracking-[0.2em] uppercase mt-3">
        {label}
      </p>
    </div>
  );
}

export function StatsSection() {
  return (
    <section id="ch-stats" className="public-stats-chapter">
      <div className="public-stats-grid">
        <StatItem target={2} suffix="+" label="Years of Experience" />
        <StatItem target={50} suffix="+" label="Companies Served" />
        <StatItem target={20} suffix="+" label="Projects Completed" />
      </div>
    </section>
  );
}
