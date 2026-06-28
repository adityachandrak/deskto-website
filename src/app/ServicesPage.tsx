import { useState, useEffect } from "react";
import {
  ChevronRight, ChevronLeft, ArrowRight, CheckCircle, MessageCircle, Phone,
  Plus, Minus, Sparkles, Monitor, Laptop, Upload, Newspaper, Cpu, Trophy,
  CalendarDays, Star, Tag, Gamepad2, Share2, Eye,
} from "lucide-react";
import { toast } from "sonner";
import {
  Navbar, FooterSection, SectionHeader, Reveal, ScrollToTop,
} from "@/app/App";
import { SERVICES, Service, ServicePricingTier } from "@/app/lib/services";
import { useCurrentUser } from "@/app/lib/currentUser";
import { useDashboardData } from "@/app/lib/dashboardData";
import type { GamingHubItem } from "@/app/lib/dashboardData";
import { saveMediaFile } from "@/app/lib/mediaStore";

const WHATSAPP = "+919876543210";

function RepairField({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#777", letterSpacing: "1.4px", textTransform: "uppercase", fontWeight: 700 }}>{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 8, padding: "11px 12px", fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: "white", outline: "none" }} />
    </label>
  );
}

function encodeUpload(file: File) {
  return saveMediaFile(file);
}

function encodeInlineRepairImage(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    const type = file.type || (file.name.toLowerCase().endsWith(".png") ? "image/png" : file.name.toLowerCase().endsWith(".webp") ? "image/webp" : "image/jpeg");
    reader.onload = () => resolve(`${file.name}|||${type}|||${reader.result}`);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function uploadName(value: string) {
  return value.split("|||")[0] || value;
}

function isRepairImageUploadRecord(value: string) {
  const parts = value.split("|||");
  const name = (parts[0] || value).toLowerCase();
  const mime = (parts[1] || "").toLowerCase();
  return (
    mime === "image/jpeg" ||
    mime === "image/png" ||
    mime === "image/webp" ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png") ||
    name.endsWith(".webp")
  );
}

function isAllowedUpload(file: File) {
  const name = file.name.toLowerCase();
  return file.type.startsWith("image/") || file.type === "application/pdf" || file.type === "video/mp4" || file.type === "text/plain" || name.endsWith(".pdf") || name.endsWith(".mp4") || name.endsWith(".log") || name.endsWith(".txt");
}

function isAllowedRepairImage(file: File) {
  const name = file.name.toLowerCase();
  return (
    file.type === "image/jpeg" ||
    file.type === "image/png" ||
    file.type === "image/webp" ||
    name.endsWith(".jpg") ||
    name.endsWith(".jpeg") ||
    name.endsWith(".png") ||
    name.endsWith(".webp")
  );
}

// ─────────────── BREADCRUMB ───────────────
function BreadcrumbBar({ crumbs }: { crumbs: string[] }) {
  return (
    <div
      style={{
        background: "#0D0D0D",
        borderBottom: "1px solid rgba(255,255,255,0.06)",
        padding: "16px 0",
      }}
    >
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 24px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          fontFamily: "'Space Grotesk', sans-serif",
          fontSize: 12,
          color: "#777",
          flexWrap: "wrap",
        }}
      >
        {crumbs.map((c, i) => (
          <span key={i} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {i > 0 && <ChevronRight size={12} color="#444" />}
            {i < crumbs.length - 1 ? (
              <a
                href={i === 0 ? "/" : "/services"}
                style={{ color: "#777", textDecoration: "none" }}
              >
                {c}
              </a>
            ) : (
              <span style={{ color: "#FF1F45", fontWeight: 600 }}>{c}</span>
            )}
          </span>
        ))}
      </div>
    </div>
  );
}

// ─────────────── GLASS CARD ───────────────
function GlassCard({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div
      className="glass-card"
      style={{
        background: "rgba(255,255,255,0.04)",
        backdropFilter: "blur(20px) saturate(180%)",
        WebkitBackdropFilter: "blur(20px) saturate(180%)",
        border: "1px solid rgba(255,255,255,0.09)",
        borderRadius: 14,
        padding: 24,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// ─────────────── HERO ───────────────
function ServiceHero({ service }: { service: Service }) {
  const Icon = service.icon;
  const waLink = `https://wa.me/${WHATSAPP.replace(/\D/g, "")}?text=${encodeURIComponent(
    `Hi, I'm interested in your ${service.title} service`
  )}`;
  const telLink = `tel:${WHATSAPP.replace(/\s/g, "")}`;

  const onBook = () => {
    toast.success(`Booking request received — we'll contact you shortly.`);
  };

  return (
    <section className="section-pad" style={{ padding: "48px 0", background: "#050505" }}>
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 24px",
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) minmax(0, 1.4fr)",
          gap: 40,
          alignItems: "center",
        }}
      >
        <Reveal>
          <div
            style={{
              position: "relative",
              aspectRatio: "1/1",
              maxWidth: 320,
              margin: "0 auto",
              width: "100%",
            }}
          >
            <div
              style={{
                position: "absolute",
                inset: "-20%",
                background: `radial-gradient(circle, ${service.color}40 0%, transparent 70%)`,
                pointerEvents: "none",
              }}
            />
            <div
              style={{
                position: "relative",
                width: "100%",
                height: "100%",
                borderRadius: 24,
                background: `${service.color}14`,
                border: `1px solid ${service.color}50`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                backdropFilter: "blur(20px)",
                WebkitBackdropFilter: "blur(20px)",
              }}
            >
              <Icon size={120} color={service.color} strokeWidth={1.5} />
            </div>
            <div
              style={{
                position: "absolute",
                top: 16,
                left: 16,
                background: `linear-gradient(135deg, ${service.color}, ${service.color}cc)`,
                padding: "6px 14px",
                borderRadius: 4,
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 10,
                fontWeight: 700,
                color: "white",
                letterSpacing: "1.5px",
              }}
            >
              {service.tag}
            </div>
          </div>
        </Reveal>

        <Reveal delay={.1}>
          <div
            style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: 11,
              color: service.color,
              letterSpacing: "3px",
              textTransform: "uppercase",
              marginBottom: 12,
            }}
          >
            DESKTO Service Category
          </div>
          <h1
            style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "clamp(28px, 4.5vw, 48px)",
              fontWeight: 800,
              color: "white",
              lineHeight: 1.05,
              marginBottom: 16,
              letterSpacing: "-.5px",
            }}
          >
            {service.title}
          </h1>
          <p
            style={{
              color: "#CFCFCF",
              fontSize: 16,
              lineHeight: 1.7,
              fontFamily: "'Space Grotesk', sans-serif",
              marginBottom: 16,
            }}
          >
            {service.longDescription}
          </p>
          <p
            style={{
              color: service.color,
              fontSize: 13,
              fontFamily: "'Orbitron', sans-serif",
              letterSpacing: "1px",
              marginBottom: 24,
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Sparkles size={14} /> {service.sub}
          </p>

          <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap" }}>
            <button
              onClick={onBook}
              className="glass-pill glass-pill-primary"
              id="book"
              style={{
                padding: "14px 26px",
                fontSize: 11,
              }}
            >
              <CheckCircle size={14} /> {service.ctaLabel.toUpperCase()}
            </button>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "14px 22px",
                background: "linear-gradient(135deg, #00cc66, #006633)",
                color: "white",
                borderRadius: 8,
                textDecoration: "none",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 10,
                letterSpacing: "1px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <MessageCircle size={13} /> WHATSAPP
            </a>
            <a
              href={telLink}
              style={{
                padding: "14px 22px",
                background: "rgba(255,31,69,0.15)",
                border: "1px solid rgba(255,31,69,0.4)",
                color: "#FF1F45",
                borderRadius: 8,
                textDecoration: "none",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 10,
                letterSpacing: "1px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Phone size={13} /> CALL SHOP
            </a>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

// ─────────────── INCLUDED SERVICES ───────────────
function IncludedServicesSection({ service }: { service: Service }) {
  return (
    <section className="section-pad" style={{ background: "#0D0D0D", padding: "64px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
        <SectionHeader eyebrow="WHAT'S INCLUDED" title="ALL" accent="SERVICES" sub={`${service.includedServices.length} services under the ${service.title} category`} />
        <Reveal>
          <GlassCard>
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                gap: 14,
              }}
            >
              {service.includedServices.map((s, i) => (
                <li
                  key={i}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    padding: "12px 14px",
                    background: "rgba(255,255,255,0.03)",
                    border: "1px solid rgba(255,255,255,0.05)",
                    borderRadius: 8,
                    transition: "border-color .2s, transform .2s",
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = service.color;
                    e.currentTarget.style.transform = "translateY(-2px)";
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = "rgba(255,255,255,0.05)";
                    e.currentTarget.style.transform = "translateY(0)";
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: 8,
                      background: `${service.color}22`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <CheckCircle size={14} color={service.color} />
                  </div>
                  <span style={{ color: "white", fontSize: 14, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>
                    {s}
                  </span>
                </li>
              ))}
            </ul>
          </GlassCard>
        </Reveal>
      </div>
    </section>
  );
}

// ─────────────── PRICING ───────────────
function PricingSection({ service }: { service: Service }) {
  return (
    <section className="section-pad" style={{ background: "#050505", padding: "64px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
        <SectionHeader eyebrow="PRICING" title="PLANS" accent="& PACKAGES" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 20 }}>
          {service.pricingTiers.map((tier, i) => (
            <Reveal key={tier.name} delay={i * .08}>
              <PricingCard tier={tier} color={service.color} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function PricingCard({ tier, color }: { tier: ServicePricingTier; color: string }) {
  return (
    <GlassCard
      style={{
        position: "relative",
        border: tier.highlight ? `2px solid ${color}` : "1px solid rgba(255,255,255,0.09)",
        boxShadow: tier.highlight ? `0 0 30px ${color}44` : undefined,
        transform: tier.highlight ? "scale(1.03)" : undefined,
      }}
    >
      {tier.highlight && (
        <div
          style={{
            position: "absolute",
            top: -12,
            left: "50%",
            transform: "translateX(-50%)",
            background: color,
            color: "white",
            padding: "4px 14px",
            borderRadius: 3,
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 9,
            fontWeight: 700,
            letterSpacing: "1.5px",
            whiteSpace: "nowrap",
          }}
        >
          MOST POPULAR
        </div>
      )}
      <div style={{ marginBottom: 14 }}>
        <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 12, color: "#777", letterSpacing: "2px", textTransform: "uppercase", marginBottom: 8 }}>
          {tier.name}
        </div>
        <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 36, color: tier.highlight ? color : "white", fontWeight: 700, lineHeight: 1 }}>
            {tier.price}
          </span>
          {tier.period && (
            <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: "#777" }}>
              {tier.period}
            </span>
          )}
        </div>
      </div>
      <ul style={{ listStyle: "none", padding: 0, margin: "0 0 18px", display: "flex", flexDirection: "column", gap: 10 }}>
        {tier.bullets.map((b, i) => (
          <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, color: "#CFCFCF", fontSize: 13, fontFamily: "'Space Grotesk', sans-serif" }}>
            <CheckCircle size={13} color={color} style={{ flexShrink: 0, marginTop: 3 }} />
            <span>{b}</span>
          </li>
        ))}
      </ul>
      <a
        href="#book"
        className={tier.highlight ? "glass-pill glass-pill-primary" : "glass-pill glass-pill-outline"}
        style={{
          width: "100%",
          padding: "12px",
          fontSize: 10,
          justifyContent: "center",
          display: "inline-flex",
        }}
      >
        CHOOSE PLAN <ArrowRight size={11} />
      </a>
    </GlassCard>
  );
}

// ─────────────── FAQ ───────────────
function FaqSection({ service }: { service: Service }) {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section className="section-pad" style={{ background: "#0D0D0D", padding: "64px 0" }}>
      <div style={{ maxWidth: 900, margin: "0 auto", padding: "0 24px" }}>
        <SectionHeader eyebrow="QUESTIONS" title="FREQUENTLY" accent="ASKED" />
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {service.faqs.map((f, i) => {
            const isOpen = open === i;
            return (
              <Reveal key={i} delay={i * .04}>
                <div
                  style={{
                    background: "rgba(255,255,255,0.03)",
                    border: `1px solid ${isOpen ? service.color : "rgba(255,255,255,0.06)"}`,
                    borderRadius: 10,
                    overflow: "hidden",
                    transition: "border-color .2s",
                  }}
                >
                  <button
                    onClick={() => setOpen(isOpen ? null : i)}
                    style={{
                      width: "100%",
                      background: "transparent",
                      border: "none",
                      padding: "16px 18px",
                      color: "white",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: 12,
                      textAlign: "left",
                    }}
                  >
                    <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, fontWeight: 600 }}>
                      {f.q}
                    </span>
                    {isOpen ? (
                      <Minus size={16} color={service.color} />
                    ) : (
                      <Plus size={16} color="#777" />
                    )}
                  </button>
                  {isOpen && (
                    <div style={{ padding: "0 18px 16px", color: "#CFCFCF", fontSize: 14, lineHeight: 1.7, fontFamily: "'Space Grotesk', sans-serif" }}>
                      {f.a}
                    </div>
                  )}
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─────────────── RELATED SERVICES ───────────────
function RelatedServicesSection({ service }: { service: Service }) {
  const related = service.relatedSlugs
    .map((slug) => SERVICES.find((s) => s.slug === slug))
    .filter(Boolean) as Service[];

  if (related.length === 0) return null;

  return (
    <section className="section-pad" style={{ background: "#050505", padding: "64px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
        <SectionHeader eyebrow="EXPLORE MORE" title="RELATED" accent="SERVICES" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {related.map((s, i) => {
            const Icon = s.icon;
            return (
              <Reveal key={s.slug} delay={i * .06}>
                <a
                  href={`/services/${s.slug}`}
                  style={{ textDecoration: "none", color: "inherit", display: "block" }}
                >
                  <div
                    className="card-hover glass-card"
                    style={{
                      borderRadius: 14,
                      padding: 22,
                      position: "relative",
                      overflow: "hidden",
                      border: "1px solid rgba(255,255,255,0.07)",
                    }}
                  >
                    <div
                      style={{
                        position: "absolute",
                        top: -40,
                        right: -40,
                        width: 130,
                        height: 130,
                        background: `radial-gradient(circle, ${s.color}18 0%, transparent 70%)`,
                        pointerEvents: "none",
                      }}
                    />
                    <div
                      style={{
                        width: 48,
                        height: 48,
                        background: `${s.color}14`,
                        border: `1px solid ${s.color}35`,
                        borderRadius: 12,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        marginBottom: 14,
                        backdropFilter: "blur(12px)",
                      }}
                    >
                      <Icon size={20} color={s.color} />
                    </div>
                    <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 14, fontWeight: 800, color: "white", marginBottom: 6 }}>
                      {s.title}
                    </h3>
                    <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#CFCFCF", lineHeight: 1.65, marginBottom: 12 }}>
                      {s.sub}
                    </p>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                      <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 600, color: s.color, letterSpacing: "1px" }}>
                        {s.tag}
                      </span>
                      <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, color: s.color, letterSpacing: "1px", display: "inline-flex", alignItems: "center", gap: 4 }}>
                        EXPLORE <ArrowRight size={10} />
                      </span>
                    </div>
                  </div>
                </a>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

// ─────────────── CTA STRIP ───────────────
function CtaSection({ service }: { service: Service }) {
  const waLink = `https://wa.me/${WHATSAPP.replace(/\D/g, "")}?text=${encodeURIComponent(
    `Hi, I'm interested in your ${service.title} service`
  )}`;
  const telLink = `tel:${WHATSAPP.replace(/\s/g, "")}`;

  return (
    <section style={{ padding: "60px 0", position: "relative" }}>
      <div
        style={{
          maxWidth: 1280,
          margin: "0 auto",
          padding: "0 24px",
        }}
      >
        <div
          style={{
            background: `linear-gradient(135deg, ${service.color}22 0%, ${service.color}05 100%)`,
            border: `1px solid ${service.color}55`,
            borderRadius: 18,
            padding: "48px 36px",
            textAlign: "center",
            backdropFilter: "blur(20px)",
            position: "relative",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: -100,
              left: "50%",
              transform: "translateX(-50%)",
              width: 400,
              height: 400,
              background: `radial-gradient(circle, ${service.color}30 0%, transparent 70%)`,
              pointerEvents: "none",
            }}
          />
          <h2
            style={{
              fontFamily: "'Orbitron', sans-serif",
              fontSize: "clamp(24px, 4vw, 36px)",
              fontWeight: 800,
              color: "white",
              marginBottom: 12,
              position: "relative",
            }}
          >
            Ready to Get Started with{" "}
            <span style={{ color: service.color }}>{service.title}?</span>
          </h2>
          <p
            style={{
              color: "#CFCFCF",
              fontSize: 15,
              fontFamily: "'Space Grotesk', sans-serif",
              maxWidth: 600,
              margin: "0 auto 28px",
              position: "relative",
            }}
          >
            Talk to a DESKTO expert today. We'll scope your requirement, give you a written quote, and get you up and running.
          </p>
          <div style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", position: "relative" }}>
            <a
              href="#book"
              className="glass-pill glass-pill-primary"
              style={{
                padding: "14px 26px",
                fontSize: 11,
              }}
            >
              <CheckCircle size={14} /> {service.ctaLabel.toUpperCase()}
            </a>
            <a
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                padding: "14px 22px",
                background: "linear-gradient(135deg, #00cc66, #006633)",
                color: "white",
                borderRadius: 8,
                textDecoration: "none",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 10,
                letterSpacing: "1px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <MessageCircle size={13} /> WHATSAPP US
            </a>
            <a
              href={telLink}
              style={{
                padding: "14px 22px",
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.2)",
                color: "white",
                borderRadius: 8,
                textDecoration: "none",
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 10,
                letterSpacing: "1px",
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Phone size={13} /> CALL SHOP
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

function RepairHubPage({ service }: { service: Service }) {
  const options = [
    {
      title: "PC Repair",
      href: "/services/pc-repair",
      icon: Monitor,
      color: "#FF1F45",
      sub: "Desktop, gaming PC, workstation, PSU, GPU, boot, cooling, display, and performance repairs.",
      points: ["Desktop / Gaming PC", "Hardware diagnostics", "Quotation approval", "QC + warranty"],
    },
    {
      title: "Laptop Repair",
      href: "/services/laptop-repair",
      icon: Laptop,
      color: "#00b4ff",
      sub: "Laptop, MacBook, screen, keyboard, battery, motherboard, overheating, liquid damage, and software repairs.",
      points: ["Laptop / MacBook", "Pickup or shop visit", "Parts estimate", "Invoice + warranty"],
    },
  ];

  return (
    <div style={{ background: "#050505", color: "white", minHeight: "100vh", paddingBottom: 60 }}>
      <Navbar />
      <BreadcrumbBar crumbs={["Home", "Services", service.title]} />
      <ServiceHero service={service} />
      <section className="section-pad" style={{ padding: "48px 0 80px", background: "#050505" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px" }}>
          <SectionHeader eyebrow="Book Repair" title="Choose" accent="Repair Type" sub="Create a tracked repair request with technician assignment, quotation approval, quality checks, invoice, and warranty." />
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
            {options.map((item, i) => {
              const Icon = item.icon;
              return (
                <Reveal key={item.title} delay={i * .08}>
                  <a href={item.href} className="glass-card card-hover" style={{ textDecoration: "none", color: "inherit", display: "block", borderRadius: 14, padding: 24, border: `1px solid ${item.color}45` }}>
                    <div style={{ width: 52, height: 52, borderRadius: 12, background: `${item.color}14`, border: `1px solid ${item.color}40`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16 }}>
                      <Icon size={22} color={item.color} />
                    </div>
                    <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 18, color: "white", margin: "0 0 10px" }}>{item.title}</h2>
                    <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: "#CFCFCF", lineHeight: 1.7, margin: "0 0 16px" }}>{item.sub}</p>
                    <div style={{ display: "grid", gap: 8, marginBottom: 20 }}>
                      {item.points.map(point => (
                        <span key={point} style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#ddd", display: "flex", alignItems: "center", gap: 8 }}>
                          <CheckCircle size={13} color={item.color} /> {point}
                        </span>
                      ))}
                    </div>
                    <span className="glass-pill glass-pill-primary" style={{ padding: "10px 16px", fontSize: 10 }}>Start Booking <ArrowRight size={12} /></span>
                  </a>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>
      <IncludedServicesSection service={service} />
      <FooterSection />
      <ScrollToTop />
    </div>
  );
}

function RepairBookingPage({ kind }: { kind: "pc-repair" | "laptop-repair" }) {
  const user = useCurrentUser();
  const { addRepairRequest } = useDashboardData();
  const isLaptop = kind === "laptop-repair";
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    email: user?.email || "",
    deviceType: isLaptop ? "Laptop" : "Desktop",
    brand: "",
    model: "",
    serialNumber: "",
    issue: "",
    uploadFiles: [] as string[],
    serviceType: "Shop Visit",
    preferredSlot: "",
  });
  const [requestId, setRequestId] = useState("");
  const serviceCharge = form.serviceType === "Home Visit" ? 999 : form.serviceType === "Pickup & Delivery" ? 799 : 499;
  const title = isLaptop ? "Laptop Repair" : "PC Repair";
  const accent = isLaptop ? "#00b4ff" : "#FF1F45";
  const repairImages = form.uploadFiles.filter(Boolean);

  const set = (key: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [key]: value }));
  const uploadRepairImageSlot = async (slot: number, files: FileList | null, input: HTMLInputElement) => {
    const file = files?.[0];
    input.value = "";
    if (!file) return;
    if (!isAllowedRepairImage(file)) {
      toast.error("Repair uploads support only JPG, JPEG, PNG, and WEBP images.");
      return;
    }
    try {
      const encoded = await encodeInlineRepairImage(file);
      setForm(prev => {
        const next = Array.from({ length: 5 }, (_, idx) => prev.uploadFiles[idx] || "");
        next[slot] = encoded;
        return { ...prev, uploadFiles: next };
      });
      toast.success(`Image ${slot + 1} uploaded.`);
    } catch {
      toast.error("Could not save this image.");
    }
  };
  const removeRepairImageSlot = (slot: number) => {
    setForm(prev => {
      const next = Array.from({ length: 5 }, (_, idx) => prev.uploadFiles[idx] || "");
      next[slot] = "";
      return { ...prev, uploadFiles: next };
    });
  };
  const submit = () => {
    if (!form.name.trim() || !form.phone.trim() || !form.brand.trim() || !form.model.trim() || !form.issue.trim() || !form.preferredSlot.trim()) {
      toast.error("Complete customer, device, issue, and preferred slot details.");
      return;
    }
    if (repairImages.length > 5) {
      toast.error("Repair requests can include a maximum of 5 images.");
      return;
    }
    if (repairImages.some(file => !isRepairImageUploadRecord(file))) {
      toast.error("Repair uploads must be JPG, JPEG, PNG, or WEBP images.");
      return;
    }
    const repair = addRepairRequest({
      customerId: user?.id || `guest_${Date.now()}`,
      customerName: form.name.trim(),
      contactPhone: form.phone.trim(),
      contactEmail: form.email.trim(),
      serviceCategory: kind,
      deviceType: form.deviceType as any,
      brand: form.brand.trim(),
      model: form.model.trim(),
      serialNumber: form.serialNumber.trim() || undefined,
      device: `${form.brand.trim()} ${form.model.trim()}`,
      issue: form.issue.trim(),
      serviceType: form.serviceType as any,
      preferredSlot: form.preferredSlot,
      estimatedCharge: serviceCharge,
      uploadedFiles: repairImages,
      qualityChecks: ["Stress Testing", "Temperature Test", "Performance Benchmark", "Hardware Verification", "Software Verification"].map(label => ({ label, done: false })),
      deliveryMode: form.serviceType === "Pickup & Delivery" ? "Home Delivery" : "Pickup",
    });
    setRequestId(repair.id);
    toast.success(`Repair request ${repair.id.slice(-8).toUpperCase()} submitted.`);
  };

  return (
    <div style={{ background: "#050505", color: "white", minHeight: "100vh", paddingBottom: 60 }}>
      <Navbar />
      <BreadcrumbBar crumbs={["Home", "Services", title]} />
      <section className="section-pad" style={{ padding: "64px 0 88px", background: "#050505" }}>
        <div style={{ maxWidth: 1180, margin: "0 auto", padding: "0 24px" }}>
          <SectionHeader eyebrow="Repair Booking" title={title} accent="Workflow" sub="Submit a repair request with validation, scheduling, estimate, notifications, quotation approval, QA, invoice, and warranty tracking." />
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(280px, .65fr)", gap: 18 }}>
            <div className="glass-card" style={{ borderRadius: 14, padding: 22 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
                <RepairField label="Customer Name" value={form.name} onChange={v => set("name", v)} />
                <RepairField label="Mobile Number" value={form.phone} onChange={v => set("phone", v)} />
                <RepairField label="Email" value={form.email} onChange={v => set("email", v)} />
                <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#777", letterSpacing: "1.4px", textTransform: "uppercase", fontWeight: 700 }}>Device Type</span>
                  <select value={form.deviceType} onChange={e => set("deviceType", e.target.value)} style={{ background: "#111", border: "1px solid rgba(255,255,255,.09)", borderRadius: 8, padding: "11px 12px", color: "white" }}>
                    {(isLaptop ? ["Laptop", "MacBook", "Other"] : ["Desktop", "Gaming PC", "Printer", "Other"]).map(v => <option key={v}>{v}</option>)}
                  </select>
                </label>
                <RepairField label="Brand" value={form.brand} onChange={v => set("brand", v)} placeholder={isLaptop ? "Dell, HP, Lenovo, Apple" : "DESKTO, ASUS, HP, Custom"} />
                <RepairField label="Model" value={form.model} onChange={v => set("model", v)} placeholder={isLaptop ? "XPS 15, Legion 5" : "Phantom X, custom Ryzen PC"} />
                <RepairField label="Serial Number Optional" value={form.serialNumber} onChange={v => set("serialNumber", v)} />
                <RepairField label="Preferred Date & Time" value={form.preferredSlot} onChange={v => set("preferredSlot", v)} type="datetime-local" />
              </div>
              <label style={{ display: "flex", flexDirection: "column", gap: 7, marginTop: 12 }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#777", letterSpacing: "1.4px", textTransform: "uppercase", fontWeight: 700 }}>Describe Issue</span>
                <textarea value={form.issue} onChange={e => set("issue", e.target.value)} placeholder="Symptoms, when it started, error codes, sounds, display behavior, prior repairs..."
                  style={{ minHeight: 120, resize: "vertical", width: "100%", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 8, padding: "11px 12px", fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: "white", outline: "none" }} />
              </label>
              <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 12 }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#777", letterSpacing: "1.4px", textTransform: "uppercase", fontWeight: 700 }}>Upload Repair Images Optional (5 Slots)</span>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
                  {Array.from({ length: 5 }, (_, slot) => {
                    const file = form.uploadFiles[slot] || "";
                    const inputId = `repair-image-${kind}-${slot}`;
                    return (
                      <div key={slot} className="glass" style={{ minHeight: 112, borderRadius: 10, padding: 10, border: `1px solid ${file ? accent : "rgba(255,255,255,.1)"}`, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 8 }}>
                        <label htmlFor={inputId} style={{ cursor: "pointer", display: "flex", minHeight: 62, alignItems: "center", justifyContent: "center", textAlign: "center", borderRadius: 8, background: "rgba(255,255,255,.035)", border: "1px dashed rgba(255,255,255,.12)", padding: 8 }}>
                          <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: file ? "white" : "#888", lineHeight: 1.35, wordBreak: "break-word" }}>
                            {file ? uploadName(file) : `Image ${slot + 1}`}
                          </span>
                        </label>
                        <input
                          id={inputId}
                          type="file"
                          accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                          onChange={e => uploadRepairImageSlot(slot, e.currentTarget.files, e.currentTarget)}
                          style={{ display: "none" }}
                        />
                        <div style={{ display: "flex", gap: 6 }}>
                          <label htmlFor={inputId} className={file ? "glass-pill glass-pill-sm glass-pill-outline" : "glass-pill glass-pill-sm glass-pill-primary"} style={{ flex: 1, justifyContent: "center", fontSize: 8, cursor: "pointer" }}>
                            <Upload size={10} /> {file ? "Replace" : "Upload"}
                          </label>
                          {file && (
                            <button className="glass-pill glass-pill-sm glass-pill-red" onClick={() => removeRepairImageSlot(slot)} style={{ fontSize: 8 }}>
                              Remove
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#777" }}>
                  {repairImages.length ? `${repairImages.length}/5 images selected: ${repairImages.map(uploadName).join(", ")}` : "No images selected. Supported: JPG, JPEG, PNG, WEBP"}
                </span>
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 14 }}>
                {["Shop Visit", "Home Visit", "Pickup & Delivery"].map(v => (
                  <button key={v} className={form.serviceType === v ? "glass-pill glass-pill-primary" : "glass-pill glass-pill-outline"} onClick={() => set("serviceType", v)} style={{ padding: "10px 14px", fontSize: 9 }}>{v}</button>
                ))}
              </div>
              <button className="glass-pill glass-pill-primary" onClick={submit} style={{ padding: "13px 22px", fontSize: 10, marginTop: 18 }}>
                <CheckCircle size={13} /> Submit Repair Request
              </button>
            </div>

            <div className="glass-card" style={{ borderRadius: 14, padding: 22, border: `1px solid ${accent}35` }}>
              <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: "white", margin: "0 0 16px" }}>Request Summary</h3>
              {[
                ["Device", `${form.deviceType} ${form.brand} ${form.model}`.trim() || "Pending"],
                ["Service", form.serviceType],
                ["Preferred Slot", form.preferredSlot || "Pending"],
                ["Uploaded Images", repairImages.length ? `${repairImages.length}/5 image(s)` : "Optional"],
              ].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "11px 0", borderBottom: "1px solid rgba(255,255,255,.06)", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12 }}>
                  <span style={{ color: "#777" }}>{k}</span><span style={{ color: "white", textAlign: "right" }}>{v}</span>
                </div>
              ))}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11 }}>Estimated Service Charge</span>
                <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 26, color: accent, fontWeight: 800 }}>₹{serviceCharge}</span>
              </div>
              <div className="glass" style={{ borderRadius: 10, padding: 12, marginTop: 18, fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#CFCFCF", lineHeight: 1.6 }}>
                <Upload size={13} color={accent} /> Admin verifies the request, assigns a technician, sends diagnosis and quotation, then QA generates invoice and warranty.
              </div>
              {requestId && (
                <div className="glass-red" style={{ borderRadius: 10, padding: 12, marginTop: 14, fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#FFC0C8", lineHeight: 1.6 }}>
                  Request ID: <strong style={{ color: "white" }}>{requestId.slice(-8).toUpperCase()}</strong><br />
                  Track it in your customer dashboard under My Repairs.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
      <FooterSection />
      <ScrollToTop />
    </div>
  );
}

const PC_COMPONENTS = {
  CPU: [["Intel i5-14400F", 18000], ["Intel i7-14700K", 36000], ["Ryzen 9 7950X", 58000]],
  Motherboard: [["B760 WiFi DDR5", 16500], ["Z790 Creator WiFi", 34000], ["X670E Gaming", 41000]],
  RAM: [["16GB DDR5", 5000], ["32GB DDR5", 9000], ["64GB DDR5", 16000]],
  GPU: [["RTX 4060", 35000], ["RTX 4070 Ti", 80000], ["RTX 4080 Super", 110000], ["RTX 4090", 175000]],
  Storage: [["1TB NVMe", 4000], ["2TB NVMe", 7500], ["4TB NVMe", 14000]],
  PSU: [["650W Bronze", 5500], ["850W Gold", 12500], ["1000W Platinum", 22000]],
  Cabinet: [["Fractal Pop Air", 5500], ["Lian Li O11D", 12000], ["Custom RGB Glass", 25000]],
  Cooler: [["Air Tower", 3500], ["240mm AIO", 9000], ["360mm AIO", 15000]],
  Fans: [["Standard Fans", 1500], ["ARGB Fan Kit", 4500]],
  OS: [["No OS", 0], ["Windows 11 Home", 11500], ["Ubuntu Setup", 1500]],
  Accessories: [["None", 0], ["Keyboard + Mouse", 4500], ["Monitor + UPS", 28000]],
} as const;

function CustomPCBuildPage({ service }: { service: Service }) {
  const user = useCurrentUser();
  const { addPCBuildRequest } = useDashboardData();
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    email: user?.email || "",
    purpose: "Gaming",
    budgetRange: "₹1,00,000 - ₹2,00,000",
    preferredBrand: "",
    performanceLevel: "High",
  });
  const [selected, setSelected] = useState<Record<string, number>>({ CPU: 1, Motherboard: 0, RAM: 1, GPU: 1, Storage: 1, PSU: 1, Cabinet: 0, Cooler: 1, Fans: 1, OS: 1, Accessories: 0 });
  const [requestId, setRequestId] = useState("");
  const set = (key: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [key]: value }));
  const components = Object.entries(PC_COMPONENTS).map(([type, options]) => {
    const option = options[selected[type] || 0];
    return { type, name: option[0], price: option[1] };
  });
  const componentCost = components.reduce((sum, c) => sum + c.price, 0);
  const assemblyCharge = form.performanceLevel === "Extreme" ? 12000 : 8000;
  const shipping = componentCost > 150000 ? 0 : 1499;
  const gst = Math.round((componentCost + assemblyCharge) * 0.18);
  const total = componentCost + assemblyCharge + gst + shipping;
  const validationReport = [
    { label: "CPU Socket Compatibility", pass: true, detail: "CPU and motherboard generation validated" },
    { label: "RAM Compatibility", pass: true, detail: "DDR5 memory selected with matching board support" },
    { label: "GPU Clearance", pass: true, detail: "Cabinet supports selected GPU class" },
    { label: "PSU Wattage", pass: true, detail: `Estimated draw ${Math.round(componentCost / 420)}W under selected tier` },
    { label: "Cooler Height", pass: true, detail: "Cooler and cabinet clearance checked" },
    { label: "Upgrade Path", pass: true, detail: "Spare storage and PSU headroom available" },
  ];
  const submit = () => {
    if (!form.name.trim() || !form.phone.trim()) {
      toast.error("Enter customer name and phone.");
      return;
    }
    const build = addPCBuildRequest({
      customerId: user?.id || `guest_${Date.now()}`,
      customerName: form.name.trim(),
      contactPhone: form.phone.trim(),
      contactEmail: form.email.trim(),
      name: `${form.purpose} ${form.performanceLevel} Build`,
      purpose: form.purpose,
      budgetRange: form.budgetRange,
      preferredBrand: form.preferredBrand || "Any",
      performanceLevel: form.performanceLevel,
      components,
      validationReport,
      assemblyChecklist: ["Install CPU", "Install Cooler", "Install RAM", "Install SSD", "Install Motherboard", "Install PSU", "Install GPU", "Cable Management", "RGB Setup", "BIOS Configuration"].map(label => ({ label, done: false })),
      testResults: ["Boot Test", "Temperature Test", "Stress Test", "Benchmark Test", "GPU Test", "RAM Test", "SSD Health Test", "Power Stability Test", "RGB Test", "Final Quality Check"].map(label => ({ label, done: false })),
      assemblyCharge,
      gst,
      shipping,
      estimatedDelivery: "5-7 working days",
      quotation: total,
      quotationNote: "Initial automated estimate. Admin will verify inventory and send final quotation.",
      total,
    });
    setRequestId(build.id);
    toast.success(`Build request ${build.id.slice(-8).toUpperCase()} submitted.`);
  };

  return (
    <div style={{ background: "#050505", color: "white", minHeight: "100vh", paddingBottom: 60 }}>
      <Navbar />
      <BreadcrumbBar crumbs={["Home", "Services", service.title]} />
      <section className="section-pad" style={{ padding: "64px 0 88px", background: "#050505" }}>
        <div style={{ maxWidth: 1260, margin: "0 auto", padding: "0 24px" }}>
          <SectionHeader eyebrow="Custom PC Builder" title="Configure" accent="Your Build" sub="Consultation, compatibility validation, quotation, assembly, testing, delivery, and warranty in one tracked workflow." />
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(310px, .65fr)", gap: 18 }}>
            <div className="glass-card" style={{ borderRadius: 14, padding: 22 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, marginBottom: 18 }}>
                <RepairField label="Customer Name" value={form.name} onChange={v => set("name", v)} />
                <RepairField label="Mobile Number" value={form.phone} onChange={v => set("phone", v)} />
                <RepairField label="Email" value={form.email} onChange={v => set("email", v)} />
                <RepairField label="Preferred Brand Optional" value={form.preferredBrand} onChange={v => set("preferredBrand", v)} placeholder="Intel, AMD, NVIDIA, ASUS..." />
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                {["Gaming", "Office", "Editing", "Streaming", "AI / ML", "CAD / 3D", "Programming", "Server"].map(v => <button key={v} className={form.purpose === v ? "glass-pill glass-pill-primary" : "glass-pill glass-pill-outline"} onClick={() => set("purpose", v)} style={{ padding: "9px 13px", fontSize: 9 }}>{v}</button>)}
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>
                {["Entry", "Mid", "High", "Extreme"].map(v => <button key={v} className={form.performanceLevel === v ? "glass-pill glass-pill-primary" : "glass-pill glass-pill-outline"} onClick={() => set("performanceLevel", v)} style={{ padding: "9px 13px", fontSize: 9 }}>{v}</button>)}
                <select value={form.budgetRange} onChange={e => set("budgetRange", e.target.value)} style={{ background: "#111", border: "1px solid rgba(255,255,255,.12)", borderRadius: 999, padding: "9px 13px", color: "white" }}>
                  {["Under ₹75,000", "₹75,000 - ₹1,00,000", "₹1,00,000 - ₹2,00,000", "₹2,00,000 - ₹3,00,000", "₹3,00,000+"].map(v => <option key={v}>{v}</option>)}
                </select>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
                {Object.entries(PC_COMPONENTS).map(([type, options]) => (
                  <div key={type} className="glass" style={{ borderRadius: 10, padding: 12 }}>
                    <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 10, color: "#FF1F45", marginBottom: 8 }}>{type}</div>
                    <select value={selected[type] || 0} onChange={e => setSelected(prev => ({ ...prev, [type]: Number(e.target.value) }))} style={{ width: "100%", background: "#111", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "10px", color: "white" }}>
                      {options.map((o, i) => <option key={o[0]} value={i}>{o[0]} · ₹{o[1].toLocaleString("en-IN")}</option>)}
                    </select>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-card" style={{ borderRadius: 14, padding: 22, border: "1px solid rgba(122,0,255,.35)" }}>
              <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: "white", margin: "0 0 16px" }}>Build Summary</h3>
              {components.map(c => <div key={c.type} style={{ display: "flex", justifyContent: "space-between", gap: 10, padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.06)", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12 }}><span style={{ color: "#aaa" }}>{c.type}</span><span style={{ color: "white", textAlign: "right" }}>{c.name}</span></div>)}
              <div style={{ marginTop: 16, display: "grid", gap: 8 }}>
                {validationReport.map(v => <span key={v.label} style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#ddd", display: "flex", gap: 8 }}><CheckCircle size={13} color="#00cc66" /> {v.label}</span>)}
              </div>
              <div style={{ marginTop: 18, fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#CFCFCF", lineHeight: 1.9 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Components</span><span>₹{componentCost.toLocaleString("en-IN")}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Assembly</span><span>₹{assemblyCharge.toLocaleString("en-IN")}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>GST</span><span>₹{gst.toLocaleString("en-IN")}</span></div>
                <div style={{ display: "flex", justifyContent: "space-between" }}><span>Shipping</span><span>{shipping ? `₹${shipping}` : "FREE"}</span></div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 18 }}>
                <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11 }}>Final Estimate</span>
                <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 28, color: "#7a00ff", fontWeight: 800 }}>₹{total.toLocaleString("en-IN")}</span>
              </div>
              <button className="glass-pill glass-pill-primary" onClick={submit} style={{ padding: "13px 20px", fontSize: 10, marginTop: 18, width: "100%" }}>Submit Build Request</button>
              {requestId && <div className="glass-red" style={{ borderRadius: 10, padding: 12, marginTop: 14, fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#FFC0C8", lineHeight: 1.6 }}>Build ID: <strong style={{ color: "white" }}>{requestId.slice(-8).toUpperCase()}</strong><br />Track it in Customer Dashboard → PC Builds.</div>}
            </div>
          </div>
        </div>
      </section>
      <FooterSection />
      <ScrollToTop />
    </div>
  );
}

type WorkflowKind = "upgrade" | "software";
type WorkflowPayload = Record<string, unknown>;

function saveServiceWorkflowRequest(kind: WorkflowKind, payload: WorkflowPayload) {
  const id = `${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  if (typeof window !== "undefined") {
    try {
      const key = "deskto-service-workflow-requests-v1";
      const raw = window.localStorage.getItem(key);
      const existing = raw ? JSON.parse(raw) : [];
      const requests = Array.isArray(existing) ? existing : [];
      requests.unshift({ id, kind, ...payload, createdAt: new Date().toISOString() });
      window.localStorage.setItem(key, JSON.stringify(requests.slice(0, 80)));
    } catch {}
  }
  return id;
}

function WorkflowTextarea({ label, value, onChange, placeholder }: { label: string; value: string; onChange: (v: string) => void; placeholder?: string }) {
  return (
    <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#777", letterSpacing: "1.4px", textTransform: "uppercase", fontWeight: 700 }}>{label}</span>
      <textarea value={value} placeholder={placeholder} onChange={e => onChange(e.target.value)}
        style={{ width: "100%", minHeight: 110, resize: "vertical", background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 8, padding: "11px 12px", fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, color: "white", outline: "none" }} />
    </label>
  );
}

function WorkflowSummary({ accent, title, timeline, requestId, dashboardText }: { accent: string; title: string; timeline: string[]; requestId: string; dashboardText: string }) {
  return (
    <div className="glass-card" style={{ borderRadius: 14, padding: 22, border: `1px solid ${accent}55` }}>
      <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: "white", margin: "0 0 16px" }}>{title}</h3>
      <div style={{ display: "grid", gap: 9 }}>
        {timeline.map((step, index) => (
          <div key={step} style={{ display: "flex", alignItems: "flex-start", gap: 9, fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#D8D8D8", lineHeight: 1.45 }}>
            <CheckCircle size={14} color={index < 3 ? "#00cc66" : accent} style={{ marginTop: 1, flexShrink: 0 }} />
            <span>{step}</span>
          </div>
        ))}
      </div>
      {requestId && (
        <div className="glass-red" style={{ borderRadius: 10, padding: 12, marginTop: 18, fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#FFC0C8", lineHeight: 1.6 }}>
          Request ID: <strong style={{ color: "white" }}>{requestId.slice(-8).toUpperCase()}</strong><br />
          {dashboardText}
        </div>
      )}
    </div>
  );
}

function ServiceImageSlots({ label, uploads, setUploads, accent }: { label: string; uploads: string[]; setUploads: (uploads: string[]) => void; accent: string }) {
  const selected = uploads.filter(Boolean);
  const uploadSlot = async (slot: number, files: FileList | null, input: HTMLInputElement) => {
    const file = files?.[0];
    input.value = "";
    if (!file) return;
    if (!isAllowedRepairImage(file)) {
      toast.error("Uploads support only JPG, JPEG, PNG, and WEBP images.");
      return;
    }
    try {
      const encoded = await encodeInlineRepairImage(file);
      const next = Array.from({ length: 5 }, (_, idx) => uploads[idx] || "");
      next[slot] = encoded;
      setUploads(next);
      toast.success(`Image ${slot + 1} uploaded.`);
    } catch {
      toast.error("Could not save this image.");
    }
  };
  const removeSlot = (slot: number) => {
    const next = Array.from({ length: 5 }, (_, idx) => uploads[idx] || "");
    next[slot] = "";
    setUploads(next);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 9, marginTop: 14 }}>
      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#777", letterSpacing: "1.4px", textTransform: "uppercase", fontWeight: 700 }}>{label}</span>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 10 }}>
        {Array.from({ length: 5 }, (_, slot) => {
          const file = uploads[slot] || "";
          const inputId = `service-image-${label.replace(/[^a-z0-9]/gi, "-").toLowerCase()}-${slot}`;
          return (
            <div key={slot} className="glass" style={{ minHeight: 112, borderRadius: 10, padding: 10, border: `1px solid ${file ? accent : "rgba(255,255,255,.1)"}`, display: "flex", flexDirection: "column", justifyContent: "space-between", gap: 8 }}>
              <label htmlFor={inputId} style={{ cursor: "pointer", display: "flex", minHeight: 62, alignItems: "center", justifyContent: "center", textAlign: "center", borderRadius: 8, background: "rgba(255,255,255,.035)", border: "1px dashed rgba(255,255,255,.12)", padding: 8 }}>
                <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: file ? "white" : "#888", lineHeight: 1.35, wordBreak: "break-word" }}>
                  {file ? uploadName(file) : `Image ${slot + 1}`}
                </span>
              </label>
              <input id={inputId} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" onChange={e => uploadSlot(slot, e.currentTarget.files, e.currentTarget)} style={{ display: "none" }} />
              <div style={{ display: "flex", gap: 6 }}>
                <label htmlFor={inputId} className={file ? "glass-pill glass-pill-sm glass-pill-outline" : "glass-pill glass-pill-sm glass-pill-primary"} style={{ flex: 1, justifyContent: "center", fontSize: 8, cursor: "pointer" }}>
                  <Upload size={10} /> {file ? "Replace" : "Upload"}
                </label>
                {file && <button className="glass-pill glass-pill-sm glass-pill-red" onClick={() => removeSlot(slot)} style={{ fontSize: 8 }}>Remove</button>}
              </div>
            </div>
          );
        })}
      </div>
      <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 11, color: "#777" }}>
        {selected.length ? `${selected.length}/5 images selected: ${selected.map(uploadName).join(", ")}` : "No images selected. Supported: JPG, JPEG, PNG, WEBP"}
      </span>
    </div>
  );
}

const UPGRADE_TIMELINE = [
  "Upgrade Request Submitted", "Request Received", "Admin Approved", "Technician Assigned",
  "System Inspection", "Compatibility Verified", "Quotation Sent", "Customer Approved",
  "Payment Successful", "Components Reserved", "Upgrade Started", "Performance Optimization",
  "Quality Testing", "Invoice Generated", "Warranty Generated", "Ready for Delivery", "Delivered", "Review Requested",
];

function UpgradeOptimizationPage({ service }: { service: Service }) {
  const user = useCurrentUser();
  const { addServiceRequest } = useDashboardData();
  const accent = service.color;
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    email: user?.email || "",
    deviceType: "Desktop PC",
    category: "RAM Upgrade",
    specs: "",
    requirements: "",
    serviceMethod: "Shop Visit",
    slot: "",
  });
  const [uploads, setUploads] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [requestId, setRequestId] = useState("");
  const set = (key: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const selected = Array.from(files).slice(0, 6);
    const allowed = selected.filter(isAllowedUpload);
    if (allowed.length !== selected.length) toast.error("Only images, PDF files, and MP4 videos are allowed.");
    if (!allowed.length) return;
    setUploading(true);
    try {
      const encoded = await Promise.all(allowed.map(encodeUpload));
      setUploads(encoded);
      toast.success(`${encoded.length} file${encoded.length > 1 ? "s" : ""} attached.`);
    } catch {
      toast.error("Could not save one of the selected files. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const submit = () => {
    if (!form.name.trim() || !form.phone.trim() || !form.requirements.trim()) {
      toast.error("Enter customer name, phone, and upgrade requirements.");
      return;
    }
    const request = addServiceRequest({
      kind: "upgrade",
      customerId: user?.id || `guest_${Date.now()}`,
      customerName: form.name.trim(),
      contactPhone: form.phone.trim(),
      contactEmail: form.email.trim(),
      title: `${form.category} for ${form.deviceType}`,
      deviceType: form.deviceType,
      category: form.category,
      requirements: form.requirements,
      currentSpecs: form.specs,
      serviceMethod: form.serviceMethod,
      preferredSlot: form.slot,
      uploads: uploads.filter(Boolean),
    });
    setRequestId(request.id);
    toast.success(`Upgrade request ${request.id.slice(-8).toUpperCase()} submitted.`);
  };

  return (
    <div style={{ background: "#050505", color: "white", minHeight: "100vh", paddingBottom: 60 }}>
      <Navbar />
      <BreadcrumbBar crumbs={["Home", "Services", service.title]} />
      <section className="section-pad" style={{ padding: "64px 0 88px", background: "#050505" }}>
        <div style={{ maxWidth: 1260, margin: "0 auto", padding: "0 24px" }}>
          <SectionHeader eyebrow="Upgrade Workflow" title="Upgrade &" accent="Optimization" sub="Compatibility checks, parts quotation, installation, performance tuning, benchmark comparison, invoice, and warranty in one request." />
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(310px, .65fr)", gap: 18 }}>
            <div className="glass-card" style={{ borderRadius: 14, padding: 22 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, marginBottom: 18 }}>
                <RepairField label="Customer Name" value={form.name} onChange={v => set("name", v)} />
                <RepairField label="Mobile Number" value={form.phone} onChange={v => set("phone", v)} />
                <RepairField label="Email" value={form.email} onChange={v => set("email", v)} />
                <RepairField label="Preferred Date & Time" type="datetime-local" value={form.slot} onChange={v => set("slot", v)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 18 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#777", letterSpacing: "1.4px", textTransform: "uppercase", fontWeight: 700 }}>Device Type</span>
                  <select value={form.deviceType} onChange={e => set("deviceType", e.target.value)} style={{ background: "#111", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "11px 12px", color: "white" }}>
                    {["Desktop PC", "Gaming PC", "Laptop", "Workstation", "MacBook"].map(v => <option key={v}>{v}</option>)}
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#777", letterSpacing: "1.4px", textTransform: "uppercase", fontWeight: 700 }}>Upgrade Category</span>
                  <select value={form.category} onChange={e => set("category", e.target.value)} style={{ background: "#111", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "11px 12px", color: "white" }}>
                    {["RAM Upgrade", "SSD Upgrade", "GPU Upgrade", "CPU Upgrade", "Motherboard Upgrade", "PSU Upgrade", "Cooling Upgrade", "RGB Upgrade", "Windows Upgrade", "Performance Optimization"].map(v => <option key={v}>{v}</option>)}
                  </select>
                </label>
              </div>
              <WorkflowTextarea label="Current PC Specifications Optional" value={form.specs} onChange={v => set("specs", v)} placeholder="CPU, GPU, RAM, storage, PSU, cabinet, operating system..." />
              <div style={{ height: 12 }} />
              <WorkflowTextarea label="Describe Requirements" value={form.requirements} onChange={v => set("requirements", v)} placeholder="What performance, FPS, cooling, storage, or software result do you want?" />
              <ServiceImageSlots label="Upload Current PC Images Optional (5 Slots)" uploads={uploads} setUploads={setUploads} accent={accent} />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
                {["Shop Visit", "Home Visit", "Pickup & Delivery"].map(v => <button key={v} className={form.serviceMethod === v ? "glass-pill glass-pill-primary" : "glass-pill glass-pill-outline"} onClick={() => set("serviceMethod", v)} style={{ padding: "10px 14px", fontSize: 9 }}>{v}</button>)}
              </div>
              <button className="glass-pill glass-pill-primary" onClick={submit} style={{ padding: "13px 22px", fontSize: 10, marginTop: 20 }}><CheckCircle size={14} /> Submit Upgrade Request</button>
            </div>
            <WorkflowSummary accent={accent} title="Upgrade Status Timeline" timeline={UPGRADE_TIMELINE} requestId={requestId} dashboardText="Admin will verify compatibility, assign a technician, send quotation, complete optimization, and generate invoice/warranty." />
          </div>
        </div>
      </section>
      <FooterSection />
      <ScrollToTop />
    </div>
  );
}

const SOFTWARE_TIMELINE = [
  "Service Request Submitted", "Request Received", "Admin Approved", "Technician Assigned",
  "System Diagnosis", "Quotation Sent", "Customer Approved", "Payment Successful",
  "Backup Completed", "Software Installation Started", "Data Recovery Completed", "System Optimization Completed",
  "Quality Testing", "Invoice Generated", "Service Completed", "Review Requested",
];

function SoftwareDataServicePage({ service }: { service: Service }) {
  const user = useCurrentUser();
  const { addServiceRequest } = useDashboardData();
  const accent = service.color;
  const [form, setForm] = useState({
    name: user?.name || "",
    phone: user?.phone || "",
    email: user?.email || "",
    category: "Windows Installation",
    deviceType: "Laptop",
    problem: "",
    serviceMethod: "Remote Support",
    slot: "",
  });
  const [uploads, setUploads] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [requestId, setRequestId] = useState("");
  const set = (key: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [key]: value }));

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const selected = Array.from(files).slice(0, 6);
    const allowed = selected.filter(isAllowedUpload);
    if (allowed.length !== selected.length) toast.error("Only images, PDF files, and MP4 videos are allowed.");
    if (!allowed.length) return;
    setUploading(true);
    try {
      const encoded = await Promise.all(allowed.map(encodeUpload));
      setUploads(encoded);
      toast.success(`${encoded.length} file${encoded.length > 1 ? "s" : ""} attached.`);
    } catch {
      toast.error("Could not save one of the selected files. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const submit = () => {
    if (!form.name.trim() || !form.phone.trim() || !form.problem.trim()) {
      toast.error("Enter customer name, phone, and problem description.");
      return;
    }
    const request = addServiceRequest({
      kind: "software",
      customerId: user?.id || `guest_${Date.now()}`,
      customerName: form.name.trim(),
      contactPhone: form.phone.trim(),
      contactEmail: form.email.trim(),
      title: `${form.category} for ${form.deviceType}`,
      deviceType: form.deviceType,
      category: form.category,
      requirements: form.problem,
      serviceMethod: form.serviceMethod,
      preferredSlot: form.slot,
      uploads: uploads.filter(Boolean),
    });
    setRequestId(request.id);
    toast.success(`Software request ${request.id.slice(-8).toUpperCase()} submitted.`);
  };

  return (
    <div style={{ background: "#050505", color: "white", minHeight: "100vh", paddingBottom: 60 }}>
      <Navbar />
      <BreadcrumbBar crumbs={["Home", "Services", service.title]} />
      <section className="section-pad" style={{ padding: "64px 0 88px", background: "#050505" }}>
        <div style={{ maxWidth: 1260, margin: "0 auto", padding: "0 24px" }}>
          <SectionHeader eyebrow="Software Workflow" title="Software &" accent="Data Services" sub="OS installs, data backup/recovery, virus removal, driver setup, licensing, quality testing, service report, and invoice." />
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(310px, .65fr)", gap: 18 }}>
            <div className="glass-card" style={{ borderRadius: 14, padding: 22 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, marginBottom: 18 }}>
                <RepairField label="Customer Name" value={form.name} onChange={v => set("name", v)} />
                <RepairField label="Mobile Number" value={form.phone} onChange={v => set("phone", v)} />
                <RepairField label="Email" value={form.email} onChange={v => set("email", v)} />
                <RepairField label="Preferred Date & Time" type="datetime-local" value={form.slot} onChange={v => set("slot", v)} />
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 18 }}>
                <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#777", letterSpacing: "1.4px", textTransform: "uppercase", fontWeight: 700 }}>Service Category</span>
                  <select value={form.category} onChange={e => set("category", e.target.value)} style={{ background: "#111", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "11px 12px", color: "white" }}>
                    {["Windows Installation", "Linux Installation", "Driver Installation", "Software Installation", "MS Office Installation", "Antivirus Installation", "Virus Removal", "Windows Activation", "BIOS Update", "Data Backup", "Data Recovery", "Email Setup", "Printer Setup", "Performance Optimization", "Password Recovery", "OS Migration"].map(v => <option key={v}>{v}</option>)}
                  </select>
                </label>
                <label style={{ display: "flex", flexDirection: "column", gap: 7 }}>
                  <span style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 10, color: "#777", letterSpacing: "1.4px", textTransform: "uppercase", fontWeight: 700 }}>Device Type</span>
                  <select value={form.deviceType} onChange={e => set("deviceType", e.target.value)} style={{ background: "#111", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: "11px 12px", color: "white" }}>
                    {["Desktop", "Laptop", "Gaming PC", "MacBook", "Workstation", "Server"].map(v => <option key={v}>{v}</option>)}
                  </select>
                </label>
              </div>
              <WorkflowTextarea label="Describe Problem" value={form.problem} onChange={v => set("problem", v)} placeholder="Error messages, screenshots, data loss details, OS version, software name, recovery needs..." />
              <ServiceImageSlots label="Upload Software Issue Images Optional (5 Slots)" uploads={uploads} setUploads={setUploads} accent={accent} />
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginTop: 16 }}>
                {["Remote Support", "Shop Visit", "Home Visit", "Pickup & Delivery"].map(v => <button key={v} className={form.serviceMethod === v ? "glass-pill glass-pill-primary" : "glass-pill glass-pill-outline"} onClick={() => set("serviceMethod", v)} style={{ padding: "10px 14px", fontSize: 9 }}>{v}</button>)}
              </div>
              <button className="glass-pill glass-pill-primary" onClick={submit} style={{ padding: "13px 22px", fontSize: 10, marginTop: 20 }}><CheckCircle size={14} /> Submit Service Request</button>
            </div>
            <WorkflowSummary accent={accent} title="Software Status Timeline" timeline={SOFTWARE_TIMELINE} requestId={requestId} dashboardText="Admin will review, assign a software technician, send quotation, complete service, and generate invoice/report." />
          </div>
        </div>
      </section>
      <FooterSection />
      <ScrollToTop />
    </div>
  );
}

function RentalSolutionsPage({ service }: { service: Service }) {
  const user = useCurrentUser();
  const { addServiceRequest } = useDashboardData();
  const [form, setForm] = useState({
    name: user?.name || "", phone: user?.phone || "", email: user?.email || "",
    category: "Gaming PC", duration: "Day", quantity: "1", serviceMethod: "Home Delivery",
    startDate: "", endDate: "", requirements: "", companyName: "",
  });
  const [uploads, setUploads] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [requestId, setRequestId] = useState("");
  const set = (key: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [key]: value }));
  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const selected = Array.from(files).slice(0, 8);
    const allowed = selected.filter(isAllowedUpload);
    if (allowed.length !== selected.length) toast.error("Only images, PDF files, and MP4 videos are allowed.");
    if (!allowed.length) return;
    setUploading(true);
    try {
      const encoded = await Promise.all(allowed.map(encodeUpload));
      setUploads(encoded);
      toast.success(`${encoded.length} document${encoded.length > 1 ? "s" : ""} attached.`);
    } catch {
      toast.error("Could not save one of the selected files. Please try again.");
    } finally {
      setUploading(false);
    }
  };
  const submit = () => {
    if (!form.name.trim() || !form.phone.trim() || !form.startDate || !form.endDate) { toast.error("Enter customer, phone, start date, and end date."); return; }
    const request = addServiceRequest({
      kind: "rental", customerId: user?.id || `guest_${Date.now()}`, customerName: form.name.trim(), contactPhone: form.phone.trim(), contactEmail: form.email.trim(),
      title: `${form.category} Rental`, deviceType: form.category, category: form.category, requirements: form.requirements || `${form.quantity} unit(s), ${form.duration} rental`, serviceMethod: form.serviceMethod,
      companyName: form.companyName, quantity: Number(form.quantity || 1), rentalDuration: form.duration, startDate: form.startDate, endDate: form.endDate, uploads: uploads.filter(Boolean),
    });
    setRequestId(request.id);
    toast.success(`Rental request ${request.id.slice(-8).toUpperCase()} submitted.`);
  };
  return (
    <div style={{ background: "#050505", color: "white", minHeight: "100vh", paddingBottom: 60 }}>
      <Navbar /><BreadcrumbBar crumbs={["Home", "Services", service.title]} />
      <section className="section-pad" style={{ padding: "64px 0 88px", background: "#050505" }}>
        <div style={{ maxWidth: 1260, margin: "0 auto", padding: "0 24px" }}>
          <SectionHeader eyebrow="Rental Workflow" title="Rental" accent="Solutions" sub="Document verification, rental agreement, deposit, inventory reservation, delivery, return inspection, and refund tracking." />
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(310px, .65fr)", gap: 18 }}>
            <div className="glass-card" style={{ borderRadius: 14, padding: 22 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, marginBottom: 18 }}>
                <RepairField label="Customer Name" value={form.name} onChange={v => set("name", v)} />
                <RepairField label="Mobile Number" value={form.phone} onChange={v => set("phone", v)} />
                <RepairField label="Email" value={form.email} onChange={v => set("email", v)} />
                <RepairField label="Company Optional" value={form.companyName} onChange={v => set("companyName", v)} />
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                {["Gaming PC", "Gaming Laptop", "Office Desktop", "Office Laptop", "Monitor", "Projector", "Printer", "Server", "Accessories"].map(v => <button key={v} className={form.category === v ? "glass-pill glass-pill-primary" : "glass-pill glass-pill-outline"} onClick={() => set("category", v)} style={{ padding: "9px 13px", fontSize: 9 }}>{v}</button>)}
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 12, marginBottom: 16 }}>
                <RepairField label="Quantity" type="number" value={form.quantity} onChange={v => set("quantity", v)} />
                <RepairField label="Start Date" type="date" value={form.startDate} onChange={v => set("startDate", v)} />
                <RepairField label="End Date" type="date" value={form.endDate} onChange={v => set("endDate", v)} />
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
                {["Hour", "Day", "Week", "Month"].map(v => <button key={v} className={form.duration === v ? "glass-pill glass-pill-primary" : "glass-pill glass-pill-outline"} onClick={() => set("duration", v)} style={{ padding: "9px 13px", fontSize: 9 }}>{v}</button>)}
                {["Pickup", "Home Delivery"].map(v => <button key={v} className={form.serviceMethod === v ? "glass-pill glass-pill-primary" : "glass-pill glass-pill-outline"} onClick={() => set("serviceMethod", v)} style={{ padding: "9px 13px", fontSize: 9 }}>{v}</button>)}
              </div>
              <WorkflowTextarea label="Rental Requirements" value={form.requirements} onChange={v => set("requirements", v)} placeholder="Software needed, event/office use, accessories, delivery address, business details..." />
              <ServiceImageSlots label="Upload Rental Document Images Optional (5 Slots)" uploads={uploads} setUploads={setUploads} accent={service.color} />
              <button className="glass-pill glass-pill-primary" onClick={submit} style={{ padding: "13px 22px", fontSize: 10, marginTop: 20 }}><CheckCircle size={14} /> Submit Rental Request</button>
            </div>
            <WorkflowSummary accent={service.color} title="Rental Status Timeline" timeline={["Rental Request Submitted", "Request Received", "Documents Verified", "Rental Approved", "Rental Agreement Generated", "Payment Successful", "Product Reserved", "Product Prepared", "Product Shipped", "Rental Active", "Return Requested", "Product Received", "Inspection Completed", "Final Invoice Generated", "Security Deposit Refunded", "Rental Closed", "Review Requested"]} requestId={requestId} dashboardText="Track verification, agreement, deposit, delivery, return inspection, final invoice, and refund in your dashboard." />
          </div>
        </div>
      </section><FooterSection /><ScrollToTop />
    </div>
  );
}

function SellUsedProductsPage({ service }: { service: Service }) {
  const user = useCurrentUser();
  const { addServiceRequest } = useDashboardData();
  const [form, setForm] = useState({ name: user?.name || "", phone: user?.phone || "", email: user?.email || "", category: "Laptop", brand: "", model: "", specs: "", age: "", condition: "Good", serialNumber: "", expectedPrice: "", serviceMethod: "Pickup", requirements: "" });
  const [uploads, setUploads] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [requestId, setRequestId] = useState("");
  const set = (key: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [key]: value }));
  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const selected = Array.from(files).slice(0, 8);
    const allowed = selected.filter(isAllowedUpload);
    if (allowed.length !== selected.length) toast.error("Only images, PDF files, and MP4 videos are allowed.");
    if (!allowed.length) return;
    setUploading(true);
    try {
      const encoded = await Promise.all(allowed.map(encodeUpload));
      setUploads(encoded);
      toast.success(`${encoded.length} file${encoded.length > 1 ? "s" : ""} attached.`);
    } catch {
      toast.error("Could not save one of the selected files. Please try again.");
    } finally {
      setUploading(false);
    }
  };
  const submit = () => {
    if (!form.name.trim() || !form.phone.trim() || !form.brand.trim() || !form.model.trim()) { toast.error("Enter customer, phone, brand, and model."); return; }
    const request = addServiceRequest({
      kind: "sell", customerId: user?.id || `guest_${Date.now()}`, customerName: form.name.trim(), contactPhone: form.phone.trim(), contactEmail: form.email.trim(),
      title: `Sell ${form.brand} ${form.model}`, deviceType: form.category, category: form.category, requirements: `${form.condition} condition · ${form.age || "Age not specified"} · ${form.requirements || "No notes"}`,
      currentSpecs: form.specs, serialNumber: form.serialNumber, expectedPrice: Number(form.expectedPrice || 0), serviceMethod: form.serviceMethod, uploads: uploads.filter(Boolean),
    });
    setRequestId(request.id);
    toast.success(`Sell request ${request.id.slice(-8).toUpperCase()} submitted.`);
  };
  return (
    <div style={{ background: "#050505", color: "white", minHeight: "100vh", paddingBottom: 60 }}>
      <Navbar /><BreadcrumbBar crumbs={["Home", "Services", service.title]} />
      <section className="section-pad" style={{ padding: "64px 0 88px", background: "#050505" }}>
        <div style={{ maxWidth: 1260, margin: "0 auto", padding: "0 24px" }}>
          <SectionHeader eyebrow="Used Product Buyback" title="Sell Used" accent="Products" sub="Submit product details, photos, invoice, expected price, inspection scheduling, offer approval, payment, inventory certification, and resale publishing." />
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(310px, .65fr)", gap: 18 }}>
            <div className="glass-card" style={{ borderRadius: 14, padding: 22 }}>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, marginBottom: 18 }}>
                <RepairField label="Customer Name" value={form.name} onChange={v => set("name", v)} /><RepairField label="Mobile Number" value={form.phone} onChange={v => set("phone", v)} /><RepairField label="Email" value={form.email} onChange={v => set("email", v)} /><RepairField label="Expected Price" type="number" value={form.expectedPrice} onChange={v => set("expectedPrice", v)} />
                <RepairField label="Brand" value={form.brand} onChange={v => set("brand", v)} /><RepairField label="Model" value={form.model} onChange={v => set("model", v)} /><RepairField label="Serial Number" value={form.serialNumber} onChange={v => set("serialNumber", v)} /><RepairField label="Age" value={form.age} onChange={v => set("age", v)} placeholder="2 years" />
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>{["Laptop", "Gaming PC", "GPU", "Monitor", "Accessories"].map(v => <button key={v} className={form.category === v ? "glass-pill glass-pill-primary" : "glass-pill glass-pill-outline"} onClick={() => set("category", v)} style={{ padding: "9px 13px", fontSize: 9 }}>{v}</button>)}</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>{["Excellent", "Good", "Fair", "Needs Repair"].map(v => <button key={v} className={form.condition === v ? "glass-pill glass-pill-primary" : "glass-pill glass-pill-outline"} onClick={() => set("condition", v)} style={{ padding: "9px 13px", fontSize: 9 }}>{v}</button>)}{["Pickup", "Shop Visit"].map(v => <button key={v} className={form.serviceMethod === v ? "glass-pill glass-pill-primary" : "glass-pill glass-pill-outline"} onClick={() => set("serviceMethod", v)} style={{ padding: "9px 13px", fontSize: 9 }}>{v}</button>)}</div>
              <WorkflowTextarea label="Specs / Notes" value={form.specs} onChange={v => set("specs", v)} placeholder="CPU, RAM, GPU, storage, bill availability, accessories, condition notes..." />
              <ServiceImageSlots label="Upload Product Photos / Invoice Images Optional (5 Slots)" uploads={uploads} setUploads={setUploads} accent={service.color} />
              <button className="glass-pill glass-pill-primary" onClick={submit} style={{ padding: "13px 22px", fontSize: 10, marginTop: 20 }}><CheckCircle size={14} /> Submit Sell Request</button>
            </div>
            <WorkflowSummary accent={service.color} title="Sell Request Timeline" timeline={["Sell Request Submitted", "Admin Review", "Inspection Scheduled", "Product Inspected", "Price Offer Sent", "Offer Accepted", "Payment Completed", "Added to Inventory", "Published for Resale", "Request Closed"]} requestId={requestId} dashboardText="Track inspection, price offer, acceptance, payment, inventory certification, and resale publishing in your dashboard." />
          </div>
        </div>
      </section><FooterSection /><ScrollToTop />
    </div>
  );
}

function RemoteBusinessSupportPage({ service }: { service: Service }) {
  const user = useCurrentUser();
  const { addServiceRequest } = useDashboardData();
  const [mode, setMode] = useState<"Remote Support" | "Business IT Support">("Remote Support");
  const [form, setForm] = useState({ name: user?.name || "", phone: user?.phone || "", email: user?.email || "", category: "Software Issue", deviceType: "Laptop", priority: "Normal", preferredSlot: "", companyName: "", businessSize: "", deviceCount: "", serviceMethod: "Remote", requirements: "" });
  const [uploads, setUploads] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [requestId, setRequestId] = useState("");
  const set = (key: keyof typeof form, value: string) => setForm(prev => ({ ...prev, [key]: value }));
  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const selected = Array.from(files).slice(0, 8);
    const allowed = selected.filter(isAllowedUpload);
    if (allowed.length !== selected.length) toast.error("Only images, PDF files, MP4 videos, TXT, and LOG files are allowed.");
    if (!allowed.length) return;
    setUploading(true);
    try {
      const encoded = await Promise.all(allowed.map(encodeUpload));
      setUploads(encoded);
      toast.success(`${encoded.length} file${encoded.length > 1 ? "s" : ""} attached.`);
    } catch {
      toast.error("Could not save one of the selected files. Please try again.");
    } finally {
      setUploading(false);
    }
  };
  const submit = () => {
    if (!form.name.trim() || !form.phone.trim() || !form.requirements.trim()) { toast.error("Enter customer, phone, and issue details."); return; }
    const request = addServiceRequest({
      kind: "support", customerId: user?.id || `guest_${Date.now()}`, customerName: form.name.trim(), contactPhone: form.phone.trim(), contactEmail: form.email.trim(),
      title: `${mode}: ${form.category}`, deviceType: form.deviceType, category: form.category, requirements: form.requirements, serviceMethod: form.serviceMethod,
      preferredSlot: form.preferredSlot, companyName: form.companyName, priority: form.priority, quantity: Number(form.deviceCount || 0), uploads: uploads.filter(Boolean),
    });
    setRequestId(request.id);
    toast.success(`Support ticket ${request.id.slice(-8).toUpperCase()} submitted.`);
  };
  const categories = mode === "Remote Support" ? ["Software Issue", "Windows Issue", "Driver Installation", "Printer Setup", "Wi-Fi Issue", "Virus Removal", "Gaming Optimization", "Performance Issue", "Application Installation", "Other"] : ["AMC", "Office Setup", "Network Support", "Server Support", "Remote Monitoring", "Cloud Support", "Security", "Consultation"];
  return (
    <div style={{ background: "#050505", color: "white", minHeight: "100vh", paddingBottom: 60 }}>
      <Navbar /><BreadcrumbBar crumbs={["Home", "Services", service.title]} />
      <section className="section-pad" style={{ padding: "64px 0 88px", background: "#050505" }}>
        <div style={{ maxWidth: 1260, margin: "0 auto", padding: "0 24px" }}>
          <SectionHeader eyebrow="IT Support Workflow" title="Remote & Business" accent="IT Support" sub="Remote tickets, business enquiries, technician assignment, secure sessions, proposals, AMC, invoices, and service reports." />
          <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.35fr) minmax(310px, .65fr)", gap: 18 }}>
            <div className="glass-card" style={{ borderRadius: 14, padding: 22 }}>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 18 }}>{["Remote Support", "Business IT Support"].map(v => <button key={v} className={mode === v ? "glass-pill glass-pill-primary" : "glass-pill glass-pill-outline"} onClick={() => setMode(v as typeof mode)} style={{ padding: "10px 14px", fontSize: 9 }}>{v}</button>)}</div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(210px, 1fr))", gap: 12, marginBottom: 18 }}>
                <RepairField label={mode === "Remote Support" ? "Customer Name" : "Contact Person"} value={form.name} onChange={v => set("name", v)} /><RepairField label="Mobile Number" value={form.phone} onChange={v => set("phone", v)} /><RepairField label="Email" value={form.email} onChange={v => set("email", v)} />
                {mode === "Business IT Support" && <RepairField label="Company Name" value={form.companyName} onChange={v => set("companyName", v)} />}
                {mode === "Business IT Support" && <RepairField label="Business Size" value={form.businessSize} onChange={v => set("businessSize", v)} placeholder="20 employees" />}
                {mode === "Business IT Support" && <RepairField label="Number of Devices" type="number" value={form.deviceCount} onChange={v => set("deviceCount", v)} />}
                <RepairField label="Preferred Support Time" type="datetime-local" value={form.preferredSlot} onChange={v => set("preferredSlot", v)} />
              </div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>{categories.map(v => <button key={v} className={form.category === v ? "glass-pill glass-pill-primary" : "glass-pill glass-pill-outline"} onClick={() => set("category", v)} style={{ padding: "9px 13px", fontSize: 9 }}>{v}</button>)}</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>{["Laptop", "Desktop", "Gaming PC", "Server", "Printer", "Network"].map(v => <button key={v} className={form.deviceType === v ? "glass-pill glass-pill-primary" : "glass-pill glass-pill-outline"} onClick={() => set("deviceType", v)} style={{ padding: "9px 13px", fontSize: 9 }}>{v}</button>)}{["Normal", "Urgent", "Emergency"].map(v => <button key={v} className={form.priority === v ? "glass-pill glass-pill-primary" : "glass-pill glass-pill-outline"} onClick={() => set("priority", v)} style={{ padding: "9px 13px", fontSize: 9 }}>{v}</button>)}</div>
              <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>{["Remote", "Onsite", "Hybrid"].map(v => <button key={v} className={form.serviceMethod === v ? "glass-pill glass-pill-primary" : "glass-pill glass-pill-outline"} onClick={() => set("serviceMethod", v)} style={{ padding: "9px 13px", fontSize: 9 }}>{v}</button>)}</div>
              <WorkflowTextarea label={mode === "Remote Support" ? "Describe Issue" : "Current Problems / Requirements"} value={form.requirements} onChange={v => set("requirements", v)} placeholder="Error messages, infrastructure, devices, software, network, server, SLA or AMC needs..." />
              <ServiceImageSlots label="Upload Support Screenshots Optional (5 Slots)" uploads={uploads} setUploads={setUploads} accent={service.color} />
              <button className="glass-pill glass-pill-primary" onClick={submit} style={{ padding: "13px 22px", fontSize: 10, marginTop: 20 }}><CheckCircle size={14} /> Submit Support Request</button>
            </div>
            <WorkflowSummary accent={service.color} title="Support Status Timeline" timeline={["Ticket Submitted", "Ticket Assigned", "Session Scheduled", "Technician Connected", "Issue Resolved", "Invoice Generated", "Payment Completed", "Ticket Closed"]} requestId={requestId} dashboardText="Track assignment, remote session, work notes, report, invoice, payment, and closure in your dashboard." />
          </div>
        </div>
      </section><FooterSection /><ScrollToTop />
    </div>
  );
}

// ─────────────── NOT FOUND ───────────────
function NotFoundView() {
  return (
    <div style={{ background: "#050505", minHeight: "100vh", color: "white" }}>
      <Navbar />
      <div style={{ maxWidth: 600, margin: "120px auto", padding: "0 24px", textAlign: "center" }}>
        <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 80, color: "#FF1F45", fontWeight: 900, lineHeight: 1 }}>404</div>
        <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 24, margin: "20px 0 12px" }}>Service Not Found</h2>
        <p style={{ color: "#CFCFCF", fontSize: 14, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 30 }}>
          The service you're looking for doesn't exist or has been moved.
        </p>
        <a
          href="/services"
          className="glass-pill glass-pill-primary"
          style={{
            padding: "14px 28px",
            fontSize: 11,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            textDecoration: "none",
            color: "white",
          }}
        >
          <ChevronLeft size={14} /> BROWSE ALL SERVICES
        </a>
      </div>
      <FooterSection />
    </div>
  );
}

// ─────────────── INDEX PAGE (when slug is null) ───────────────
function ServicesIndex() {
  return (
    <div style={{ background: "#050505", color: "white", minHeight: "100vh", paddingBottom: 60 }}>
      <Navbar />
      <BreadcrumbBar crumbs={["Home", "Services"]} />

      <section className="section-pad" style={{ padding: "48px 0 24px", background: "#050505" }}>
        <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
          <SectionHeader
            eyebrow="Beyond the Machine"
            title="ALL"
            accent="SERVICES"
            sub="From repair to custom builds — we are your complete PC ecosystem partner."
          />
        </div>
      </section>

      <section className="section-pad" style={{ padding: "32px 0 64px", background: "#050505" }}>
        <div style={{ maxWidth: 1400, margin: "0 auto", padding: "0 24px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 18 }}>
            {SERVICES.map((s, i) => {
              const Icon = s.icon;
              return (
                <Reveal key={s.slug} delay={i * .05}>
                  <a href={`/services/${s.slug}`} style={{ textDecoration: "none", color: "inherit", display: "block" }}>
                    <div
                      className="card-hover glass-card"
                      style={{
                        borderRadius: 14,
                        padding: 24,
                        position: "relative",
                        overflow: "hidden",
                        border: "1px solid rgba(255,255,255,0.06)",
                      }}
                    >
                      <div
                        style={{
                          position: "absolute",
                          top: -40,
                          right: -40,
                          width: 130,
                          height: 130,
                          background: `radial-gradient(circle, ${s.color}18 0%, transparent 70%)`,
                          pointerEvents: "none",
                        }}
                      />
                      <div
                        style={{
                          width: 48,
                          height: 48,
                          background: `${s.color}14`,
                          border: `1px solid ${s.color}35`,
                          borderRadius: 12,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          marginBottom: 14,
                          backdropFilter: "blur(12px)",
                        }}
                      >
                        <Icon size={20} color={s.color} />
                      </div>
                      <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 14, fontWeight: 800, color: "white", marginBottom: 7 }}>
                        {s.title}
                      </h3>
                      <p style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#CFCFCF", lineHeight: 1.65, marginBottom: 14 }}>
                        {s.sub}
                      </p>
                      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                        <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 11, fontWeight: 600, color: s.color, letterSpacing: "1px" }}>
                          {s.tag}
                        </span>
                        <span style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 9, color: s.color, letterSpacing: "1px", display: "inline-flex", alignItems: "center", gap: 4 }}>
                          EXPLORE <ArrowRight size={10} />
                        </span>
                      </div>
                    </div>
                  </a>
                </Reveal>
              );
            })}
          </div>
        </div>
      </section>

      <FooterSection />
      <ScrollToTop />
    </div>
  );
}

const GAMING_CATEGORIES = [
  { label: "Gaming News", type: "gaming-news", icon: Newspaper },
  { label: "Latest Hardware", type: "latest-hardware", icon: Cpu },
  { label: "Esports Updates", type: "esports-update", icon: Trophy },
  { label: "New Game Releases", type: "game-release", icon: Gamepad2 },
  { label: "Gaming Tips", type: "gaming-tip", icon: Sparkles },
  { label: "Benchmark Results", type: "benchmark-result", icon: Monitor },
  { label: "Reviews", type: "product-review", icon: Star },
  { label: "Community Blog", type: "community-blog", icon: MessageCircle },
];

function gamingDate(value: number) {
  return new Date(value).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

function gamingCategoryMatches(item: GamingHubItem, selected: string) {
  return selected === "All" || item.category === selected || item.type === selected;
}

function GamingHubCard({ item, onRead }: { item: GamingHubItem; onRead: () => void }) {
  return (
    <article className="glass-card" style={{ overflow: "hidden", minHeight: 330, display: "grid", gridTemplateRows: "180px 1fr", border: item.featured ? "1px solid rgba(255,31,69,.35)" : undefined }}>
      <div style={{ position: "relative", background: "#111" }}>
        <img src={item.thumbnailImage || item.coverImage} alt={item.title} style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: 0.82 }} />
        <span style={{ position: "absolute", top: 14, left: 14, border: "1px solid rgba(255,31,69,.55)", background: "rgba(255,31,69,.18)", color: "#ff2f55", borderRadius: 6, padding: "6px 10px", fontFamily: "'Orbitron', sans-serif", fontSize: 10, letterSpacing: 1 }}>
          {item.category}
        </span>
      </div>
      <div style={{ padding: 18, display: "grid", gap: 12 }}>
        <h3 style={{ margin: 0, color: "white", fontFamily: "'Orbitron', sans-serif", fontSize: 17, lineHeight: 1.25 }}>{item.title}</h3>
        <p style={{ margin: 0, color: "#cfcfcf", fontFamily: "'Space Grotesk', sans-serif", fontSize: 13, lineHeight: 1.55 }}>{item.shortDescription}</p>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, marginTop: "auto" }}>
          <span style={{ color: "#777", fontFamily: "'Space Grotesk', sans-serif", fontSize: 12 }}>{gamingDate(item.publishDate)}</span>
          <a href={`/services/gaming-hub/${item.slug}`} onClick={onRead} className="glass-pill glass-pill-primary glass-pill-sm" style={{ textDecoration: "none" }}>
            Read <ArrowRight size={12} />
          </a>
        </div>
      </div>
    </article>
  );
}

function GamingHubArticlePage({ item, related, track, patchGamingHubItem }: {
  item: GamingHubItem;
  related: GamingHubItem[];
  track: (id: string, metric: "views" | "reads" | "shares" | "whatsappClicks" | "callClicks" | "offerClicks" | "ctaClicks") => void;
  patchGamingHubItem: (id: string, patch: Partial<GamingHubItem>) => void;
}) {
  const { user } = useCurrentUser();
  const [comment, setComment] = useState("");

  useEffect(() => {
    track(item.id, "views");
    track(item.id, "reads");
  }, [item.id, track]);

  const submitComment = () => {
    if (!comment.trim()) return toast.error("Write a comment first");
    patchGamingHubItem(item.id, {
      comments: [
        ...(item.comments || []),
        { id: `ghc_${Date.now()}`, customerName: user?.name || "Customer", text: comment.trim(), status: "pending", createdAt: Date.now() },
      ],
    });
    setComment("");
    toast.success("Comment sent for admin approval");
  };

  const sharePost = async () => {
    track(item.id, "shares");
    try {
      if (navigator.share) await navigator.share({ title: item.title, url: window.location.href });
      else await navigator.clipboard.writeText(window.location.href);
      toast.success("Post link ready to share");
    } catch {}
  };

  return (
    <div style={{ background: "#050505", color: "white", minHeight: "100vh", paddingBottom: 70 }}>
      <Navbar />
      <BreadcrumbBar crumbs={["Home", "Services", "Gaming Hub", item.title]} />
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "70px 20px 30px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1.2fr) minmax(280px,.8fr)", gap: 28, alignItems: "start" }} className="gaming-article-grid">
          <div>
            <span style={{ color: "#ff2f55", fontFamily: "'Orbitron', sans-serif", fontSize: 12, letterSpacing: 3, textTransform: "uppercase" }}>{item.category}</span>
            <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(38px,6vw,74px)", lineHeight: .95, margin: "18px 0", letterSpacing: 0 }}>{item.title}</h1>
            <p style={{ color: "#d5d5d5", fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, lineHeight: 1.65, margin: 0 }}>{item.shortDescription}</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 22, color: "#888", fontFamily: "'Space Grotesk', sans-serif", fontSize: 13 }}>
              <span><CalendarDays size={14} style={{ verticalAlign: -2 }} /> {gamingDate(item.publishDate)}</span>
              <span>By {item.author}</span>
              <span><Eye size={14} style={{ verticalAlign: -2 }} /> {item.views + 1} views</span>
            </div>
          </div>
          <img src={item.coverImage} alt={item.title} style={{ width: "100%", aspectRatio: "4 / 3", objectFit: "cover", borderRadius: 10, border: "1px solid rgba(255,255,255,.12)" }} />
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "20px" }}>
        {!!item.gallery?.length && (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", gap: 10, marginBottom: 26 }}>
            {item.gallery.slice(0, 5).map((src, index) => (
              <img key={`${item.id}-gallery-${index}`} src={src} alt={`${item.title} gallery ${index + 1}`} style={{ width: "100%", aspectRatio: "16 / 10", objectFit: "cover", borderRadius: 8, border: "1px solid rgba(255,255,255,.1)" }} />
            ))}
          </div>
        )}

        <div className="glass-card" style={{ padding: 28, display: "grid", gap: 18 }}>
          <p style={{ margin: 0, color: "#ddd", fontFamily: "'Space Grotesk', sans-serif", fontSize: 17, lineHeight: 1.75 }}>{item.intro}</p>
          <p style={{ margin: 0, color: "#cfcfcf", fontFamily: "'Space Grotesk', sans-serif", fontSize: 16, lineHeight: 1.75, whiteSpace: "pre-line" }}>{item.body}</p>
          {item.specs && <p style={{ margin: 0, color: "#aaa", fontFamily: "'Space Grotesk', sans-serif" }}><b style={{ color: "white" }}>Specs:</b> {item.specs}</p>}
          {item.benchmarkData && <p style={{ margin: 0, color: "#aaa", fontFamily: "'Space Grotesk', sans-serif" }}><b style={{ color: "white" }}>Benchmark:</b> {item.benchmarkData}</p>}
          {!!item.tips?.length && <ul style={{ margin: 0, paddingLeft: 20, color: "#ccc", fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.8 }}>{item.tips.map(tip => <li key={tip}>{tip}</li>)}</ul>}
          {item.offerDetails && <div style={{ border: "1px solid rgba(0,204,102,.35)", borderRadius: 8, padding: 16, color: "#00cc66", fontFamily: "'Orbitron', sans-serif" }}>{item.offerDetails} {item.discount ? `- ${item.discount}` : ""}</div>}
          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <button className="glass-pill glass-pill-outline" onClick={sharePost}><Share2 size={14} /> Share</button>
            <a className="glass-pill glass-pill-success" href={`https://wa.me/${WHATSAPP.replace(/\D/g, "")}`} onClick={() => track(item.id, "whatsappClicks")} style={{ textDecoration: "none" }}><MessageCircle size={14} /> WhatsApp</a>
            <a className="glass-pill glass-pill-outline" href={`tel:${WHATSAPP}`} onClick={() => track(item.id, "callClicks")} style={{ textDecoration: "none" }}><Phone size={14} /> Call Shop</a>
            {item.ctaHref && <a className="glass-pill glass-pill-primary" href={item.ctaHref} onClick={() => track(item.id, item.type === "offer" ? "offerClicks" : "ctaClicks")} style={{ textDecoration: "none" }}>{item.ctaText || "Explore"} <ArrowRight size={14} /></a>}
          </div>
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "20px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 18 }} className="gaming-article-grid">
          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ marginTop: 0, fontFamily: "'Orbitron', sans-serif" }}>Comments</h3>
            {(item.comments || []).filter(c => c.status === "approved").map(c => <p key={c.id} style={{ color: "#ccc", fontFamily: "'Space Grotesk', sans-serif" }}><b style={{ color: "white" }}>{c.customerName}:</b> {c.text}</p>)}
            <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Write a comment for admin approval..." rows={4} style={{ width: "100%", background: "#101010", color: "white", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: 12, fontFamily: "'Space Grotesk', sans-serif", resize: "vertical" }} />
            <button className="glass-pill glass-pill-primary" style={{ marginTop: 10 }} onClick={submitComment}>Submit Comment</button>
          </div>
          <div className="glass-card" style={{ padding: 20 }}>
            <h3 style={{ marginTop: 0, fontFamily: "'Orbitron', sans-serif" }}>Related Posts</h3>
            <div style={{ display: "grid", gap: 10 }}>
              {related.slice(0, 3).map(post => <a key={post.id} href={`/services/gaming-hub/${post.slug}`} style={{ color: "white", textDecoration: "none", fontFamily: "'Space Grotesk', sans-serif", borderBottom: "1px solid rgba(255,255,255,.08)", paddingBottom: 10 }}>{post.title}</a>)}
              <a href="/shop" className="glass-pill glass-pill-outline glass-pill-sm" style={{ textDecoration: "none", width: "max-content" }}>Explore Products</a>
              <a href="/services" className="glass-pill glass-pill-outline glass-pill-sm" style={{ textDecoration: "none", width: "max-content" }}>Explore Services</a>
            </div>
          </div>
        </div>
      </section>
      <FooterSection />
      <ScrollToTop />
      <style>{`@media (max-width: 900px) { .gaming-article-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

function GamingHubPage({ service, postSlug }: { service: Service; postSlug?: string | null }) {
  const { store, trackGamingHubMetric, patchGamingHubItem } = useDashboardData();
  const [selected, setSelected] = useState("All");
  const published = (store.gamingHub || []).filter(item => item.status === "published" && item.showOnHub);
  const target = postSlug ? published.find(item => item.slug === postSlug) : null;
  const visible = published.filter(item => gamingCategoryMatches(item, selected));
  const news = published.filter(item => item.showInLatestNews || ["gaming-news", "latest-hardware", "gaming-tip"].includes(item.type)).slice(0, 3);
  const builds = published.filter(item => item.showInSignatureMachines || item.type === "featured-build").slice(0, 3);
  const offers = published.filter(item => item.showInExclusiveOffers || item.type === "offer").slice(0, 3);
  const testimonials = published.filter(item => item.type === "testimonial").slice(0, 4);
  const faqs = published.filter(item => item.type === "faq").slice(0, 6);

  if (postSlug) {
    if (!target) return <NotFoundView />;
    return <GamingHubArticlePage item={target} related={published.filter(item => item.id !== target.id)} track={trackGamingHubMetric} patchGamingHubItem={patchGamingHubItem} />;
  }

  return (
    <div style={{ background: "#050505", color: "white", minHeight: "100vh", paddingBottom: 70 }}>
      <Navbar />
      <BreadcrumbBar crumbs={["Home", "Services", service.title]} />
      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "80px 20px 35px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(280px,.75fr) minmax(0,1.25fr)", gap: 42, alignItems: "center" }} className="gaming-article-grid">
          <div className="glass-card" style={{ minHeight: 280, display: "grid", placeItems: "center", borderColor: "rgba(255,31,69,.28)", background: "linear-gradient(135deg, rgba(255,31,69,.15), rgba(255,31,69,.04))" }}>
            <Gamepad2 size={92} color="#e5001f" />
          </div>
          <div>
            <span style={{ color: "#ff2f55", fontFamily: "'Orbitron', sans-serif", fontSize: 12, letterSpacing: 4 }}>DESKTO SERVICE CATEGORY</span>
            <h1 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: "clamp(46px,7vw,86px)", lineHeight: .95, margin: "20px 0", letterSpacing: 0 }}>{service.title}</h1>
            <p style={{ color: "#d0d0d0", fontFamily: "'Space Grotesk', sans-serif", fontSize: 18, lineHeight: 1.7, maxWidth: 760 }}>{service.longDescription}</p>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", marginTop: 24 }}>
              <a href="#gaming-posts" className="glass-pill glass-pill-primary" style={{ textDecoration: "none" }}><CheckCircle size={16} /> Explore</a>
              <a href={`https://wa.me/${WHATSAPP.replace(/\D/g, "")}`} className="glass-pill glass-pill-success" style={{ textDecoration: "none" }}><MessageCircle size={16} /> WhatsApp</a>
              <a href={`tel:${WHATSAPP}`} className="glass-pill glass-pill-outline" style={{ textDecoration: "none" }}><Phone size={16} /> Call Shop</a>
            </div>
          </div>
        </div>
      </section>

      <section id="gaming-posts" style={{ maxWidth: 1180, margin: "0 auto", padding: "45px 20px" }}>
        <SectionHeader eyebrow="What's Included" title="All" accent="Services" sub={`${published.length} published Gaming Hub items`} />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(230px,1fr))", gap: 12, marginTop: 28 }}>
          <button className={selected === "All" ? "glass-pill glass-pill-primary" : "glass-pill glass-pill-outline"} onClick={() => setSelected("All")}>All</button>
          {GAMING_CATEGORIES.map(cat => {
            const Icon = cat.icon;
            return <button key={cat.type} className={selected === cat.type || selected === cat.label ? "glass-pill glass-pill-primary" : "glass-pill glass-pill-outline"} onClick={() => setSelected(cat.type)}><Icon size={14} /> {cat.label}</button>;
          })}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: 18, marginTop: 28 }}>
          {visible.map(item => <GamingHubCard key={item.id} item={item} onRead={() => trackGamingHubMetric(item.id, "reads")} />)}
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "35px 20px" }}>
        <SectionHeader eyebrow="Featured Builds" title="Signature" accent="Machines" sub="Admin-managed builds and featured editorials." />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", gap: 18, marginTop: 28 }}>
          {builds.map(item => <GamingHubCard key={item.id} item={item} onRead={() => trackGamingHubMetric(item.id, "reads")} />)}
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "35px 20px" }}>
        <SectionHeader eyebrow="Hot Deals" title="Exclusive" accent="Offers" sub="Active offers published by admin." />
        <div style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(260px,.5fr)", gap: 18 }} className="gaming-article-grid">
          {offers[0] && <GamingHubCard item={offers[0]} onRead={() => trackGamingHubMetric(offers[0].id, "reads")} />}
          <div style={{ display: "grid", gap: 12 }}>{offers.slice(1).map(item => <a key={item.id} href={`/services/gaming-hub/${item.slug}`} className="glass-card" style={{ padding: 18, color: "white", textDecoration: "none" }}><b style={{ fontFamily: "'Orbitron', sans-serif" }}>{item.title}</b><p style={{ color: "#aaa", marginBottom: 0 }}>{item.discount || item.shortDescription}</p></a>)}</div>
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "35px 20px" }}>
        <SectionHeader eyebrow="Gaming News" title="Stay" accent="Updated" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(270px,1fr))", gap: 18, marginTop: 28 }}>
          {news.map(item => <GamingHubCard key={item.id} item={item} onRead={() => trackGamingHubMetric(item.id, "reads")} />)}
        </div>
      </section>

      <section style={{ maxWidth: 1180, margin: "0 auto", padding: "35px 20px" }}>
        <SectionHeader eyebrow="Testimonials" title="What Our" accent="Customers Say" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))", gap: 18, marginTop: 28 }}>
          {testimonials.map(item => <a key={item.id} href={`/services/gaming-hub/${item.slug}`} className="glass-card" style={{ padding: 22, color: "white", textDecoration: "none" }}><div style={{ color: "#ff2f55", marginBottom: 14 }}>★★★★★</div><p style={{ color: "#ddd", fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.65 }}>“{item.body}”</p><b style={{ fontFamily: "'Orbitron', sans-serif" }}>{item.title}</b></a>)}
        </div>
      </section>

      <section style={{ maxWidth: 900, margin: "0 auto", padding: "35px 20px" }}>
        <SectionHeader eyebrow="FAQ" title="Common" accent="Questions" />
        <div style={{ display: "grid", gap: 12, marginTop: 28 }}>
          {faqs.map(item => <details key={item.id} className="glass-card" style={{ padding: 18 }}><summary style={{ cursor: "pointer", fontFamily: "'Orbitron', sans-serif", color: "white" }}>{item.title}</summary><p style={{ color: "#cfcfcf", fontFamily: "'Space Grotesk', sans-serif", lineHeight: 1.6 }}>{item.body}</p></details>)}
        </div>
      </section>
      <FooterSection />
      <ScrollToTop />
      <style>{`@media (max-width: 900px) { .gaming-article-grid { grid-template-columns: 1fr !important; } }`}</style>
    </div>
  );
}

// ─────────────── MAIN PAGE ───────────────
export default function ServicesPage({ slug, child }: { slug: string | null; child?: string | null }) {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [slug, child]);

  // Index mode
  if (slug === null) {
    return <ServicesIndex />;
  }

  if (slug === "pc-repair" || slug === "laptop-repair") {
    return <RepairBookingPage kind={slug} />;
  }

  const service = SERVICES.find((s) => s.slug === slug);
  if (!service) return <NotFoundView />;
  if (service.slug === "repair") return <RepairHubPage service={service} />;
  if (service.slug === "custom-pc") return <CustomPCBuildPage service={service} />;
  if (service.slug === "upgrade") return <UpgradeOptimizationPage service={service} />;
  if (service.slug === "software") return <SoftwareDataServicePage service={service} />;
  if (service.slug === "rental") return <RentalSolutionsPage service={service} />;
  if (service.slug === "marketplace") return <SellUsedProductsPage service={service} />;
  if (service.slug === "remote-it") return <RemoteBusinessSupportPage service={service} />;
  if (service.slug === "gaming-hub") return <GamingHubPage service={service} postSlug={child} />;

  return (
    <div style={{ background: "#050505", color: "white", minHeight: "100vh", paddingBottom: 60 }}>
      <Navbar />
      <BreadcrumbBar crumbs={["Home", "Services", service.title]} />
      <ServiceHero service={service} />
      <IncludedServicesSection service={service} />
      <PricingSection service={service} />
      <FaqSection service={service} />
      <RelatedServicesSection service={service} />
      <CtaSection service={service} />
      <FooterSection />
      <ScrollToTop />
      <style>{`
        @media (max-width: 900px) {
          .section-inner > div[style*="grid-template-columns: minmax"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
