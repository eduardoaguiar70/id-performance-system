import { Skeleton } from "@/components/ui/skeleton"

export default function InsightsLoading() {
  return (
    <div className="flex flex-col h-[calc(100vh-4rem)]">
      <div className="flex-shrink-0 px-6 py-4 border-b flex items-center gap-3">
        <Skeleton className="h-10 w-10 rounded-full" />
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-36" />
          <Skeleton className="h-3 w-52" />
        </div>
      </div>
      <div className="flex-1 px-6 py-4 space-y-6">
        <div className="flex gap-3">
          <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
          <Skeleton className="h-20 w-80" style={{ borderRadius: "16px" }} />
        </div>
        <div className="grid grid-cols-2 gap-2 max-w-sm">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" style={{ borderRadius: "12px" }} />
          ))}
        </div>
      </div>
      <div className="flex-shrink-0 px-6 py-4 border-t">
        <Skeleton className="h-12 w-full" style={{ borderRadius: "16px" }} />
      </div>
    </div>
  )
}
