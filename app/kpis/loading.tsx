import { Skeleton } from "@/components/ui/skeleton"

export default function KpisLoading() {
  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-40" style={{ borderRadius: "2px" }} />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" style={{ borderRadius: "2px" }} />
        ))}
      </div>
      <Skeleton className="h-72 w-full" style={{ borderRadius: "2px" }} />
      <Skeleton className="h-40 w-full" style={{ borderRadius: "2px" }} />
    </div>
  )
}
