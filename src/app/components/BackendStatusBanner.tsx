import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, RefreshCw } from "lucide-react";

// Tiny banner that probes the backend's CMS routes on mount and after every
// navigation. When the backend is reachable AND has the routes we use, the
// banner is invisible. When something is off, it surfaces a clear, actionable
// message pointing at `./scripts/rebuild-backend.sh` so the operator can fix
// the stale-image symptom without trawling logs.

type Status = "checking" | "healthy" | "missing-routes" | "unreachable" | "unauthenticated";

const probeOnce = async (): Promise<{ status: Status; detail?: string }> => {
  try {
    const res = await fetch("/api/version", { cache: "no-store" });
    if (!res.ok) {
      return { status: "unreachable", detail: `/api/version returned ${res.status}` };
    }
    // /api/version exists → backend image is at least recent enough to ship the
    // diagnostic route. Now verify the public CMS read route exists too.
    const cms = await fetch("/api/public/homepage-content?type=featured-build", { cache: "no-store" });
    if (cms.ok) return { status: "healthy" };
    if (cms.status === 404) return { status: "missing-routes", detail: "/api/public/homepage-content returned 404 — backend image is missing the CMS routes" };
    if (cms.status === 502) return { status: "unreachable", detail: "/api/public/homepage-content returned 502" };
    return { status: "unreachable", detail: `/api/public/homepage-content returned ${cms.status}` };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { status: "unreachable", detail: msg || "fetch failed" };
  }
};

export function BackendStatusBanner() {
  const [status, setStatus] = useState<Status>("checking");
  const [detail, setDetail] = useState<string | undefined>();
  const [dismissed, setDismissed] = useState(false);
  const [probing, setProbing] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const probe = () => {
      setProbing(true);
      probeOnce().then((r) => {
        if (cancelled) return;
        setStatus(r.status);
        setDetail(r.detail);
        setProbing(false);
      });
    };
    probe();
    const id = setInterval(probe, 30_000);
    return () => { cancelled = true; clearInterval(id); };
  }, []);

  if (status === "healthy" || status === "checking" || dismissed) return null;
  if (status === "unauthenticated") return null; // login screen is its own UX

  const isMissing = status === "missing-routes";
  const isUnreachable = status === "unreachable";

  return (
    <div
      data-testid="backend-status-banner"
      style={{
        background: "rgba(255,31,69,0.12)",
        border: "1px solid rgba(255,31,69,0.55)",
        borderRadius: 8,
        padding: "10px 14px",
        margin: "12px 24px 0",
        display: "flex",
        alignItems: "flex-start",
        gap: 12,
        fontFamily: "'Space Grotesk', sans-serif",
        fontSize: 12,
        color: "#ffd6dd",
      }}
    >
      <AlertCircle size={18} color="#ff2f55" style={{ flexShrink: 0, marginTop: 2 }} />
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 700, color: "#ff7888" }}>
          {isMissing ? "Backend is missing the CMS routes" : "Backend is unreachable"}
        </div>
        <div style={{ marginTop: 4, color: "#e9d2d6", lineHeight: 1.5 }}>
          {isMissing
            ? <>Admin saves and publishes won't reach any other device until the backend image is rebuilt with the homepage CMS routes. Run <code style={{ background: "rgba(0,0,0,0.35)", padding: "1px 5px", borderRadius: 4, color: "#fff" }}>npm run fix:backend</code> (or <code style={{ background: "rgba(0,0,0,0.35)", padding: "1px 5px", borderRadius: 4, color: "#fff" }}>bash scripts/rebuild-backend.sh</code>) and try again.</>
            : <>Admin saves and publishes won't reach any other device. Confirm the backend container is running and reachable from your browser. Run <code style={{ background: "rgba(0,0,0,0.35)", padding: "1px 5px", borderRadius: 4, color: "#fff" }}>npm run validate:backend</code> to diagnose. {detail ? <span style={{ display: "block", marginTop: 4, opacity: 0.7 }}>({detail})</span> : null}</>}
        </div>
      </div>
      <button
        onClick={() => {
          setProbing(true);
          probeOnce().then((r) => { setStatus(r.status); setDetail(r.detail); setProbing(false); });
        }}
        title="Re-check now"
        style={{
          background: "rgba(255,255,255,0.06)",
          border: "1px solid rgba(255,255,255,0.12)",
          color: "#fff",
          borderRadius: 6,
          padding: "4px 8px",
          cursor: "pointer",
          display: "inline-flex",
          alignItems: "center",
          gap: 4,
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 11,
        }}
      >
        <RefreshCw size={12} className={probing ? "animate-spin" : ""} />
        Check
      </button>
      <button
        onClick={() => setDismissed(true)}
        title="Dismiss"
        style={{
          background: "transparent",
          border: "none",
          color: "#aaa",
          cursor: "pointer",
          fontSize: 16,
          lineHeight: 1,
          padding: 0,
        }}
      >
        ×
      </button>
    </div>
  );
}