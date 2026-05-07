import { Loader2 } from "lucide-react"

export default function Loading() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-[50vh] text-muted-foreground space-y-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-sm font-medium">Carregando...</p>
    </div>
  )
}
