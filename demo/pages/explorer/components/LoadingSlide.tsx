/** The contents of the slide at the end of the feed while the next braid is being found. */
export function LoadingSlide({ tried }: { tried: number }) {
  return (
    <div className="loadingbox" role="status" aria-busy="true">
      <div className="weaving" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <b>Finding a new braid…</b>
      <span>{tried ? `${tried.toLocaleString()} patterns tried` : 'Picking a random setup'}</span>
    </div>
  );
}
