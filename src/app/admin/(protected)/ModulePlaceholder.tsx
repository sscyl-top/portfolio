export function ModulePlaceholder({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div>
      <p className="font-mono text-xs uppercase tracking-[0.22em] text-cyan">
        Module
      </p>
      <h2 className="mt-3 text-3xl font-semibold">{title}</h2>
      <section className="mt-6 rounded-md border border-white/10 bg-white/[0.035] p-5 text-sm leading-7 text-white/62">
        {description}
      </section>
    </div>
  );
}
