export function Footer() {
  return (
    <footer className="border-t border-slate-200/80 bg-white/80 backdrop-blur-md dark:border-zinc-800/80 dark:bg-zinc-950/80">
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-slate-500 dark:text-zinc-400">
        © {new Date().getFullYear()} VR Georgia
      </div>
    </footer>
  );
}
