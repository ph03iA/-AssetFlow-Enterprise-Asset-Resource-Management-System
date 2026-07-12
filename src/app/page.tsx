export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950 px-6 text-white">
      <section className="w-full max-w-3xl border-l border-emerald-400/50 pl-8 sm:pl-12">
        <p className="mb-5 font-mono text-xs uppercase tracking-[0.35em] text-emerald-300">
          Enterprise asset & resource management
        </p>
        <h1 className="text-5xl font-semibold tracking-tight sm:text-7xl">
          AssetFlow
        </h1>
        <p className="mt-6 max-w-xl text-lg leading-8 text-slate-300">
          A centralized workspace for tracking assets, allocating resources,
          managing maintenance, and keeping every team accountable.
        </p>
        <div className="mt-10 inline-flex items-center gap-3 rounded-full border border-slate-700 px-4 py-2 font-mono text-xs text-slate-300">
          <span className="size-2 rounded-full bg-emerald-400" aria-hidden="true" />
          Project foundation ready
        </div>
      </section>
    </main>
  );
}
