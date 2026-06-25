export default function ArticleLoading() {
  return (
    <div
      className="container mx-auto animate-pulse px-4 py-6"
      aria-busy
      aria-label="Chargement de l'article"
    >
      <div className="grid gap-8 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="aspect-[16/10] rounded-2xl bg-muted/50 md:aspect-[16/9]" />
          <div className="space-y-3 px-1">
            <div className="h-4 w-24 rounded bg-muted/40" />
            <div className="h-8 w-full rounded bg-muted/50" />
            <div className="h-8 w-4/5 rounded bg-muted/50" />
            <div className="h-4 w-48 rounded bg-muted/30" />
          </div>
          <div className="space-y-3 pt-4">
            <div className="h-4 w-full rounded bg-muted/30" />
            <div className="h-4 w-full rounded bg-muted/30" />
            <div className="h-4 w-5/6 rounded bg-muted/30" />
            <div className="h-4 w-full rounded bg-muted/30" />
            <div className="h-4 w-2/3 rounded bg-muted/30" />
          </div>
        </div>
        <aside className="hidden space-y-6 lg:block">
          <div className="h-64 rounded-xl bg-muted/40" />
          <div className="h-48 rounded-xl bg-muted/30" />
        </aside>
      </div>
    </div>
  );
}
