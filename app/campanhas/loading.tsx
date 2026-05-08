import { Skeleton } from "@/components/ui/skeleton"

export default function CampanhasLoading() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <div className="flex gap-2">
          <Skeleton className="h-8 w-32" style={{ borderRadius: "2px" }} />
          <Skeleton className="h-8 w-32" style={{ borderRadius: "2px" }} />
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20 w-full" style={{ borderRadius: "2px" }} />
        ))}
      </div>
      <Skeleton className="h-64 w-full" style={{ borderRadius: "2px" }} />
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" style={{ borderRadius: "2px" }} />
        ))}
      </div>
    </div>
  )
}
