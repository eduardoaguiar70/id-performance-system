import { Skeleton } from "@/components/ui/skeleton"

export default function DashboardLoading() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <Skeleton className="h-4 w-48" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" style={{ borderRadius: "2px" }} />
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-64 w-full" style={{ borderRadius: "2px" }} />
        <Skeleton className="h-64 w-full" style={{ borderRadius: "2px" }} />
      </div>
      <Skeleton className="h-48 w-full" style={{ borderRadius: "2px" }} />
    </div>
  )
}
