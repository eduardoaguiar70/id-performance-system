import Link from "next/link";

// Dados que aparecem nas páginas legais. Ajuste aqui e vale para as duas páginas.
export const LEGAL = {
  empresa: "GRUPO EH",
  produto: "ID Performance Plataforma",
  site: "https://aceleracao.idperformancedigital.com.br",
  email: "eduardo.aguiar70@gmail.com",
  atualizadoEm: "26 de outubro de 2026",
};

export function LegalLayout({
  titulo,
  children,
}: {
  titulo: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border/50">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-6 py-5">
          <Link href={LEGAL.site} className="text-sm font-bold uppercase tracking-widest">
            {LEGAL.produto}
          </Link>
          <nav className="flex gap-5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Link href="/privacidade" className="hover:text-foreground">
              Privacidade
            </Link>
            <Link href="/termos" className="hover:text-foreground">
              Termos
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold tracking-tight">{titulo}</h1>
        <p className="mt-2 text-sm text-muted-foreground">Última atualização: {LEGAL.atualizadoEm}</p>
        <div className="mt-10 space-y-10">{children}</div>
      </main>

      <footer className="border-t border-border/50">
        <div className="mx-auto max-w-3xl px-6 py-6 text-xs text-muted-foreground">
          © {new Date().getFullYear()} {LEGAL.empresa} · {LEGAL.produto}
        </div>
      </footer>
    </div>
  );
}

export function Secao({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3 text-sm leading-relaxed text-foreground/80">
      <h2 className="text-lg font-bold tracking-tight text-foreground">{titulo}</h2>
      {children}
    </section>
  );
}

export function Lista({ itens }: { itens: React.ReactNode[] }) {
  return (
    <ul className="list-disc space-y-1.5 pl-5">
      {itens.map((item, i) => (
        <li key={i}>{item}</li>
      ))}
    </ul>
  );
}
