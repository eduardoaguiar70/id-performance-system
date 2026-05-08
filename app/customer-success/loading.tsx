import { Skeleton } from "@/components/ui/skeleton"

export default function CustomerSuccessLoading() {
  return (
    <div className="flex-1 space-y-5 p-8 pt-6">
      <Skeleton className="h-4 w-40" />
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24 w-full" style={{ borderRadius: "2px" }} />
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_420px] gap-4">
        <div className="space-y-2">
          <Skeleton className="h-12 w-full" style={{ borderRadius: "2px" }} />
          {Array.from({ length: 5 }).map((_, i) => (
            <Skeleton key={i} className="h-16 w-full" style={{ borderRadius: "2px" }} />
          ))}
        </div>
        <Skeleton className="h-80 w-full" style={{ borderRadius: "2px" }} />
      </div>
    </div>
  )
}
