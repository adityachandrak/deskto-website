import { useEffect, useMemo, useRef, useState, type CSSProperties, type FormEvent } from "react";
import { ArrowRight, Cpu, ExternalLink, Gauge, HardDrive, HelpCircle, MessageSquareText, Minus, MonitorCog, Newspaper, Plus, Quote, Send, ShieldCheck, Sparkles, Wrench, Zap } from "lucide-react";
import scrollVideo from "@/assets/graphics-card-workbench-scroll.mp4";
import { homepageContentApi, servicesApi, type HomepageContentItem, type HomepageContentType } from "@/app/lib/api";
import { useCurrentUser } from "@/app/lib/currentUser";
import { toast } from "sonner";

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

const adminRoutes: Record<HomepageContentType | "quick-enquiries", string> = {
  "featured-build": "/dashboard/admin#featured-builds",
  offer: "/dashboard/admin#exclusive-offers",
  "gaming-news": "/dashboard/admin#gaming-news",
  testimonial: "/dashboard/admin#testimonials",
  faq: "/dashboard/admin#faq",
  "quick-enquiries": "/dashboard/admin#quick-enquiries",
};

const defaultCmsImage = "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=900&h=600&fit=crop&auto=format";

const fallbackContent: Record<HomepageContentType, HomepageContentItem[]> = {
  "featured-build": [
    {
      id: "fallback-build-phantom",
      type: "featured-build",
      slug: "phantom-rtx-signature",
      title: "Phantom RTX Signature",
      category: "4K Gaming Build",
      shortDescription: "RTX-class graphics, airflow tuned casework, and benchmark-ready delivery.",
      specs: "RTX GPU · Liquid cooling · 72h stress test",
      coverImage: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=900&h=600&fit=crop&auto=format",
    },
    {
      id: "fallback-build-studio",
      type: "featured-build",
      slug: "creator-studio-pro",
      title: "Creator Studio Pro",
      category: "Workstation",
      shortDescription: "A quiet creator tower for editing, rendering, streaming, and AI workflows.",
      specs: "High-core CPU · 64GB RAM · Silent profile",
      coverImage: "https://images.unsplash.com/photo-1593640408182-31c228a7e5e1?w=900&h=600&fit=crop&auto=format",
    },
  ],
  offer: [
    {
      id: "fallback-offer-upgrade",
      type: "offer",
      slug: "gpu-upgrade-week",
      title: "GPU Upgrade Week",
      category: "Limited Offer",
      shortDescription: "Bundle pricing on selected graphics card upgrades and thermal service.",
      discount: "Save up to 18%",
      bannerImage: "https://images.unsplash.com/photo-1591489378430-ef2f4c626b35?w=900&h=600&fit=crop&auto=format",
    },
    {
      id: "fallback-offer-service",
      type: "offer",
      slug: "clean-and-tune",
      title: "Clean And Tune Combo",
      category: "Service Bundle",
      shortDescription: "Deep clean, thermal paste, driver update, and fan curve optimization.",
      discount: "Flat service deal",
      bannerImage: "https://images.unsplash.com/photo-1518770660439-4636190af475?w=900&h=600&fit=crop&auto=format",
    },
  ],
  "gaming-news": [
    {
      id: "fallback-news-bench",
      type: "gaming-news",
      slug: "gpu-bench-notes",
      title: "How DESKTO Bench Tests A Graphics Card Before Delivery",
      category: "Hardware",
      shortDescription: "A quick look at thermals, stability runs, driver checks, and frame pacing.",
      coverImage: "https://images.unsplash.com/photo-1563770660941-20978e870e26?w=900&h=600&fit=crop&auto=format",
    },
    {
      id: "fallback-news-build",
      type: "gaming-news",
      slug: "balanced-gaming-pc",
      title: "Why A Balanced Gaming PC Beats A Parts-List Flex",
      category: "Build Guide",
      shortDescription: "Power delivery, thermals, memory, and storage choices matter as much as the GPU.",
      coverImage: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=900&h=600&fit=crop&auto=format",
    },
  ],
  testimonial: [
    {
      id: "fallback-review-arjun",
      type: "testimonial",
      slug: "arjun-mehta-review",
      title: "Arjun Mehta",
      category: "Pro Gamer",
      body: "DESKTO delivered a clean, quiet build that holds boost clocks even during long tournament sessions.",
      thumbnailImage: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&auto=format",
    },
    {
      id: "fallback-review-priya",
      type: "testimonial",
      slug: "priya-sharma-review",
      title: "Priya Sharma",
      category: "Creator",
      body: "The team mapped the workstation around my render workload and the final machine feels incredibly stable.",
      thumbnailImage: "https://images.unsplash.com/photo-1494790108755-2616b612b786?w=120&h=120&fit=crop&auto=format",
    },
  ],
  faq: [
    {
      id: "fallback-faq-build-time",
      type: "faq",
      slug: "custom-build-time",
      title: "How long does a custom PC build take?",
      body: "Most builds take 3 to 5 working days including assembly, cable management, OS setup, driver installation, and stability testing.",
    },
    {
      id: "fallback-faq-warranty",
      type: "faq",
      slug: "custom-build-warranty",
      title: "Do custom builds include warranty?",
      body: "Yes. DESKTO builds include service support, and individual components retain their manufacturer warranty.",
    },
    {
      id: "fallback-faq-enquiry",
      type: "faq",
      slug: "quick-enquiry-routing",
      title: "Where do instant enquiries go?",
      body: "Instant enquiries create a backend service request that admins and staff can review from the Quick Enquiries dashboard.",
    },
  ],
};

function contentImage(item: HomepageContentItem) {
  return item.bannerImage || item.coverImage || item.thumbnailImage || item.gallery?.[0] || defaultCmsImage;
}

function contentHref(item: HomepageContentItem) {
  return item.slug ? `/services/gaming-hub/${item.slug}` : "/services/gaming-hub";
}

function useHomepageContent(type: HomepageContentType) {
  const [items, setItems] = useState<HomepageContentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [source, setSource] = useState<"api" | "fallback">("fallback");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    homepageContentApi.list({ type })
      .then((rows) => {
        if (cancelled) return;
        setItems(Array.isArray(rows) && rows.length ? rows : fallbackContent[type]);
        setSource(Array.isArray(rows) && rows.length ? "api" : "fallback");
      })
      .catch((error) => {
        if (!cancelled) {
          console.warn(`[video-home ${type}] CMS load failed`, error);
          setItems(fallbackContent[type]);
          setSource("fallback");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [type]);

  return { items, loading, source };
}

function SectionTitle({ eyebrow, title, accent, adminHref, isAdmin }: { eyebrow: string; title: string; accent: string; adminHref?: string; isAdmin: boolean }) {
  return (
    <div className="video-section-head">
      <div>
        <div className="video-home-kicker"><Sparkles size={14} /> {eyebrow}</div>
        <h2>{title} <span>{accent}</span></h2>
      </div>
      {isAdmin && adminHref && (
        <a className="video-home-admin-link" href={adminHref}>
          Manage <ExternalLink size={13} />
        </a>
      )}
    </div>
  );
}

function FeaturedBuilds({ isAdmin }: { isAdmin: boolean }) {
  const { items, loading, source } = useHomepageContent("featured-build");
  return (
    <section className="video-home-section" id="featured-builds">
      <SectionTitle eyebrow="Admin CMS synced" title="Featured" accent="Builds" adminHref={adminRoutes["featured-build"]} isAdmin={isAdmin} />
      <div className="video-home-card-grid video-home-card-grid-2">
        {items.slice(0, 4).map((item) => (
          <article className="video-home-cms-card" key={item.id}>
            <img src={contentImage(item)} alt={item.title} />
            <div className="video-home-cms-shade" />
            <div className="video-home-cms-body">
              <span>{item.category || "Signature Build"}</span>
              <h3>{item.title}</h3>
              <p>{item.shortDescription || item.specs || "Published from Admin Homepage > Featured Builds."}</p>
              <div className="video-home-cms-actions">
                <a className="video-home-btn primary" href={contentHref(item)}>Details <ArrowRight size={14} /></a>
                <a className="video-home-btn" href="#instant-enquiry">Enquire</a>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="video-home-source">{loading ? "Loading featured builds..." : source === "api" ? "Live from Admin Featured Builds" : "Showing fallback until admin publishes content"}</div>
    </section>
  );
}

function ExclusiveOffers({ isAdmin }: { isAdmin: boolean }) {
  const { items, loading, source } = useHomepageContent("offer");
  return (
    <section className="video-home-section" id="exclusive-offers">
      <SectionTitle eyebrow="Customer campaigns" title="Exclusive" accent="Offers" adminHref={adminRoutes.offer} isAdmin={isAdmin} />
      <div className="video-home-offer-grid">
        {items.slice(0, 3).map((item) => (
          <article className="video-home-offer" key={item.id}>
            <img src={contentImage(item)} alt={item.title} />
            <div>
              <span>{item.discount || item.category || "Limited Offer"}</span>
              <h3>{item.title}</h3>
              <p>{item.shortDescription || item.offerDetails || "Published from Admin Homepage > Exclusive Offers."}</p>
              <a className="video-home-btn primary" href={item.ctaHref || contentHref(item)}>{item.ctaText || "View Offer"} <ArrowRight size={14} /></a>
            </div>
          </article>
        ))}
      </div>
      <div className="video-home-source">{loading ? "Loading offers..." : source === "api" ? "Live from Admin Exclusive Offers" : "Showing fallback until admin publishes content"}</div>
    </section>
  );
}

function GamingNews({ isAdmin }: { isAdmin: boolean }) {
  const { items, loading, source } = useHomepageContent("gaming-news");
  return (
    <section className="video-home-section" id="gaming-news">
      <SectionTitle eyebrow="Gaming hub" title="Gaming" accent="News" adminHref={adminRoutes["gaming-news"]} isAdmin={isAdmin} />
      <div className="video-home-news-grid">
        {items.slice(0, 3).map((item) => (
          <a className="video-home-news" href={contentHref(item)} key={item.id}>
            <img src={contentImage(item)} alt={item.title} />
            <div>
              <span><Newspaper size={13} /> {item.category || "Gaming News"}</span>
              <h3>{item.title}</h3>
              <p>{item.shortDescription || item.intro || "Read the full article from the DESKTO Gaming Hub."}</p>
            </div>
          </a>
        ))}
      </div>
      <div className="video-home-source">{loading ? "Loading gaming news..." : source === "api" ? "Live from Admin Gaming News" : "Showing fallback until admin publishes content"}</div>
    </section>
  );
}

function Testimonials({ isAdmin }: { isAdmin: boolean }) {
  const { items, loading, source } = useHomepageContent("testimonial");
  return (
    <section className="video-home-section" id="testimonials">
      <SectionTitle eyebrow="Customer proof" title="Verified" accent="Testimonials" adminHref={adminRoutes.testimonial} isAdmin={isAdmin} />
      <div className="video-home-testimonial-grid">
        {items.slice(0, 4).map((item) => (
          <article className="video-home-testimonial" key={item.id}>
            <Quote size={24} />
            <p>{item.body || item.shortDescription || "Published from Admin Homepage > Testimonials."}</p>
            <div>
              <img src={contentImage(item) || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop&auto=format"} alt={item.title} />
              <span><b>{item.title}</b>{item.category || "Verified customer"}</span>
            </div>
          </article>
        ))}
      </div>
      <div className="video-home-source">{loading ? "Loading testimonials..." : source === "api" ? "Live from Admin Testimonials" : "Showing fallback until admin publishes content"}</div>
    </section>
  );
}

function FAQ({ isAdmin }: { isAdmin: boolean }) {
  const { items, loading, source } = useHomepageContent("faq");
  const [open, setOpen] = useState(0);
  return (
    <section className="video-home-section video-home-section-narrow" id="faq">
      <SectionTitle eyebrow="Support answers" title="Frequently Asked" accent="Questions" adminHref={adminRoutes.faq} isAdmin={isAdmin} />
      <div className="video-home-faq-list">
        {items.slice(0, 6).map((item, index) => (
          <article className="video-home-faq" key={item.id}>
            <button type="button" onClick={() => setOpen(open === index ? -1 : index)}>
              <span><HelpCircle size={16} /> {item.title}</span>
              {open === index ? <Minus size={16} /> : <Plus size={16} />}
            </button>
            {open === index && <p>{item.body || item.shortDescription || "Published from Admin Homepage > FAQ."}</p>}
          </article>
        ))}
      </div>
      <div className="video-home-source">{loading ? "Loading FAQ..." : source === "api" ? "Live from Admin FAQ" : "Showing fallback until admin publishes content"}</div>
    </section>
  );
}

function InstantEnquiry({ isAdmin }: { isAdmin: boolean }) {
  const [form, setForm] = useState({ name: "", contact: "", serviceNeeded: "", requirements: "" });
  const [submitting, setSubmitting] = useState(false);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const payload = {
      name: form.name.trim(),
      contact: form.contact.trim(),
      serviceNeeded: form.serviceNeeded.trim(),
      requirements: form.requirements.trim(),
    };
    if (payload.name.length < 2) return toast.error("Please enter your name.");
    if (payload.contact.length < 5) return toast.error("Please enter your phone or email.");
    if (payload.serviceNeeded.length < 2) return toast.error("Please enter the service needed.");
    setSubmitting(true);
    try {
      const created = await servicesApi.createQuickEnquiry(payload);
      toast.success(`Enquiry ${created.serviceNumber} submitted. Our team will contact you shortly.`);
      setForm({ name: "", contact: "", serviceNeeded: "", requirements: "" });
    } catch (error) {
      console.warn("[video-home enquiry] submit failed", error);
      toast.error("Could not submit enquiry. Please retry.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="video-home-section video-home-enquiry-section" id="instant-enquiry">
      <div>
        <SectionTitle eyebrow="Routed to operations" title="Instant" accent="Enquiry" adminHref={adminRoutes["quick-enquiries"]} isAdmin={isAdmin} />
        <p className="video-home-section-copy">
          Send a build, repair, upgrade, or service request from the customer website. It creates a backend quick-enquiry record for Admin and Staff follow-up.
        </p>
      </div>
      <form className="video-home-enquiry" onSubmit={submit}>
        <label>
          Name
          <input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} autoComplete="name" />
        </label>
        <label>
          Phone / Email
          <input value={form.contact} onChange={(event) => setForm((prev) => ({ ...prev, contact: event.target.value }))} autoComplete="email" />
        </label>
        <label>
          Service Needed
          <input value={form.serviceNeeded} onChange={(event) => setForm((prev) => ({ ...prev, serviceNeeded: event.target.value }))} placeholder="Custom PC, repair, GPU upgrade..." />
        </label>
        <label>
          Requirements
          <textarea value={form.requirements} onChange={(event) => setForm((prev) => ({ ...prev, requirements: event.target.value }))} rows={4} />
        </label>
        <button className="video-home-btn primary" type="submit" disabled={submitting}>
          {submitting ? "Sending..." : "Send Enquiry"} <Send size={14} />
        </button>
        <div className="video-home-source"><MessageSquareText size={13} /> Admin route: Quick Enquiries</div>
      </form>
    </section>
  );
}

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
  const currentUser = useCurrentUser();
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
  const isAdmin = currentUser?.role === "admin";

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
          filter:saturate(1.24) contrast(1.12) brightness(1.16);
        }
        .video-home-bg::after{
          content:"";
          position:absolute;
          inset:0;
          background:
            linear-gradient(90deg,rgba(3,4,5,.56) 0%,rgba(3,4,5,.24) 46%,rgba(3,4,5,.46) 100%),
            linear-gradient(180deg,rgba(0,0,0,.22),rgba(0,0,0,.32));
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
        .video-home-card-grid-2{grid-template-columns:repeat(2,minmax(0,1fr));}
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
        .video-home-section{
          min-height:100vh;
          display:grid;
          align-content:center;
          gap:28px;
          padding:118px clamp(20px,5vw,72px) 72px;
          position:relative;
        }
        .video-home-section-narrow{
          width:min(980px,100%);
          margin:0 auto;
        }
        .video-section-head{
          display:flex;
          align-items:end;
          justify-content:space-between;
          gap:18px;
          width:min(1180px,100%);
        }
        .video-section-head h2 span{color:var(--vh-red);}
        .video-home-admin-link{
          display:inline-flex;
          align-items:center;
          gap:8px;
          color:#dff8ff;
          text-decoration:none;
          border:1px solid rgba(86,214,255,.36);
          background:rgba(86,214,255,.08);
          padding:10px 12px;
          font-family:'Orbitron',sans-serif;
          font-size:10px;
          font-weight:800;
          letter-spacing:1.4px;
          text-transform:uppercase;
          backdrop-filter:blur(18px);
        }
        .video-home-cms-card,
        .video-home-offer,
        .video-home-news,
        .video-home-testimonial,
        .video-home-faq,
        .video-home-enquiry{
          border:1px solid rgba(255,255,255,.15);
          background:rgba(4,6,8,.50);
          backdrop-filter:blur(22px) saturate(160%);
          box-shadow:0 20px 70px rgba(0,0,0,.30);
        }
        .video-home-cms-card{
          min-height:360px;
          position:relative;
          overflow:hidden;
          display:flex;
          align-items:end;
        }
        .video-home-cms-card img,
        .video-home-offer img,
        .video-home-news img{
          width:100%;
          height:100%;
          object-fit:cover;
        }
        .video-home-cms-card > img{
          position:absolute;
          inset:0;
          filter:brightness(.82) saturate(1.12);
          transform:scale(1.01);
        }
        .video-home-cms-shade{
          position:absolute;
          inset:0;
          background:linear-gradient(180deg,rgba(3,4,5,.08),rgba(3,4,5,.86));
        }
        .video-home-cms-body{
          position:relative;
          z-index:1;
          padding:24px;
          width:100%;
        }
        .video-home-cms-body span,
        .video-home-offer span,
        .video-home-news span,
        .video-home-source{
          color:var(--vh-cyan);
          font-family:'Space Grotesk',sans-serif;
          font-size:11px;
          font-weight:800;
          letter-spacing:1.3px;
          text-transform:uppercase;
        }
        .video-home-cms-body h3,
        .video-home-offer h3,
        .video-home-news h3{
          font-family:'Orbitron',sans-serif;
          color:#fff;
          font-size:clamp(18px,2.4vw,30px);
          line-height:1.08;
          margin:10px 0;
        }
        .video-home-cms-body p,
        .video-home-offer p,
        .video-home-news p,
        .video-home-testimonial p,
        .video-home-section-copy{
          color:rgba(255,255,255,.74);
          font-family:'Space Grotesk',sans-serif;
          font-size:14px;
          line-height:1.7;
          max-width:680px;
        }
        .video-home-cms-actions{
          display:flex;
          gap:10px;
          flex-wrap:wrap;
          margin-top:18px;
        }
        .video-home-source{
          display:inline-flex;
          align-items:center;
          gap:8px;
          color:rgba(255,255,255,.46);
          text-transform:none;
          letter-spacing:.4px;
          font-weight:600;
        }
        .video-home-offer-grid,
        .video-home-news-grid,
        .video-home-testimonial-grid{
          display:grid;
          grid-template-columns:repeat(3,minmax(0,1fr));
          gap:14px;
          width:min(1180px,100%);
        }
        .video-home-offer{
          min-height:390px;
          overflow:hidden;
        }
        .video-home-offer img{
          height:170px;
          filter:brightness(.82) saturate(1.15);
        }
        .video-home-offer > div{padding:22px;}
        .video-home-news{
          color:inherit;
          text-decoration:none;
          overflow:hidden;
          min-height:380px;
          display:flex;
          flex-direction:column;
        }
        .video-home-news img{height:170px;filter:brightness(.78) saturate(1.1);}
        .video-home-news > div{padding:20px;}
        .video-home-news span{display:flex;align-items:center;gap:8px;}
        .video-home-testimonial{
          min-height:260px;
          padding:22px;
          display:flex;
          flex-direction:column;
          justify-content:space-between;
        }
        .video-home-testimonial svg{color:var(--vh-red);}
        .video-home-testimonial > div{
          display:flex;
          align-items:center;
          gap:10px;
          margin-top:18px;
        }
        .video-home-testimonial img{
          width:42px;
          height:42px;
          border-radius:50%;
          object-fit:cover;
          border:1px solid rgba(86,214,255,.42);
        }
        .video-home-testimonial span{
          display:grid;
          gap:2px;
          color:rgba(255,255,255,.56);
          font-family:'Space Grotesk',sans-serif;
          font-size:12px;
        }
        .video-home-testimonial b{
          color:#fff;
          font-family:'Orbitron',sans-serif;
          font-size:11px;
        }
        .video-home-faq-list{
          display:grid;
          gap:10px;
        }
        .video-home-faq{
          overflow:hidden;
        }
        .video-home-faq button{
          width:100%;
          min-height:62px;
          border:0;
          background:transparent;
          color:#fff;
          display:flex;
          align-items:center;
          justify-content:space-between;
          gap:16px;
          padding:0 18px;
          cursor:pointer;
          text-align:left;
          font-family:'Space Grotesk',sans-serif;
          font-size:15px;
          font-weight:800;
        }
        .video-home-faq button span{
          display:flex;
          align-items:center;
          gap:10px;
        }
        .video-home-faq button svg{color:var(--vh-cyan);}
        .video-home-faq p{
          margin:0;
          padding:0 18px 18px 44px;
          color:rgba(255,255,255,.72);
          font-family:'Space Grotesk',sans-serif;
          line-height:1.7;
          font-size:14px;
        }
        .video-home-enquiry-section{
          grid-template-columns:minmax(280px,560px) minmax(300px,520px);
          align-items:center;
          justify-content:space-between;
        }
        .video-home-enquiry{
          padding:24px;
          display:grid;
          gap:12px;
        }
        .video-home-enquiry label{
          display:grid;
          gap:7px;
          color:rgba(255,255,255,.58);
          font-family:'Space Grotesk',sans-serif;
          font-size:11px;
          font-weight:800;
          letter-spacing:1.1px;
          text-transform:uppercase;
        }
        .video-home-enquiry input,
        .video-home-enquiry textarea{
          width:100%;
          border:1px solid rgba(255,255,255,.13);
          background:rgba(255,255,255,.07);
          color:#fff;
          padding:12px 13px;
          font:inherit;
          letter-spacing:0;
          text-transform:none;
          outline:none;
        }
        .video-home-enquiry input:focus,
        .video-home-enquiry textarea:focus{
          border-color:rgba(86,214,255,.58);
          box-shadow:0 0 0 3px rgba(86,214,255,.08);
        }
        @media (max-width:900px){
          .video-home-links{display:none;}
          .video-home-panel,
          .video-home-section{padding:104px 20px 58px;}
          .video-home-metrics,
          .video-home-card-grid,
          .video-home-stage-row,
          .video-home-final,
          .video-home-offer-grid,
          .video-home-news-grid,
          .video-home-testimonial-grid,
          .video-home-enquiry-section{grid-template-columns:1fr;}
          .video-section-head{align-items:start;flex-direction:column;}
          .video-home-card{min-height:180px;}
          .video-home h1{font-size:clamp(40px,14vw,72px);}
          .video-home-cms-card{min-height:320px;}
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

        <FeaturedBuilds isAdmin={isAdmin} />
        <ExclusiveOffers isAdmin={isAdmin} />
        <GamingNews isAdmin={isAdmin} />
        <Testimonials isAdmin={isAdmin} />
        <FAQ isAdmin={isAdmin} />
        <InstantEnquiry isAdmin={isAdmin} />

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
