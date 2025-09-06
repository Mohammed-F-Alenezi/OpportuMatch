export default function CoverHeader() {
  return (
    <div className="relative overflow-hidden rounded-2xl mb-6">
      <div
        className="h-32 w-full"
        style={{
          background:
            "radial-gradient(1100px 380px at 80% -80%, #25e0a288 0%, transparent 70%), radial-gradient(900px 260px at 20% -50%, #7ee7c899 10%, transparent 70%), linear-gradient(180deg,rgba(255,255,255,.06), transparent)"
        }}
      />
      <div className="absolute inset-0 px-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">بوصلة الممكنات</h1>
          <p className="text-sm text-white/70">دليلك لاكتشاف الفرص وتوجيه رحلة نمو منشأتك</p>
        </div>
        <div className="flex items-center gap-2">
          <input
            placeholder="ابحث هنا…"
            className="rounded-xl bg-white/10 border border-white/15 px-4 py-2 text-sm focus:outline-none placeholder-white/50"
          />
          <div className="rounded-full w-10 h-10 grid place-items-center bg-white/10 border border-white/15 text-sm">
            ل
          </div>
        </div>
      </div>
    </div>
  );
}
