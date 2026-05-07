"use client"

import { useState } from "react"
import { Sparkles, Download, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { toast } from "sonner"

export default function BriefingPage() {
  const [loading, setLoading] = useState(false)
  const [briefing, setBriefing] = useState<string | null>(null)

  const handleGenerate = () => {
    setLoading(true)
    const toastId = toast.loading("Analisando dados e gerando briefing com IA...")
    
    // Mock da geração
    setTimeout(() => {
      setBriefing(`## Briefing: Campanha Black Friday ID Performance\n\n### 1. Objetivo\nAumentar as vendas do e-commerce em 30% durante o mês de novembro.\n\n### 2. Público-Alvo\nHomens e Mulheres, 25-45 anos, interessados em tecnologia e lifestyle.\n\n### 3. Estrutura de Criativos Sugerida\n- **Vídeos Curtos (Reels/TikTok)**: Foco em unboxing e reviews rápidos.\n- **Imagens Estáticas**: Descontos agressivos com cores vibrantes (vermelho/amarelo).\n\n### 4. Orçamento e Canais\n- Budget: R$ 50.000\n- Canais: Meta Ads (60%), Google Ads (40%)`)
      setLoading(false)
      toast.success("Briefing gerado com sucesso!", { id: toastId })
    }, 2000)
  }

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <FileText className="h-4 w-4" />
          Gerador de Pré-Briefing
        </h2>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Dados da Campanha</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Cliente</label>
              <Input placeholder="Nome do Cliente" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Objetivo</label>
              <Input placeholder="Ex: Geração de Leads, Vendas..." />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Público-Alvo</label>
              <Input placeholder="Ex: Mulheres 25-35 anos" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Orçamento</label>
                <Input placeholder="R$ 10.000" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Prazo</label>
                <Input type="date" />
              </div>
            </div>
            <Button className="w-full mt-4" onClick={handleGenerate} disabled={loading}>
              <Sparkles className="mr-2 h-4 w-4" />
              {loading ? "Gerando..." : "Gerar Briefing com IA"}
            </Button>
          </CardContent>
        </Card>

        <Card className="flex flex-col">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Preview do Briefing</CardTitle>
            {briefing && (
              <Button variant="outline" size="sm">
                <Download className="mr-2 h-4 w-4" />
                Exportar PDF
              </Button>
            )}
          </CardHeader>
          <CardContent className="flex-1">
            {briefing ? (
              <div className="bg-muted/30 p-6 rounded-lg h-full prose prose-sm dark:prose-invert max-w-none">
                <pre className="whitespace-pre-wrap font-sans text-sm">{briefing}</pre>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground min-h-[300px] border-2 border-dashed border-muted rounded-lg">
                <FileText className="h-12 w-12 mb-4 opacity-50" />
                <p>Preencha os dados e clique em gerar para ver o preview.</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
