import { Skeleton } from "@/components/ui/skeleton"

export default function LeadsLoading() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-8 w-28" style={{ borderRadius: "2px" }} />
      </div>
      <Skeleton className="h-9 w-72" style={{ borderRadius: "2px" }} />
      <div className="space-y-1">
        <Skeleton className="h-10 w-full" style={{ borderRadius: "2px" }} />
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="h-14 w-full" style={{ borderRadius: "2px" }} />
        ))}
      </div>
    </div>
  )
}
