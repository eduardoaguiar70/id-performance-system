import { Skeleton } from "@/components/ui/skeleton"

export default function TarefasLoading() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-28" style={{ borderRadius: "2px" }} />
          <Skeleton className="h-8 w-28" style={{ borderRadius: "2px" }} />
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Skeleton className="h-6 w-24" style={{ borderRadius: "2px" }} />
            {Array.from({ length: 3 }).map((_, j) => (
              <Skeleton key={j} className="h-20 w-full" style={{ borderRadius: "2px" }} />
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
