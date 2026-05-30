function MetricCard({ title, label, value, accent = 'mint' }) {
  const accentStyles = {
    mint: 'from-mint/30 to-mint/5 border-mint/40',
    amber: 'from-amberx/30 to-amberx/5 border-amberx/40',
    rose: 'from-rosex/30 to-rosex/5 border-rosex/40',
  };

  return (
    <article className={`rounded-2xl border bg-gradient-to-br p-4 shadow-panel sm:p-5 ${accentStyles[accent] || accentStyles.mint}`}>
      <p className="text-xs font-bold uppercase tracking-[0.2em] text-slate-300">{title || label}</p>
      <p className="mt-2 text-3xl font-black text-white sm:text-4xl">{value}</p>
    </article>
  );
}

export default MetricCard;
