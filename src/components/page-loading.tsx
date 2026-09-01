// Shared route loading.tsx UI. Deliberately plain: earlier skeletons were
// shaped per-route (grids, hero blocks), but any route without its own
// loading.tsx fell back to the home page's skeleton — which showed up
// mismatched (hero/rail shapes) on completely unrelated pages like Account.
// One neutral, content-agnostic screen everywhere sidesteps that mismatch
// entirely and reads as calmer than a wall of gray placeholder blocks.
// Fades in (see the page-loading-fade-in keyframe in globals.css) so a slow
// navigation feels like a deliberate dim, not a flash.
export function PageLoading() {
  return (
    <main
      className="flex min-h-[70vh] w-full items-center justify-center"
      style={{ animation: "page-loading-fade-in 0.4s ease-out" }}
    >
      <div className="h-1.5 w-1.5 animate-pulse rounded-full bg-line" />
    </main>
  );
}
