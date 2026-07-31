import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, Cpu, Gauge, HardDrive, MonitorCog, ShieldCheck, Sparkles, Wrench, Zap } from "lucide-react";
import scrollVideo from "@/assets/graphics-card-workbench-scroll.mp4";

const metrics = [
  { label: "Custom builds", value: "240+" },
  { label: "Stress tested", value: "72h" },
  { label: "Parts warranty", value: "1yr" },
];

const serviceCards = [
  { icon: Cpu, title: "GPU First Builds", text: "Performance plans around the graphics card, thermal path, and power budget." },
  { icon: Wrench, title: "Repair Bench", text: "Diagnostics, deep cleaning, thermal paste, upgrades, and component replacement." },
  { icon: Gauge, title: "Tuned Delivery", text: "BIOS, drivers, thermals, fan curves, and benchmark validation before pickup." },
];

const stages = [
  "Select workload",
  "Choose components",
  "Bench test",
  "Cable finish",
  "Deliver ready",
];

function useScrollProgress() {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const max = Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
        setProgress(Math.min(1, Math.max(0, window.scrollY / max)));
      });
    };

    update();
    window.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, []);

  return progress;
}

export default function VideoScrollHomePage() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const progress = useScrollProgress();
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !duration) return;
    const target = Math.min(duration - 0.04, Math.max(0, progress * duration));
    if (Number.isFinite(target) && Math.abs(video.currentTime - target) > 0.04) {
      video.currentTime = target;
    }
  }, [duration, progress]);

  const progressPct = useMemo(() => `${Math.round(progress * 100)}%`, [progress]);

  return (
    <main className="video-home">
      <style>{`
        .video-home{
          --vh-red:#ff2d55;
          --vh-cyan:#56d6ff;
          --vh-amber:#ffb454;
          min-height:460vh;
          color:#fff;
          background:#030405;
          font-family:'Inter',sans-serif;
          position:relative;
          overflow:hidden;
        }
        .video-home-bg{
          position:fixed;
          inset:0;
          z-index:0;
          background:#030405;
        }
        .video-home-bg video{
          width:100%;
          height:100%;
          object-fit:cover;
          filter:saturate(1.18) contrast(1.1) brightness(1.04);
        }
        .video-home-bg::after{
          content:"";
          position:absolute;
          inset:0;
          background:
            linear-gradient(90deg,rgba(3,4,5,.64) 0%,rgba(3,4,5,.32) 46%,rgba(3,4,5,.54) 100%),
            linear-gradient(180deg,rgba(0,0,0,.30),rgba(0,0,0,.40));
          pointer-events:none;
        }
        .video-home-scan{
          position:fixed;
          inset:0;
          z-index:1;
          pointer-events:none;
          opacity:.28;
          background-image:linear-gradient(rgba(255,255,255,.035) 1px,transparent 1px);
          background-size:100% 7px;
          mix-blend-mode:screen;
        }
        .video-home-nav{
          position:fixed;
          top:0;
          left:0;
          right:0;
          z-index:10;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:18px;
          padding:18px clamp(18px,4vw,56px);
          background:linear-gradient(180deg,rgba(3,4,5,.74),rgba(3,4,5,0));
        }
        .video-home-brand{
          display:flex;
          align-items:center;
          gap:10px;
          color:#fff;
          text-decoration:none;
          font-family:'Orbitron',sans-serif;
          font-weight:900;
          letter-spacing:4px;
          font-size:14px;
        }
        .video-home-mark{
          width:34px;
          height:34px;
          border:1px solid rgba(255,255,255,.24);
          display:grid;
          place-items:center;
          background:rgba(255,255,255,.06);
          box-shadow:0 0 28px rgba(255,45,85,.24);
        }
        .video-home-links{
          display:flex;
          align-items:center;
          gap:8px;
        }
        .video-home-link{
          color:rgba(255,255,255,.76);
          text-decoration:none;
          font-size:11px;
          font-weight:700;
          letter-spacing:1.6px;
          text-transform:uppercase;
          padding:10px 12px;
          border:1px solid rgba(255,255,255,.11);
          background:rgba(5,7,9,.32);
          backdrop-filter:blur(16px);
        }
        .video-home-link.primary{
          color:#fff;
          border-color:rgba(255,45,85,.62);
          background:rgba(255,45,85,.14);
        }
        .video-home-progress{
          position:fixed;
          left:0;
          top:0;
          height:2px;
          width:var(--progress);
          z-index:30;
          background:linear-gradient(90deg,var(--vh-red),var(--vh-cyan));
          box-shadow:0 0 18px rgba(86,214,255,.65);
        }
        .video-home-content{
          position:relative;
          z-index:2;
        }
        .video-home-panel{
          min-height:100vh;
          display:grid;
          align-items:center;
          padding:118px clamp(20px,5vw,72px) 72px;
        }
        .video-home-panel.end{align-items:end;}
        .video-home-copy{
          width:min(760px,100%);
        }
        .video-home-kicker{
          display:inline-flex;
          align-items:center;
          gap:9px;
          color:#ffd9df;
          background:rgba(255,45,85,.15);
          border:1px solid rgba(255,45,85,.34);
          padding:8px 12px;
          font-size:10px;
          font-weight:800;
          letter-spacing:2.2px;
          text-transform:uppercase;
          margin-bottom:18px;
          backdrop-filter:blur(18px);
        }
        .video-home h1{
          font-family:'Orbitron',sans-serif;
          font-size:clamp(42px,8vw,104px);
          line-height:.92;
          letter-spacing:0;
          margin:0 0 22px;
          text-transform:uppercase;
          text-shadow:0 20px 80px rgba(0,0,0,.65);
        }
        .video-home h2{
          font-family:'Orbitron',sans-serif;
          font-size:clamp(30px,5vw,68px);
          line-height:1;
          letter-spacing:0;
          margin:0 0 18px;
          text-transform:uppercase;
        }
        .video-home p{
          max-width:650px;
          color:rgba(255,255,255,.78);
          font-family:'Space Grotesk',sans-serif;
          font-size:clamp(15px,1.5vw,19px);
          line-height:1.72;
          margin:0;
        }
        .video-home-actions{
          display:flex;
          align-items:center;
          gap:12px;
          flex-wrap:wrap;
          margin-top:30px;
        }
        .video-home-btn{
          display:inline-flex;
          align-items:center;
          justify-content:center;
          gap:9px;
          min-height:46px;
          padding:0 20px;
          color:#fff;
          text-decoration:none;
          border:1px solid rgba(255,255,255,.18);
          background:rgba(255,255,255,.07);
          backdrop-filter:blur(18px);
          font-family:'Orbitron',sans-serif;
          font-size:11px;
          font-weight:800;
          letter-spacing:1.2px;
          text-transform:uppercase;
        }
        .video-home-btn.primary{
          border-color:rgba(255,45,85,.72);
          background:linear-gradient(135deg,rgba(255,45,85,.34),rgba(86,214,255,.12));
          box-shadow:0 0 36px rgba(255,45,85,.22);
        }
        .video-home-metrics{
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          gap:10px;
          width:min(620px,100%);
          margin-top:42px;
        }
        .video-home-metric,
        .video-home-card,
        .video-home-stage,
        .video-home-final-card{
          border:1px solid rgba(255,255,255,.14);
          background:rgba(4,6,8,.46);
          backdrop-filter:blur(22px) saturate(160%);
          box-shadow:0 20px 70px rgba(0,0,0,.28);
        }
        .video-home-metric{
          padding:15px;
        }
        .video-home-metric strong{
          display:block;
          font-family:'Orbitron',sans-serif;
          font-size:24px;
          color:#fff;
          margin-bottom:5px;
        }
        .video-home-metric span{
          color:rgba(255,255,255,.58);
          font-size:11px;
          letter-spacing:1.2px;
          text-transform:uppercase;
        }
        .video-home-card-grid{
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          gap:14px;
          width:min(1040px,100%);
          margin-top:34px;
        }
        .video-home-card{
          min-height:220px;
          padding:22px;
          display:flex;
          flex-direction:column;
          justify-content:space-between;
        }
        .video-home-card svg{color:var(--vh-cyan);}
        .video-home-card h3{
          font-family:'Orbitron',sans-serif;
          font-size:15px;
          letter-spacing:0;
          margin:18px 0 10px;
        }
        .video-home-card p{
          font-size:13px;
          line-height:1.6;
          color:rgba(255,255,255,.66);
        }
        .video-home-stage-row{
          display:grid;
          grid-template-columns:repeat(5,minmax(0,1fr));
          gap:10px;
          width:min(1120px,100%);
          margin-top:32px;
        }
        .video-home-stage{
          min-height:116px;
          padding:16px;
          display:flex;
          flex-direction:column;
          justify-content:space-between;
        }
        .video-home-stage b{
          color:var(--vh-red);
          font-family:'Orbitron',sans-serif;
          font-size:13px;
        }
        .video-home-stage span{
          color:#fff;
          font-size:13px;
          font-weight:800;
          line-height:1.35;
        }
        .video-home-final{
          display:grid;
          grid-template-columns:minmax(280px,680px) minmax(260px,380px);
          gap:20px;
          align-items:end;
          width:min(1120px,100%);
        }
        .video-home-final-card{
          padding:22px;
        }
        .video-home-spec{
          display:flex;
          justify-content:space-between;
          gap:16px;
          padding:13px 0;
          border-bottom:1px solid rgba(255,255,255,.09);
          color:rgba(255,255,255,.72);
          font-family:'Space Grotesk',sans-serif;
          font-size:13px;
        }
        .video-home-spec strong{color:#fff;}
        @media (max-width:900px){
          .video-home-links{display:none;}
          .video-home-panel{padding:104px 20px 58px;}
          .video-home-metrics,
          .video-home-card-grid,
          .video-home-stage-row,
          .video-home-final{grid-template-columns:1fr;}
          .video-home-card{min-height:180px;}
          .video-home h1{font-size:clamp(40px,14vw,72px);}
        }
      `}</style>

      <div className="video-home-bg" aria-hidden="true">
        <video
          ref={videoRef}
          src={scrollVideo}
          muted
          playsInline
          preload="auto"
          onLoadedMetadata={(event) => setDuration(event.currentTarget.duration || 0)}
        />
      </div>
      <div className="video-home-scan" aria-hidden="true" />
      <div className="video-home-progress" style={{ "--progress": progressPct } as CSSProperties} />

      <nav className="video-home-nav" aria-label="Primary">
        <a className="video-home-brand" href="/">
          <span className="video-home-mark"><Zap size={17} /></span>
          DESKTO
        </a>
        <div className="video-home-links">
          <a className="video-home-link" href="/products">Products</a>
          <a className="video-home-link" href="/services">Services</a>
          <a className="video-home-link" href="/sign-in">Sign In</a>
          <a className="video-home-link primary" href="/dashboard/customer">Dashboard</a>
        </div>
      </nav>

      <div className="video-home-content">
        <section className="video-home-panel">
          <div className="video-home-copy">
            <div className="video-home-kicker"><Sparkles size={14} /> Scroll-built performance lab</div>
            <h1>Graphics Power, Built On The Bench.</h1>
            <p>
              DESKTO turns high-end PC parts into reliable gaming, creator, and workstation machines. Scroll through the build flow and watch the hardware reveal drive the page.
            </p>
            <div className="video-home-actions">
              <a className="video-home-btn primary" href="/products/gaming">Shop Gaming <ArrowRight size={15} /></a>
              <a className="video-home-btn" href="/services/custom-pc">Start A Build</a>
            </div>
            <div className="video-home-metrics">
              {metrics.map((item) => (
                <div className="video-home-metric" key={item.label}>
                  <strong>{item.value}</strong>
                  <span>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="video-home-panel">
          <div>
            <div className="video-home-kicker"><MonitorCog size={14} /> Workbench services</div>
            <h2>Every Frame Needs Stable Hardware.</h2>
            <p>
              The homepage now follows the same visual language as the video: dark glass, precise highlights, compact controls, and readable white typography over a lighter cinematic overlay.
            </p>
            <div className="video-home-card-grid">
              {serviceCards.map(({ icon: Icon, title, text }) => (
                <article className="video-home-card" key={title}>
                  <div>
                    <Icon size={28} />
                    <h3>{title}</h3>
                    <p>{text}</p>
                  </div>
                  <ArrowRight size={18} />
                </article>
              ))}
            </div>
          </div>
        </section>

        <section className="video-home-panel">
          <div>
            <div className="video-home-kicker"><HardDrive size={14} /> Scroll sequence</div>
            <h2>From Loose Parts To A Ready Machine.</h2>
            <p>
              The video frame responds to page scroll, creating a smooth reveal while the content stays restrained and readable across desktop and mobile.
            </p>
            <div className="video-home-stage-row">
              {stages.map((stage, index) => (
                <div className="video-home-stage" key={stage}>
                  <b>0{index + 1}</b>
                  <span>{stage}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="video-home-panel end">
          <div className="video-home-final">
            <div>
              <div className="video-home-kicker"><ShieldCheck size={14} /> DESKTO validation</div>
              <h2>Built To Boot Clean, Run Cool, And Look Sharp.</h2>
              <p>
                Keep exploring the shop, book a service, or sign in to manage orders and requests. The old homepage sections are no longer shown on the landing page.
              </p>
              <div className="video-home-actions">
                <a className="video-home-btn primary" href="/services">Book Service <ArrowRight size={15} /></a>
                <a className="video-home-btn" href="/products">View Products</a>
              </div>
            </div>
            <aside className="video-home-final-card">
              <div className="video-home-spec"><span>Overlay</span><strong>Brighter dark</strong></div>
              <div className="video-home-spec"><span>Motion</span><strong>Scroll synced</strong></div>
              <div className="video-home-spec"><span>Frame</span><strong>GPU bench</strong></div>
              <div className="video-home-spec"><span>UI</span><strong>Glass + neon</strong></div>
            </aside>
          </div>
        </section>
      </div>
    </main>
  );
}
