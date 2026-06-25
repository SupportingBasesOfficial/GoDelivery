export default function OrdersLoading() {
  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="h-8 w-32 animate-pulse rounded bg-gray-200" />
        <div className="h-10 w-32 animate-pulse rounded bg-gray-200" />
      </div>

      <div className="overflow-hidden rounded-xl bg-white shadow">
        <div className="border-b border-gray-100 bg-gray-50 px-4 py-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="h-9 flex-1 animate-pulse rounded bg-gray-200" />
            <div className="h-9 w-40 animate-pulse rounded bg-gray-200" />
          </div>
        </div>

        <div className="divide-y divide-gray-100">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 px-4 py-4">
              <div className="h-5 w-32 animate-pulse rounded bg-gray-200" />
              <div className="h-5 flex-1 animate-pulse rounded bg-gray-200" />
              <div className="h-5 w-20 animate-pulse rounded bg-gray-200" />
              <div className="h-5 w-24 animate-pulse rounded bg-gray-200" />
              <div className="h-5 w-24 animate-pulse rounded bg-gray-200" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
