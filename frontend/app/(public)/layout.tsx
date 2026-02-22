export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-100">
      <main className="mx-auto w-full max-w-7xl p-4 md:p-6">{children}</main>
      <footer className="border-t border-slate-200 bg-white p-4 text-center text-xs text-slate-500">
        (c) {new Date().getFullYear()} NAAS Solutions Limited
      </footer>
    </div>
  );
}
