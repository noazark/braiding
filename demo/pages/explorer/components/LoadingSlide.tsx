/** The contents of the slide at the end of the feed while the next braid is being found. */
export function LoadingSlide({ tried }: { tried: number }) {
  return (
    <div className="loadingbox" role="status" aria-busy="true">
      <b>Finding a new braid…</b>
      <div className="weaving" aria-hidden="true">
        <i />
        <i />
        <i />
      </div>
      <span className="tried">
        {tried ? (
          <>
            <strong>{tried.toLocaleString()}</strong> patterns tried
          </>
        ) : (
          "Picking a random setup"
        )}
      </span>
    </div>
  );
}
