import { LeadsTable } from "@/components/leads/leads-table"
import { Users } from "lucide-react"

export default function LeadsPage() {
  return (
    <div className="flex-1 space-y-6 p-6 pt-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <Users className="h-4 w-4 text-muted-foreground" />
        <h1 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
          Leads · Scraper Instagram
        </h1>
      </div>

      {/* Tabela principal */}
      <LeadsTable />
    </div>
  )
}
