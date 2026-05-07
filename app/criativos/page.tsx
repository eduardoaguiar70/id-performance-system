/* eslint-disable @typescript-eslint/no-unused-vars, @next/next/no-img-element */
import { Upload, ImageIcon, Sparkles } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export default function CriativosPage() {
  const mockCriativos = [
    { id: 1, url: "https://images.unsplash.com/photo-1557838923-2985c318be48?auto=format&fit=crop&w=400&q=80", type: "image", insights: "Cores vibrantes, CTA claro no centro." },
    { id: 2, url: "https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=400&q=80", type: "image", insights: "Pessoas sorrindo, alta conversão esperada." },
    { id: 3, url: "https://images.unsplash.com/photo-1600880292203-757bb62b4baf?auto=format&fit=crop&w=400&q=80", type: "image", insights: "Estilo minimalista, bom para remarketing." },
  ]

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <ImageIcon className="h-4 w-4" />
          Criativos e IA
        </h2>
        <Button>
          <Sparkles className="mr-2 h-4 w-4" />
          Analisar Padrões com IA
        </Button>
      </div>
      
      <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-12 text-center bg-card">
        <div className="mx-auto flex max-w-[420px] flex-col items-center justify-center text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-full bg-muted">
            <Upload className="h-10 w-10 text-muted-foreground" />
          </div>
          <h3 className="mt-4 text-lg font-semibold">Arraste seus criativos</h3>
          <p className="mb-4 mt-2 text-sm text-muted-foreground">
            Suporta imagens (JPG, PNG) e vídeos (MP4) de até 50MB.
          </p>
          <Button variant="secondary">Selecionar Arquivos</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
        {mockCriativos.map((criativo) => (
          <Card key={criativo.id} className="overflow-hidden">
            <div className="aspect-video relative bg-muted flex items-center justify-center overflow-hidden">
              <img src={criativo.url} alt="Criativo" className="object-cover w-full h-full hover:scale-105 transition-transform duration-300" />
            </div>
            <CardContent className="p-4 bg-card">
              <div className="flex items-center gap-2 mb-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="font-semibold text-sm">Insights da IA</span>
              </div>
              <p className="text-sm text-muted-foreground">{criativo.insights}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
