export default function PageLoading() {
  return (
    <main
      className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-6"
      role="status"
      aria-label="กำลังโหลดข้อมูล"
      aria-busy="true"
    >
      <span className="sr-only">กำลังโหลดข้อมูล…</span>
      <div className="animate-pulse space-y-6" aria-hidden="true">
        <div className="bg-muted h-5 w-32 rounded" />
        <div className="bg-muted h-9 w-48 rounded" />
        <div className="bg-muted h-14 rounded-xl" />
        <div className="border-input space-y-4 rounded-xl border p-5">
          <div className="bg-muted h-6 w-40 rounded" />
          <div className="bg-muted h-40 rounded-lg" />
        </div>
      </div>
    </main>
  );
}
