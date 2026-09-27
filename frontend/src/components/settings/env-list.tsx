export function EnvList({ items }: { items: Array<{ name: string; hint?: string }> }) {
  return (
    <ul className="mt-2 space-y-1.5 rounded-xl bg-navy-950 p-3 font-mono text-xs text-white/85">
      {items.map((item) => (
        <li key={item.name} className="flex flex-wrap items-baseline gap-x-2 break-all">
          <span className="text-sun-300">{item.name}</span>
          <span className="text-white/40">=</span>
          {item.hint ? <span className="font-sans text-white/50"># {item.hint}</span> : <span className="text-white/40">…</span>}
        </li>
      ))}
    </ul>
  );
}
