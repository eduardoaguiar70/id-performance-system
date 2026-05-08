import { Wrench, ImageIcon } from "lucide-react"

export default function CriativosPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] p-8 text-center select-none">
      {/* Ícone */}
      <div className="relative mb-6">
        <div className="absolute inset-0 rounded-full bg-primary/10 animate-ping opacity-30" />
        <div className="relative flex h-20 w-20 items-center justify-center rounded-full bg-muted border border-border">
          <Wrench className="h-9 w-9 text-muted-foreground" />
        </div>
      </div>

      {/* Texto */}
      <h2 className="text-xl font-semibold mb-2 text-foreground">
        Seção em Manutenção
      </h2>
      <p className="text-muted-foreground max-w-sm text-sm leading-relaxed">
        Estamos a preparar algo melhor para a gestão dos seus Criativos com IA.
        <br />
        <span className="text-primary font-medium">Nova funcionalidade em breve.</span>
      </p>

      {/* Rodapé sutil */}
      <div className="mt-8 flex items-center gap-2 text-[11px] text-muted-foreground/40 uppercase tracking-widest">
        <ImageIcon className="h-3 w-3" />
        <span>Criativos &amp; IA — em desenvolvimento</span>
      </div>
    </div>
  )
}
