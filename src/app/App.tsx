import { Component, type ReactNode, useState, useEffect, useRef, useCallback, useReducer, useMemo } from "react";
import { motion, useInView, useScroll, useTransform } from "motion/react";
import { useWishlist } from "@/app/lib/wishlist";
import ProductDetailPage from "@/app/ProductDetailPage";
import ServicesPage from "@/app/ServicesPage";
import { SERVICES } from "@/app/lib/services";
import { useDashboardData, type CatalogProduct } from "@/app/lib/dashboardData";
import { Toaster } from "@/app/components/ui/sonner";
import { BrandMark } from "@/app/components/BrandMark";
import { toast } from "sonner";
import { AUTH_STATE_CHANGED_EVENT, logout, useCurrentUser, login as apiLogin, register as apiRegister } from "@/app/lib/currentUser";
import { ordersApi, isAuthenticated as isApiAuthenticated } from "@/app/lib/api";
import CustomerDashboard from "@/app/CustomerDashboard";
import StaffDashboard from "@/app/StaffDashboard";
import AdminDashboard from "@/app/AdminDashboard";
import {
  HardDrive, Zap, Wrench, ChevronRight, ChevronUp,
  Star, ArrowRight, Wifi, Clock, CheckCircle, Circle,
  Menu, Search, ShoppingCart, Heart, Bell, Gamepad2, Package,
  Settings, TrendingUp, MapPin, Phone, Mail,
  Minus, Plus, X, Instagram, Youtube, Facebook,
  RefreshCw, Twitter, UserPlus, LogIn, KeyRound, ShieldCheck,
  LogOut, ClipboardCheck, Database, Lock, History, Smartphone,
  Truck, CreditCard, Banknote, Wallet, Check, ChevronLeft, Eye, User
} from "lucide-react";

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  resetDemoState = () => {
    try {
      window.localStorage.removeItem("deskto-dashboard-v1");
      const raw = window.localStorage.getItem("deskto-auth-demo-state");
      if (raw) {
        const parsed = JSON.parse(raw);
        parsed.users = (parsed.users || []).map((user: any) => ({
          ...user,
          status: user.status === "locked" ? "locked" : "active",
        }));
        window.localStorage.setItem("deskto-auth-demo-state", JSON.stringify(parsed));
      }
    } catch {}
    window.location.href = "/dashboard/admin";
  };

  render() {
    if (!this.state.error) return this.props.children;
    return (
      <div style={{ background: "#050505", minHeight: "100vh", color: "white", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, fontFamily: "'Space Grotesk', sans-serif" }}>
        <div className="glass-card" style={{ width: "min(720px, 100%)", padding: 24, display: "grid", gap: 14, borderColor: "rgba(255,31,69,.35)" }}>
          <div style={{ fontFamily: "'Orbitron', sans-serif", color: "#FF1F45", fontSize: 22 }}>Dashboard could not load</div>
          <div style={{ color: "#bbb", lineHeight: 1.6 }}>
            A saved demo record in this browser is blocking the dashboard render. Resetting demo dashboard data regenerates clean records.
          </div>
          <pre style={{ whiteSpace: "pre-wrap", color: "#ccc", background: "#080808", border: "1px solid rgba(255,255,255,.12)", borderRadius: 8, padding: 12, maxHeight: 180, overflow: "auto", fontSize: 11 }}>
            {this.state.error.message}
          </pre>
          <button className="glass-pill glass-pill-primary" style={{ width: "fit-content" }} onClick={this.resetDemoState}>Reset Demo Data & Open Admin</button>
        </div>
      </div>
    );
  }
}

// ─────────────── GLOBAL STYLES ───────────────
function GlobalStyles() {
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@300;400;500;600;700&family=Inter:wght@300;400;500;600;700&family=Rajdhani:wght@300;400;500;600;700&display=swap');

      /* ── Keyframes ── */
      @keyframes float{0%,100%{transform:translateY(0) rotate(0deg);}33%{transform:translateY(-14px) rotate(1.5deg);}66%{transform:translateY(-6px) rotate(-1deg);}}
      @keyframes float2{0%,100%{transform:translateY(0);}50%{transform:translateY(-18px);}}
      @keyframes float3{0%,100%{transform:translateY(0);}50%{transform:translateY(-22px);}}
      @keyframes glow-pulse{0%,100%{box-shadow:0 0 16px rgba(255,31,69,.25),0 0 32px rgba(255,31,69,.08);}50%{box-shadow:0 0 36px rgba(255,31,69,.6),0 0 72px rgba(255,31,69,.2);}}
      @keyframes rotate-slow{from{transform:rotate(0)}to{transform:rotate(360deg)}}
      @keyframes rotate-reverse{from{transform:rotate(360deg)}to{transform:rotate(0)}}
      @keyframes scan-line{0%{top:-2px;opacity:0}5%{opacity:1}95%{opacity:.4}100%{top:100%;opacity:0}}
      @keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
      @keyframes glitch{0%,88%,100%{transform:translate(0);clip-path:none}89%{transform:translate(-2px,1px);clip-path:polygon(0 20%,100% 20%,100% 40%,0 40%)}90%{transform:translate(2px,-1px);clip-path:polygon(0 60%,100% 60%,100% 80%,0 80%)}91%{transform:translate(0);clip-path:none}}
      @keyframes shimmer{0%{background-position:-200% center}100%{background-position:200% center}}
      @keyframes rgb-bar{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
      @keyframes fade-slide-down{from{opacity:0;transform:translateY(-12px)}to{opacity:1;transform:translateY(0)}}
      @keyframes gpu3d-float{0%,100%{transform:rotateX(12deg) rotateY(-22deg) translateY(0) scale(1);}25%{transform:rotateX(13deg) rotateY(-20deg) translateY(-18px) scale(1.005);}50%{transform:rotateX(11deg) rotateY(-24deg) translateY(-30px) scale(1.01);}75%{transform:rotateX(13deg) rotateY(-21deg) translateY(-12px) scale(1.003);}}

      /* ── Resets ── */
      *,*::before,*::after{box-sizing:border-box;}
      html{scroll-behavior:smooth;}
      body{background:#050505;color:#fff;font-family:'Inter',sans-serif;overflow-x:hidden;}
      ::-webkit-scrollbar{width:3px}
      ::-webkit-scrollbar-track{background:#050505}
      ::-webkit-scrollbar-thumb{background:#FF1F45;border-radius:2px}
      ::selection{background:rgba(255,31,69,.3);color:#fff}

      /* ── Glass System ── */
      .glass{
        background:rgba(255,255,255,0.04);
        backdrop-filter:blur(20px) saturate(180%);
        -webkit-backdrop-filter:blur(20px) saturate(180%);
        border:1px solid rgba(255,255,255,0.09);
      }
      .glass-dark{
        background:rgba(5,5,5,0.88);
        backdrop-filter:blur(24px) saturate(200%);
        -webkit-backdrop-filter:blur(24px) saturate(200%);
        border:1px solid rgba(255,255,255,0.06);
      }
      .glass-red{
        background:rgba(255,31,69,0.07);
        backdrop-filter:blur(16px) saturate(160%);
        -webkit-backdrop-filter:blur(16px) saturate(160%);
        border:1px solid rgba(255,31,69,0.22);
      }
      .glass-card{
        background:rgba(255,255,255,0.025);
        backdrop-filter:blur(28px) saturate(200%);
        -webkit-backdrop-filter:blur(28px) saturate(200%);
        border:1px solid rgba(255,255,255,0.08);
        box-shadow:0 8px 32px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.06);
      }

      /* ── Glass Button Base ── */
      /* ── GLASS PILL BUTTON SYSTEM ── */
      .glass-pill{
        position:relative;display:inline-flex;align-items:center;justify-content:center;gap:8px;
        font-family:'Orbitron',sans-serif;font-weight:700;letter-spacing:1.5px;text-transform:uppercase;
        background:transparent;
        border:1px solid rgba(255,255,255,0.18);
        color:white;
        transition:all .25s ease;
        backdrop-filter:blur(20px) saturate(180%);
        -webkit-backdrop-filter:blur(20px) saturate(180%);
        white-space:nowrap;text-decoration:none;cursor:pointer;
        padding:11px 22px;border-radius:9999px;font-size:10px;
      }
      .glass-pill:hover{
        background:rgba(255,255,255,0.06);
        border-color:rgba(255,255,255,0.32);
        transform:translateY(-1px);
      }
      .glass-pill:active{transform:translateY(0) scale(.98);}

      .glass-pill-primary{
        border-color:rgba(255,31,69,0.6);
        color:#FF1F45;
        background:rgba(255,31,69,0.06);
      }
      .glass-pill-primary:hover{
        background:rgba(255,31,69,0.14);
        border-color:#FF1F45;
        box-shadow:0 0 24px rgba(255,31,69,0.4);
      }
      .glass-pill-outline{
        border-color:rgba(255,255,255,0.18);
      }
      .glass-pill-outline:hover{
        border-color:rgba(255,31,69,0.45);
        background:rgba(255,31,69,0.04);
      }
      .glass-pill-red{
        border-color:rgba(255,31,69,0.45);
        color:#FF1F45;
      }
      .glass-pill-red:hover{
        background:rgba(255,31,69,0.1);
        border-color:rgba(255,31,69,0.7);
      }
      .glass-pill-success{
        border-color:rgba(0,204,102,0.55);
        color:#00cc66;
        background:rgba(0,204,102,0.06);
      }
      .glass-pill-success:hover{
        background:rgba(0,204,102,0.14);
        border-color:#00cc66;
        box-shadow:0 0 24px rgba(0,204,102,0.35);
      }
      .glass-pill-warn{
        border-color:rgba(255,107,0,0.55);
        color:#ff6b00;
        background:rgba(255,107,0,0.06);
      }
      .glass-pill-warn:hover{
        background:rgba(255,107,0,0.14);
        border-color:#ff6b00;
        box-shadow:0 0 24px rgba(255,107,0,0.35);
      }
      .glass-pill-info{
        border-color:rgba(0,180,255,0.55);
        color:#00b4ff;
        background:rgba(0,180,255,0.06);
      }
      .glass-pill-info:hover{
        background:rgba(0,180,255,0.14);
        border-color:#00b4ff;
        box-shadow:0 0 24px rgba(0,180,255,0.35);
      }
      .glass-pill-icon{
        padding:0;width:38px;height:38px;font-size:0;border-radius:50%;
        border:1px solid rgba(255,255,255,0.18);
      }
      .glass-pill-icon:hover{
        background:rgba(255,31,69,0.1);
        border-color:rgba(255,31,69,0.45);
        color:#FF1F45;
      }
      .glass-pill-sm{padding:7px 14px;font-size:9px;}
      .glass-pill-lg{padding:14px 28px;font-size:11px;}
      .glass-pill-block{width:100%;}

      /* ── GLASS ICON CONTAINERS ── */
      .glass-icon-circle{
        width:48px;height:48px;border-radius:50%;
        display:flex;align-items:center;justify-content:center;
        background:rgba(255,255,255,0.05);
        border:1px solid rgba(255,255,255,0.12);
        backdrop-filter:blur(20px) saturate(180%);
        -webkit-backdrop-filter:blur(20px) saturate(180%);
      }
      .glass-icon-circle-red{
        background:rgba(255,31,69,0.08);
        border-color:rgba(255,31,69,0.35);
      }
      .glass-icon-circle-success{
        background:rgba(0,204,102,0.08);
        border-color:rgba(0,204,102,0.35);
      }
      .glass-icon-circle-info{
        background:rgba(0,180,255,0.08);
        border-color:rgba(0,180,255,0.35);
      }
      .glass-icon-tile{
        width:48px;height:48px;border-radius:9999px;
        display:flex;align-items:center;justify-content:center;
        background:rgba(255,255,255,0.05);
        border:1px solid rgba(255,255,255,0.12);
        backdrop-filter:blur(20px) saturate(180%);
        -webkit-backdrop-filter:blur(20px) saturate(180%);
      }
      .glass-icon-tile-red{
        background:rgba(255,31,69,0.08);
        border-color:rgba(255,31,69,0.35);
      }

      /* ── Card hover ── */
      .card-hover{transition:all .35s cubic-bezier(.23,1,.32,1);}
      .card-hover:hover{
        transform:translateY(-8px) scale(1.015);
        box-shadow:0 24px 60px rgba(255,31,69,.14),0 0 0 1px rgba(255,31,69,.2);
      }

      /* ── Cyber grid ── */
      .cyber-grid{
        background-image:linear-gradient(rgba(255,31,69,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,31,69,.025) 1px,transparent 1px);
        background-size:44px 44px;
      }

      /* ── Animations ── */
      .animate-float{animation:float 6.5s ease-in-out infinite;}
      .animate-float2{animation:float2 8s ease-in-out infinite;}
      .animate-float3{animation:float3 7s ease-in-out infinite 1.5s;}
      .animate-float4{animation:float2 9s ease-in-out infinite 3s;}
      .animate-glow{animation:glow-pulse 3s ease-in-out infinite;}
      .animate-rotate-slow{animation:rotate-slow 22s linear infinite;}
      .animate-rotate-reverse{animation:rotate-reverse 28s linear infinite;}
      .animate-fan-1{animation:rotate-slow 2.2s linear infinite;transform-box:fill-box;transform-origin:50% 50%;}
      .animate-fan-2{animation:rotate-reverse 2.6s linear infinite;transform-box:fill-box;transform-origin:50% 50%;}
      .animate-fan-3{animation:rotate-slow 2.4s linear infinite;transform-box:fill-box;transform-origin:50% 50%;}
      .gpu3d-stage{perspective:1600px;perspective-origin:40% 45%;}
      .gpu3d-card{transform-style:preserve-3d;animation:gpu3d-float 10s ease-in-out infinite;will-change:transform;}
      .animate-glitch{animation:glitch 9s infinite;}
      .animate-marquee{animation:marquee 32s linear infinite;}
      .rgb-bar{background:linear-gradient(90deg,#f00,#ff6b00,#ff0,#0f0,#00f,#f0f,#f00);background-size:400% 100%;animation:rgb-bar 4s linear infinite;}
      .gpu-rgb-pulse{animation:gpu-rgb-pulse 3s ease-in-out infinite;}
      @keyframes gpu-rgb-pulse{0%,100%{opacity:.7;filter:drop-shadow(0 0 4px rgba(255,31,69,.4));}50%{opacity:1;filter:drop-shadow(0 0 12px rgba(255,31,69,.8)) drop-shadow(0 0 24px rgba(139,0,0,.5));}}
      @keyframes gpu-spark{0%{transform:translate(0,0) scale(1);opacity:1;}100%{transform:translate(var(--sx),var(--sy)) scale(0);opacity:0;}}
      @keyframes gpu-particle-drift{0%{transform:translateY(0) translateX(0);opacity:var(--po,0.4);}50%{transform:translateY(var(--dy,-20px)) translateX(var(--dx,10px));opacity:calc(var(--po,0.4)*1.5);}100%{transform:translateY(0) translateX(0);opacity:var(--po,0.4);}}

      /* ── Visibility helpers ── */
      .desktop-only{display:flex!important;}
      .mobile-only{display:none!important;}

      /* ─────────── MOBILE ─────────── */
      @media(max-width:900px){
        .desktop-only{display:none!important;}
        .mobile-only{display:flex!important;}

        /* Navbar */
        .nav-inner{padding:0 16px!important;height:58px!important;}
        .nav-logo-text{font-size:14px!important;letter-spacing:3px!important;}

        /* Hero */
        .hero-content{padding:86px 20px 136px!important;}
        .hero-floating,.hero-rings{display:none!important;}
        .hero-gpu-bg{width:160%!important;right:auto!important;left:50%!important;transform:translate(-50%,-50%)!important;opacity:.3!important;top:42%!important;filter:saturate(.8) brightness(1.2)!important;}
        .hero-stats{grid-template-columns:repeat(2,1fr)!important;padding:14px 20px!important;}
        .hero-stats-num{font-size:20px!important;}
        .hero-btns{flex-direction:column!important;}
        .hero-btns .glass-pill{width:100%!important;justify-content:center!important;}

        /* Section spacing */
        .section-pad{padding:64px 0!important;}
        .section-inner{padding:0 20px!important;}
        .section-h2{font-size:clamp(24px,6vw,40px)!important;}

        /* Grids */
        .products-grid{grid-template-columns:1fr 1fr!important;gap:12px!important;}
        .services-grid{grid-template-columns:1fr 1fr!important;gap:14px!important;}
        .workflow-grid{grid-template-columns:repeat(3,1fr)!important;gap:16px!important;}
        .workflow-line-abs{display:none!important;}
        .pcbuilder-grid{grid-template-columns:1fr!important;}
        .pcbuilder-summary{position:static!important;}
        .service-hero-grid{grid-template-columns:1fr!important;gap:28px!important;}
        .two-col-workflow{grid-template-columns:1fr!important;}
        .offers-grid{grid-template-columns:1fr!important;}
        .offers-hero{height:auto!important;min-height:240px!important;}
        .offers-hero:has(.offer-hero-pad){min-height:380px!important;}
        .location-grid{grid-template-columns:1fr!important;gap:32px!important;}
        .footer-grid{grid-template-columns:1fr 1fr!important;gap:24px!important;}
        .footer-brand{grid-column:1/-1!important;}
        .footer-pad{padding:40px 20px 24px!important;}
        .footer-bottom{flex-direction:column!important;align-items:flex-start!important;}
        .footer-bottom-links{flex-wrap:wrap!important;gap:14px!important;}

        /* Nav mobile menu animation */
        .mobile-menu{animation:fade-slide-down .25s ease;}
      }

      @media(max-width:600px){
        .products-grid{grid-template-columns:1fr!important;}
        .services-grid{grid-template-columns:1fr!important;}
        .builds-grid{grid-template-columns:1fr!important;}
        .workflow-grid{grid-template-columns:repeat(2,1fr)!important;}
        .pc-opts{grid-template-columns:1fr!important;}
        .hero-h1{font-size:clamp(30px,9vw,52px)!important;}
        .faq-btn{padding:14px 16px!important;}
        .faq-q{font-size:12px!important;}
        .offer-h3{font-size:clamp(16px,4vw,22px)!important;}
        .offer-hero-pad{padding-right:28px!important;padding-top:84px!important;}
        .footer-grid{grid-template-columns:1fr!important;}
      }

      @media(max-width:400px){
        .hero-stats{grid-template-columns:1fr 1fr!important;}
        .nav-inner{padding:0 12px!important;}
      }

      /* ── DASHBOARD SHELL ── */
      .dash-shell{display:grid;grid-template-columns:240px 1fr;min-height:100vh;background:#050505;}
      .dash-sidebar{position:sticky;top:0;height:100vh;overflow:hidden;border-right:1px solid rgba(255,255,255,0.06);padding:20px 14px;background:rgba(10,10,10,0.6);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);}
      .dash-sidebar-link{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:10px;font-family:'Space Grotesk',sans-serif;font-size:12px;color:#888;transition:all .15s;cursor:pointer;border-left:2px solid transparent;margin-bottom:2px;}
      .dash-sidebar-link:hover{background:rgba(255,255,255,0.04);color:white;}
      .dash-sidebar-link.active{background:rgba(255,31,69,0.1);color:#FF1F45;border-left-color:#FF1F45;}
      .dash-main{padding:24px 32px;}
      .dash-topbar{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:14px 24px;border-bottom:1px solid rgba(255,255,255,0.06);position:sticky;top:0;background:rgba(5,5,5,0.85);backdrop-filter:blur(20px);-webkit-backdrop-filter:blur(20px);z-index:50;}
      .dash-kpi-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:14px;}
      .dash-tab-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:14px;}
      .dash-timeline{display:flex;flex-direction:column;gap:12px;position:relative;padding-left:18px;}
      .dash-timeline::before{content:"";position:absolute;left:5px;top:6px;bottom:6px;width:1px;background:rgba(255,255,255,0.1);}
      .dash-timeline-step{position:relative;}
      .dash-timeline-step::before{content:"";position:absolute;left:-18px;top:6px;width:11px;height:11px;border-radius:50%;background:#0a0a0a;border:2px solid #555;}
      .dash-timeline-step.done::before{background:#00cc66;border-color:#00cc66;box-shadow:0 0 8px rgba(0,204,102,0.5);}
      .dash-timeline-step.current::before{background:#FF1F45;border-color:#FF1F45;box-shadow:0 0 8px rgba(255,31,69,0.6);}
      .dash-sidebar-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:590;display:none;}
      .dash-menu-btn,.dash-sidebar-close{display:none;}
      @media (max-width:768px){
        .dash-shell{grid-template-columns:1fr;}
        .dash-sidebar{position:fixed;top:0;left:0;width:270px;max-width:82vw;height:100vh;z-index:600;transform:translateX(-100%);transition:transform .28s ease;box-shadow:12px 0 32px rgba(0,0,0,.55);}
        .dash-sidebar.open{transform:translateX(0);}
        .dash-sidebar-backdrop{display:block;}
        .dash-menu-btn{display:flex!important;}
        .dash-sidebar-close{display:flex!important;}
        .dash-main{padding:16px!important;}
        .dash-topbar{padding:10px 14px!important;gap:8px!important;flex-wrap:wrap!important;}
        .dash-search-box{min-width:0!important;flex:1 1 100%!important;order:3;margin-right:0!important;}
        .dash-search-box input{font-size:16px!important;}
        .dash-kpi-grid{grid-template-columns:repeat(auto-fit,minmax(140px,1fr))!important;gap:10px!important;}
      }
    `}</style>
  );
}

// ─────────────── PARTICLES ───────────────
function ParticleCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d"); if (!ctx) return;
    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize(); window.addEventListener("resize", resize);
    const pts = Array.from({ length: 80 }, () => ({ x: Math.random()*window.innerWidth, y: Math.random()*window.innerHeight, vx:(Math.random()-.5)*.4, vy:(Math.random()-.5)*.4, size:Math.random()*1.6+.4, alpha:Math.random()*.4+.1, red:Math.random()>.8 }));
    let id: number;
    const draw = () => {
      ctx.clearRect(0,0,canvas.width,canvas.height);
      pts.forEach(p => {
        p.x+=p.vx; p.y+=p.vy;
        if(p.x<0)p.x=canvas.width; if(p.x>canvas.width)p.x=0;
        if(p.y<0)p.y=canvas.height; if(p.y>canvas.height)p.y=0;
        ctx.beginPath(); ctx.arc(p.x,p.y,p.size,0,Math.PI*2); ctx.fillStyle=p.red?"#FF1F45":"#fff"; ctx.globalAlpha=p.alpha; ctx.fill();
      });
      ctx.globalAlpha=1;
      for(let i=0;i<pts.length;i++) for(let j=i+1;j<pts.length;j++){
        const dx=pts[i].x-pts[j].x,dy=pts[i].y-pts[j].y,d=Math.sqrt(dx*dx+dy*dy);
        if(d<100){ ctx.globalAlpha=(1-d/100)*.05; ctx.strokeStyle="rgba(255,31,69,.8)"; ctx.lineWidth=.4; ctx.beginPath(); ctx.moveTo(pts[i].x,pts[i].y); ctx.lineTo(pts[j].x,pts[j].y); ctx.stroke(); }
      }
      ctx.globalAlpha=1; id=requestAnimationFrame(draw);
    };
    draw();
    return () => { window.removeEventListener("resize",resize); cancelAnimationFrame(id); };
  }, []);
  return <canvas ref={canvasRef} style={{ position:"absolute",inset:0,width:"100%",height:"100%",pointerEvents:"none" }} />;
}

// ─────────────── REVEAL ───────────────
export function Reveal({ children, delay=0, dir="up" }: { children: React.ReactNode; delay?: number; dir?: "up"|"left"|"right" }) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const init = dir==="up" ? {opacity:0,y:36} : dir==="left" ? {opacity:0,x:-36} : {opacity:0,x:36};
  return (
    <motion.div ref={ref} initial={init} animate={inView?{opacity:1,x:0,y:0}:init} transition={{duration:.7,delay,ease:[.22,1,.36,1]}}>
      {children}
    </motion.div>
  );
}

// ─────────────── SECTION HEADER ───────────────
export function SectionHeader({ eyebrow,title,accent,sub }: { eyebrow:string;title:string;accent:string;sub?:string }) {
  return (
    <div style={{ textAlign:"center",marginBottom:52 }}>
      <Reveal>
        <span className="glass-red" style={{ display:"inline-block",padding:"6px 16px",borderRadius:4,fontFamily:"'Space Grotesk',sans-serif",fontSize:10,fontWeight:600,color:"#FF1F45",letterSpacing:"3px",textTransform:"uppercase",marginBottom:16 }}>{eyebrow}</span>
      </Reveal>
      <Reveal delay={.1}>
        <h2 className="section-h2" style={{ fontFamily:"'Orbitron',sans-serif",fontSize:"clamp(26px,4vw,50px)",fontWeight:900,lineHeight:1.05,letterSpacing:"-.5px",marginBottom:12 }}>
          <span style={{ color:"white" }}>{title} </span>
          <span style={{ background:"linear-gradient(135deg,#FF1F45,#ff8090)",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent" }}>{accent}</span>
        </h2>
      </Reveal>
      {sub && <Reveal delay={.2}><p style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:15,color:"#CFCFCF",maxWidth:500,margin:"0 auto",lineHeight:1.7 }}>{sub}</p></Reveal>}
    </div>
  );
}

// ─────────────── 3D TILT CARD ───────────────
export function TiltCard({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const onMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current; if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX-r.left)/r.width-.5, y = (e.clientY-r.top)/r.height-.5;
    el.style.transform = `perspective(900px) rotateX(${-y*10}deg) rotateY(${x*12}deg)`;
    el.style.transition = "transform .08s ease";
  }, []);
  const onLeave = useCallback(() => {
    if (ref.current) { ref.current.style.transform = "perspective(900px) rotateX(0) rotateY(0)"; ref.current.style.transition = "transform .5s cubic-bezier(.23,1,.32,1)"; }
  }, []);
  return <div ref={ref} onMouseMove={onMove} onMouseLeave={onLeave} style={{ transformStyle:"preserve-3d" }}>{children}</div>;
}

// ─────────────── NAVBAR ───────────────
function NavbarDashboardCTA({ mobile=false, onNavigate }: { mobile?: boolean; onNavigate?: () => void }) {
  const user = useCurrentUser();
  if (user) {
    return (
      <a href={`/dashboard/${user.role}`} onClick={onNavigate} className={`glass-pill glass-pill-primary ${mobile ? "glass-pill-block glass-pill-lg" : "glass-pill-sm desktop-only"}`} style={{ marginLeft: mobile ? 0 : 4, marginTop: mobile ? 16 : undefined }}>
        {user.name}
      </a>
    );
  }
  return (
    <a href="/sign-up" onClick={onNavigate} className={`glass-pill glass-pill-primary ${mobile ? "glass-pill-block glass-pill-lg" : "glass-pill-sm desktop-only"}`} style={{ marginLeft: mobile ? 0 : 4, marginTop: mobile ? 16 : undefined }}>
      Sign Up
    </a>
  );
}

function NavbarLogoutButton({ mobile=false, onLogout }: { mobile?: boolean; onLogout?: () => void }) {
  const user = useCurrentUser();
  if (!user) return null;
  return (
    <button
      type="button"
      onClick={() => {
        onLogout?.();
        logout();
      }}
      className={`glass-pill glass-pill-red ${mobile ? "glass-pill-block glass-pill-lg" : "glass-pill-sm"}`}
      style={{ marginTop: mobile ? 8 : undefined }}
    >
      <LogOut size={12} /> Log Out
    </button>
  );
}

function readNavbarCartCount() {
  if (typeof window === "undefined") return 0;
  try {
    const raw = window.localStorage.getItem("deskto_cart_v1");
    const cart = raw ? JSON.parse(raw) : {};
    if (!cart || typeof cart !== "object") return 0;
    return Object.values(cart).reduce((sum, qty) => sum + Number(qty || 0), 0);
  } catch {
    return 0;
  }
}

function NavbarCartButton({ mobile=false }: { mobile?: boolean }) {
  const [count, setCount] = useState(() => readNavbarCartCount());
  useEffect(() => {
    const sync = () => setCount(readNavbarCartCount());
    window.addEventListener("storage", sync);
    window.addEventListener("deskto-cart-changed", sync);
    window.addEventListener("focus", sync);
    sync();
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("deskto-cart-changed", sync);
      window.removeEventListener("focus", sync);
    };
  }, []);

  return (
    <a href="/checkout" className={`glass-pill glass-pill-icon${mobile ? " mobile-only" : ""}`} aria-label="Open cart" style={{ position:"relative",fontSize:0,textDecoration:"none",color:"white" }}>
      <ShoppingCart size={mobile ? 16 : 15} />
      {count > 0 && (
        <span style={{ position:"absolute",top:3,right:3,minWidth:13,height:13,padding:"0 3px",background:"#FF1F45",borderRadius:999,fontSize:7,display:"flex",alignItems:"center",justifyContent:"center",color:"white",fontFamily:"'Rajdhani',sans-serif",fontWeight:700 }}>
          {count > 99 ? "99+" : count}
        </span>
      )}
    </a>
  );
}

export function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);

  const links = [
    { label:"Home", href:"/" },
    { label:"Sign In", href:"/sign-in" },
    { label:"Shop Products", href:"/products" },
    { label:"Services", href:"/services" },
    { label:"Gaming Info", href:"#news" },
    { label:"Contact", href:"#contact" },
  ];

  return (
    <nav style={{ position:"fixed",top:0,left:0,right:0,zIndex:500,transition:"all .4s ease",background:scrolled?"rgba(5,5,5,.92)":"transparent",backdropFilter:scrolled?"blur(24px) saturate(200%)":"none",WebkitBackdropFilter:scrolled?"blur(24px) saturate(200%)":"none",borderBottom:scrolled?"1px solid rgba(255,255,255,.05)":"none" }}>
      <div className="nav-inner" style={{ maxWidth:1400,margin:"0 auto",padding:"0 28px",display:"flex",alignItems:"center",justifyContent:"space-between",height:68 }}>

        {/* Logo */}
        <a href="/" aria-label="Go to DESKTO home" style={{ display:"flex",alignItems:"center",gap:10,textDecoration:"none",flexShrink:0 }}>
          <BrandMark size={38} />
        </a>

        {/* Desktop links */}
        <div className="desktop-only" style={{ alignItems:"center",gap:30 }}>
          {links.map(l => (
            <a key={l.label} href={l.href}
              style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:11,fontWeight:600,color:"#CFCFCF",textDecoration:"none",letterSpacing:"1.5px",textTransform:"uppercase",transition:"color .3s" }}
              onMouseEnter={e=>(e.currentTarget.style.color="#FF1F45")}
              onMouseLeave={e=>(e.currentTarget.style.color="#CFCFCF")}>{l.label}</a>
          ))}
          <NavbarLogoutButton />
        </div>

        {/* Right actions */}
        <div style={{ display:"flex",alignItems:"center",gap:8 }}>
          {/* Desktop icon buttons */}
          <div className="desktop-only" style={{ alignItems:"center",gap:6 }}>
            <button className="glass-pill glass-pill-icon" style={{ fontSize:0 }}><Bell size={15} /></button>
            <NavbarCartButton />
          </div>

          {/* Desktop CTA */}
          <NavbarDashboardCTA />

          {/* Mobile: cart */}
          <NavbarCartButton mobile />

          {/* Mobile: hamburger */}
          <button className="glass-pill glass-pill-icon mobile-only" onClick={() => setOpen(o=>!o)} style={{ fontSize:0 }}>
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown */}
      {open && (
        <div className="glass-dark mobile-menu" style={{ borderTop:"1px solid rgba(255,31,69,.15)" }}>
          <div style={{ padding:"8px 20px 20px",display:"flex",flexDirection:"column" }}>
            {links.map(l => (
              <a key={l.label} href={l.href} onClick={() => setOpen(false)}
                style={{ fontFamily:"'Space Grotesk',sans-serif",color:"#CFCFCF",textDecoration:"none",fontSize:13,fontWeight:600,letterSpacing:"1.5px",textTransform:"uppercase",padding:"13px 0",borderBottom:"1px solid rgba(255,255,255,.04)",display:"flex",alignItems:"center",justifyContent:"space-between",transition:"color .3s" }}
                onMouseEnter={e=>(e.currentTarget.style.color="#FF1F45")}
                onMouseLeave={e=>(e.currentTarget.style.color="#CFCFCF")}>
                <span>{l.label}</span>
                <ChevronRight size={13} color="#FF1F45" />
              </a>
            ))}
            <NavbarLogoutButton mobile onLogout={() => setOpen(false)} />
            <NavbarDashboardCTA mobile onNavigate={() => setOpen(false)} />
          </div>
        </div>
      )}
    </nav>
  );
}

// ─────────────── HERO ───────────────
// Ultra-detailed RTX 5090-style triple-fan GPU rendered as inline SVG.
// Features: 3 spinning fans with realistic blades, heatsink fins, PCIe connector,
// 8-pin power connectors, backplate, metallic screws, vent grills, RGB edge strip,
// "RTX 5090" branding, ambient particles, sparks, and light streaks.
// All CSS-animated — no external images needed.

function Gpu3DFan({ cx, cy, r, anim }: { cx: number; cy: number; r: number; anim: string }) {
  const blades = 11;
  const bladeEls = Array.from({ length: blades }).map((_, i) => {
    const angle = (360 / blades) * i;
    return (
      <path
        key={i}
        transform={`rotate(${angle} ${cx} ${cy})`}
        d={`M ${cx} ${cy}
            C ${cx + r * 0.08} ${cy - r * 0.12} ${cx + r * 0.22} ${cy - r * 0.3} ${cx + r * 0.52} ${cy - r * 0.42}
            Q ${cx + r * 0.72} ${cy - r * 0.36} ${cx + r * 0.88} ${cy - r * 0.18}
            Q ${cx + r * 0.92} ${cy - r * 0.04} ${cx + r * 0.78} ${cy + r * 0.08}
            Q ${cx + r * 0.5} ${cy + r * 0.18} ${cx + r * 0.2} ${cy + r * 0.1}
            Q ${cx + r * 0.06} ${cy + r * 0.04} ${cx} ${cy} Z`}
        fill="url(#gpuBlade5090)"
        stroke="rgba(255,255,255,.05)"
        strokeWidth={0.4}
      />
    );
  });
  return (
    <g>
      {/* Outer ring with double rim */}
      <circle cx={cx} cy={cy} r={r + 14} fill="none" stroke="rgba(255,255,255,.06)" strokeWidth={1} />
      <circle cx={cx} cy={cy} r={r + 12} fill="#08080a" stroke="rgba(255,255,255,.1)" strokeWidth={2.5} />
      {/* Fan well depression */}
      <circle cx={cx} cy={cy} r={r + 6} fill="url(#gpuFanWell5090)" />
      {/* Inner ring detail */}
      <circle cx={cx} cy={cy} r={r + 2} fill="none" stroke="rgba(255,255,255,.04)" strokeWidth={0.5} strokeDasharray="3 5" />
      {/* Spinning blades */}
      <g className={anim}>{bladeEls}</g>
      {/* Central hub */}
      <circle cx={cx} cy={cy} r={r * 0.28} fill="url(#gpuHub5090)" stroke="rgba(255,255,255,.12)" strokeWidth={1.5} />
      <circle cx={cx} cy={cy} r={r * 0.2} fill="url(#gpuHubInner5090)" stroke="rgba(255,31,69,.3)" strokeWidth={1} />
      {/* Hub screws — 4 tiny dots */}
      {[0, 90, 180, 270].map(a => {
        const sr = r * 0.23;
        const sx = cx + sr * Math.cos((a * Math.PI) / 180);
        const sy = cy + sr * Math.sin((a * Math.PI) / 180);
        return <circle key={a} cx={sx} cy={sy} r={1.8} fill="#1a1a1e" stroke="rgba(255,255,255,.15)" strokeWidth={0.5} />;
      })}
      {/* Center LED glow */}
      <circle cx={cx} cy={cy} r={r * 0.07} fill="#FF1F45" opacity={0.9} className="animate-glow" />
      <circle cx={cx} cy={cy} r={r * 0.12} fill="none" stroke="rgba(255,31,69,.2)" strokeWidth={0.6} />
    </g>
  );
}

function Gpu3DBackground() {
  // Particle positions for ambient dust/sparks
  const particles = useMemo(() =>
    Array.from({ length: 22 }, (_, i) => ({
      x: 60 + Math.random() * 820,
      y: 20 + Math.random() * 500,
      size: Math.random() * 2 + 0.5,
      dur: 4 + Math.random() * 6,
      delay: Math.random() * 4,
      isRed: Math.random() > 0.6,
      dx: (Math.random() - 0.5) * 30,
      dy: (Math.random() - 0.5) * 25,
      opacity: 0.15 + Math.random() * 0.35,
    }))
  , []);

  // Spark positions (small bright points near the GPU edge)
  const sparks = useMemo(() =>
    Array.from({ length: 8 }, (_, i) => ({
      x: 120 + Math.random() * 700,
      y: 60 + Math.random() * 400,
      sx: (Math.random() - 0.5) * 60,
      sy: (Math.random() - 0.5) * 60,
      dur: 1.5 + Math.random() * 2,
      delay: Math.random() * 5,
    }))
  , []);

  return (
    <div className="gpu3d-stage" style={{ width: "100%", height: "100%", position: "relative" }}>
      {/* Ambient neon glow behind GPU */}
      <div style={{
        position: "absolute", top: "50%", left: "50%",
        transform: "translate(-50%, -50%)",
        width: "110%", height: "110%",
        background: "radial-gradient(ellipse 60% 55% at 50% 48%, rgba(255,31,69,.08) 0%, rgba(139,0,0,.04) 40%, transparent 70%)",
        pointerEvents: "none", zIndex: 0,
      }} />

      <div className="gpu3d-card" style={{ width: "100%", height: "100%", position: "relative", zIndex: 1 }}>
        <svg viewBox="0 0 940 540" style={{ width: "100%", height: "100%", display: "block", overflow: "visible" }} aria-hidden="true">
          <defs>
            {/* ── Gradient: Front shroud (dark matte metal) ── */}
            <linearGradient id="gpuShroud5090" x1="0" y1="0" x2="0.5" y2="1">
              <stop offset="0%" stopColor="#3d3d45" />
              <stop offset="25%" stopColor="#2a2a30" />
              <stop offset="60%" stopColor="#1a1a20" />
              <stop offset="100%" stopColor="#0f0f13" />
            </linearGradient>
            {/* ── Gradient: Side extrusion ── */}
            <linearGradient id="gpuSide5090" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#141417" />
              <stop offset="100%" stopColor="#040405" />
            </linearGradient>
            {/* ── Gradient: Top bevel ── */}
            <linearGradient id="gpuTop5090" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#38383e" />
              <stop offset="50%" stopColor="#1e1e22" />
              <stop offset="100%" stopColor="#0d0d10" />
            </linearGradient>
            {/* ── Gradient: Backplate ── */}
            <linearGradient id="gpuBackplate5090" x1="0" y1="0" x2="0.3" y2="1">
              <stop offset="0%" stopColor="#1a1a1e" />
              <stop offset="100%" stopColor="#0a0a0c" />
            </linearGradient>
            {/* ── Gradient: Fan well ── */}
            <radialGradient id="gpuFanWell5090" cx="50%" cy="42%" r="58%">
              <stop offset="0%" stopColor="#141417" />
              <stop offset="80%" stopColor="#08080a" />
              <stop offset="100%" stopColor="#050506" />
            </radialGradient>
            {/* ── Gradient: Blade ── */}
            <linearGradient id="gpuBlade5090" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#38383e" />
              <stop offset="40%" stopColor="#28282c" />
              <stop offset="100%" stopColor="#18181c" />
            </linearGradient>
            {/* ── Gradient: Hub ── */}
            <radialGradient id="gpuHub5090" cx="40%" cy="35%" r="70%">
              <stop offset="0%" stopColor="#2a2a2e" />
              <stop offset="100%" stopColor="#0d0d10" />
            </radialGradient>
            <radialGradient id="gpuHubInner5090" cx="45%" cy="40%" r="60%">
              <stop offset="0%" stopColor="#222226" />
              <stop offset="100%" stopColor="#0a0a0c" />
            </radialGradient>
            {/* ── Gradient: RGB bar (red-maroon theme) ── */}
            <linearGradient id="gpuRgb5090" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#8B0000" />
              <stop offset="20%" stopColor="#FF1F45" />
              <stop offset="40%" stopColor="#cc1133" />
              <stop offset="60%" stopColor="#FF1F45" />
              <stop offset="80%" stopColor="#8B0000" />
              <stop offset="100%" stopColor="#FF1F45" />
            </linearGradient>
            {/* ── Gradient: PCIe gold pins ── */}
            <linearGradient id="gpuPCIe5090" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#d4a340" />
              <stop offset="50%" stopColor="#b8922e" />
              <stop offset="100%" stopColor="#8a6d20" />
            </linearGradient>
            {/* ── Gradient: Power connector ── */}
            <linearGradient id="gpuPower5090" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#222226" />
              <stop offset="100%" stopColor="#111114" />
            </linearGradient>
            {/* ── Filter: Card drop shadow ── */}
            <filter id="gpuSoft5090" x="-20%" y="-20%" width="140%" height="140%">
              <feDropShadow dx="0" dy="20" stdDeviation="28" floodColor="#000" floodOpacity="0.6" />
              <feDropShadow dx="0" dy="6" stdDeviation="8" floodColor="#FF1F45" floodOpacity="0.08" />
            </filter>
            {/* ── Filter: Neon glow for RGB strip ── */}
            <filter id="gpuNeonGlow" x="-30%" y="-60%" width="160%" height="220%">
              <feGaussianBlur in="SourceGraphic" stdDeviation="4" result="blur1" />
              <feGaussianBlur in="SourceGraphic" stdDeviation="8" result="blur2" />
              <feMerge>
                <feMergeNode in="blur2" />
                <feMergeNode in="blur1" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            {/* ── Clip for backplate ventilation slots ── */}
            <clipPath id="backplateVents">
              <rect x="0" y="0" width="940" height="540" />
            </clipPath>
          </defs>

          {/* ═══════════ AMBIENT PARTICLES ═══════════ */}
          {particles.map((p, i) => (
            <circle
              key={`p-${i}`}
              cx={p.x} cy={p.y} r={p.size}
              fill={p.isRed ? "#FF1F45" : "#ffffff"}
              opacity={p.opacity}
              style={{
                animation: `gpu-particle-drift ${p.dur}s ease-in-out infinite`,
                animationDelay: `${p.delay}s`,
                ["--dx" as any]: `${p.dx}px`,
                ["--dy" as any]: `${p.dy}px`,
                ["--po" as any]: p.opacity,
              }}
            />
          ))}

          {/* ═══════════ SPARKS ═══════════ */}
          {sparks.map((s, i) => (
            <circle
              key={`s-${i}`}
              cx={s.x} cy={s.y} r={1}
              fill="#FF1F45"
              style={{
                animation: `gpu-spark ${s.dur}s ease-out infinite`,
                animationDelay: `${s.delay}s`,
                ["--sx" as any]: `${s.sx}px`,
                ["--sy" as any]: `${s.sy}px`,
              }}
            />
          ))}

          {/* ═══════════ LIGHT STREAKS (horizontal lens flares) ═══════════ */}
          <line x1="60" y1="188" x2="280" y2="188" stroke="url(#gpuRgb5090)" strokeWidth="0.5" opacity="0.15" className="gpu-rgb-pulse" />
          <line x1="650" y1="332" x2="880" y2="332" stroke="url(#gpuRgb5090)" strokeWidth="0.4" opacity="0.1" className="gpu-rgb-pulse" style={{ animationDelay: "1.5s" }} />

          {/* ═══════════ CONTACT SHADOW ═══════════ */}
          <ellipse cx="460" cy="510" rx="340" ry="28" fill="#000" opacity="0.5" />
          <ellipse cx="460" cy="510" rx="220" ry="14" fill="#FF1F45" opacity="0.03" />

          <g filter="url(#gpuSoft5090)">

            {/* ─── BACKPLATE (visible bottom slice for 3D depth) ─── */}
            <path d="M 90 120 L 830 120 L 830 400 L 90 400 Z" fill="url(#gpuBackplate5090)" transform="translate(28 32)" />
            {/* Backplate ventilation slots */}
            {Array.from({ length: 14 }).map((_, i) => (
              <rect key={`bv-${i}`} x={140 + i * 48} y={160} width={28} height={3} rx={1.5} fill="rgba(255,255,255,.02)" transform="translate(28 32)" />
            ))}
            {/* Backplate screw mounts */}
            {[150, 350, 550, 750].map(x => (
              <g key={`bs-${x}`} transform="translate(28 32)">
                <circle cx={x} cy={136} r={4} fill="#0e0e11" stroke="rgba(255,255,255,.1)" strokeWidth={0.8} />
                <line x1={x - 2} y1={136} x2={x + 2} y2={136} stroke="rgba(255,255,255,.15)" strokeWidth={0.5} />
              </g>
            ))}

            {/* ─── 3D EXTRUSION: Bottom face ─── */}
            <path d="M 90 400 L 118 432 L 858 432 L 830 400 Z" fill="url(#gpuSide5090)" />
            {/* ─── 3D EXTRUSION: Right face ─── */}
            <path d="M 830 120 L 858 90 L 858 432 L 830 400 Z" fill="url(#gpuSide5090)" />
            {/* ─── 3D EXTRUSION: Top bevel face ─── */}
            <path d="M 90 120 L 118 90 L 858 90 L 830 120 Z" fill="url(#gpuTop5090)" />

            {/* ─── MAIN SHROUD (front face) ─── */}
            <rect x="90" y="120" width="740" height="280" rx="16" fill="url(#gpuShroud5090)" stroke="rgba(255,255,255,.07)" strokeWidth={1.2} />

            {/* ─── HEATSINK FINS (left edge, subtle vertical lines) ─── */}
            {Array.from({ length: 16 }).map((_, i) => (
              <rect key={`hf-${i}`} x={106 + i * 4.5} y={142} width={1.5} height={238} fill="rgba(255,255,255,.025)" rx={0.5} />
            ))}

            {/* ─── HEATSINK FINS (right edge) ─── */}
            {Array.from({ length: 10 }).map((_, i) => (
              <rect key={`hfr-${i}`} x={756 + i * 4.5} y={152} width={1.2} height={218} fill="rgba(255,255,255,.02)" rx={0.5} />
            ))}

            {/* ─── VENT GRILLS (horizontal slits near top) ─── */}
            {Array.from({ length: 6 }).map((_, i) => (
              <rect key={`vg-${i}`} x={115} y={136 + i * 5} width={60} height={1.5} rx={0.75} fill="rgba(255,255,255,.03)" />
            ))}
            {Array.from({ length: 6 }).map((_, i) => (
              <rect key={`vgr-${i}`} x={750} y={136 + i * 5} width={55} height={1.5} rx={0.75} fill="rgba(255,255,255,.03)" />
            ))}

            {/* ═══════════ RGB ACCENT STRIP (top, pulsing red/maroon) ═══════════ */}
            <g className="gpu-rgb-pulse" filter="url(#gpuNeonGlow)">
              <rect x="108" y="127" width="704" height="5" rx="2.5" fill="url(#gpuRgb5090)" opacity="0.85" style={{ mixBlendMode: "screen" }} />
            </g>
            {/* Thin secondary RGB line at bottom */}
            <g className="gpu-rgb-pulse" style={{ animationDelay: "1s" }}>
              <rect x="108" y="388" width="704" height="3" rx="1.5" fill="url(#gpuRgb5090)" opacity="0.4" style={{ mixBlendMode: "screen" }} />
            </g>

            {/* ═══════════ THREE SPINNING FANS ═══════════ */}
            <Gpu3DFan cx={230} cy={262} r={88} anim="animate-fan-1" />
            <Gpu3DFan cx={460} cy={262} r={88} anim="animate-fan-2" />
            <Gpu3DFan cx={690} cy={262} r={88} anim="animate-fan-3" />

            {/* ─── METALLIC SCREWS (corners of shroud) ─── */}
            {[
              [106, 136], [106, 384], [814, 136], [814, 384],
              [200, 136], [400, 136], [600, 136],
              [200, 384], [400, 384], [600, 384],
            ].map(([sx, sy], i) => (
              <g key={`screw-${i}`}>
                <circle cx={sx} cy={sy} r={4.5} fill="#141418" stroke="rgba(255,255,255,.12)" strokeWidth={0.8} />
                <line x1={sx - 2.5} y1={sy} x2={sx + 2.5} y2={sy} stroke="rgba(255,255,255,.2)" strokeWidth={0.6} />
                <line x1={sx} y1={sy - 2.5} x2={sx} y2={sy + 2.5} stroke="rgba(255,255,255,.2)" strokeWidth={0.6} />
              </g>
            ))}

            {/* ─── "RTX 5090" BRANDING TEXT ─── */}
            <text x="460" y="425" textAnchor="middle" fontFamily="'Orbitron', sans-serif" fontSize="14" fontWeight="800" letterSpacing="6" fill="#ffffff" filter="drop-shadow(0 0 8px rgba(255,31,69,0.8))">
              RTX 5090
            </text>
            {/* Sub-brand text */}
            <text x="460" y="440" textAnchor="middle" fontFamily="'Space Grotesk', sans-serif" fontSize="7" fontWeight="600" letterSpacing="4" fill="#ff7b90" filter="drop-shadow(0 0 4px rgba(255,31,69,0.6))">
              GEFORCE
            </text>

            {/* ─── PCIe CONNECTOR (gold pins at the bottom-left) ─── */}
            <g>
              <rect x="120" y="400" width="180" height="14" rx="2" fill="#0e0e11" stroke="rgba(255,255,255,.06)" strokeWidth={0.6} />
              {/* Gold pins */}
              {Array.from({ length: 28 }).map((_, i) => (
                <rect key={`pci-${i}`} x={126 + i * 6} y={404} width={3} height={7} rx={0.5} fill="url(#gpuPCIe5090)" />
              ))}
              {/* PCIe notch */}
              <rect x="220" y="400" width="8" height="14" fill="#050505" />
            </g>

            {/* ─── 8-PIN POWER CONNECTORS (top-right, two blocks) ─── */}
            <g>
              {/* Connector block 1 */}
              <rect x="690" y="108" width="42" height="18" rx="3" fill="url(#gpuPower5090)" stroke="rgba(255,255,255,.08)" strokeWidth={0.6} />
              {Array.from({ length: 8 }).map((_, i) => (
                <circle key={`pw1-${i}`} cx={697 + (i % 4) * 9} cy={113 + Math.floor(i / 4) * 8} r={2.2} fill="#0a0a0c" stroke="rgba(255,255,255,.1)" strokeWidth={0.4} />
              ))}
              {/* Connector block 2 */}
              <rect x="738" y="108" width="42" height="18" rx="3" fill="url(#gpuPower5090)" stroke="rgba(255,255,255,.08)" strokeWidth={0.6} />
              {Array.from({ length: 8 }).map((_, i) => (
                <circle key={`pw2-${i}`} cx={745 + (i % 4) * 9} cy={113 + Math.floor(i / 4) * 8} r={2.2} fill="#0a0a0c" stroke="rgba(255,255,255,.1)" strokeWidth={0.4} />
              ))}
            </g>

            {/* ─── DISPLAY OUTPUTS (bottom-right, 3 ports) ─── */}
            <g>
              {[0, 1, 2].map(i => (
                <g key={`dp-${i}`}>
                  <rect x={620 + i * 36} y={400} width={24} height={12} rx={2} fill="#0a0a0c" stroke="rgba(255,255,255,.08)" strokeWidth={0.5} />
                  <rect x={624 + i * 36} y={403} width={16} height={6} rx={1} fill="#060608" />
                </g>
              ))}
            </g>

            {/* ─── Top metallic highlight ─── */}
            <rect x="90" y="120" width="740" height="50" rx="16" fill="rgba(255,255,255,.02)" />

            {/* ─── Side accent lines (geometric detail) ─── */}
            <line x1="90" y1="175" x2="830" y2="175" stroke="rgba(255,255,255,.03)" strokeWidth={0.5} />
            <line x1="90" y1="348" x2="830" y2="348" stroke="rgba(255,255,255,.03)" strokeWidth={0.5} />

          </g>
        </svg>
      </div>
    </div>
  );
}

function HeroSection() {
  const { scrollYProgress } = useScroll();
  const user = useCurrentUser();
  const bgY = useTransform(scrollYProgress, [0,.4], ["0%","28%"]);
  const heroLinks = [
    user
      ? { label:user.name, href:`/dashboard/${user.role}`, primary:true }
      : { label:"Sign In", href:"/sign-in", icon:LogIn, primary:true },
    { label:"Shop Products", href:"/products", icon:ShoppingCart },
    { label:"Services", href:"/services", icon:Wrench },
    { label:"Gaming Info", href:"#news", icon:Gamepad2 },
    { label:"Contact", href:"#contact", icon:Phone },
  ];

  return (
    <section id="hero" style={{ position:"relative",minHeight:"100vh",display:"flex",alignItems:"center",overflow:"hidden",background:"linear-gradient(135deg,#050505 0%,#0a0005 55%,#2A0008 100%)" }}>
      <motion.div className="cyber-grid" style={{ position:"absolute",inset:0,y:bgY }} />
      <div style={{ position:"absolute",top:"20%",right:"15%",width:600,height:600,background:"radial-gradient(circle,rgba(42,0,8,.7) 0%,transparent 65%)",pointerEvents:"none" }} />
      <div style={{ position:"absolute",bottom:"5%",left:"5%",width:500,height:500,background:"radial-gradient(circle,rgba(255,31,69,.04) 0%,transparent 65%)",pointerEvents:"none" }} />
      <div style={{ position:"absolute",left:0,right:0,height:2,background:"linear-gradient(90deg,transparent,rgba(255,31,69,.25),transparent)",pointerEvents:"none",animation:"scan-line 10s linear infinite" }} />
      <ParticleCanvas />

      {/* 3D RTX-5090-style triple-fan GPU as cinematic animated backdrop */}
      <div className="hero-gpu-bg" style={{ position:"absolute",right:"-6%",top:"50%",transform:"translateY(-50%)",width:"72%",maxWidth:1050,zIndex:1,opacity:0.85,pointerEvents:"none",filter:"saturate(1) contrast(1.15) brightness(1.1)",maskImage:"radial-gradient(ellipse 85% 90% at 55% 50%, #000 60%, transparent 100%)",WebkitMaskImage:"radial-gradient(ellipse 85% 90% at 55% 50%, #000 60%, transparent 100%)" }}>
        <Gpu3DBackground />
      </div>

      {/* Main content */}
      <div className="hero-content section-inner" style={{ position:"relative",zIndex:10,maxWidth:1400,margin:"0 auto",padding:"130px 32px 130px",width:"100%" }}>
        <div style={{ maxWidth:640 }}>
          <motion.div initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} transition={{duration:.6}} style={{marginBottom:20}}>
            <span className="glass-red" style={{ display:"inline-flex",alignItems:"center",gap:8,padding:"7px 16px",borderRadius:4,fontFamily:"'Space Grotesk',sans-serif",fontSize:11,fontWeight:600,color:"#FF1F45",letterSpacing:"2.5px",textTransform:"uppercase" }}>
              <span className="animate-glow" style={{ width:6,height:6,background:"#FF1F45",borderRadius:"50%" }} />
              Premium Gaming Machines
            </span>
          </motion.div>

          <motion.h1 className="hero-h1 animate-glitch" initial={{opacity:0,y:40}} animate={{opacity:1,y:0}} transition={{duration:.85,delay:.15,ease:[.22,1,.36,1]}}
            style={{ fontFamily:"'Orbitron',sans-serif",fontSize:"clamp(36px,6vw,82px)",fontWeight:900,lineHeight:1.0,letterSpacing:"-1.5px",marginBottom:20 }}>
            <span style={{ display:"block",color:"white" }}>POWER YOUR</span>
            <span style={{ display:"block",background:"linear-gradient(135deg,#FF1F45 0%,#ff7b90 50%,#FF1F45 100%)",backgroundSize:"200% 100%",WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",animation:"shimmer 4s linear infinite" }}>DOMINANCE</span>
            <span style={{ display:"block",color:"rgba(255,255,255,.6)",fontSize:"52%" }}>WITH DESKTO</span>
          </motion.h1>

          <motion.p initial={{opacity:0,y:24}} animate={{opacity:1,y:0}} transition={{duration:.8,delay:.3}}
            style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:"clamp(14px,2vw,17px)",color:"#CFCFCF",lineHeight:1.75,marginBottom:36,maxWidth:500 }}>
            Premium gaming rigs, custom PC builds, expert repair services, and cutting-edge hardware — engineered to outperform every expectation.
          </motion.p>

          <motion.div className="hero-btns" initial={{opacity:0,y:20}} animate={{opacity:1,y:0}} transition={{duration:.8,delay:.45}}
            style={{ display:"flex",gap:12,flexWrap:"wrap" }}>
            {heroLinks.map(({ label, href, icon:Icon, primary }) => (
              <a key={label} href={href} className={`glass-pill ${primary ? "glass-pill-primary" : "glass-pill-outline"}`}>
                {Icon && <Icon size={13} />} {label}
              </a>
            ))}
          </motion.div>
        </div>
      </div>

      {/* Stats bar */}
      <div style={{ position:"absolute",bottom:0,left:0,right:0,background:"rgba(5,5,5,.9)",backdropFilter:"blur(20px)",WebkitBackdropFilter:"blur(20px)",borderTop:"1px solid rgba(255,255,255,.05)" }}>
        <div className="hero-stats" style={{ maxWidth:1400,margin:"0 auto",padding:"16px 32px",display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12 }}>
          {[["5,000+","PCs Delivered"],["15K+","Happy Customers"],["98%","Satisfaction Rate"],["8 Yrs","In Business"]].map(([n,l])=>(
            <div key={l} style={{ textAlign:"center" }}>
              <div className="hero-stats-num" style={{ fontFamily:"'Rajdhani',sans-serif",fontSize:26,fontWeight:700,color:"#FF1F45",lineHeight:1 }}>{n}</div>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:10,color:"#CFCFCF",letterSpacing:"1px",marginTop:3 }}>{l}</div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────── PRODUCTS ───────────────
export const PRODUCTS = [
  { id:1,name:"DESKTO Phantom X",type:"gaming",category:"gaming-pc",condition:"first-hand",brand:"DESKTO",price:285000,orig:320000,rating:4.9,reviews:847,badge:"BESTSELLER",inStock:true,warrantyMonths:36,rgb:true,specs:["RTX 4090 24GB","i9-14900K","64GB DDR5","4TB NVMe"],img:"https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=400&h=280&fit=crop&auto=format",createdAt:20240601,popularity:9800,sales:412 },
  { id:2,name:"DESKTO Titan Pro",type:"gaming",category:"gaming-pc",condition:"first-hand",brand:"DESKTO",price:195000,orig:220000,rating:4.8,reviews:624,badge:"HOT",inStock:true,warrantyMonths:36,rgb:true,specs:["RTX 4080 Super","i7-14700K","32GB DDR5","2TB NVMe"],img:"https://images.unsplash.com/photo-1593640408182-31c228a7e5e1?w=400&h=280&fit=crop&auto=format",createdAt:20240815,popularity:8400,sales:380 },
  { id:3,name:"DESKTO Reaper XT",type:"gaming",category:"gaming-pc",condition:"first-hand",brand:"DESKTO",price:135000,orig:155000,rating:4.7,reviews:412,badge:"NEW",inStock:true,warrantyMonths:24,rgb:true,specs:["RTX 4070 Ti","Ryzen 9 7950X","32GB DDR5","2TB NVMe"],img:"https://images.unsplash.com/photo-1560756741-c45f6e86eb46?w=400&h=280&fit=crop&auto=format",createdAt:20260320,popularity:6200,sales:240 },
  { id:4,name:"DESKTO Workstation W1",type:"general",category:"desktop-pc",condition:"first-hand",brand:"DESKTO",price:165000,orig:185000,rating:4.8,reviews:289,badge:"PRO",inStock:true,warrantyMonths:36,rgb:false,specs:["RTX A4000","Xeon W3","128GB ECC","8TB Storage"],img:"https://images.unsplash.com/photo-1547082299-de196ea013d6?w=400&h=280&fit=crop&auto=format",createdAt:20240510,popularity:4100,sales:165 },
  { id:5,name:"DESKTO Elite Slim",type:"general",category:"desktop-pc",condition:"first-hand",brand:"DESKTO",price:82000,orig:95000,rating:4.6,reviews:533,badge:null,inStock:true,warrantyMonths:24,rgb:false,specs:["RTX 4060","i5-14600K","16GB DDR5","1TB NVMe"],img:"https://images.unsplash.com/photo-1525547719571-a2d4ac8945e2?w=400&h=280&fit=crop&auto=format",createdAt:20241112,popularity:7300,sales:502 },
  { id:6,name:"DESKTO Origin Mini",type:"general",category:"desktop-pc",condition:"second-hand",brand:"DESKTO",price:55000,orig:62000,rating:4.5,reviews:218,badge:"VALUE",inStock:true,warrantyMonths:6,rgb:false,specs:["GTX 1660 Super","i5-12400","16GB DDR4","512GB NVMe"],img:"https://images.unsplash.com/photo-1585771724684-38269d6639fd?w=400&h=280&fit=crop&auto=format",createdAt:20240115,popularity:2900,sales:198,serial:"DT-OMG-2018-0042",qualityReport:"8/10 — Fully serviced, new thermal paste, no dead pixels." },
  { id:7,name:"ASUS ROG Strix G16",type:"gaming",category:"gaming-laptop",condition:"first-hand",brand:"ASUS",price:185000,orig:210000,rating:4.7,reviews:321,badge:"HOT",inStock:true,warrantyMonths:24,rgb:true,specs:["RTX 4070","i9-14900HX","32GB DDR5","1TB NVMe","16\" QHD+ 240Hz"],img:"https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&h=280&fit=crop&auto=format",createdAt:20250210,popularity:7100,sales:265 },
  { id:8,name:"Dell XPS 15",type:"general",category:"laptop",condition:"first-hand",brand:"Dell",price:142000,orig:165000,rating:4.6,reviews:412,badge:null,inStock:true,warrantyMonths:24,rgb:false,specs:["RTX 4050","i7-13700H","32GB DDR5","1TB NVMe","15.6\" OLED"],img:"https://images.unsplash.com/photo-1496181133206-80ce9b88a853?w=400&h=280&fit=crop&auto=format",createdAt:20240922,popularity:5800,sales:340 },
  { id:9,name:"Lenovo Legion Pro 5 (Used)",type:"gaming",category:"gaming-laptop",condition:"second-hand",brand:"Lenovo",price:78000,orig:145000,rating:4.4,reviews:62,badge:"VALUE",inStock:true,warrantyMonths:3,rgb:true,specs:["RTX 3070","Ryzen 7 6800H","16GB DDR5","1TB NVMe","16\" WQXGA 165Hz"],img:"https://images.unsplash.com/photo-1593642632559-0c6d3fc62b89?w=400&h=280&fit=crop&auto=format",createdAt:20231115,popularity:1900,sales:58,serial:"LN-LGP5-2023-117",qualityReport:"9/10 — Minor cosmetic wear, battery health 92%, thermals verified." },
  { id:10,name:"LG UltraGear 27GP950",type:"gaming",category:"monitor",condition:"first-hand",brand:"LG",price:62000,orig:72000,rating:4.8,reviews:289,badge:"HOT",inStock:true,warrantyMonths:36,rgb:false,specs:["27\" 4K","144Hz","Nano IPS","HDR600","G-SYNC"],img:"https://images.unsplash.com/photo-1527443224154-c4a3942d3acf?w=400&h=280&fit=crop&auto=format",createdAt:20241005,popularity:4600,sales:178 },
  { id:11,name:"Intel Core i9-14900K",type:"general",category:"cpu",condition:"first-hand",brand:"Intel",price:54000,orig:60000,rating:4.9,reviews:531,badge:"BESTSELLER",inStock:true,warrantyMonths:36,rgb:false,specs:["24 Cores","6.0GHz Boost","LGA1700"],img:"https://images.unsplash.com/photo-1591798454719-b1d8ef63e87d?w=400&h=280&fit=crop&auto=format",createdAt:20240312,popularity:9100,sales:620 },
  { id:12,name:"NVIDIA RTX 4080 Super",type:"gaming",category:"gpu",condition:"first-hand",brand:"NVIDIA",price:98000,orig:110000,rating:4.8,reviews:412,badge:"NEW",inStock:true,warrantyMonths:36,rgb:true,specs:["16GB GDDR6X","DLSS 3.5","Ada Lovelace"],img:"https://images.unsplash.com/photo-1591488320449-011701bb6704?w=400&h=280&fit=crop&auto=format",createdAt:20260110,popularity:7800,sales:295 },
  { id:13,name:"RTX 3070 (Used)",type:"gaming",category:"gpu",condition:"second-hand",brand:"NVIDIA",price:26000,orig:52000,rating:4.3,reviews:78,badge:"VALUE",inStock:false,warrantyMonths:0,rgb:true,specs:["8GB GDDR6","No original box","Stress-tested 24h"],img:"https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=400&h=280&fit=crop&auto=format",createdAt:20220901,popularity:1400,sales:72,serial:"NV-3070-2022-088",qualityReport:"7/10 — Light coil whine under load, fully stable for gaming." },
  { id:14,name:"Corsair Vengeance 32GB DDR5",type:"general",category:"ram",condition:"first-hand",brand:"Corsair",price:13500,orig:16000,rating:4.7,reviews:189,badge:null,inStock:true,warrantyMonths:60,rgb:true,specs:["DDR5 6000MHz","CL30","RGB"],img:"https://images.unsplash.com/photo-1562976540-1502c2145186?w=400&h=280&fit=crop&auto=format",createdAt:20240704,popularity:3700,sales:410 },
  { id:15,name:"Samsung 990 PRO 2TB NVMe",type:"general",category:"nvme",condition:"first-hand",brand:"Samsung",price:18900,orig:23000,rating:4.9,reviews:712,badge:"HOT",inStock:true,warrantyMonths:60,rgb:false,specs:["2TB","PCIe Gen4","7450MB/s read"],img:"https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&h=280&fit=crop&auto=format",createdAt:20240810,popularity:8900,sales:840 },
  { id:16,name:"ASUS ROG Strix B760-A",type:"general",category:"motherboard",condition:"first-hand",brand:"ASUS",price:22500,orig:26000,rating:4.6,reviews:142,badge:null,inStock:true,warrantyMonths:36,rgb:true,specs:["LGA1700","DDR5","PCIe 5.0","WiFi 6E"],img:"https://images.unsplash.com/photo-1518770660439-4636190af475?w=400&h=280&fit=crop&auto=format",createdAt:20241001,popularity:3100,sales:188 },
  { id:17,name:"Corsair RM850x PSU",type:"general",category:"psu",condition:"first-hand",brand:"Corsair",price:12500,orig:14500,rating:4.8,reviews:264,badge:null,inStock:true,warrantyMonths:120,rgb:false,specs:["850W","80+ Gold","Fully Modular"],img:"https://images.unsplash.com/photo-1587202372616-b43abea06c2a?w=400&h=280&fit=crop&auto=format",createdAt:20240220,popularity:2400,sales:152 },
  { id:18,name:"Lian Li O11 Dynamic EVO",type:"gaming",category:"cabinet",condition:"first-hand",brand:"Lian Li",price:17900,orig:21000,rating:4.7,reviews:198,badge:"NEW",inStock:true,warrantyMonths:24,rgb:false,specs:["Mid Tower","Dual-Chamber","E-ATX"],img:"https://images.unsplash.com/photo-1587202372634-32705e3bf49c?w=400&h=280&fit=crop&auto=format",createdAt:20251118,popularity:5200,sales:230 },
  { id:19,name:"Logitech G Pro X Keyboard",type:"gaming",category:"keyboard",condition:"first-hand",brand:"Logitech",price:9800,orig:12000,rating:4.6,reviews:312,badge:null,inStock:true,warrantyMonths:24,rgb:true,specs:["Mechanical","Hot-swap","RGB"],img:"https://images.unsplash.com/photo-1587829741301-dc798b83add3?w=400&h=280&fit=crop&auto=format",createdAt:20240630,popularity:4400,sales:298 },
  { id:20,name:"Razer DeathAdder V3",type:"gaming",category:"mouse",condition:"first-hand",brand:"Razer",price:6500,orig:7500,rating:4.7,reviews:421,badge:"HOT",inStock:true,warrantyMonths:24,rgb:true,specs:["30K DPI","Focus Pro","89g"],img:"https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=280&fit=crop&auto=format",createdAt:20240719,popularity:5600,sales:380 },
  { id:21,name:"HyperX Cloud III Headset",type:"gaming",category:"headset",condition:"first-hand",brand:"HyperX",price:8900,orig:11000,rating:4.5,reviews:189,badge:null,inStock:true,warrantyMonths:24,rgb:false,specs:["53mm Drivers","Detachable Mic","120hr Battery"],img:"https://images.unsplash.com/photo-1583394838336-acd977736f90?w=400&h=280&fit=crop&auto=format",createdAt:20240825,popularity:3900,sales:267 },
  { id:22,name:"TP-Link Archer AX90 Router",type:"general",category:"router",condition:"first-hand",brand:"TP-Link",price:14500,orig:17500,rating:4.4,reviews:134,badge:null,inStock:true,warrantyMonths:36,rgb:false,specs:["WiFi 6","Tri-Band","8 Streams"],img:"https://images.unsplash.com/photo-1606904825846-647eb07f5be2?w=400&h=280&fit=crop&auto=format",createdAt:20240318,popularity:2700,sales:146 },
  { id:23,name:"APC Back-UPS 1100VA",type:"general",category:"ups",condition:"first-hand",brand:"APC",price:6900,orig:8500,rating:4.3,reviews:96,badge:null,inStock:true,warrantyMonths:24,rgb:false,specs:["1100VA","660W","6 Outlets"],img:"https://images.unsplash.com/photo-1581090464777-f3220bbe1b8b?w=400&h=280&fit=crop&auto=format",createdAt:20240408,popularity:1600,sales:88 },
  { id:24,name:"HP LaserJet Pro M404dn",type:"general",category:"printer",condition:"first-hand",brand:"HP",price:21500,orig:26000,rating:4.5,reviews:142,badge:null,inStock:true,warrantyMonths:12,rgb:false,specs:["Monochrome Laser","40ppm","Auto Duplex","Ethernet"],img:"https://images.unsplash.com/photo-1612815154858-60aa4c59eaa6?w=400&h=280&fit=crop&auto=format",createdAt:20240515,popularity:1300,sales:78 },
  { id:25,name:"Epson Perfection V39 Scanner",type:"general",category:"scanner",condition:"first-hand",brand:"Epson",price:9200,orig:12000,rating:4.2,reviews:64,badge:null,inStock:true,warrantyMonths:12,rgb:false,specs:["4800 DPI","USB Powered","A4 Flatbed"],img:"https://images.unsplash.com/photo-1568571780765-9276ac8b75a2?w=400&h=280&fit=crop&auto=format",createdAt:20240622,popularity:980,sales:54 },
  { id:26,name:"WD Elements 2TB HDD",type:"general",category:"hdd",condition:"first-hand",brand:"WD",price:5400,orig:6500,rating:4.4,reviews:212,badge:null,inStock:true,warrantyMonths:24,rgb:false,specs:["2TB","USB 3.0","Portable"],img:"https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&h=280&fit=crop&auto=format",createdAt:20240214,popularity:2100,sales:156 },
  { id:27,name:"Crucial MX500 1TB SSD",type:"general",category:"ssd",condition:"first-hand",brand:"Crucial",price:7800,orig:9500,rating:4.7,reviews:298,badge:null,inStock:true,warrantyMonths:60,rgb:false,specs:["1TB","SATA 2.5\"","560MB/s"],img:"https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=400&h=280&fit=crop&auto=format",createdAt:20240328,popularity:3200,sales:210 },
  { id:28,name:"MSI Cyborg 15 (Used)",type:"gaming",category:"gaming-laptop",condition:"second-hand",brand:"MSI",price:62000,orig:110000,rating:4.2,reviews:38,badge:"VALUE",inStock:true,warrantyMonths:3,rgb:true,specs:["RTX 4060","i7-12650H","16GB DDR5","512GB NVMe","15.6\" FHD 144Hz"],img:"https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=400&h=280&fit=crop&auto=format",createdAt:20230612,popularity:1100,sales:38,serial:"MS-CYB-2023-204",qualityReport:"8/10 — Light scratches on lid, fully functional, fresh thermal paste." },
  { id:29,name:"Logitech MX Master 3S",type:"general",category:"mouse",condition:"first-hand",brand:"Logitech",price:8500,orig:10500,rating:4.8,reviews:482,badge:"HOT",inStock:true,warrantyMonths:24,rgb:false,specs:["Wireless","8K DPI","Quiet Clicks"],img:"https://images.unsplash.com/photo-1527864550417-7fd91fc51a46?w=400&h=280&fit=crop&auto=format",createdAt:20240915,popularity:6700,sales:412 },
  { id:30,name:"USB-C Hub 8-in-1",type:"general",category:"accessories",condition:"first-hand",brand:"Anker",price:2900,orig:3500,rating:4.5,reviews:312,badge:null,inStock:true,warrantyMonths:18,rgb:false,specs:["HDMI 4K","100W PD","SD/TF","3x USB 3.0"],img:"https://images.unsplash.com/photo-1625948515291-69613efd103f?w=400&h=280&fit=crop&auto=format",createdAt:20240708,popularity:4100,sales:320 },
  { id:31,name:"Premium Build Service",type:"general",category:"others",condition:"first-hand",brand:"DESKTO",price:4500,orig:null,rating:4.9,reviews:182,badge:"PRO",inStock:true,warrantyMonths:0,rgb:false,specs:["Cable management","Thermal paste application","Stress test 12h"],img:"https://images.unsplash.com/photo-1587202372616-b43abea06c2a?w=400&h=280&fit=crop&auto=format",createdAt:20240101,popularity:5400,sales:188 },
];

export const BADGE_CLR: Record<string,string> = { BESTSELLER:"linear-gradient(135deg,#FF1F45,#cc001a)",HOT:"linear-gradient(135deg,#ff6b00,#cc4400)",NEW:"linear-gradient(135deg,#00b4ff,#0066cc)",VALUE:"linear-gradient(135deg,#00cc66,#006633)",PRO:"linear-gradient(135deg,#7a00ff,#440099)" };
export type Product = typeof PRODUCTS[number] & { liveId?: string; sku?: string };
type ProductType = Product["type"];
type ProductCondition = Product["condition"];
type ProductCategory = Product["category"];
type ProductBrand = string;

export const PUBLIC_PRODUCTS_API_BASE = import.meta.env.VITE_API_URL || "/api";

function catalogProductToProduct(p: CatalogProduct): Product {
  return {
    id: p.id,
    // Backend UUID — populated by the liveId-backfill effect in
    // dashboardData.ts after login. Without this, the checkout flow sends
    // the numeric CatalogProduct.id which the backend rejects with
    // "Invalid product ID" because orders.*.productId requires a UUID.
    liveId: (p as { liveId?: string }).liveId,
    sku: p.sku,
    name: p.name,
    type: (p.type || "general") as Product["type"],
    category: (p.category || "others") as Product["category"],
    condition: (p.condition || "first-hand") as Product["condition"],
    brand: p.brand,
    price: p.price,
    orig: p.orig ?? null,
    rating: p.rating || 4.8,
    reviews: p.reviews || 0,
    badge: p.badge || null,
    inStock: p.inStock ?? p.stock > 0,
    warrantyMonths: p.warrantyMonths || 0,
    rgb: Boolean(p.rgb),
    specs: p.specs?.length ? p.specs : [p.model || p.brand, p.category, p.warrantyMonths ? `${p.warrantyMonths} months warranty` : "DESKTO verified"],
    img: p.img || p.gallery?.[0] || "",
    createdAt: p.createdAt || Number(new Date().toISOString().slice(0, 10).replace(/-/g, "")),
    popularity: p.popularity || 0,
    sales: p.sales || 0,
    serial: p.serial,
    qualityReport: p.qualityReport,
    gallery: p.gallery,
    model: p.model,
    operatingSystem: p.operatingSystem,
    weight: p.weight,
    dimensions: p.dimensions,
    processor: p.processor,
    gpu: p.gpu,
    ram: p.ram,
    storage: p.storage,
    display: p.display,
    refreshRate: p.refreshRate,
    powerRequirement: p.powerRequirement,
    ports: p.ports,
    description: p.description,
    technicalDetails: p.technicalDetails,
    useCase: p.useCase,
    performanceNotes: p.performanceNotes,
    qualityNotes: p.qualityNotes,
    features: p.features,
    boxContents: p.boxContents,
    compatibility: p.compatibility,
    upgradeOptions: p.upgradeOptions,
    recommendedAccessories: p.recommendedAccessories,
    deliveryInfo: p.deliveryInfo,
    warrantyInfo: p.warrantyInfo,
  } as Product;
}

export function mergedCatalogProducts(products: CatalogProduct[] = []): Product[] {
  // Demo products are intentionally excluded here — the live catalogue (shop
  // page, product detail, checkout) only shows products the admin has actually
  // added via Catalog Management. PRODUCTS still exists for unrelated demo
  // cross-references (seeded cart/wishlist/order history) elsewhere.
  return products
    .filter(p => (p.catalogStatus || "published") === "published" && p.img)
    .map(catalogProductToProduct);
}

type PublicProductImage = {
  url?: string;
  thumbnailUrl?: string;
  isPrimary?: boolean;
};

type PublicProductApiRow = {
  id: string;
  sku?: string;
  slug?: string;
  name: string;
  description?: string;
  price: number;
  comparePrice?: number | null;
  category?: string;
  brand?: string;
  stockQuantity?: number;
  imageUrl?: string;
  images?: PublicProductImage[];
  marketTag?: string | null;
  isFeatured?: boolean;
  specifications?: Record<string, any>;
  createdAt?: string;
  publishedAt?: string;
};

export function stableNumericId(value: string): number {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = ((hash << 5) - hash + value.charCodeAt(i)) | 0;
  }
  return Math.abs(hash) + 100000;
}

export function publicProductToProduct(row: PublicProductApiRow): Product | null {
  const specs = row.specifications || {};
  const gallery = (row.images || [])
    .map(image => image.url || image.thumbnailUrl || "")
    .filter(Boolean);
  const primaryImage = row.imageUrl || gallery[0] || "";
  if (!primaryImage) return null;

  const category = (row.category || "others") as ProductCategory;
  const inferredType = (specs.type || (category === "gaming-pc" || category === "gaming-laptop" ? "gaming" : "general")) as ProductType;
  const createdDate = row.publishedAt || row.createdAt || new Date().toISOString();

  return {
    id: stableNumericId(row.id),
    liveId: row.id,
    sku: row.sku,
    slug: row.slug,
    name: row.name,
    type: inferredType,
    category,
    condition: (specs.condition || "first-hand") as ProductCondition,
    brand: row.brand || "DESKTO",
    price: Number(row.price) || 0,
    orig: row.comparePrice ?? null,
    rating: 4.8,
    reviews: 0,
    badge: row.marketTag || null,
    inStock: Number(row.stockQuantity || 0) > 0,
    warrantyMonths: Number(specs.warrantyMonths || 0),
    rgb: Boolean(specs.rgb),
    specs: Array.isArray(specs.specs) && specs.specs.length ? specs.specs : [row.brand || "DESKTO", category, row.sku || "Live catalog"],
    img: primaryImage,
    gallery: gallery.length ? gallery : [primaryImage],
    createdAt: Number(createdDate.slice(0, 10).replace(/-/g, "")) || Number(new Date().toISOString().slice(0, 10).replace(/-/g, "")),
    popularity: row.isFeatured ? 1000 : 0,
    sales: 0,
    model: specs.model,
    operatingSystem: specs.operatingSystem,
    weight: specs.weight,
    dimensions: specs.dimensions,
    processor: specs.processor,
    gpu: specs.gpu,
    ram: specs.ram,
    storage: specs.storage,
    display: specs.display,
    refreshRate: specs.refreshRate,
    powerRequirement: specs.powerRequirement,
    ports: specs.ports,
    description: row.description,
    technicalDetails: specs.technicalDetails,
    useCase: specs.useCase,
    performanceNotes: specs.performanceNotes,
    qualityNotes: specs.qualityNotes,
    features: specs.features,
    boxContents: specs.boxContents,
    compatibility: specs.compatibility,
    upgradeOptions: specs.upgradeOptions,
    recommendedAccessories: specs.recommendedAccessories,
  } as Product;
}

export const CATEGORY_LABELS: Record<ProductCategory,string> = {
  "laptop":"Laptop", "desktop-pc":"Desktop PC", "gaming-pc":"Gaming PC", "gaming-laptop":"Gaming Laptop",
  "monitor":"Monitor", "cpu":"CPU", "gpu":"GPU", "ram":"RAM", "ssd":"SSD", "hdd":"HDD", "nvme":"NVMe",
  "motherboard":"Motherboard", "psu":"PSU", "cabinet":"Cabinet", "keyboard":"Keyboard", "mouse":"Mouse",
  "headset":"Headset", "router":"Router", "ups":"UPS", "printer":"Printer", "scanner":"Scanner",
  "accessories":"Accessories", "others":"Others",
};

// Top 5 popular companies per category, used to group the Brand filter on the
// Shop Products page (independent of which brands currently exist in the demo
// catalogue — this is the curated reference list of trusted brands per category).
export const CATEGORY_BRANDS: Partial<Record<ProductCategory, string[]>> = {
  "laptop": ["Apple", "Dell", "HP", "Lenovo", "ASUS"],
  "gaming-laptop": ["ASUS ROG", "MSI", "Acer Predator", "Lenovo Legion", "Alienware"],
  "desktop-pc": ["Dell", "HP", "Lenovo", "ASUS", "Acer"],
  "gaming-pc": ["Corsair", "ASUS ROG", "MSI", "Alienware", "NZXT"],
  "monitor": ["LG", "Samsung", "ASUS", "MSI", "Acer"],
  "cpu": ["Intel", "AMD", "Apple", "Qualcomm", "NVIDIA (Grace)"],
  "gpu": ["NVIDIA", "AMD", "Intel", "ASUS", "MSI"],
  "ram": ["Corsair", "Kingston", "G.Skill", "Crucial", "TeamGroup"],
  "nvme": ["Samsung", "WD", "Crucial", "Kingston", "Seagate"],
  "motherboard": ["ASUS", "MSI", "Gigabyte", "ASRock", "Biostar"],
  "psu": ["Corsair", "Cooler Master", "DeepCool", "MSI", "Thermaltake"],
  "cabinet": ["NZXT", "Corsair", "Lian Li", "Cooler Master", "DeepCool"],
  "keyboard": ["Logitech", "Razer", "Corsair", "Redragon", "HyperX"],
  "mouse": ["Logitech", "Razer", "SteelSeries", "Corsair", "HyperX"],
  "headset": ["HyperX", "Logitech", "SteelSeries", "Razer", "Corsair"],
  "router": ["TP-Link", "ASUS", "D-Link", "Netgear", "Tenda"],
  "ups": ["APC", "Microtek", "CyberPower", "Eaton", "Zebronics"],
  "printer": ["HP", "Canon", "Epson", "Brother", "Pantum"],
  "scanner": ["Canon", "Epson", "HP", "Brother", "Fujitsu"],
  "hdd": ["Seagate", "Western Digital", "Toshiba", "HGST", "Samsung"],
  "ssd": ["Samsung", "Crucial", "Kingston", "WD", "SanDisk"],
  "accessories": ["Logitech", "UGREEN", "Anker", "Belkin", "Zebronics"],
};

const PRODUCT_BRANDS = Array.from(new Set(PRODUCTS.map(p => p.brand))).sort();

export const CART_STORAGE_KEY = "deskto_cart_v1";

function normalizeCart(cart: unknown): Record<number, number> {
  if (!cart || typeof cart !== "object") return {};
  const entries = Array.isArray(cart)
    ? cart.map((line: any) => [line?.productId ?? line?.id, line?.qty ?? line?.quantity])
    : Object.entries(cart);

  return entries.reduce<Record<number, number>>((next, [id, qty]) => {
    const productId = Number(id);
    const quantity = Number(qty);
    if (Number.isFinite(productId) && Number.isFinite(quantity) && quantity > 0) {
      next[productId] = Math.max(1, Math.floor(quantity));
    }
    return next;
  }, {});
}

export function ProductCard({ p, onAdd }: { p: Product; onAdd?: (product: Product) => void }) {
  const { has, toggle } = useWishlist();
  const wished = has(p.id);
  const productPathKey = encodeURIComponent(String((p as any).slug || (p as any).liveId || p.id));
  return (
    <TiltCard>
      <a href={`/product/${productPathKey}`} style={{ textDecoration:"none",color:"inherit",display:"block" }}>
      <div className="card-hover glass-card" style={{ borderRadius:14,overflow:"hidden",position:"relative",border:"1px solid rgba(255,255,255,.07)" }}>
        {p.badge && (
          <div style={{ position:"absolute",top:12,left:12,zIndex:2,background:BADGE_CLR[p.badge]??BADGE_CLR.PRO,padding:"4px 9px",borderRadius:3,fontFamily:"'Orbitron',sans-serif",fontSize:8,fontWeight:700,color:"white",letterSpacing:"1.5px",backdropFilter:"blur(8px)" }}>
            {p.badge}
          </div>
        )}
        <div style={{ position:"absolute",top:12,right:12,zIndex:2,display:"flex",gap:4 }}>
          {p.condition === "second-hand" && (
            <div style={{ background:"linear-gradient(135deg,#00cc66,#006633)",padding:"3px 7px",borderRadius:3,fontFamily:"'Orbitron',sans-serif",fontSize:7,fontWeight:700,color:"white",letterSpacing:"1.2px" }}>USED</div>
          )}
          {!p.inStock && (
            <div style={{ background:"linear-gradient(135deg,#444,#222)",padding:"3px 7px",borderRadius:3,fontFamily:"'Orbitron',sans-serif",fontSize:7,fontWeight:700,color:"white",letterSpacing:"1.2px" }}>OUT</div>
          )}
        </div>
        <button onClick={(e)=>{e.preventDefault();e.stopPropagation();toggle(p.id);}} className="glass-pill glass-pill-icon" style={{ position:"absolute",top:10,right:10,zIndex:3,width:32,height:32,fontSize:0 }}>
          <Heart size={12} style={{ color:wished?"#FF1F45":"#CFCFCF",fill:wished?"#FF1F45":"none" }} />
        </button>
        <div style={{ position:"relative",overflow:"hidden",height:185,background:"#0a0a0a" }}>
          <img src={p.img} alt={p.name} style={{ width:"100%",height:"100%",objectFit:"cover",filter:"brightness(.82)",transition:"transform .5s ease" }}
            onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.08)")}
            onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")} />
          <div style={{ position:"absolute",inset:0,background:"linear-gradient(to top,rgba(5,5,5,.75) 0%,transparent 55%)" }} />
        </div>
        <div style={{ padding:"15px 16px 16px" }}>
          <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:6 }}>
            <span style={{ fontFamily:"'Orbitron',sans-serif",fontSize:8,color:"#777",letterSpacing:"1px" }}>{p.brand}</span>
            <span style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:8,color:"#444" }}>•</span>
            <span style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:8,color:"#777" }}>{CATEGORY_LABELS[p.category]}</span>
          </div>
          <h3 style={{ fontFamily:"'Orbitron',sans-serif",fontSize:12,fontWeight:800,color:"white",marginBottom:6,letterSpacing:".5px" }}>{p.name}</h3>
          <div style={{ display:"flex",flexWrap:"wrap",gap:4,marginBottom:9 }}>
            {p.specs.slice(0,2).map(s=>(
              <span key={s} className="glass" style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:9,color:"#CFCFCF",padding:"3px 7px",borderRadius:3 }}>{s}</span>
            ))}
          </div>
          <div style={{ display:"flex",gap:2,marginBottom:11,alignItems:"center" }}>
            {Array.from({length:5}).map((_,i)=>(<Star key={i} size={9} style={{ fill:i<Math.floor(p.rating)?"#FF1F45":"none",color:"#FF1F45" }} />))}
            <span style={{ fontFamily:"'Rajdhani',sans-serif",fontSize:10,color:"#CFCFCF",marginLeft:4 }}>({p.reviews})</span>
            {p.warrantyMonths > 0 && (
              <span style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:8,color:"#00cc66",marginLeft:8,display:"flex",alignItems:"center",gap:3 }}><ShieldCheck size={9} /> {p.warrantyMonths}mo</span>
            )}
          </div>
          <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:6 }}>
            <div>
              <span style={{ fontFamily:"'Rajdhani',sans-serif",fontSize:19,fontWeight:700,color:"#FF1F45" }}>₹{p.price.toLocaleString("en-IN")}</span>
              {p.orig && p.orig > p.price && (
                <span style={{ fontFamily:"'Rajdhani',sans-serif",fontSize:10,color:"#444",textDecoration:"line-through",marginLeft:5 }}>₹{p.orig.toLocaleString("en-IN")}</span>
              )}
            </div>
            <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); onAdd?.(p); }} disabled={!p.inStock} className="glass-pill glass-pill-primary glass-pill-sm" style={{ flexShrink:0,opacity:p.inStock?1:0.4,position:"relative",zIndex:2 }}>
              <ShoppingCart size={9} /> {p.inStock ? "Add" : "Out"}
            </button>
          </div>
        </div>
      </div>
      </a>
    </TiltCard>
  );
}

// ─────────────── CATALOG FILTERS (shared by App.tsx and validator) ───────────────
type CatalogFilters = {
  type: "all" | ProductType;
  condition: "all" | ProductCondition;
  categories: Set<ProductCategory>;
  brands: Set<string>;
  priceMin: number | null;
  priceMax: number | null;
  inStockOnly: boolean;
  warrantyOnly: boolean;
  query: string;
};

function applyCatalogFilters(products: readonly Product[], f: CatalogFilters): Product[] {
  const q = f.query.trim().toLowerCase();
  return products.filter(p => {
    if (f.type !== "all" && p.type !== f.type) return false;
    if (f.condition !== "all" && p.condition !== f.condition) return false;
    if (f.categories.size > 0 && !f.categories.has(p.category)) return false;
    if (f.brands.size > 0 && !f.brands.has(p.brand)) return false;
    if (f.priceMin !== null && p.price < f.priceMin) return false;
    if (f.priceMax !== null && p.price > f.priceMax) return false;
    if (f.inStockOnly && !p.inStock) return false;
    if (f.warrantyOnly && p.warrantyMonths <= 0) return false;
    if (q && !`${p.name} ${p.brand} ${p.specs.join(" ")}`.toLowerCase().includes(q)) return false;
    return true;
  });
}

type SortKey = "featured" | "second-hand" | "latest" | "popular" | "best-selling" | "price-low" | "price-high" | "rating" | "new-arrivals";

function sortCatalog(products: Product[], sort: SortKey): Product[] {
  const out = [...products];
  switch (sort) {
    case "second-hand":
      return out.sort((a,b) => {
        if (a.condition === "second-hand" && b.condition !== "second-hand") return -1;
        if (a.condition !== "second-hand" && b.condition === "second-hand") return 1;
        return a.id - b.id;
      });
    case "price-low": return out.sort((a,b) => a.price - b.price);
    case "price-high": return out.sort((a,b) => b.price - a.price);
    case "rating": return out.sort((a,b) => b.rating - a.rating);
    case "latest":
    case "new-arrivals": return out.sort((a,b) => b.createdAt - a.createdAt);
    case "popular": return out.sort((a,b) => b.popularity - a.popularity);
    case "best-selling": return out.sort((a,b) => b.sales - a.sales);
    default: return out.sort((a,b) => a.id - b.id);
  }
}

// ─────────────── CART HOOK ───────────────
export function loadCart(): Record<number, number> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return normalizeCart(parsed);
  } catch { return {}; }
}

export function saveCart(cart: Record<number, number>) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(normalizeCart(cart)));
    window.dispatchEvent(new Event("deskto-cart-changed"));
  } catch {}
}

function ProductCatalogPage({ category }: { category: ProductType | "all" }) {
  const initialType: "all" | ProductType = category === "gaming" || category === "general" ? category : "all";
  const [catalogProducts,setCatalogProducts] = useState<Product[]>([]);
  const [catalogLoading,setCatalogLoading] = useState(true);
  const [catalogError,setCatalogError] = useState("");
  const [typeFilter,setTypeFilter] = useState<"all" | ProductType>(initialType);
  const [conditionFilter,setConditionFilter] = useState<"all" | ProductCondition>("all");
  const [selectedCategories,setSelectedCategories] = useState<Set<ProductCategory>>(new Set());
  const [selectedBrands,setSelectedBrands] = useState<Set<string>>(new Set());
  const [priceMin,setPriceMin] = useState<string>("");
  const [priceMax,setPriceMax] = useState<string>("");
  const [inStockOnly,setInStockOnly] = useState(false);
  const [warrantyOnly,setWarrantyOnly] = useState(false);
  const [query,setQuery] = useState("");
  const [sort,setSort] = useState<SortKey>("featured");
  const [cart,setCart] = useState<Record<number,number>>(() => loadCart());
  const [status,setStatus] = useState("Select products to add to your cart.");
  const [filtersOpen,setFiltersOpen] = useState(false);
  const dynamicCategories = Array.from(new Set(catalogProducts.map(p => p.category))) as ProductCategory[];
  const allCategoryBrands = Array.from(new Set(Object.values(CATEGORY_BRANDS).flat() as string[])).sort();

  const loadLiveProducts = useCallback(async () => {
    setCatalogLoading(true);
    setCatalogError("");
    try {
      const response = await fetch(`${PUBLIC_PRODUCTS_API_BASE}/products?limit=100`, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
        cache: "no-store",
      });
      if (!response.ok) throw new Error(`Product API returned ${response.status}`);
      const data = await response.json();
      const products = (data.products || [])
        .map(publicProductToProduct)
        .filter((product: Product | null): product is Product => Boolean(product));
      setCatalogProducts(products);
      setStatus(products.length ? "Live catalog loaded from DESKTO backend." : "No published products are available yet.");
    } catch (error: any) {
      console.error("Live product catalog load failed:", error);
      setCatalogError(error?.message || "Unable to load live catalog.");
      setCatalogProducts([]);
      setStatus("Unable to load live catalog. Please refresh products.");
    } finally {
      setCatalogLoading(false);
    }
  }, []);

  useEffect(() => { saveCart(cart); }, [cart]);
  useEffect(() => { loadLiveProducts(); }, [loadLiveProducts]);

  const visibleProducts = sortCatalog(applyCatalogFilters(catalogProducts, {
    type:typeFilter, condition:conditionFilter, categories:selectedCategories, brands:selectedBrands,
    priceMin:priceMin === "" ? null : Number(priceMin),
    priceMax:priceMax === "" ? null : Number(priceMax),
    inStockOnly, warrantyOnly, query,
  }), sort);

  const cartCount = Object.values(cart).reduce((s,q) => s+q, 0);
  const cartRows = Object.entries(cart)
    .map(([id,qty]) => ({ product:catalogProducts.find(p => p.id === Number(id)), qty }))
    .filter((row): row is { product:Product; qty:number } => Boolean(row.product));
  const subtotal = cartRows.reduce((sum,row) => sum + row.product.price * row.qty, 0);

  const toggleCategory = (c: ProductCategory) => {
    setSelectedCategories(prev => {
      const next = new Set(prev);
      if (next.has(c)) next.delete(c); else next.add(c);
      return next;
    });
  };
  const toggleBrand = (b: string) => {
    setSelectedBrands(prev => {
      const next = new Set(prev);
      if (next.has(b)) next.delete(b); else next.add(b);
      return next;
    });
  };
  const clearFilters = () => {
    setConditionFilter("all");
    setSelectedCategories(new Set());
    setSelectedBrands(new Set());
    setPriceMin(""); setPriceMax("");
    setInStockOnly(false); setWarrantyOnly(false);
    setQuery("");
  };

  const addToCart = (product: Product) => {
    if (!product.inStock) return;
    setCart(prev => ({ ...prev, [product.id]:(prev[product.id] ?? 0) + 1 }));
    setStatus(`${product.name} added to cart.`);
  };
  const setQty = (productId: number, qty: number) => {
    setCart(prev => {
      const next = { ...prev };
      if (qty <= 0) delete next[productId];
      else next[productId] = qty;
      return next;
    });
  };

  const meta = typeFilter === "gaming"
    ? { eyebrow:"Gaming Catalog", title:"Gaming", accent:"Products", sub:"High-performance rigs, GPUs, peripherals and components tuned for competitive play, streaming, and immersive AAA gaming.", icon:Gamepad2 }
    : typeFilter === "general"
    ? { eyebrow:"General Catalog", title:"General", accent:"Products", sub:"Workstations, laptops, components and accessories for work, study, creators and office deployments.", icon:Package }
    : { eyebrow:"Unified Product Catalog", title:"All", accent:"Products", sub:"Browse every category — Gaming and General, first-hand and second-hand — with filters and sorting that match how production e-commerce works.", icon:ShoppingCart };
  const MetaIcon = meta.icon;

  const FilterChip = ({ active, onClick, children }: { active:boolean; onClick:() => void; children:React.ReactNode }) => (
    <button onClick={onClick}
      className={active ? "glass-pill glass-pill-primary" : "glass-pill glass-pill-outline"}
      style={{ padding:"7px 14px",fontSize:9 }}>
      {children}
    </button>
  );

  return (
    <>
      <Navbar />
      <section className="section-pad" style={{ padding:"112px 0 96px",background:"#050505",position:"relative",minHeight:"100vh" }}>
        <div className="cyber-grid" style={{ position:"absolute",inset:0,opacity:.5 }} />
        <div className="section-inner" style={{ maxWidth:1400,margin:"0 auto",padding:"0 32px",position:"relative",zIndex:1 }}>
        <SectionHeader eyebrow={meta.eyebrow} title={meta.title} accent={meta.accent} sub={meta.sub} />

        {/* Type segmented control */}
        <Reveal>
          <div style={{ display:"flex",justifyContent:"center",gap:10,marginBottom:18,flexWrap:"wrap" }}>
            <FilterChip active={typeFilter === "all"} onClick={() => setTypeFilter("all")}><ShoppingCart size={11} /> All Products</FilterChip>
            <FilterChip active={typeFilter === "gaming"} onClick={() => setTypeFilter("gaming")}><Gamepad2 size={11} /> Gaming</FilterChip>
            <FilterChip active={typeFilter === "general"} onClick={() => setTypeFilter("general")}><Package size={11} /> General</FilterChip>
          </div>
        </Reveal>

        {/* Search + Sort */}
        <Reveal>
          <div className="glass-card" style={{ borderRadius:14,padding:16,display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(220px, 1fr))",gap:12,marginBottom:18 }}>
            <label style={{ display:"flex",alignItems:"center",gap:10 }}>
              <Search size={15} color="#FF1F45" />
              <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search by name, brand or spec"
                style={{ width:"100%",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.09)",borderRadius:8,padding:"11px 12px",fontFamily:"'Space Grotesk',sans-serif",fontSize:16,color:"white",outline:"none" }} />
            </label>
            <select value={sort} onChange={e=>setSort(e.target.value as SortKey)}
              style={{ width:"100%",background:"#151515",border:"1px solid rgba(255,255,255,.12)",borderRadius:8,padding:"11px 12px",fontFamily:"'Space Grotesk',sans-serif",fontSize:16,color:"white",outline:"none" }}>
              <option value="featured">Featured</option>
              <option value="second-hand">Second-hand</option>
              <option value="latest">Latest</option>
              <option value="popular">Popular</option>
              <option value="best-selling">Best Selling</option>
              <option value="price-low">Price: Low → High</option>
              <option value="price-high">Price: High → Low</option>
              <option value="rating">Highest Rated</option>
              <option value="new-arrivals">New Arrivals</option>
            </select>
            <button onClick={loadLiveProducts} className="glass-pill glass-pill-outline" style={{ justifyContent:"center",padding:"11px 14px",fontSize:10 }}>
              <RefreshCw size={12} /> Refresh Products
            </button>
          </div>
        </Reveal>

        {/* Filter bar */}
        <Reveal>
          <div className="glass-card" style={{ borderRadius:14,padding:16,marginBottom:22 }}>
            <button onClick={() => setFiltersOpen(o => !o)} className="glass-pill glass-pill-outline" style={{ width:"100%",justifyContent:"space-between",padding:"10px 14px",fontSize:10,marginBottom:filtersOpen?16:0 }}>
              <span style={{ display:"flex",alignItems:"center",gap:8 }}><Settings size={12} color="#FF1F45" /> {filtersOpen?"Hide":"Show"} Filters</span>
              <span style={{ fontFamily:"'Rajdhani',sans-serif",fontSize:10,color:"#777" }}>{visibleProducts.length} match</span>
            </button>
            {filtersOpen && (
              <div style={{ display:"flex",flexDirection:"column",gap:14 }}>
                {/* Condition */}
                <div>
                  <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:10,color:"#777",letterSpacing:"1.4px",textTransform:"uppercase",fontWeight:700,marginBottom:8 }}>Condition</div>
                  <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                    <FilterChip active={conditionFilter === "all"} onClick={() => setConditionFilter("all")}>All</FilterChip>
                    <FilterChip active={conditionFilter === "first-hand"} onClick={() => setConditionFilter("first-hand")}>First-Hand</FilterChip>
                    <FilterChip active={conditionFilter === "second-hand"} onClick={() => setConditionFilter("second-hand")}>Second-Hand</FilterChip>
                  </div>
                </div>
                {/* Categories */}
                <div>
                  <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:10,color:"#777",letterSpacing:"1.4px",textTransform:"uppercase",fontWeight:700,marginBottom:8 }}>Category</div>
                  <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                    {dynamicCategories.map(c => (
                      <FilterChip key={c} active={selectedCategories.has(c)} onClick={() => toggleCategory(c)}>{CATEGORY_LABELS[c] || c}</FilterChip>
                    ))}
                  </div>
                </div>
                {/* Brands — same flat chip-row format as Category, deduplicated
                    across the curated top-5-per-category reference list. */}
                <div>
                  <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:10,color:"#777",letterSpacing:"1.4px",textTransform:"uppercase",fontWeight:700,marginBottom:8 }}>Brand</div>
                  <div style={{ display:"flex",gap:6,flexWrap:"wrap" }}>
                    {allCategoryBrands.map(b => (
                      <FilterChip key={b} active={selectedBrands.has(b)} onClick={() => toggleBrand(b)}>{b}</FilterChip>
                    ))}
                  </div>
                </div>
                {/* Price + toggles */}
                <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit, minmax(150px, 1fr))",gap:12,alignItems:"end" }}>
                  <label>
                    <span style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:10,color:"#777",letterSpacing:"1.4px",textTransform:"uppercase",fontWeight:700,display:"block",marginBottom:8 }}>Min Price</span>
                    <input type="number" value={priceMin} onChange={e=>setPriceMin(e.target.value)} placeholder="₹ 0"
                      style={{ width:"100%",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.09)",borderRadius:8,padding:"11px 12px",fontFamily:"'Space Grotesk',sans-serif",fontSize:16,color:"white",outline:"none" }} />
                  </label>
                  <label>
                    <span style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:10,color:"#777",letterSpacing:"1.4px",textTransform:"uppercase",fontWeight:700,display:"block",marginBottom:8 }}>Max Price</span>
                    <input type="number" value={priceMax} onChange={e=>setPriceMax(e.target.value)} placeholder="₹ 5,00,000"
                      style={{ width:"100%",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.09)",borderRadius:8,padding:"11px 12px",fontFamily:"'Space Grotesk',sans-serif",fontSize:16,color:"white",outline:"none" }} />
                  </label>
                  <label style={{ display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"11px 0" }}>
                    <input type="checkbox" checked={inStockOnly} onChange={e=>setInStockOnly(e.target.checked)} />
                    <span style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:12,color:"#CFCFCF" }}>In stock only</span>
                  </label>
                  <label style={{ display:"flex",alignItems:"center",gap:8,cursor:"pointer",padding:"11px 0" }}>
                    <input type="checkbox" checked={warrantyOnly} onChange={e=>setWarrantyOnly(e.target.checked)} />
                    <span style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:12,color:"#CFCFCF" }}>Warranty required</span>
                  </label>
                </div>
                <div style={{ display:"flex",justifyContent:"flex-end" }}>
                  <button onClick={clearFilters} className="glass-pill glass-pill-outline" style={{ padding:"8px 14px",fontSize:9 }}>Clear Filters</button>
                </div>
              </div>
            )}
          </div>
        </Reveal>

        {/* Products grid */}
        <div style={{ marginBottom:cartCount>0?120:0 }}>
          <div className="products-grid" style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:20 }}>
            {visibleProducts.map((p,i)=>(<Reveal key={p.id} delay={i*.04}><ProductCard p={p} onAdd={addToCart} /></Reveal>))}
            {catalogLoading && (
              <div className="glass-card" style={{ borderRadius:14,padding:24,fontFamily:"'Space Grotesk',sans-serif",fontSize:13,color:"#CFCFCF" }}>
                Loading live products...
              </div>
            )}
            {!catalogLoading && visibleProducts.length === 0 && (
              <div className="glass-card" style={{ borderRadius:14,padding:24,fontFamily:"'Space Grotesk',sans-serif",fontSize:13,color:"#CFCFCF" }}>
                {catalogError ? "Live product API is currently unavailable." : "No products match these filters."}
              </div>
            )}
          </div>
        </div>

        {/* Cart strip */}
        <div style={{ position:"fixed",bottom:0,left:0,right:0,zIndex:200,background:"rgba(5,5,5,.92)",backdropFilter:"blur(16px)",WebkitBackdropFilter:"blur(16px)",borderTop:"1px solid rgba(255,31,69,.3)",padding:"14px 32px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:14,flexWrap:"wrap" }}>
          <div style={{ display:"flex",alignItems:"center",gap:14 }}>
            <div style={{ position:"relative" }}>
              <ShoppingCart size={22} color="#FF1F45" />
              {cartCount>0 && (
                <div style={{ position:"absolute",top:-6,right:-8,background:"#FF1F45",color:"white",fontFamily:"'Orbitron',sans-serif",fontSize:9,fontWeight:700,padding:"2px 6px",borderRadius:8,minWidth:18,textAlign:"center" }}>{cartCount}</div>
              )}
            </div>
            <div>
              <div style={{ fontFamily:"'Orbitron',sans-serif",fontSize:11,color:"white",letterSpacing:"1px" }}>YOUR CART</div>
              <div style={{ fontFamily:"'Rajdhani',sans-serif",fontSize:13,color:"#FF1F45" }}>₹{subtotal.toLocaleString("en-IN")}</div>
            </div>
          </div>
          <div style={{ display:"flex",gap:10 }}>
            <button onClick={clearFilters} className="glass-pill glass-pill-outline" style={{ padding:"10px 14px",fontSize:9 }}>Continue Shopping</button>
            <a href="/checkout" className={`btn btn-primary ${cartCount===0?"disabled":""}`} onClick={e=>{ if(cartCount===0){e.preventDefault();setStatus("Add at least one product before checkout.");} }} style={{ padding:"10px 18px",fontSize:10,opacity:cartCount>0?1:0.5,pointerEvents:cartCount>0?"auto":"none" }}>
              Proceed to Checkout <ChevronRight size={12} />
            </a>
          </div>
        </div>

        {status && (
          <div className="glass-red" style={{ borderRadius:10,padding:12,fontFamily:"'Space Grotesk',sans-serif",fontSize:12,color:"#FFC0C8",lineHeight:1.6,marginTop:18 }}>{status}</div>
        )}
        </div>
      </section>
    </>
  );
}

// ─────────────── SERVICES ───────────────
function ServicesSection() {
  return (
    <section id="services" className="section-pad" style={{ padding:"96px 0",background:"#0D0D0D",position:"relative" }}>
      <div style={{ position:"absolute",top:0,left:0,right:0,height:1,background:"linear-gradient(90deg,transparent,rgba(255,31,69,.3),transparent)" }} />
      <div className="section-inner" style={{ maxWidth:1400,margin:"0 auto",padding:"0 32px" }}>
        <SectionHeader eyebrow="Our Services" title="Beyond the" accent="Machine" sub="From repair to custom builds — we are your complete PC ecosystem partner." />
        <div className="services-grid" style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:18 }}>
          {SERVICES.map((s,i)=>{
            const Icon = s.icon;
            return (
            <Reveal key={s.slug} delay={i*.06}>
              <a href={`/services/${s.slug}`} style={{ textDecoration:"none",color:"inherit",display:"block" }}>
              <div className="card-hover glass-card" style={{ border:`1px solid rgba(255,255,255,.06)`,borderRadius:14,padding:24,position:"relative",overflow:"hidden" }}>
                <div style={{ position:"absolute",top:-40,right:-40,width:130,height:130,background:`radial-gradient(circle,${s.color}18 0%,transparent 70%)`,pointerEvents:"none" }} />
                <div className="glass-icon-circle" style={{ marginBottom:14,borderColor:`${s.color}55`,background:`${s.color}10` }}>
                  <Icon size={20} color={s.color} />
                </div>
                <h3 style={{ fontFamily:"'Orbitron',sans-serif",fontSize:13,fontWeight:800,color:"white",marginBottom:7,letterSpacing:".5px" }}>{s.title}</h3>
                <p style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:12,color:"#CFCFCF",lineHeight:1.65,marginBottom:14 }}>{s.sub}</p>
                <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                  <span style={{ fontFamily:"'Rajdhani',sans-serif",fontSize:11,fontWeight:600,color:s.color,letterSpacing:"1px" }}>{s.tag}</span>
                  <span className="glass-pill glass-pill-sm" style={{ borderColor:`${s.color}55`,color:s.color,background:`${s.color}0c` }}>
                    Explore <ArrowRight size={9} />
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

// ─────────────── WORKFLOW TIMELINE ───────────────
const STEPS = [
  { label:"Request",desc:"Submitted online or in-store",status:"done" },
  { label:"Review",desc:"Admin assigns technician",status:"done" },
  { label:"Quotation",desc:"Cost estimate sent",status:"done" },
  { label:"Payment",desc:"Secure processing",status:"done" },
  { label:"Work Started",desc:"Technician begins",status:"active" },
  { label:"Testing",desc:"72hr stress test",status:"pending" },
  { label:"Invoice",desc:"Final documentation",status:"pending" },
  { label:"Warranty",desc:"Certificate issued",status:"pending" },
  { label:"Complete",desc:"Ready for pickup",status:"pending" },
];

function WorkflowTimeline() {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref,{once:true,margin:"-80px"});
  return (
    <section id="workflow" className="section-pad" style={{ padding:"96px 0",background:"#050505",position:"relative" }}>
      <div className="section-inner" style={{ maxWidth:1400,margin:"0 auto",padding:"0 32px" }}>
        <SectionHeader eyebrow="Our Process" title="Transparent" accent="Workflow" sub="Every order tracked in real-time from submission to completion." />
        <div ref={ref} className="workflow-grid" style={{ display:"grid",gridTemplateColumns:"repeat(9,1fr)",gap:8,position:"relative" }}>
          <div className="workflow-line-abs" style={{ position:"absolute",top:27,left:"5%",right:"5%",height:2,background:"rgba(255,255,255,.06)",zIndex:0 }} />
          <motion.div className="workflow-line-abs" initial={{width:"0%"}} animate={inView?{width:`${(STEPS.filter(s=>s.status==="done").length/STEPS.length)*90}%`}:{width:"0%"}} transition={{duration:2,delay:.3,ease:"easeOut"}}
            style={{ position:"absolute",top:27,left:"5%",height:2,background:"linear-gradient(90deg,#FF1F45,#ff6b80)",zIndex:1,boxShadow:"0 0 8px rgba(255,31,69,.4)" }} />
          {STEPS.map((step,i)=>(
            <motion.div key={step.label} initial={{opacity:0,y:20}} animate={inView?{opacity:1,y:0}:{opacity:0,y:20}} transition={{duration:.5,delay:.4+i*.1}}
              style={{ display:"flex",flexDirection:"column",alignItems:"center",padding:"0 3px",position:"relative",zIndex:2 }}>
              <div className={step.status==="active" ? "glass-icon-circle glass-icon-circle-red" : "glass-icon-circle"}
                style={{ width:54,height:54,marginBottom:12,
                background:step.status==="done"?"linear-gradient(135deg,#FF1F45,#cc001a)":undefined,
                border:step.status==="active"?"2px solid #FF1F45":step.status==="done"?"none":undefined,
                animation:step.status==="active"?"glow-pulse 2s ease-in-out infinite":"none" }}>
                {step.status==="done"?<CheckCircle size={20} color="white"/>:step.status==="active"?<Zap size={20} color="#FF1F45"/>:<Circle size={20} color="rgba(255,255,255,.2)"/>}
              </div>
              <div style={{ textAlign:"center" }}>
                <div style={{ fontFamily:"'Orbitron',sans-serif",fontSize:9,fontWeight:700,color:step.status!=="pending"?"#FF1F45":"#CFCFCF",letterSpacing:".5px",marginBottom:3,lineHeight:1.3 }}>{step.label}</div>
                <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:9,color:"#444",lineHeight:1.4,maxWidth:90,margin:"0 auto" }}>{step.desc}</div>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────── CUSTOM PC BUILDER ───────────────
const PC_COMPS: Record<string,{label:string;opts:string[];prices:number[]}> = {
  cpu:{label:"Processor",opts:["None","Intel i3-12100F - Low Budget","Ryzen 5 5500 - Budget Gaming","Ryzen 5 5600 - Popular Value","Intel i5-12400F - Frequent Office/Gaming","Intel i5-13400F - Popular Mid Range","Intel i5-14400F - Trending Mid","Ryzen 5 7600 - AM5 Popular","Ryzen 5 9600X - Latest Value AM5","Intel Core Ultra 5 245K - Latest Intel","Ryzen 7 7700 - Frequent Creator","Ryzen 7 9700X - Latest Efficient","Intel i7-14700K - High Demand","Intel Core Ultra 7 265K - Latest Productivity","Ryzen 7 7800X3D - Popular Gaming","Ryzen 7 9800X3D - Trending Best Gaming","Ryzen 7 9850X3D - Latest Gaming","Ryzen 9 9900X - Creator/Streaming","Intel Core Ultra 9 285K - Latest Premium","Ryzen 9 9950X - Premium Creator","Ryzen 9 9950X3D - Flagship Gaming/Creator"],prices:[0,7800,8500,10500,11500,16500,17500,19000,24500,29000,25500,32000,36000,38000,39000,45500,52000,40500,54000,56000,68000]},
  motherboard:{label:"Motherboard",opts:["None","A520M DDR4 - Lowest Budget AMD","H610 DDR4 - Budget Frequent","B550M DDR4 - Popular AM4","B550M WiFi - Frequent AM4","B760M DDR4 - Intel Value","B760 WiFi DDR5 - Trending Intel","B650M DDR5 - AM5 Budget","B650 WiFi DDR5 - Popular AMD","B860 WiFi DDR5 - Latest Intel Value","X870 WiFi DDR5 - Latest AMD","Z790 Creator WiFi - Premium Intel","Z890 WiFi DDR5 - Latest Intel Premium","X670E Gaming - Premium AMD","X870E Gaming WiFi - Latest AMD Premium","TRX50 Workstation - Rich Class"],prices:[0,5200,6500,8800,10500,11200,16500,15000,18000,20500,28500,34000,38500,41000,46500,85000]},
  gpu:{label:"Graphics Card",opts:["None","Integrated Graphics - Lowest Budget","GTX 1650 Used - Entry Gaming","RX 6600 8GB - Budget Popular","Intel Arc B580 12GB - Value Trending","RTX 3050 - Budget Popular","RTX 4060 - Frequent 1080p","RTX 5060 8GB - Latest Budget","RX 9060 XT 8GB - Latest Value","RTX 5060 Ti 16GB - Latest Popular","RTX 4070 Super - Trending 1440p","RTX 4070 Ti - High Performance","RTX 5070 12GB - Latest 1440p","RX 9070 16GB - Latest AMD 1440p","RX 9070 XT 16GB - Latest AMD High","RTX 5070 Ti 16GB - Latest Premium","RTX 4080 Super - Premium 4K","RTX 5080 16GB - Latest 4K","RTX 4090 - Extreme/Rich Class","RTX 5090 - Flagship/Rich Class"],prices:[0,0,12500,19000,23000,22000,32000,34500,33500,52000,62000,80000,66000,62000,74000,105000,110000,145000,175000,285000]},
  ram:{label:"RAM",opts:["None","8GB DDR4 - Basic Office","16GB DDR4 3200 - Budget Popular","32GB DDR4 3200 - Frequent Upgrade","16GB DDR5 5200 - Entry DDR5","16GB DDR5 6000 - Popular DDR5","32GB DDR5 5600 - Value Gaming","32GB DDR5 6000 CL30 - Trending Gaming","32GB DDR5 6400 RGB - Latest Performance","48GB DDR5 6000 - Creator Sweet Spot","64GB DDR5 6000 - Creator/Editing","96GB DDR5 6000 - Heavy Creator","128GB DDR5 5600 - Workstation","192GB DDR5 ECC/Workstation - Extreme"],prices:[0,1800,3000,5600,4300,5200,7800,9500,11500,14000,18000,30000,42000,76000]},
  storage:{label:"Storage",opts:["None","500GB NVMe Gen3 - Budget Frequent","1TB NVMe Gen3 - Popular Budget","1TB NVMe Gen4 - Trending","1TB NVMe Gen4 + 1TB HDD - Value Combo","2TB NVMe Gen4 - Popular Gaming","2TB NVMe Gen5 - Latest High Speed","4TB NVMe Gen4 - Creator","4TB NVMe Gen5 - Premium Latest","2TB NVMe + 4TB HDD - Streaming Storage","4TB NVMe + 8TB HDD - Workstation","8TB NVMe - Rich Class Creator"],prices:[0,2100,3600,4800,6900,8800,18000,21000,34000,16000,28000,62000]},
  case:{label:"Cabinet",opts:["None","Basic mATX Cabinet - Low Budget","Ant Esports ICE Cabinet - Budget Popular","Deepcool Matrexx 40 - Frequent Budget","Cooler Master CMP 520 - Popular RGB","Fractal Pop Air - Trending Airflow","Corsair 4000D Airflow - Popular Premium","NZXT H5 Flow - Premium Compact","Lian Li Lancool 216 - Trending Airflow","Lian Li O11D - Popular Showcase","Fractal North - Latest Premium","Hyte Y60 - Premium Showcase","Custom RGB Glass - Rich Class"],prices:[0,2200,3500,4200,5200,6200,7800,9500,10500,13500,15500,22000,28000]},
  fan:{label:"Fan",opts:["None","Single 120mm Fan - Basic","Standard 2-Fan Setup - Budget","3x High Airflow Fans - Popular","3x ARGB Fan Kit - Trending","5x ARGB Fan Kit + Controller - Frequent Gaming","Premium PWM ARGB Kit - Rich Class","Lian Li Uni Fan 3-Pack - Premium Latest","Noctua Quiet Fan Kit - Silent Build"],prices:[0,500,1200,2600,4200,6500,9000,11500,13000]},
  psu:{label:"PSU",opts:["None","450W Bronze - Basic","550W Bronze - Budget Popular","650W Bronze - Frequent Gaming","650W Gold - Popular Efficient","750W Gold - Trending","750W Gold ATX 3.1 - Latest GPU Ready","850W Gold - High Performance","850W Gold ATX 3.1 - Latest Popular","1000W Gold ATX 3.1 - Premium GPU Ready","1000W Platinum - Premium","1200W Platinum - Extreme","1600W Platinum ATX 3.1 - Workstation/Rich"],prices:[0,2800,3800,5500,7200,8500,10500,12500,14500,18000,22000,30000,48000]},
  cooler:{label:"Cooler",opts:["None","Stock Cooler - Included","Budget Air Cooler - Frequent","Deepcool AK400 Class Air - Popular","Air Tower Cooler - Popular","Dual Fan Tower Air - Creator Value","Dual Tower Air Cooler - Trending","120mm AIO - Compact","240mm AIO - Premium","280mm AIO - Latest Balance","360mm AIO - Extreme","Premium Quiet Air Cooler - Silent Build","360mm LCD AIO - Latest Showcase","Custom Liquid Loop - Rich Class"],prices:[0,0,1500,2500,3500,5500,6500,5000,9000,11500,15000,12500,25000,45000]},
  os:{label:"OS",opts:["No OS","Ubuntu Setup - Free/Open Source","Linux Developer Stack - Popular","Windows 11 Home - Popular","Windows 11 Home + Driver Setup","Windows 11 Pro - Office/Business","Windows 11 Pro + Security Setup","Dual Boot Windows + Linux - Developer","Windows 11 Pro + Office Setup","Windows Server Setup - Business"],prices:[0,1500,3500,11500,13000,16500,18500,18500,26000,45000]},
  network:{label:"Network Device",opts:["None","Bluetooth 5.3 USB Adapter - Budget","USB WiFi Adapter - Budget","Dual Band WiFi Adapter - Popular","2.5G PCIe LAN Card - Frequent Office","PCIe WiFi 6 + Bluetooth - Trending","PCIe WiFi 6E + Bluetooth - Latest","Gigabit Router - Home/Office","8-Port Gigabit Switch - Office","WiFi 6 Router - Premium","10G PCIe LAN Card - Creator/NAS","Managed PoE Switch - Business","WiFi 6E Router - Latest Premium","Mesh WiFi Kit - Rich Class","WiFi 7 PCIe Adapter - Latest","WiFi 7 Router - Flagship"],prices:[0,600,800,1600,2500,3200,4500,4500,2500,8500,8500,9000,13000,18000,7500,26000]},
  accessories:{label:"Accessories",opts:["None","Basic Keyboard + Mouse - Budget","WiFi Dongle + Bluetooth - Frequent","Gaming Keyboard + Mouse - Popular","Headset + Mousepad Combo - Frequent","Mechanical Keyboard + Gaming Mouse - Trending","UPS 600VA + Surge Protector - Office","Webcam + USB Mic - Work/Study","27in 1080p Monitor + Keyboard/Mouse","24in 165Hz Monitor + Gaming Combo","Monitor + UPS - Office/Gaming","Streaming Kit - Mic + Webcam + Light","Creator Desk Kit - 4K Webcam + Mic + Arm"],prices:[0,1200,1700,4500,5500,8500,6500,9000,14000,18000,28000,32000,45000]},
};

function CustomPCSection() {
  const [sel,setSel] = useState<Record<string,number>>({cpu:6,motherboard:6,gpu:11,ram:7,storage:5,case:5,fan:4,psu:7,cooler:8,os:3,network:0,accessories:0});
  const total = Object.entries(sel).reduce((acc,[k,i])=>acc+PC_COMPS[k].prices[i],0)+8000;
  return (
    <section id="custom-pc" className="section-pad" style={{ padding:"96px 0",background:"#0a0005",position:"relative" }}>
      <div style={{ position:"absolute",inset:0,background:"radial-gradient(ellipse at 50% 50%,rgba(42,0,8,.4) 0%,transparent 70%)",pointerEvents:"none" }} />
      <div className="section-inner" style={{ maxWidth:1200,margin:"0 auto",padding:"0 32px",position:"relative" }}>
        <SectionHeader eyebrow="Build Your Own" title="Custom PC" accent="Builder" sub="Configure every component. We build, test, and deliver." />
        <div className="pcbuilder-grid" style={{ display:"grid",gridTemplateColumns:"1fr 340px",gap:24 }}>
          <Reveal dir="left">
            <div className="glass-card" style={{ borderRadius:18,padding:26,border:"1px solid rgba(255,255,255,.07)" }}>
              <div style={{ display:"flex",flexDirection:"column",gap:20 }}>
                {Object.entries(PC_COMPS).map(([key,comp])=>(
                  <div key={key}>
                    <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:10,color:"#FF1F45",letterSpacing:"2px",textTransform:"uppercase",marginBottom:10,fontWeight:600 }}>{comp.label}</div>
                    <div className="pc-opts" style={{ display:"grid",gridTemplateColumns:"repeat(2,1fr)",gap:8 }}>
                      {comp.opts.map((opt,i)=>(
                        <button key={opt} onClick={()=>setSel(p=>({...p,[key]:i}))}
                          className={sel[key]===i ? "glass-pill glass-pill-primary" : "glass-pill glass-pill-outline"}
                          style={{ padding:"10px 14px",textAlign:"left",borderRadius:9999,justifyContent:"flex-start" }}>
                          <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:12,color:sel[key]===i?"white":"#CFCFCF",fontWeight:500 }}>{opt}</div>
                          <div style={{ fontFamily:"'Rajdhani',sans-serif",fontSize:12,fontWeight:700,color:sel[key]===i?"#FF1F45":"#555",marginTop:2 }}>+₹{comp.prices[i].toLocaleString("en-IN")}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal dir="right">
            <div className="glass-red pcbuilder-summary" style={{ borderRadius:18,padding:24,border:"1px solid rgba(255,31,69,.22)",position:"sticky",top:82 }}>
              <h3 style={{ fontFamily:"'Orbitron',sans-serif",fontSize:12,fontWeight:800,color:"white",marginBottom:20,letterSpacing:"1px" }}>BUILD SUMMARY</h3>
              <div style={{ display:"flex",flexDirection:"column",gap:10,marginBottom:18 }}>
                {Object.entries(PC_COMPS).map(([k,c])=>(
                  <div key={k} style={{ display:"flex",justifyContent:"space-between",alignItems:"center",paddingBottom:9,borderBottom:"1px solid rgba(255,255,255,.05)" }}>
                    <div>
                      <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:9,color:"#555",letterSpacing:"1px",textTransform:"uppercase" }}>{c.label}</div>
                      <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:11,color:"#CFCFCF" }}>{c.opts[sel[k]]}</div>
                    </div>
                    <div style={{ fontFamily:"'Rajdhani',sans-serif",fontSize:12,fontWeight:700,color:"#FF1F45" }}>₹{c.prices[sel[k]].toLocaleString("en-IN")}</div>
                  </div>
                ))}
                <div style={{ display:"flex",justifyContent:"space-between",paddingBottom:9,borderBottom:"1px solid rgba(255,255,255,.05)" }}>
                  <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:11,color:"#CFCFCF" }}>Assembly & Testing</div>
                  <div style={{ fontFamily:"'Rajdhani',sans-serif",fontSize:12,fontWeight:700,color:"#FF1F45" }}>₹8,000</div>
                </div>
              </div>
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",padding:"11px 0",borderTop:"1px solid rgba(255,31,69,.2)",marginBottom:16 }}>
                <span style={{ fontFamily:"'Orbitron',sans-serif",fontSize:10,fontWeight:700,color:"white" }}>TOTAL</span>
                <span style={{ fontFamily:"'Rajdhani',sans-serif",fontSize:24,fontWeight:700,color:"#FF1F45" }}>₹{total.toLocaleString("en-IN")}</span>
              </div>
              <button className="glass-pill glass-pill-primary glass-pill-block" style={{ marginBottom:9 }}>
                Order This Build
              </button>
              <button className="glass-pill glass-pill-outline glass-pill-block">
                Save Configuration
              </button>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ─────────────── FEATURED BUILDS ───────────────
const BUILDS = [
  { name:"The Phantom",tag:"4K Gaming Beast",specs:"RTX 4090 · i9-14900K · 64GB · 4TB",price:"₹3,20,000",img:"https://images.unsplash.com/photo-1612840395141-d16e10e3d9f4?w=600&h=400&fit=crop&auto=format",rgb:true },
  { name:"The Titan",tag:"Streaming Powerhouse",specs:"RTX 4080S · i7-14700K · 32GB · 2TB",price:"₹2,05,000",img:"https://images.unsplash.com/photo-1597872200969-2b65d56bd16b?w=600&h=400&fit=crop&auto=format",rgb:false },
  { name:"The Workstation",tag:"Creator & Dev Machine",specs:"RTX A4000 · Xeon · 128GB · 8TB",price:"₹4,50,000",img:"https://images.unsplash.com/photo-1547082299-de196ea013d6?w=600&h=400&fit=crop&auto=format",rgb:false },
];

// Pull admin-managed homepage content from the dashboard store, showing ONLY
// published items of the requested type (drafts/scheduled/archived are hidden),
// ordered by display order then most-recent publish date.
function usePublishedHomepageItems(type: string) {
  const { store } = useDashboardData();
  return useMemo(
    () => (store.gamingHub || [])
      .filter(item => item.status === "published" && (
        item.type === type ||
        // Featured Builds section also includes items flagged for Signature Machines
        (type === "featured-build" && item.showInSignatureMachines) ||
        // Offers section also includes items flagged for Exclusive Offers
        (type === "offer" && item.showInExclusiveOffers) ||
        // Gaming News section also includes admin items flagged for Latest News
        (type === "gaming-news" && item.showInLatestNews)
      ))
      .sort((a, b) => (a.order || 0) - (b.order || 0) || (b.publishDate || 0) - (a.publishDate || 0)),
    [store.gamingHub, type],
  );
}

const homepageDate = (ts?: number) => ts
  ? new Date(ts).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
  : "";

const FEATURED_BUILD_WHATSAPP = "919893543312";
const buildEnquiryHref = (name: string) =>
  `https://wa.me/${FEATURED_BUILD_WHATSAPP}?text=${encodeURIComponent(`Hi DESKTO, I'm interested in the "${name}" build. Please share the details.`)}`;
const offerEnquiryHref = (name: string) =>
  `https://wa.me/${FEATURED_BUILD_WHATSAPP}?text=${encodeURIComponent(`Hi DESKTO, I'm interested in the "${name}" offer. Please share the details.`)}`;
const gamingHubArticleHref = (slug?: string | null) =>
  slug ? `/services/gaming-hub/${slug}` : "/services/gaming-hub";

function FeaturedBuildsSection() {
  const published = usePublishedHomepageItems("featured-build");
  const builds = published.length
    ? published.map(it => ({
        name: it.title,
        img: it.coverImage || it.thumbnailImage || (it.gallery || [])[0] || "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&h=400&fit=crop&auto=format",
        tag: it.shortDescription || it.category || "Signature Build",
        rgb: true,
        specs: it.specs || (it.tags || []).join(" · "),
        detailsHref: it.slug ? `/services/gaming-hub/${it.slug}` : "/services/custom-pc",
      }))
    : BUILDS.map(b => ({ name: b.name, img: b.img, tag: b.tag, rgb: b.rgb, specs: b.specs, detailsHref: "/services/custom-pc" }));
  return (
    <section id="builds" className="section-pad" style={{ padding:"96px 0",background:"#050505" }}>
      <div className="section-inner" style={{ maxWidth:1400,margin:"0 auto",padding:"0 32px" }}>
        <SectionHeader eyebrow="Featured Builds" title="Signature" accent="Machines" sub="Handcrafted builds that define the pinnacle of performance." />
        <div className="builds-grid" style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:22 }}>
          {builds.map((b,i)=>(
            <Reveal key={`${b.name}-${i}`} delay={i*.1}>
              <TiltCard>
                <div className="card-hover glass-card" style={{ borderRadius:16,overflow:"hidden",border:"1px solid rgba(255,255,255,.07)" }}>
                  <div style={{ position:"relative",height:220 }}>
                    <img src={b.img} alt={b.name} style={{ width:"100%",height:"100%",objectFit:"cover",filter:"brightness(.75)" }} />
                    <div style={{ position:"absolute",inset:0,background:"linear-gradient(to top,rgba(5,5,5,.95) 0%,transparent 55%)" }} />
                    {b.rgb && <div className="rgb-bar" style={{ position:"absolute",bottom:0,left:0,right:0,height:3 }} />}
                    <div style={{ position:"absolute",top:12,right:12 }}>
                      <span className="glass-red" style={{ display:"inline-block",padding:"4px 10px",borderRadius:4,fontFamily:"'Orbitron',sans-serif",fontSize:8,color:"#FF1F45",letterSpacing:"1.5px",fontWeight:700 }}>SIGNATURE</span>
                    </div>
                    <div style={{ position:"absolute",bottom:0,left:0,right:0,padding:"0 16px 16px" }}>
                      <h3 style={{ fontFamily:"'Orbitron',sans-serif",fontSize:17,fontWeight:900,color:"white",letterSpacing:"2px",marginBottom:3 }}>{b.name}</h3>
                      <p style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:12,color:"#CFCFCF" }}>{b.tag}</p>
                    </div>
                  </div>
                  <div style={{ padding:"12px 16px",display:"flex",alignItems:"center",justifyContent:"space-between",gap:8,flexWrap:"wrap" }}>
                    <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:10,color:"#555" }}>{b.specs}</div>
                    <a href={buildEnquiryHref(b.name)} target="_blank" rel="noopener noreferrer" style={{ fontFamily:"'Rajdhani',sans-serif",fontSize:17,fontWeight:700,color:"#FF1F45",textDecoration:"none" }}>Enquire</a>
                  </div>
                  <div style={{ padding:"0 16px 16px",display:"flex",gap:8 }}>
                    <a href={b.detailsHref} className="glass-pill glass-pill-outline glass-pill-sm" style={{ flex:1,justifyContent:"center",textDecoration:"none" }}>Details</a>
                  </div>
                </div>
              </TiltCard>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────── BRANDS ───────────────
const BRANDS = ["NVIDIA","Intel","AMD","ASUS ROG","MSI","Corsair","Seagate","Samsung","NZXT","Lian Li","be quiet!","Fractal","Cooler Master","G.SKILL","WD Black"];

function BrandsSection() {
  return (
    <section style={{ padding:"50px 0",background:"#0D0D0D",overflow:"hidden",borderTop:"1px solid rgba(255,255,255,.04)",borderBottom:"1px solid rgba(255,255,255,.04)" }}>
      <Reveal>
        <p style={{ textAlign:"center",fontFamily:"'Space Grotesk',sans-serif",fontSize:10,color:"#444",letterSpacing:"3px",textTransform:"uppercase",marginBottom:24 }}>Certified Partners & Brands</p>
      </Reveal>
      <div style={{ overflow:"hidden" }}>
        <div className="animate-marquee" style={{ display:"flex",whiteSpace:"nowrap" }}>
          {[...BRANDS,...BRANDS].map((b,i)=>(
            <div key={i} style={{ display:"inline-flex",alignItems:"center",padding:"0 34px",borderRight:"1px solid rgba(255,255,255,.05)" }}>
              <span style={{ fontFamily:"'Orbitron',sans-serif",fontSize:11,fontWeight:700,color:"rgba(255,255,255,.18)",letterSpacing:"3px",transition:"color .3s" }}
                onMouseEnter={e=>(e.currentTarget.style.color="#FF1F45")}
                onMouseLeave={e=>(e.currentTarget.style.color="rgba(255,255,255,.18)")}>{b}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────── OFFERS ───────────────
const STATIC_OFFER_HERO = {
  title: "RTX 4090 Beast Build Hot Deal",
  desc: "Save on DESKTO's flagship 4K gaming PC bundle for a limited time.",
  discount: "11% OFF",
  img: "https://images.unsplash.com/photo-1587202372775-e229f172b9d7?w=800&h=400&fit=crop&auto=format",
  detailsHref: "/services/custom-pc",
};
const STATIC_OFFERS = [
  {
    title: "Gaming Laptop",
    desc: "20% off",
    discount: "20%",
    img: "https://images.unsplash.com/photo-1603302576837-37561b2e2302?w=800&h=400&fit=crop&auto=format",
    detailsHref: "/shop?category=gaming-laptop",
  },
  STATIC_OFFER_HERO,
];

function OffersSection() {
  const published = usePublishedHomepageItems("offer");
  const offers = published.length
    ? published.slice(0, 6).map(it => ({
        title: it.title,
        desc: it.shortDescription || it.offerDetails || it.intro || "Limited time DESKTO offer.",
        discount: it.discount || "Limited Offer",
        img: it.bannerImage || it.coverImage || it.thumbnailImage || (it.gallery || [])[0] || STATIC_OFFER_HERO.img,
        detailsHref: it.slug ? `/services/gaming-hub/${it.slug}` : (it.ctaHref || "/services/custom-pc"),
      }))
    : STATIC_OFFERS;
  return (
    <section id="deals" className="section-pad" style={{ padding:"96px 0",background:"#050505" }}>
      <div className="section-inner" style={{ maxWidth:1400,margin:"0 auto",padding:"0 32px" }}>
        <SectionHeader eyebrow="Hot Deals" title="Exclusive" accent="Offers" />
        <div className="offers-grid" style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(320px,1fr))",gap:18 }}>
          {offers.map((offer,i)=>(
            <Reveal key={`${offer.title}-${i}`} delay={i*.08} dir={i % 2 ? "right" : "left"}>
              <div className="offers-hero glass-card card-hover" style={{ borderRadius:18,overflow:"hidden",position:"relative",height:280,background:"linear-gradient(135deg,#0a0005,#2A0008)",border:"1px solid rgba(255,31,69,.15)" }}>
                <img src={offer.img} alt={offer.title} style={{ position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:.22 }} />
                <div style={{ position:"absolute",inset:0,background:"linear-gradient(90deg,rgba(5,5,5,.92) 0%,rgba(5,5,5,.35) 100%)" }} />
                <div className={i === 0 ? "offer-hero-pad" : ""} style={{ position:"absolute",inset:0,padding:28,display:"flex",flexDirection:"column",justifyContent:"center",paddingRight:i === 0 ? 150 : 28 }}>
                  <span style={{ fontFamily:"'Orbitron',sans-serif",fontSize:9,color:"#FF1F45",letterSpacing:"3px",marginBottom:10,fontWeight:700 }}>LIMITED TIME OFFER</span>
                  <h3 className="offer-h3" style={{ fontFamily:"'Orbitron',sans-serif",fontSize:"clamp(18px,2.7vw,30px)",fontWeight:900,color:"white",marginBottom:8,lineHeight:1.1 }}>{offer.title}</h3>
                  <p style={{ fontFamily:"'Space Grotesk',sans-serif",color:"#CFCFCF",fontSize:13,marginBottom:18,maxWidth:620 }}>{offer.desc}</p>
                  <div style={{ display:"flex",alignItems:"center",gap:12,marginBottom:20,flexWrap:"wrap" }}>
                    <span className="glass-red" style={{ padding:"3px 8px",borderRadius:3,fontFamily:"'Orbitron',sans-serif",fontSize:9,fontWeight:700,color:"#FF1F45" }}>{offer.discount}</span>
                  </div>
                  <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
                    <a href={offerEnquiryHref(offer.title)} target="_blank" rel="noopener noreferrer" className="glass-pill glass-pill-primary" style={{ textDecoration:"none" }}>
                      Enquire <ArrowRight size={12} />
                    </a>
                    <a href={offer.detailsHref || "/services/custom-pc"} className="glass-pill glass-pill-outline" style={{ textDecoration:"none" }}>
                      Details <ArrowRight size={12} />
                    </a>
                  </div>
                </div>
                {i === 0 && (
                  <div style={{ position:"absolute",top:16,right:16 }}>
                    <div className="glass-dark" style={{ padding:"8px 12px",borderRadius:8,textAlign:"center" }}>
                      <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:9,color:"#FF1F45" }}>Ends in</div>
                      <div style={{ fontFamily:"'Rajdhani',sans-serif",fontSize:22,fontWeight:700,color:"white" }}>23:47:12</div>
                    </div>
                  </div>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────── GAMING NEWS ───────────────
const NEWS = [
  { slug:"nvidia-rtx-5090-performance-uplift",tag:"Hardware",title:"NVIDIA RTX 5090 Leaked: 40% Performance Uplift Over 4090",date:"Jun 20, 2026",img:"https://images.unsplash.com/photo-1591489378430-ef2f4c626b35?w=400&h=240&fit=crop&auto=format" },
  { slug:"deskto-phantom-x-best-gaming-pc-2026",tag:"Gaming",title:"DESKTO Phantom X Wins Best Gaming PC of 2026 Award",date:"Jun 15, 2026",img:"https://images.unsplash.com/photo-1593640408182-31c228a7e5e1?w=400&h=240&fit=crop&auto=format" },
  { slug:"ddr6-ram-pc-gaming-2027",tag:"Tech",title:"DDR6 RAM: What It Means for PC Gaming in 2027",date:"Jun 10, 2026",img:"https://images.unsplash.com/photo-1563770660941-20978e870e26?w=400&h=240&fit=crop&auto=format" },
];

function GamingNewsSection() {
  const { trackGamingHubMetric } = useDashboardData();
  const published = usePublishedHomepageItems("gaming-news");
  const news = published.length
    ? published.map(it => ({
        id: it.id,
        slug: it.slug,
        tag: it.category || "News",
        title: it.title,
        date: homepageDate(it.publishDate),
        img: it.coverImage || it.thumbnailImage || (it.gallery || [])[0] || "https://images.unsplash.com/photo-1591489378430-ef2f4c626b35?w=400&h=240&fit=crop&auto=format",
      }))
    : NEWS.map(item => ({ ...item, id: "" }));
  return (
    <section id="news" className="section-pad" style={{ padding:"96px 0",background:"#0D0D0D" }}>
      <div className="section-inner" style={{ maxWidth:1400,margin:"0 auto",padding:"0 32px" }}>
        <SectionHeader eyebrow="Gaming News" title="Stay" accent="Updated" />
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(280px,1fr))",gap:20 }}>
          {news.map((n,i)=>(
            <Reveal key={n.title} delay={i*.1}>
              <div className="card-hover glass-card" style={{ borderRadius:14,overflow:"hidden",border:"1px solid rgba(255,255,255,.06)" }}>
                <div style={{ position:"relative",height:170,overflow:"hidden" }}>
                  <img src={n.img} alt={n.title} style={{ width:"100%",height:"100%",objectFit:"cover",filter:"brightness(.72)",transition:"transform .5s ease" }}
                    onMouseEnter={e=>(e.currentTarget.style.transform="scale(1.06)")}
                    onMouseLeave={e=>(e.currentTarget.style.transform="scale(1)")} />
                  <div style={{ position:"absolute",inset:0,background:"linear-gradient(to top,rgba(13,13,13,.8),transparent)" }} />
                  <span className="glass-red" style={{ position:"absolute",top:12,left:12,padding:"3px 9px",borderRadius:3,fontFamily:"'Orbitron',sans-serif",fontSize:8,fontWeight:700,color:"#FF1F45",letterSpacing:"1px" }}>{n.tag}</span>
                </div>
                <div style={{ padding:16 }}>
                  <h3 style={{ fontFamily:"'Orbitron',sans-serif",fontSize:12,fontWeight:700,color:"white",lineHeight:1.45,marginBottom:10 }}>{n.title}</h3>
                  <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between" }}>
                    <span style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:10,color:"#555" }}>{n.date}</span>
                    <a
                      href={gamingHubArticleHref(n.slug)}
                      className="glass-pill glass-pill-red glass-pill-sm"
                      style={{ textDecoration:"none" }}
                      onClick={() => {
                        if (n.id) trackGamingHubMetric(n.id, "ctaClicks");
                      }}
                    >
                      Read <ChevronRight size={9} />
                    </a>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────── TESTIMONIALS ───────────────
const REVIEWS = [
  { name:"Arjun Mehta",role:"Pro Gamer · Mumbai",text:"The Phantom X is an absolute beast. DESKTO delivered exactly what was promised — blazing fast, whisper-quiet, and the cable management is immaculate.",stars:5,avatar:"https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format" },
  { name:"Priya Sharma",role:"Content Creator · Bangalore",text:"Ordered a custom workstation for video editing. The team walked me through every component choice. My renders literally halved in time. Worth every rupee.",stars:5,avatar:"https://images.unsplash.com/photo-1494790108755-2616b612b786?w=60&h=60&fit=crop&auto=format" },
  { name:"Rahul Nair",role:"Software Engineer · Hyderabad",text:"Fast delivery, everything perfectly assembled. DESKTO even stress-tested the PC for 72 hours before shipping. That level of professionalism is rare.",stars:5,avatar:"https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=60&h=60&fit=crop&auto=format" },
  { name:"Sneha Kapoor",role:"Streamer · Delhi",text:"Rented a gaming rig for a 3-day event and it was flawless. Support team was incredibly responsive. Will definitely buy my own build from DESKTO.",stars:5,avatar:"https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=60&h=60&fit=crop&auto=format" },
];

function TestimonialsSection() {
  const published = usePublishedHomepageItems("testimonial");
  const reviews = published.length
    ? published.map(it => ({
        name: it.title,
        role: it.category || "Verified Customer",
        text: it.body || it.shortDescription || it.intro || "",
        stars: 5,
        avatar: it.coverImage || it.thumbnailImage || (it.gallery || [])[0] || "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=60&h=60&fit=crop&auto=format",
      }))
    : REVIEWS;
  return (
    <section className="section-pad" style={{ padding:"96px 0",background:"#050505" }}>
      <div className="section-inner" style={{ maxWidth:1400,margin:"0 auto",padding:"0 32px" }}>
        <SectionHeader eyebrow="Testimonials" title="What Our" accent="Customers Say" />
        <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(250px,1fr))",gap:18 }}>
          {reviews.map((r,i)=>(
            <Reveal key={r.name} delay={i*.08}>
              <div className="card-hover glass-card" style={{ borderRadius:16,padding:22,border:"1px solid rgba(255,255,255,.06)",position:"relative" }}>
                <div style={{ display:"flex",gap:3,marginBottom:12 }}>
                  {Array.from({length:r.stars}).map((_,j)=><Star key={j} size={12} style={{ fill:"#FF1F45",color:"#FF1F45" }} />)}
                </div>
                <p style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:12,color:"#CFCFCF",lineHeight:1.75,marginBottom:16 }}>&ldquo;{r.text}&rdquo;</p>
                <div style={{ display:"flex",alignItems:"center",gap:10 }}>
                  <img src={r.avatar} alt={r.name} style={{ width:40,height:40,borderRadius:"50%",border:"2px solid rgba(255,31,69,.3)",objectFit:"cover" }} />
                  <div>
                    <div style={{ fontFamily:"'Orbitron',sans-serif",fontSize:10,fontWeight:700,color:"white" }}>{r.name}</div>
                    <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:9,color:"#555" }}>{r.role}</div>
                  </div>
                </div>
                <div className="animate-glow" style={{ position:"absolute",top:18,right:18,width:7,height:7,borderRadius:"50%",background:"#FF1F45" }} />
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────── FAQ ───────────────
const FAQS = [
  { q:"How long does a custom PC build take?",a:"Custom builds typically take 3–5 business days including assembly, cable management, OS installation, and our 72-hour stress test protocol. Rush builds can be completed in 48 hours for an additional fee." },
  { q:"Do you offer warranty on custom builds?",a:"All DESKTO custom builds come with a 1-year parts and labour warranty. Individual components carry their manufacturer warranty on top of this. We also offer extended warranty plans up to 3 years." },
  { q:"Can I trade in my old PC for a new build?",a:"Absolutely. We accept trade-ins and offer competitive assessments. The trade-in value is applied as a discount toward your new build. Bring your system to any DESKTO store or request a home pickup." },
  { q:"What payment options are available?",a:"We accept all major credit/debit cards, UPI, net banking, and EMI options through major banks (0% EMI for 6/12 months on orders above ₹50,000). We also offer BNPL through Simpl and LazyPay." },
  { q:"Do you provide remote support?",a:"Yes! Our remote support team is available 24/7. We can diagnose and fix most software issues remotely. Hardware issues can be escalated to our in-store repair team." },
  { q:"Are second-hand products quality checked?",a:"Every second-hand product goes through a rigorous 50-point inspection checklist, performance benchmarking, and burn-in testing. All verified products come with a 6-month DESKTO warranty." },
];

function FAQSection() {
  const [open,setOpen] = useState<number|null>(null);
  const published = usePublishedHomepageItems("faq");
  const faqs = published.length
    ? published.map(it => ({ q: it.title, a: it.body || it.shortDescription || it.intro || "" }))
    : FAQS;
  return (
    <section id="support" className="section-pad" style={{ padding:"96px 0",background:"#0D0D0D" }}>
      <div className="section-inner" style={{ maxWidth:860,margin:"0 auto",padding:"0 32px" }}>
        <SectionHeader eyebrow="FAQ" title="Common" accent="Questions" />
        <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
          {faqs.map((f,i)=>(
            <Reveal key={i} delay={i*.04}>
              <div className="glass-card" style={{ borderRadius:12,border:open===i?"1px solid rgba(255,31,69,.35)":"1px solid rgba(255,255,255,.06)",transition:"border-color .3s",overflow:"hidden" }}>
                <button onClick={()=>setOpen(open===i?null:i)} className="faq-btn"
                  style={{ width:"100%",padding:"16px 18px",background:"none",border:"none",display:"flex",alignItems:"center",justifyContent:"space-between",gap:12,textAlign:"left" }}>
                  <span className="faq-q" style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:13,fontWeight:600,color:open===i?"#FF1F45":"white",transition:"color .3s",flex:1 }}>{f.q}</span>
                  <div className={open===i ? "glass-icon-circle glass-icon-circle-red" : "glass-icon-circle"} style={{ flexShrink:0,width:28,height:28,transition:"all .3s" }}>
                    {open===i?<Minus size={12} color="#FF1F45"/>:<Plus size={12} color="#CFCFCF"/>}
                  </div>
                </button>
                {open===i && (
                  <div className="faq-ans" style={{ padding:"0 18px 16px" }}>
                    <p style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:13,color:"#CFCFCF",lineHeight:1.75,borderTop:"1px solid rgba(255,255,255,.05)",paddingTop:12 }}>{f.a}</p>
                  </div>
                )}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────── LOCATION ───────────────
function LocationSection() {
  return (
    <section id="contact" className="section-pad" style={{ padding:"80px 0",background:"linear-gradient(135deg,#0a0005,#050505)",position:"relative" }}>
      <div style={{ position:"absolute",inset:0,background:"radial-gradient(ellipse at 30% 50%,rgba(42,0,8,.5) 0%,transparent 60%)",pointerEvents:"none" }} />
      <div className="section-inner" style={{ maxWidth:1400,margin:"0 auto",padding:"0 32px",position:"relative" }}>
        <div className="location-grid" style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:52,alignItems:"center" }}>
          <Reveal dir="left">
            <div>
              <span className="glass-red" style={{ display:"inline-block",padding:"6px 14px",borderRadius:4,fontFamily:"'Space Grotesk',sans-serif",fontSize:10,fontWeight:600,color:"#FF1F45",letterSpacing:"3px",textTransform:"uppercase",marginBottom:16 }}>Visit Us</span>
              <h2 style={{ fontFamily:"'Orbitron',sans-serif",fontSize:"clamp(22px,3.5vw,42px)",fontWeight:900,color:"white",lineHeight:1.1,marginBottom:16 }}>Experience DESKTO<br /><span style={{ color:"#FF1F45" }}>In Person</span></h2>
              <p style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:14,color:"#CFCFCF",lineHeight:1.7,marginBottom:26 }}>Visit our showroom to see our machines running live. Our experts are ready to guide you through every option.</p>
              <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                {[
                  {icon:User,text:"Mr. Vishnu — Computer & Gaming Expert"},
                  {icon:Wrench,text:"Gaming PC Builds | Laptop/Desktop Repair"},
                  {icon:Package,text:"Used Laptops (Buy/Sell) | Data Recovery | Gaming Info"},
                  {icon:Phone,text:"9893543312",link:"https://wa.me/919893543312"},
                  {icon:Mail,text:"desktogaming@gmail.com",link:"mailto:desktogaming@gmail.com"},
                  {icon:MapPin,text:"Ground Floor Shop No-9 Block No-8 Dakshin Gangotri Supela Bhilai 490023",link:"https://maps.google.com/?q=21.206030,81.348663"}
                ].map(({icon:Icon,text,link})=>(
                  <a key={text} href={link} target={link ? "_blank" : undefined} rel="noopener noreferrer" style={{ display:"flex",alignItems:"flex-start",gap:10,textDecoration:"none",cursor:link?"pointer":"default" }}>
                    <div className="glass-icon-circle glass-icon-circle-red" style={{ width:32,height:32,flexShrink:0 }}>
                      <Icon size={13} color="#FF1F45" />
                    </div>
                    <span style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:13,color:"#CFCFCF",paddingTop:7,transition:"color .3s" }}
                          onMouseEnter={e=>{if(link) e.currentTarget.style.color="#FF1F45"}}
                          onMouseLeave={e=>{if(link) e.currentTarget.style.color="#CFCFCF"}}>
                      {text}
                    </span>
                  </a>
                ))}
              </div>
            </div>
          </Reveal>
          <Reveal dir="right">
            <div className="glass-card" style={{ borderRadius:18,padding:26,border:"1px solid rgba(255,255,255,.07)" }}>
              <h3 style={{ fontFamily:"'Orbitron',sans-serif",fontSize:13,fontWeight:800,color:"white",marginBottom:18,letterSpacing:"1px" }}>QUICK ENQUIRY</h3>
              <div style={{ display:"flex",flexDirection:"column",gap:11 }}>
                {["Your Name","Phone / Email","Service Needed"].map(ph=>(
                  <input key={ph} placeholder={ph}
                    style={{ width:"100%",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:9,padding:"11px 14px",fontFamily:"'Space Grotesk',sans-serif",fontSize:13,color:"white",outline:"none",transition:"border-color .3s",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)" }}
                    onFocus={e=>(e.currentTarget.style.borderColor="rgba(255,31,69,.5)")}
                    onBlur={e=>(e.currentTarget.style.borderColor="rgba(255,255,255,.08)")} />
                ))}
                <textarea placeholder="Tell us about your requirements..." rows={3}
                  style={{ width:"100%",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",borderRadius:9,padding:"11px 14px",fontFamily:"'Space Grotesk',sans-serif",fontSize:13,color:"white",outline:"none",resize:"none",transition:"border-color .3s",backdropFilter:"blur(8px)",WebkitBackdropFilter:"blur(8px)" }}
                  onFocus={e=>(e.currentTarget.style.borderColor="rgba(255,31,69,.5)")}
                  onBlur={e=>(e.currentTarget.style.borderColor="rgba(255,255,255,.08)")} />
                <button className="glass-pill glass-pill-primary glass-pill-block">
                  Send Enquiry
                </button>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

// ─────────────── AUTHENTICATION WORKFLOWS ───────────────
type AuthUser = {
  id: string;
  name: string;
  firstName?: string;
  lastName?: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: AuthRole;
  staffId?: string;
  department?: string;
  emailVerified: boolean;
  phoneVerified: boolean;
  status: "active" | "locked";
  loginAttempts: number;
  lockedUntil?: number;
  createdAt: string;
  updatedAt: string;
};

type PendingSignup = {
  name: string;
  email: string;
  phone: string;
  passwordHash: string;
  role: AuthRole;
  staffId?: string;
  department?: string;
  otp: string;
  expiresAt: number;
  attempts: number;
  rawPassword?: string;
};

type ResetRequest = {
  email: string;
  otp: string;
  expiresAt: number;
  attempts: number;
  verified: boolean;
};

type SessionRecord = {
  id: string;
  userId: string;
  refreshToken: string;
  device: string;
  ip: string;
  expiresAt: string;
};

type AuditLog = {
  id: string;
  event: string;
  detail: string;
  at: string;
};

const AUTH_STORAGE_KEY = "deskto-auth-demo-state";
const OTP_TTL_MS = 5 * 60 * 1000;
const MAX_OTP_ATTEMPTS = 3;
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_MS = 10 * 60 * 1000;
const ADMIN_SIGNUP_CODE = "DESKTO-ADMIN-2026";

const emptyAuthState = {
  users: [] as AuthUser[],
  pendingSignup: null as PendingSignup | null,
  resetRequest: null as ResetRequest | null,
  sessions: [] as SessionRecord[],
  auditLogs: [] as AuditLog[],
  currentUserId: null as string | null,
  accessToken: "",
};

function makeId(prefix: string) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function demoHashPassword(password: string) {
  return `demo_bcrypt_${btoa(unescape(encodeURIComponent(password))).slice(0, 28)}`;
}

function generateOtp() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

function isEmail(value: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function normalizePhone(value: string) {
  return value.replace(/\D/g, "");
}

function strongPassword(value: string) {
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$/.test(value);
}

function AuthField({ label, type="text", value, onChange, placeholder }: { label:string; type?:string; value:string; onChange:(value:string)=>void; placeholder?:string }) {
  return (
    <label style={{ display:"flex",flexDirection:"column",gap:7 }}>
      <span style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:10,color:"#777",letterSpacing:"1.4px",textTransform:"uppercase",fontWeight:700 }}>{label}</span>
      <input type={type} value={value} placeholder={placeholder} onChange={e=>onChange(e.target.value)}
        style={{ width:"100%",background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.09)",borderRadius:8,padding:"11px 12px",fontFamily:"'Space Grotesk',sans-serif",fontSize:13,color:"white",outline:"none" }} />
    </label>
  );
}

type AuthMode = "sign-in" | "sign-up" | "forgot-password";
type AuthRole = "customer" | "admin" | "staff";

const signupRoleMeta = {
  customer: { label:"Customer", path:"/sign-up/customer", icon:UserPlus },
  admin: { label:"Admin", path:"/sign-up/admin", icon:ShieldCheck },
  staff: { label:"Staff", path:"/sign-up/staff", icon:ClipboardCheck },
} satisfies Record<AuthRole, { label:string; path:string; icon:typeof UserPlus }>;

function AuthSection({ initialMode="sign-in", initialRole="customer", standalone=false }: { initialMode?: AuthMode; initialRole?: AuthRole; standalone?: boolean }) {
  const [state,setState] = useState(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? { ...emptyAuthState, ...JSON.parse(saved) } : emptyAuthState;
    } catch {
      return emptyAuthState;
    }
  });
  const [signup,setSignup] = useState({ name:"", email:"", phone:"", password:"", confirm:"", terms:false, role:initialRole, adminCode:"", staffId:"", department:"" });
  const [signupOtp,setSignupOtp] = useState("");
  const [login,setLogin] = useState({ identifier:"", password:"", remember:true });
  const [forgot,setForgot] = useState({ email:"", otp:"", password:"", confirm:"" });
  const [message,setMessage] = useState("Ready to validate customer authentication.");
  const [mode,setMode] = useState<AuthMode>(initialMode);

  useEffect(() => {
    localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
    window.dispatchEvent(new Event(AUTH_STATE_CHANGED_EVENT));
  }, [state]);

  useEffect(() => {
    setMode(initialMode);
    setSignup(prev => ({ ...prev, role:initialRole }));
  }, [initialMode, initialRole]);

  const goMode = (nextMode: AuthMode) => {
    setMode(nextMode);
    if (standalone) {
      window.history.pushState(null, "", `/${nextMode}`);
    }
  };

  const goSignupRole = (role: AuthRole) => {
    setMode("sign-up");
    setSignup(prev => ({ ...prev, role }));
    if (standalone) {
      window.history.pushState(null, "", signupRoleMeta[role].path);
    }
  };

  const addLog = (event: string, detail: string) => {
    setState(prev => ({
      ...prev,
      auditLogs: [{ id:makeId("log"), event, detail, at:new Date().toLocaleString() }, ...prev.auditLogs].slice(0, 8),
    }));
  };

  const runSignup = () => {
    const phone = normalizePhone(signup.phone);
    if (signup.name.trim().length < 2) return setMessage("Name is required.");
    if (!isEmail(signup.email)) return setMessage("Enter a valid email address.");
    if (phone.length < 10) return setMessage("Mobile number must be at least 10 digits.");
    if (!strongPassword(signup.password)) return setMessage("Password needs 8+ chars with upper, lower, number, and symbol.");
    if (signup.password !== signup.confirm) return setMessage("Confirm password must match.");
    if (!signup.terms) return setMessage("Accept Terms and Privacy Policy.");
    if (signup.role === "admin" && signup.adminCode.trim() !== ADMIN_SIGNUP_CODE) return setMessage("Enter the valid admin signup code.");
    if (signup.role === "staff" && !/^STF-\d{4,}$/i.test(signup.staffId.trim())) return setMessage("Staff ID must use the format STF-1001.");
    if (signup.role === "staff" && signup.department.trim().length < 2) return setMessage("Department is required for staff signup.");
    if (state.users.some(u => u.email.toLowerCase() === signup.email.toLowerCase())) return setMessage("Duplicate email blocked.");
    if (state.users.some(u => normalizePhone(u.phone) === phone)) return setMessage("Duplicate mobile blocked.");
    if (signup.role === "staff" && state.users.some(u => u.staffId?.toLowerCase() === signup.staffId.trim().toLowerCase())) return setMessage("Duplicate staff ID blocked.");

    const otp = generateOtp();
    setState(prev => ({
      ...prev,
      pendingSignup: {
        name: signup.name.trim(),
        email: signup.email.trim().toLowerCase(),
        phone,
        passwordHash: demoHashPassword(signup.password),
        rawPassword: signup.password,
        role: signup.role,
        staffId: signup.role === "staff" ? signup.staffId.trim().toUpperCase() : undefined,
        department: signup.role === "staff" ? signup.department.trim() : undefined,
        otp,
        expiresAt: Date.now() + OTP_TTL_MS,
        attempts: 0,
      },
    }));
    setSignupOtp(otp);
    setMessage(`OTP generated and stored with expiry. Demo OTP: ${otp}`);
    addLog("signup_otp_sent", `${signup.role} OTP sent to ${signup.email}`);
  };

  const verifySignupOtp = async () => {
    const pending = state.pendingSignup;
    if (!pending) return setMessage("Create a signup request first.");
    if (Date.now() > pending.expiresAt) return setMessage("Signup OTP expired.");
    if (pending.attempts >= MAX_OTP_ATTEMPTS) return setMessage("Maximum OTP attempts reached.");
    if (signupOtp !== pending.otp) {
      setState(prev => prev.pendingSignup ? { ...prev, pendingSignup:{ ...prev.pendingSignup, attempts:prev.pendingSignup.attempts + 1 } } : prev);
      return setMessage("Wrong OTP.");
    }
    try {
      const nameParts = pending.name.trim().split(' ');
      const firstName = nameParts[0];
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

      // Build the user locally first so the demo always works even without a backend
      const newUserId = makeId("usr");
      const newUser: AuthUser = {
        id: newUserId,
        name: pending.name,
        email: pending.email,
        phone: pending.phone,
        firstName,
        lastName,
        passwordHash: pending.passwordHash,
        role: pending.role,
        staffId: pending.staffId,
        department: pending.department,
        emailVerified: true,
        phoneVerified: true,
        status: "active",
        loginAttempts: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      const session: SessionRecord = {
        id: makeId("sess"),
        userId: newUserId,
        refreshToken: makeId("refresh"),
        device: "Browser demo",
        ip: "127.0.0.1",
        expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      };

      // Persist to demo state (used by useCurrentUser / DashboardRouter)
      setState(prev => ({
        ...prev,
        users: [...prev.users, newUser],
        pendingSignup: null,
        sessions: [...prev.sessions, session],
        currentUserId: newUserId,
        accessToken: makeId("jwt"),
      }));

      // Also attempt real backend registration (non-blocking — failure is OK in demo mode)
      apiRegister({
        email: pending.email,
        password: pending.rawPassword || pending.passwordHash,
        firstName,
        lastName,
        phone: pending.phone,
        role: pending.role,
        staffId: pending.staffId,
        department: pending.department
      }).catch(() => { /* backend not available in demo mode — that's fine */ });

      setMessage(`${signupRoleMeta[pending.role].label} account created! Redirecting to dashboard…`);
      addLog("signup_completed", `${pending.role} ${pending.email} verified by OTP`);

      // Redirect to the correct role dashboard
      const dashPath = `/dashboard/${pending.role}`;
      setTimeout(() => {
        window.history.pushState(null, "", dashPath);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }, 800);
    } catch (error: any) {
      const errorMsg = error?.message || "Failed to create account.";
      setMessage(errorMsg);
      addLog("signup_failure", `${pending.email} failed to create account: ${errorMsg}`);
    }
  };

  const runLogin = async () => {
    const identifier = login.identifier.trim();
    if (!identifier) return setMessage("Email or mobile is required.");
    if (!login.password) return setMessage("Password is required.");

    try {
      const authUser = await apiLogin(identifier, login.password);
      // Sync this component's own copy of auth state so the persist effect
      // (and addLog below) don't overwrite the session apiLogin just wrote —
      // otherwise the stale local `state.currentUserId` clobbers it back to null.
      setState(prev => ({ ...prev, currentUserId: authUser.id }));
      setMessage("Login successful. Redirecting to dashboard…");
      addLog("login_success", `${identifier} logged in as ${authUser.role}`);

      // Redirect to the correct role dashboard after a brief delay
      const dashPath = `/dashboard/${authUser.role}`;
      setTimeout(() => {
        window.history.pushState(null, "", dashPath);
        window.dispatchEvent(new PopStateEvent("popstate"));
      }, 600);
    } catch (error: any) {
      const message = error?.message || "Wrong email/mobile or password.";
      setMessage(message.includes("Invalid credentials") ? "Wrong email/mobile or password." : message);
      addLog("login_failure", `${identifier} failed to log in: ${message}`);
    }
  };

  const requestPasswordReset = () => {
    const email = forgot.email.trim().toLowerCase();
    if (!isEmail(email)) return setMessage("Enter a valid reset email.");
    if (!state.users.some(u => u.email === email)) return setMessage("No customer exists with that email.");
    const otp = generateOtp();
    setState(prev => ({ ...prev, resetRequest:{ email, otp, expiresAt:Date.now() + OTP_TTL_MS, attempts:0, verified:false } }));
    setForgot(prev => ({ ...prev, otp }));
    setMessage(`Password reset OTP generated. Demo OTP: ${otp}`);
    addLog("reset_otp_sent", `Password reset OTP sent to ${email}`);
  };

  const verifyResetOtp = () => {
    const reset = state.resetRequest;
    if (!reset) return setMessage("Request password reset first.");
    if (Date.now() > reset.expiresAt) return setMessage("Reset OTP expired.");
    if (reset.attempts >= MAX_OTP_ATTEMPTS) return setMessage("Maximum reset OTP attempts reached.");
    if (forgot.otp !== reset.otp) {
      setState(prev => prev.resetRequest ? { ...prev, resetRequest:{ ...prev.resetRequest, attempts:prev.resetRequest.attempts + 1 } } : prev);
      return setMessage("Wrong reset OTP.");
    }
    setState(prev => prev.resetRequest ? { ...prev, resetRequest:{ ...prev.resetRequest, verified:true } } : prev);
    setMessage("Reset OTP verified. Enter a new password.");
  };

  const resetPassword = () => {
    const reset = state.resetRequest;
    if (!reset?.verified) return setMessage("Verify reset OTP before updating password.");
    if (!strongPassword(forgot.password)) return setMessage("New password is not strong enough.");
    if (forgot.password !== forgot.confirm) return setMessage("Confirm password must match.");
    const user = state.users.find(u => u.email === reset.email);
    if (!user) return setMessage("User no longer exists.");
    setState(prev => ({
      ...prev,
      users: prev.users.map(u => u.id === user.id ? { ...u, passwordHash:demoHashPassword(forgot.password), updatedAt:new Date().toISOString(), loginAttempts:0, status:"active", lockedUntil:undefined } : u),
      sessions: prev.sessions.filter(s => s.userId !== user.id),
      currentUserId: prev.currentUserId === user.id ? null : prev.currentUserId,
      accessToken: prev.currentUserId === user.id ? "" : prev.accessToken,
      resetRequest: null,
    }));
    setMessage("Password reset complete. Old sessions invalidated.");
    addLog("password_reset", `${reset.email} reset password and sessions were revoked`);
  };

  const logout = () => {
    const userId = state.currentUserId;
    setState(prev => ({ ...prev, currentUserId:null, accessToken:"", sessions: prev.sessions.filter(s => s.userId !== userId) }));
    setMessage("Logout successful. Refresh sessions removed for this browser user.");
    addLog("logout", "Current customer logged out");
  };

  const refreshAccessToken = () => {
    if (!state.currentUserId || !state.sessions.some(s => s.userId === state.currentUserId)) return setMessage("No refresh token session available.");
    setState(prev => ({ ...prev, accessToken:makeId("jwt") }));
    setMessage("Access token refreshed using stored refresh token.");
    addLog("token_refreshed", "JWT access token rotated");
  };

  const resetDemo = () => {
    setState(emptyAuthState);
    setSignup({ name:"", email:"", phone:"", password:"", confirm:"", terms:false, role:initialRole, adminCode:"", staffId:"", department:"" });
    setLogin({ identifier:"", password:"", remember:true });
    setForgot({ email:"", otp:"", password:"", confirm:"" });
    setSignupOtp("");
    setMessage("Demo state cleared.");
  };

  const currentUser = state.users.find(u => u.id === state.currentUserId);
  const currentSignupRole = signupRoleMeta[signup.role];
  const CurrentSignupIcon = currentSignupRole.icon;

  return (
    <section id="auth" className="section-pad" style={{ padding:standalone?"112px 0 96px":"96px 0",background:"#050505",position:"relative",minHeight:standalone?"100vh":undefined }}>
      <div className="cyber-grid" style={{ position:"absolute",inset:0,opacity:.4 }} />
      <div className="section-inner" style={{ maxWidth:1400,margin:"0 auto",padding:"0 32px",position:"relative" }}>
        {standalone && (
          <Reveal>
            <a href="/" className="glass-pill glass-pill-outline" style={{ padding:"9px 12px",fontSize:9,marginBottom:22 }}>
              DESKTO Home
            </a>
          </Reveal>
        )}
        <SectionHeader eyebrow="Secure Account Access" title={mode === "sign-up" ? currentSignupRole.label : "Customer"} accent={mode === "sign-up" ? "Sign Up" : "Authentication"} sub="Sign in, create an account, or reset your password with validated OTP and session flows." />
        <Reveal>
          <div style={{ display:"flex",justifyContent:"center",gap:10,flexWrap:"wrap",marginBottom:22 }}>
            {[
              ["sign-in","Sign In",LogIn],
              ["sign-up","Sign Up",UserPlus],
              ["forgot-password","Forgot Password",KeyRound],
            ].map(([key,label,Icon]) => (
              <button key={key as string} className={mode === key ? "glass-pill glass-pill-primary" : "glass-pill glass-pill-outline"} onClick={() => key === "sign-up" ? goSignupRole(signup.role) : goMode(key as AuthMode)} style={{ padding:"11px 16px",fontSize:9 }}>
                <Icon size={12} /> {label as string}
              </button>
            ))}
          </div>
        </Reveal>
        <Reveal>
          <div className="glass-red" style={{ borderRadius:10,padding:"12px 16px",marginBottom:22,fontFamily:"'Space Grotesk',sans-serif",fontSize:12,color:"#FFC0C8",lineHeight:1.6 }}>
            Browser demo only: real production bcrypt hashing, JWT signing, HTTPS, CSRF protection, rate limits, SMS/email delivery, SQL constraints, and audit storage must run on a backend service.
          </div>
        </Reveal>
        <div style={{ display:"grid",gridTemplateColumns:standalone ? "minmax(290px,460px)" : "repeat(auto-fit,minmax(290px,1fr))",gap:18,justifyContent:standalone ? "center" : undefined }}>
          {mode === "sign-up" && (
          <Reveal>
            <div className="glass-card" style={{ borderRadius:14,padding:20 }}>
              <h3 style={{ fontFamily:"'Orbitron',sans-serif",fontSize:12,color:"white",letterSpacing:"1px",marginBottom:14,display:"flex",alignItems:"center",gap:8 }}><CurrentSignupIcon size={15} color="#FF1F45" /> {currentSignupRole.label.toUpperCase()} SIGN UP</h3>
              <div style={{ display:"flex",flexDirection:"column",gap:11 }}>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8 }}>
                  {(Object.keys(signupRoleMeta) as AuthRole[]).map(role => {
                    const meta = signupRoleMeta[role];
                    const Icon = meta.icon;
                    return (
                      <button key={role} className={signup.role === role ? "glass-pill glass-pill-primary" : "glass-pill glass-pill-outline"} onClick={() => goSignupRole(role)} style={{ padding:"10px 10px",fontSize:8 }}>
                        <Icon size={11} /> {meta.label}
                      </button>
                    );
                  })}
                </div>
                <AuthField label="Full Name" value={signup.name} onChange={v=>setSignup(p=>({...p,name:v}))} />
                <AuthField label="Email" value={signup.email} onChange={v=>setSignup(p=>({...p,email:v}))} />
                <AuthField label="Mobile Number" value={signup.phone} onChange={v=>setSignup(p=>({...p,phone:v}))} />
                {signup.role === "admin" && (
                  <AuthField label="Admin Signup Code" value={signup.adminCode} onChange={v=>setSignup(p=>({...p,adminCode:v}))} placeholder={ADMIN_SIGNUP_CODE} />
                )}
                {signup.role === "staff" && (
                  <>
                    <AuthField label="Staff ID" value={signup.staffId} onChange={v=>setSignup(p=>({...p,staffId:v}))} placeholder="STF-1001" />
                    <AuthField label="Department" value={signup.department} onChange={v=>setSignup(p=>({...p,department:v}))} placeholder="Sales, Support, Service" />
                  </>
                )}
                <AuthField label="Password" type="password" value={signup.password} onChange={v=>setSignup(p=>({...p,password:v}))} />
                <AuthField label="Confirm Password" type="password" value={signup.confirm} onChange={v=>setSignup(p=>({...p,confirm:v}))} />
                <label style={{ display:"flex",alignItems:"center",gap:9,fontFamily:"'Space Grotesk',sans-serif",fontSize:12,color:"#CFCFCF" }}>
                  <input type="checkbox" checked={signup.terms} onChange={e=>setSignup(p=>({...p,terms:e.target.checked}))} /> Accept Terms and Privacy Policy
                </label>
                <button className="glass-pill glass-pill-primary" onClick={runSignup}>Create {currentSignupRole.label} Account</button>
                <div style={{ display:"grid",gridTemplateColumns:"1fr auto",gap:8 }}>
                  <input value={signupOtp} onChange={e=>setSignupOtp(e.target.value)} placeholder="Enter OTP"
                    style={{ background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.09)",borderRadius:8,padding:"11px 12px",fontFamily:"'Space Grotesk',sans-serif",fontSize:13,color:"white",outline:"none" }} />
                  <button className="glass-pill glass-pill-outline" onClick={verifySignupOtp} style={{ padding:"10px 13px",fontSize:9 }}>Verify</button>
                </div>
                <div className="glass" style={{ borderRadius:10,padding:13,fontFamily:"'Space Grotesk',sans-serif",fontSize:12,color:"#FFC0C8",lineHeight:1.6 }}>{message}</div>
                <button className="glass-pill glass-pill-outline" onClick={() => goMode("sign-in")} style={{ padding:"10px 13px",fontSize:9 }}>Already have an account</button>
              </div>
            </div>
          </Reveal>
          )}
          {mode === "sign-in" && (
          <Reveal delay={.08}>
            <div className="glass-card" style={{ borderRadius:14,padding:20 }}>
              <h3 style={{ fontFamily:"'Orbitron',sans-serif",fontSize:12,color:"white",letterSpacing:"1px",marginBottom:14,display:"flex",alignItems:"center",gap:8 }}><LogIn size={15} color="#FF1F45" /> CUSTOMER SIGN IN</h3>
              <div style={{ display:"flex",flexDirection:"column",gap:11 }}>
                <AuthField label="Email or Mobile" value={login.identifier} onChange={v=>setLogin(p=>({...p,identifier:v}))} />
                <AuthField label="Password" type="password" value={login.password} onChange={v=>setLogin(p=>({...p,password:v}))} />
                <label style={{ display:"flex",alignItems:"center",gap:9,fontFamily:"'Space Grotesk',sans-serif",fontSize:12,color:"#CFCFCF" }}>
                  <input type="checkbox" checked={login.remember} onChange={e=>setLogin(p=>({...p,remember:e.target.checked}))} /> Remember this device
                </label>
                <button className="glass-pill glass-pill-primary" onClick={runLogin}>Login</button>
                <div className="glass" style={{ borderRadius:9,padding:12,fontFamily:"'Space Grotesk',sans-serif",fontSize:12,color:"#CFCFCF",lineHeight:1.6 }}>
                  <strong style={{ color:"white" }}>Dashboard:</strong> {currentUser ? `${currentUser.name} is signed in as ${signupRoleMeta[currentUser.role].label}` : "No active session"}<br />
                  <strong style={{ color:"white" }}>JWT:</strong> {state.accessToken ? state.accessToken.slice(0, 18) + "..." : "Not issued"}
                </div>
                <div className="glass" style={{ borderRadius:10,padding:13,fontFamily:"'Space Grotesk',sans-serif",fontSize:12,color:"#FFC0C8",lineHeight:1.6 }}>{message}</div>
                <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                  <button className="glass-pill glass-pill-outline" onClick={refreshAccessToken} style={{ padding:"9px 12px",fontSize:9 }}><RefreshCw size={11} /> Refresh</button>
                  <button className="glass-pill glass-pill-red" onClick={logout} style={{ padding:"9px 12px",fontSize:9 }}><LogOut size={11} /> Logout</button>
                </div>
                <div style={{ display:"flex",gap:8,flexWrap:"wrap" }}>
                  <button className="glass-pill glass-pill-outline" onClick={() => goMode("sign-up")} style={{ padding:"9px 12px",fontSize:9 }}>Create Account</button>
                  <button className="glass-pill glass-pill-outline" onClick={() => goMode("forgot-password")} style={{ padding:"9px 12px",fontSize:9 }}>Forgot Password</button>
                </div>
              </div>
            </div>
          </Reveal>
          )}
          {mode === "forgot-password" && (
          <Reveal delay={.16}>
            <div className="glass-card" style={{ borderRadius:14,padding:20 }}>
              <h3 style={{ fontFamily:"'Orbitron',sans-serif",fontSize:12,color:"white",letterSpacing:"1px",marginBottom:14,display:"flex",alignItems:"center",gap:8 }}><KeyRound size={15} color="#FF1F45" /> FORGOT PASSWORD</h3>
              <div style={{ display:"flex",flexDirection:"column",gap:11 }}>
                <AuthField label="Email" value={forgot.email} onChange={v=>setForgot(p=>({...p,email:v}))} />
                <button className="glass-pill glass-pill-outline" onClick={requestPasswordReset}>Send Reset OTP</button>
                <div style={{ display:"grid",gridTemplateColumns:"1fr auto",gap:8 }}>
                  <input value={forgot.otp} onChange={e=>setForgot(p=>({...p,otp:e.target.value}))} placeholder="Reset OTP"
                    style={{ background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.09)",borderRadius:8,padding:"11px 12px",fontFamily:"'Space Grotesk',sans-serif",fontSize:13,color:"white",outline:"none" }} />
                  <button className="glass-pill glass-pill-outline" onClick={verifyResetOtp} style={{ padding:"10px 13px",fontSize:9 }}>Verify</button>
                </div>
                <AuthField label="New Password" type="password" value={forgot.password} onChange={v=>setForgot(p=>({...p,password:v}))} />
                <AuthField label="Confirm New Password" type="password" value={forgot.confirm} onChange={v=>setForgot(p=>({...p,confirm:v}))} />
                <button className="glass-pill glass-pill-primary" onClick={resetPassword}>Reset Password</button>
                <div className="glass" style={{ borderRadius:10,padding:13,fontFamily:"'Space Grotesk',sans-serif",fontSize:12,color:"#FFC0C8",lineHeight:1.6 }}>{message}</div>
                <button className="glass-pill glass-pill-outline" onClick={() => goMode("sign-in")} style={{ padding:"10px 13px",fontSize:9 }}>Back to Sign In</button>
              </div>
            </div>
          </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}

// ─────────────── FOOTER ───────────────
export function FooterSection() {
  const cols = [
    { title:"Products",links:["Gaming PCs","General PCs","Laptops","Components","Peripherals","Monitors"] },
    { title:"Services",links:["PC Repair","Custom Builds","PC Rental","Remote Support","PC Assembly","Buy Second-Hand"] },
    { title:"Company",links:["About Us","Careers","Press Kit","Blog","Partners","Contact"] },
    { title:"Support",links:["Track Order","Warranty Claims","User Manuals","FAQ","Live Chat","Community"] },
  ];
  return (
    <footer style={{ background:"#0D0D0D",borderTop:"1px solid rgba(255,255,255,.05)" }}>
      <div className="footer-pad" style={{ maxWidth:1400,margin:"0 auto",padding:"58px 32px 26px" }}>
        <div className="footer-grid" style={{ display:"grid",gridTemplateColumns:"1.4fr repeat(4,1fr)",gap:34,marginBottom:48 }}>
          <div className="footer-brand">
            <div style={{ display:"flex",alignItems:"center",gap:10,marginBottom:14 }}>
              <BrandMark size={34} />
              <span style={{ fontFamily:"'Orbitron',sans-serif",fontSize:14,fontWeight:900,letterSpacing:"4px",color:"white" }}>DESKTO</span>
            </div>
            <p style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:12,color:"#555",lineHeight:1.7,marginBottom:16,maxWidth:200 }}>Premium gaming computers & tech services. Built for those who demand perfection.</p>
            <div style={{ display:"flex",gap:8 }}>
              {[Instagram,Twitter,Youtube,Facebook].map((Icon,i)=>(
                <button key={i} className="glass-pill glass-pill-icon" style={{ width:34,height:34,fontSize:0 }}>
                  <Icon size={13} />
                </button>
              ))}
            </div>
          </div>
          {cols.map(col=>(
            <div key={col.title}>
              <h4 style={{ fontFamily:"'Orbitron',sans-serif",fontSize:9,fontWeight:700,color:"white",letterSpacing:"2px",marginBottom:14,textTransform:"uppercase" }}>{col.title}</h4>
              <div style={{ display:"flex",flexDirection:"column",gap:9 }}>
                {col.links.map(l=>(
                  <a key={l} href="#" style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:12,color:"#555",textDecoration:"none",transition:"color .3s" }}
                    onMouseEnter={e=>(e.currentTarget.style.color="#CFCFCF")}
                    onMouseLeave={e=>(e.currentTarget.style.color="#555")}>{l}</a>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="footer-bottom" style={{ borderTop:"1px solid rgba(255,255,255,.05)",paddingTop:20,display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:12 }}>
          <span style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:11,color:"#444" }}>© 2026 DESKTO Computer & Gaming. All rights reserved.</span>
          <div className="footer-bottom-links" style={{ display:"flex",gap:20 }}>
            {["Privacy Policy","Terms of Service","Sitemap"].map(l=>(
              <a key={l} href="#" style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:10,color:"#444",textDecoration:"none",transition:"color .3s" }}
                onMouseEnter={e=>(e.currentTarget.style.color="#CFCFCF")}
                onMouseLeave={e=>(e.currentTarget.style.color="#444")}>{l}</a>
            ))}
          </div>
          <div className="rgb-bar" style={{ height:2,width:"100%",borderRadius:1,marginTop:12,opacity:.4 }} />
        </div>
      </div>
    </footer>
  );
}

// ─────────────── SCROLL TO TOP ───────────────
export function ScrollToTop() {
  const [vis,setVis] = useState(false);
  useEffect(() => {
    const fn = () => setVis(window.scrollY > 500);
    window.addEventListener("scroll", fn);
    return () => window.removeEventListener("scroll", fn);
  }, []);
  if (!vis) return null;
  return (
    <button onClick={() => window.scrollTo({top:0,behavior:"smooth"})}
      className="glass-pill glass-pill-primary animate-glow"
      style={{ position:"fixed",bottom:22,right:22,zIndex:400,width:46,height:46,padding:0,borderRadius:"50%" }}>
      <ChevronUp size={18} />
    </button>
  );
}

function getAuthRouteFromPath(pathname: string): { mode: AuthMode; role: AuthRole } | null {
  if (pathname === "/sign-up" || pathname === "/sign-up/customer") return { mode:"sign-up", role:"customer" };
  if (pathname === "/sign-up/admin") return { mode:"sign-up", role:"admin" };
  if (pathname === "/sign-up/staff") return { mode:"sign-up", role:"staff" };
  if (pathname === "/sign-in" || pathname === "/auth") return { mode:"sign-in", role:"customer" };
  if (pathname === "/forgot-password") return { mode:"forgot-password", role:"customer" };
  return null;
}

function getProductCategoryFromPath(pathname: string): ProductType | "all" | null {
  if (pathname === "/products/gaming") return "gaming";
  if (pathname === "/products/general") return "general";
  if (pathname === "/products") return "all";
  return null;
}

function getProductDetailFromPath(pathname: string): string | null {
  const m = pathname.match(/^\/product\/([^/]+)\/?$/);
  return m ? decodeURIComponent(m[1]) : null;
}

function getServicesRouteFromPath(pathname: string): { slug: string | null; child?: string | null } | null {
  if (pathname === "/services" || pathname === "/services/") return { slug: null };
  const m = pathname.match(/^\/services\/([a-z0-9-]+)(?:\/([a-z0-9-]+))?\/?$/);
  return m ? { slug: m[1], child: m[2] || null } : null;
}

function isCheckoutPath(pathname: string): boolean {
  return pathname === "/checkout";
}

function getDashboardRouteFromPath(pathname: string): { kind: "customer" | "staff" | "admin"; tab?: string | null } | null {
  if (pathname === "/dashboard" || pathname === "/dashboard/") return { kind: "customer", tab: null };
  const m = pathname.match(/^\/dashboard\/(customer|staff|admin)(?:\/([a-z0-9-]+))?\/?$/);
  return m ? { kind: m[1] as "customer" | "staff" | "admin", tab: m[2] || null } : null;
}

function HomePage() {
  return (
    <>
      <Navbar />
      <HeroSection />
      <ServicesSection />
      <WorkflowTimeline />
      <FeaturedBuildsSection />
      <BrandsSection />
      <OffersSection />
      <GamingNewsSection />
      <TestimonialsSection />
      <FAQSection />
      <LocationSection />
      <FooterSection />
    </>
  );
}

function AuthPage({ mode, role }: { mode: AuthMode; role: AuthRole }) {
  return (
    <>
      <Navbar />
      <AuthSection initialMode={mode} initialRole={role} standalone />
      <ScrollToTop />
    </>
  );
}

// ─────────────── CHECKOUT ───────────────
type CheckoutStep = "cart" | "address" | "delivery" | "coupon" | "payment" | "review" | "done";
type CheckoutStatus = "draft" | "PAID" | "PENDING" | "FAILED" | "RESERVED" | "SHIPPED" | "DELIVERED" | "CANCELLED";
type PaymentMethod = "upi" | "card" | "netbanking" | "wallet" | "cod";
type DeliveryMethod = "ship" | "pickup";

type CheckoutState = {
  step: CheckoutStep;
  cart: Record<number, number>;
  address: { name:string; phone:string; email:string; line1:string; line2:string; city:string; state:string; pincode:string; country:string };
  delivery: { method: DeliveryMethod; storeId?: string };
  coupon: { code: string; discountPct: number; flatOff?: number; minSubtotal?: number } | null;
  payment: { method: PaymentMethod; details?: string; processing: boolean; error?: string };
  orderId: string | null;
  status: CheckoutStatus;
};

type CheckoutAction =
  | { type:"load"; cart: Record<number,number> }
  | { type:"goto"; step: CheckoutStep }
  | { type:"back" }
  | { type:"setAddress"; address: Partial<CheckoutState["address"]> }
  | { type:"setDelivery"; delivery: Partial<CheckoutState["delivery"]> }
  | { type:"applyCoupon"; coupon: CheckoutState["coupon"] }
  | { type:"clearCoupon" }
  | { type:"setPayment"; payment: Partial<CheckoutState["payment"]> }
  | { type:"placeOrder"; orderId: string }
  | { type:"markPaid" }
  | { type:"markShipped" }
  | { type:"markDelivered" }
  | { type:"cancel" }
  | { type:"reset" };

const CHECKOUT_STEPS: { key: CheckoutStep; label: string; icon: any }[] = [
  { key:"cart", label:"Cart", icon:ShoppingCart },
  { key:"address", label:"Address", icon:MapPin },
  { key:"delivery", label:"Delivery", icon:Truck },
  { key:"coupon", label:"Coupon", icon:Circle },
  { key:"payment", label:"Payment", icon:CreditCard },
  { key:"review", label:"Review", icon:Eye },
];

const STORES = [
  { id:"DEL-BLK", name:"DESKTO Connaught Place" },
  { id:"DEL-GUR", name:"DESKTO Gurgaon Cyber Hub" },
  { id:"DEL-NOI", name:"DESKTO Noida Sector 18" },
  { id:"BLR-IND", name:"DESKTO Indiranagar, Bengaluru" },
  { id:"MUM-BKC", name:"DESKTO BKC, Mumbai" },
];

function validateAddress(a: CheckoutState["address"]): string | null {
  if (!a.name.trim() || a.name.trim().length < 2) return "Enter your full name.";
  if (normalizePhone(a.phone).length < 10) return "Enter a valid 10-digit phone.";
  if (!isEmail(a.email)) return "Enter a valid email.";
  if (!a.line1.trim()) return "Address line 1 is required.";
  if (!a.city.trim()) return "City is required.";
  if (!a.state.trim()) return "State is required.";
  if (!/^\d{6}$/.test(a.pincode.trim())) return "Pincode must be 6 digits.";
  return null;
}

function applyCoupon(code: string, subtotal: number): CheckoutState["coupon"] | null {
  const c = code.trim().toUpperCase();
  if (c === "DESKTO10") return { code:"DESKTO10", discountPct:10 };
  if (c === "WELCOME5") return subtotal > 50000 ? { code:"WELCOME5", discountPct:0, flatOff:5000, minSubtotal:50000 } : null;
  return null;
}

function cartSubtotal(cart: Record<number,number>): number {
  return Object.entries(cart).reduce((sum,[id,qty]) => {
    const p = PRODUCTS.find(item => item.id === Number(id));
    return p ? sum + p.price * qty : sum;
  }, 0);
}

function cartDiscount(subtotal: number, coupon: CheckoutState["coupon"]): number {
  if (!coupon) return 0;
  let d = Math.round(subtotal * (coupon.discountPct / 100));
  if (coupon.flatOff) d = Math.max(d, coupon.flatOff);
  return Math.min(d, subtotal);
}

function cartGst(subtotal: number, discount: number): number {
  return Math.round((subtotal - discount) * 0.18);
}

function cartGrandTotal(cart: Record<number,number>, coupon: CheckoutState["coupon"], deliveryMethod: DeliveryMethod): number {
  const subtotal = cartSubtotal(cart);
  const discount = cartDiscount(subtotal, coupon);
  const gst = cartGst(subtotal, discount);
  const shipping = deliveryMethod === "ship" ? (subtotal > 50000 ? 0 : 499) : 0;
  return subtotal - discount + gst + shipping;
}

function mergeCheckoutProducts(...groups: Product[][]): Product[] {
  const seen = new Set<string>();
  const products: Product[] = [];
  for (const product of groups.flat()) {
    const key = String(product.liveId || product.sku || product.id);
    if (seen.has(key)) continue;
    seen.add(key);
    products.push(product);
  }
  return products;
}

function resolveCartProduct(cartProductId: number, products: Product[]): Product | undefined {
  return products.find(product => {
    if (product.id === cartProductId) return true;
    if (product.liveId && stableNumericId(product.liveId) === cartProductId) return true;
    if (product.sku && stableNumericId(product.sku) === cartProductId) return true;
    return false;
  });
}

function checkoutReducer(state: CheckoutState, action: CheckoutAction): CheckoutState {
  switch (action.type) {
    case "load": return { ...state, cart: action.cart };
    case "goto": return { ...state, step: action.step };
    case "back": {
      const idx = CHECKOUT_STEPS.findIndex(s => s.key === state.step);
      if (state.step === "done") return state;
      if (state.step === "review") return { ...state, step:"payment" };
      if (idx > 0) return { ...state, step: CHECKOUT_STEPS[idx-1].key };
      return state;
    }
    case "setAddress": return { ...state, address: { ...state.address, ...action.address } };
    case "setDelivery": return { ...state, delivery: { ...state.delivery, ...action.delivery } };
    case "applyCoupon": return { ...state, coupon: action.coupon };
    case "clearCoupon": return { ...state, coupon: null };
    case "setPayment": return { ...state, payment: { ...state.payment, ...action.payment } };
    case "placeOrder": return { ...state, orderId: action.orderId, status:"RESERVED" };
    case "markPaid": return { ...state, status:"PAID" };
    case "markShipped": return { ...state, status:"SHIPPED" };
    case "markDelivered": return { ...state, status:"DELIVERED" };
    case "cancel": return { ...state, status:"CANCELLED" };
    case "reset": return INITIAL_CHECKOUT_STATE;
  }
}

const INITIAL_CHECKOUT_STATE: CheckoutState = {
  step:"cart",
  cart:{},
  address:{ name:"", phone:"", email:"", line1:"", line2:"", city:"", state:"", pincode:"", country:"India" },
  delivery:{ method:"ship" },
  coupon:null,
  payment:{ method:"upi", processing:false },
  orderId:null,
  status:"draft",
};

function CheckoutPage() {
  const [state, dispatch] = useReducer(
    checkoutReducer,
    INITIAL_CHECKOUT_STATE,
    initial => ({ ...initial, cart: loadCart() }),
  );
  const [error, setError] = useState<string | null>(null);
  const [couponInput, setCouponInput] = useState("");
  const [couponMsg, setCouponMsg] = useState<string | null>(null);
  const user = useCurrentUser();
  const { addOrder, store } = useDashboardData();
  // Cart items can be keyed by live product hash, admin catalog ID, or older
  // seeded product ID depending on where the customer added them. Keep all
  // resolvers available so checkout never silently drops selected products.
  const fallbackCheckoutProducts = useMemo(
    () => mergeCheckoutProducts(mergedCatalogProducts(store.products), PRODUCTS),
    [store.products],
  );
  const [checkoutProducts, setCheckoutProducts] = useState<Product[]>(fallbackCheckoutProducts);
  useEffect(() => {
    let cancelled = false;
    const loadLive = async () => {
      try {
        const response = await fetch(`${PUBLIC_PRODUCTS_API_BASE}/products?limit=100`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });
        if (!response.ok) throw new Error(`Product API returned ${response.status}`);
        const data = await response.json();
        const liveProducts = (data.products || [])
          .map(publicProductToProduct)
          .filter((p: Product | null): p is Product => Boolean(p));
        if (cancelled) return;
        setCheckoutProducts(mergeCheckoutProducts(liveProducts, fallbackCheckoutProducts));
      } catch (err) {
        if (cancelled) return;
        // Live API unavailable — keep admin-catalog fallback so checkout still works for seeded items.
        console.warn("[checkout] live product fetch failed, using admin catalog fallback:", err);
        setCheckoutProducts(fallbackCheckoutProducts);
      }
    };
    void loadLive();
    return () => { cancelled = true; };
  }, [fallbackCheckoutProducts]);
  useEffect(() => {
    // If the store.products fallback changes (e.g. admin catalog updated mid-session),
    // re-sync so we don't keep a stale snapshot if the live API is offline.
    setCheckoutProducts(prev => mergeCheckoutProducts(prev, fallbackCheckoutProducts));
  }, [fallbackCheckoutProducts]);

  useEffect(() => {
    if (!user) return;
    dispatch({
      type: "setAddress",
      address: {
        name: state.address.name || user.name || "",
        phone: state.address.phone || user.phone || "",
        email: state.address.email || user.email || "",
      },
    });
  }, [user?.id]);
  useEffect(() => { saveCart(state.cart); }, [state.cart]);
  useEffect(() => { window.scrollTo({ top:0, behavior:"smooth" }); }, [state.step]);

  const cartRows = Object.entries(state.cart)
    .map(([id,qty]) => ({ product:resolveCartProduct(Number(id), checkoutProducts), qty }))
    .filter((row): row is { product:Product; qty:number } => Boolean(row.product));
  const subtotal = cartRows.reduce((sum, row) => sum + row.product.price * row.qty, 0);
  const discount = cartDiscount(subtotal, state.coupon);
  const gst = cartGst(subtotal, discount);
  const shipping = state.delivery.method === "ship" ? (subtotal > 50000 ? 0 : 499) : 0;
  const total = subtotal - discount + gst + shipping;

  const goNext = () => {
    setError(null);
    if (state.step === "cart") {
      if (cartRows.length === 0) return setError("Your cart is empty.");
      return dispatch({ type:"goto", step:"address" });
    }
    if (state.step === "address") {
      const v = validateAddress(state.address);
      if (v) return setError(v);
      return dispatch({ type:"goto", step:"delivery" });
    }
    if (state.step === "delivery") {
      if (state.delivery.method === "pickup" && !state.delivery.storeId) return setError("Select a pickup store.");
      return dispatch({ type:"goto", step:"coupon" });
    }
    if (state.step === "coupon") return dispatch({ type:"goto", step:"payment" });
    if (state.step === "payment") return dispatch({ type:"goto", step:"review" });
    if (state.step === "review") {
      if (!user || user.role !== "customer") {
        setError("Please sign in with a customer account before placing an order.");
        toast.error("Customer sign in required");
        window.history.pushState(null, "", "/sign-in");
        window.dispatchEvent(new PopStateEvent("popstate"));
        return;
      }
      // Place order: try the real backend first, fall back to local-only if it fails.
      dispatch({ type:"setPayment", payment:{ processing:true, error:undefined } });
      const placeOrderAsync = async () => {
        const firstAddress = store.addresses.find(a => a.id === `${user.id}-checkout`) || store.addresses.find(a => a.id.startsWith(`${user.id}-`));
        const localId = `ORD-${Date.now().toString(36).toUpperCase()}`;
        const baseOrder = {
          customerId: user.id,
          customerName: state.address.name || user.name,
          customerPhone: state.address.phone || user.phone,
          customerEmail: state.address.email || user.email,
          items: cartRows.map(({ product, qty }) => ({
            productId: product.id,
            name: product.name,
            qty,
            price: product.price,
            img: product.img,
            sku: product.sku,
            liveId: product.liveId,
          })),
          subtotal,
          discount,
          gst,
          shipping,
          total,
          couponCode: state.coupon?.code,
          paymentMethod: state.payment.method,
          deliveryMethod: state.delivery.method,
          shippingAddress: { ...state.address },
          addressId: firstAddress?.id || `${user.id}-checkout`,
          status: "placed" as const,
        };

        let serverOrder: { id: string; orderNumber: string; totalAmount: number; createdAt?: string } | null = null;
        let serverError: string | null = null;

        // Try the real backend first (only when the user has an API access token).
        if (isApiAuthenticated()) {
          try {
            // Backend requires each `items.*.productId` to be a UUID. Cart items
            // carry the numeric CatalogProduct.id plus an optional `liveId`
            // populated by the post-login backfill effect. Filter to items
            // with a real UUID; numeric-only IDs (admin-created products not
            // yet on the live API) are surfaced as a clear error below.
            const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
            const liveItems = baseOrder.items
              .map((it) => {
                const candidate =
                  typeof it.liveId === "string" && UUID_RE.test(it.liveId)
                    ? it.liveId
                    : typeof it.productId === "string" && UUID_RE.test(it.productId)
                      ? it.productId
                      : null;
                if (!candidate) {
                  console.warn("[checkout] dropping item without liveId UUID:", it.name, it.productId);
                  return null;
                }
                return {
                  productId: candidate,
                  sku: it.sku,
                  name: it.name,
                  price: it.price,
                  quantity: it.qty,
                  img: it.img,
                };
              })
              .filter((x): x is NonNullable<typeof x> => x !== null);

            if (liveItems.length === 0) {
              throw new Error("No cart items have a backend product UUID — refresh the catalog and try again");
            }

            serverOrder = await ordersApi.create({
              items: liveItems,
              shippingAddress: {
                name: baseOrder.customerName || "",
                phone: baseOrder.customerPhone || "",
                email: baseOrder.customerEmail || "",
                line1: state.address.line1,
                line2: state.address.line2,
                city: state.address.city,
                state: state.address.state,
                pincode: state.address.pincode,
                country: state.address.country,
              },
              notes: `deliveryMethod=${state.delivery.method}; coupon=${state.coupon?.code || ""}`,
            });
          } catch (err) {
            console.error("[checkout] backend order create failed:", err);
            serverError = err instanceof Error ? err.message : "Could not place order on server";
          }
        }

        addOrder({
          ...baseOrder,
          id: serverOrder?.orderNumber || localId,
          ...(serverOrder ? { invoiceId: `INV-${serverOrder.orderNumber.slice(-6).toUpperCase()}` } : { invoiceId: `INV-${localId.slice(-6)}` }),
        });
        dispatch({ type:"placeOrder", orderId: serverOrder?.orderNumber || localId });

        if (state.payment.method === "cod") {
          dispatch({ type:"setPayment", payment:{ processing:false } });
        } else {
          dispatch({ type:"markPaid" });
          dispatch({ type:"setPayment", payment:{ processing:false } });
        }
        saveCart({});
        dispatch({ type:"goto", step:"done" });

        if (serverError) {
          toast.warning(`Order saved locally — server sync failed: ${serverError}`);
        } else if (serverOrder) {
          toast.success(`Order ${serverOrder.orderNumber} placed`);
        }
      };
      void placeOrderAsync();
    }
  };

  const currentIdx = CHECKOUT_STEPS.findIndex(s => s.key === state.step);

  const StepHeader = () => (
    <div className="glass-card" style={{ borderRadius:14,padding:"18px 16px",marginBottom:24 }}>
      <div style={{ display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,flexWrap:"wrap" }}>
        {CHECKOUT_STEPS.map((s,i) => {
          const Icon = s.icon;
          const done = i < currentIdx || state.step === "done";
          const active = i === currentIdx;
          return (
            <div key={s.key} style={{ display:"flex",alignItems:"center",gap:8,flex:1,minWidth:90 }}>
              <div style={{ width:30,height:30,borderRadius:8,display:"flex",alignItems:"center",justifyContent:"center",background:done?"linear-gradient(135deg,#00cc66,#006633)":active?"linear-gradient(135deg,#FF1F45,#cc001a)":"rgba(255,255,255,.05)",border:done||active?"none":"1px solid rgba(255,255,255,.12)",color:"white",flexShrink:0 }}>
                {done ? <Check size={14} /> : <Icon size={13} />}
              </div>
              <div>
                <div style={{ fontFamily:"'Orbitron',sans-serif",fontSize:8,color:done||active?"white":"#555",letterSpacing:"1.5px" }}>STEP {i+1}</div>
                <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:11,color:done?"#00cc66":active?"#FF1F45":"#777",fontWeight:600 }}>{s.label.toUpperCase()}</div>
              </div>
              {i < CHECKOUT_STEPS.length-1 && <div style={{ flex:1,height:1,background:i<currentIdx?"linear-gradient(90deg,#00cc66,#FF1F45)":"rgba(255,255,255,.08)",minWidth:20 }} />}
            </div>
          );
        })}
      </div>
    </div>
  );

  const OrderSummary = () => (
    <div className="glass-card" style={{ borderRadius:14,padding:20,position:"sticky",top:86 }}>
      <h3 style={{ fontFamily:"'Orbitron',sans-serif",fontSize:12,color:"white",letterSpacing:"1px",marginBottom:14,display:"flex",alignItems:"center",gap:8 }}>
        <ShoppingCart size={15} color="#FF1F45" /> ORDER SUMMARY
      </h3>
      <div style={{ display:"flex",flexDirection:"column",gap:8,marginBottom:14,maxHeight:220,overflowY:"auto" }}>
        {cartRows.length === 0 ? (
          <div className="glass" style={{ borderRadius:9,padding:12,fontFamily:"'Space Grotesk',sans-serif",fontSize:12,color:"#777" }}>Cart is empty.</div>
        ) : cartRows.map(({product,qty}) => (
          <div key={product.id} className="glass" style={{ borderRadius:9,padding:10,display:"flex",justifyContent:"space-between",alignItems:"center",gap:8 }}>
            <div style={{ minWidth:0,flex:1 }}>
              <div style={{ fontFamily:"'Orbitron',sans-serif",fontSize:9,color:"white",marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap" }}>{product.name}</div>
              <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:10,color:"#777" }}>Qty {qty} · ₹{product.price.toLocaleString("en-IN")}</div>
            </div>
            <div style={{ fontFamily:"'Rajdhani',sans-serif",fontSize:13,color:"#FF1F45",fontWeight:700,flexShrink:0 }}>₹{(product.price * qty).toLocaleString("en-IN")}</div>
          </div>
        ))}
      </div>
      <div className="glass" style={{ borderRadius:10,padding:13,fontFamily:"'Space Grotesk',sans-serif",fontSize:12,color:"#CFCFCF",lineHeight:1.8 }}>
        <div style={{ display:"flex",justifyContent:"space-between" }}><span>Subtotal</span><span>₹{subtotal.toLocaleString("en-IN")}</span></div>
        {discount > 0 && <div style={{ display:"flex",justifyContent:"space-between",color:"#00cc66" }}><span>Discount{state.coupon ? ` (${state.coupon.code})` : ""}</span><span>−₹{discount.toLocaleString("en-IN")}</span></div>}
        <div style={{ display:"flex",justifyContent:"space-between" }}><span>GST (18%)</span><span>₹{gst.toLocaleString("en-IN")}</span></div>
        <div style={{ display:"flex",justifyContent:"space-between" }}><span>Shipping</span><span>{shipping === 0 ? <span style={{color:"#00cc66"}}>FREE</span> : `₹${shipping.toLocaleString("en-IN")}`}</span></div>
        <div style={{ display:"flex",justifyContent:"space-between",color:"white",fontWeight:700,marginTop:6,paddingTop:6,borderTop:"1px solid rgba(255,255,255,.08)",fontSize:14 }}><span>Total</span><span>₹{total.toLocaleString("en-IN")}</span></div>
      </div>
    </div>
  );

  return (
    <>
    <Navbar />
    <section className="section-pad" style={{ padding:"112px 0 96px",background:"#050505",position:"relative",minHeight:"100vh" }}>
      <div className="cyber-grid" style={{ position:"absolute",inset:0,opacity:.4 }} />
      <div className="section-inner" style={{ maxWidth:1280,margin:"0 auto",padding:"0 32px",position:"relative",zIndex:1 }}>
        <Reveal>
          <a href="/products" className="glass-pill glass-pill-outline" style={{ padding:"9px 12px",fontSize:9,marginBottom:22 }}>
            ← Continue Shopping
          </a>
        </Reveal>
        <SectionHeader eyebrow="Secure Checkout" title="Complete" accent="Your Order" sub="One unified workflow for gaming and general products — cart, address, delivery, coupon, payment and review, all in one place." />

        {state.step !== "done" && <StepHeader />}

        {error && (
          <div className="glass-red" style={{ borderRadius:10,padding:12,fontFamily:"'Space Grotesk',sans-serif",fontSize:12,color:"#FFC0C8",marginBottom:18 }}>{error}</div>
        )}

        <div style={{ display:"grid",gridTemplateColumns:state.step==="done"?"1fr":"minmax(0,1fr) 360px",gap:24,alignItems:"start" }}>
          {/* Step content */}
          <div className="glass-card" style={{ borderRadius:14,padding:24,minHeight:380 }}>
            {state.step === "cart" && (
              <div>
                <h3 style={{ fontFamily:"'Orbitron',sans-serif",fontSize:14,color:"white",marginBottom:16,display:"flex",alignItems:"center",gap:8 }}><ShoppingCart size={16} color="#FF1F45" /> Your Cart</h3>
                {cartRows.length === 0 ? (
                  <div style={{ textAlign:"center",padding:40 }}>
                    <ShoppingCart size={36} color="#444" style={{marginBottom:12}} />
                    <p style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:13,color:"#777" }}>Your cart is empty.</p>
                    <a href="/products" className="glass-pill glass-pill-primary" style={{ marginTop:18,padding:"10px 18px",fontSize:10 }}>Browse Products</a>
                  </div>
                ) : (
                  <div style={{ display:"flex",flexDirection:"column",gap:10 }}>
                    {cartRows.map(({product,qty}) => (
                      <div key={product.id} className="glass" style={{ borderRadius:10,padding:12,display:"grid",gridTemplateColumns:"60px 1fr auto auto",gap:14,alignItems:"center" }}>
                        <img src={product.img} alt={product.name} style={{ width:60,height:50,objectFit:"cover",borderRadius:6 }} />
                        <div style={{ minWidth:0 }}>
                          <div style={{ fontFamily:"'Orbitron',sans-serif",fontSize:10,color:"white",marginBottom:2,overflow:"hidden",textOverflow:"ellipsis" }}>{product.name}</div>
                          <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:10,color:"#777" }}>{product.brand} · {CATEGORY_LABELS[product.category]}</div>
                        </div>
                        <div style={{ display:"flex",alignItems:"center",gap:6 }}>
                          <button className="glass-pill glass-pill-outline" onClick={() => dispatch({ type:"load", cart:{ ...state.cart, [product.id]: Math.max(0, qty-1) } })} style={{ width:28,height:28,padding:0,fontSize:0 }}><Minus size={11} /></button>
                          <span style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:12,color:"#CFCFCF",minWidth:18,textAlign:"center" }}>{qty}</span>
                          <button className="glass-pill glass-pill-outline" onClick={() => dispatch({ type:"load", cart:{ ...state.cart, [product.id]: qty+1 } })} style={{ width:28,height:28,padding:0,fontSize:0 }}><Plus size={11} /></button>
                        </div>
                        <div style={{ fontFamily:"'Rajdhani',sans-serif",fontSize:14,color:"#FF1F45",fontWeight:700,minWidth:90,textAlign:"right" }}>₹{(product.price*qty).toLocaleString("en-IN")}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {state.step === "address" && (
              <div>
                <h3 style={{ fontFamily:"'Orbitron',sans-serif",fontSize:14,color:"white",marginBottom:16,display:"flex",alignItems:"center",gap:8 }}><MapPin size={16} color="#FF1F45" /> Delivery Address</h3>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                  <AuthField label="Full Name" value={state.address.name} onChange={v=>dispatch({type:"setAddress",address:{name:v}})} />
                  <AuthField label="Phone Number" value={state.address.phone} onChange={v=>dispatch({type:"setAddress",address:{phone:v}})} />
                  <AuthField label="Email" value={state.address.email} onChange={v=>dispatch({type:"setAddress",address:{email:v}})} />
                  <AuthField label="Country" value={state.address.country} onChange={v=>dispatch({type:"setAddress",address:{country:v}})} />
                  <div style={{ gridColumn:"1 / -1" }}><AuthField label="Address Line 1" value={state.address.line1} onChange={v=>dispatch({type:"setAddress",address:{line1:v}})} placeholder="House no., street, locality" /></div>
                  <div style={{ gridColumn:"1 / -1" }}><AuthField label="Address Line 2 (Optional)" value={state.address.line2} onChange={v=>dispatch({type:"setAddress",address:{line2:v}})} placeholder="Landmark, area" /></div>
                  <AuthField label="City" value={state.address.city} onChange={v=>dispatch({type:"setAddress",address:{city:v}})} />
                  <AuthField label="State" value={state.address.state} onChange={v=>dispatch({type:"setAddress",address:{state:v}})} />
                  <AuthField label="Pincode" value={state.address.pincode} onChange={v=>dispatch({type:"setAddress",address:{pincode:v}})} placeholder="6-digit" />
                </div>
              </div>
            )}

            {state.step === "delivery" && (
              <div>
                <h3 style={{ fontFamily:"'Orbitron',sans-serif",fontSize:14,color:"white",marginBottom:16,display:"flex",alignItems:"center",gap:8 }}><Truck size={16} color="#FF1F45" /> Delivery Method</h3>
                <div style={{ display:"flex",flexDirection:"column",gap:12 }}>
                  {[
                    { v:"ship", label:"Home Delivery", sub:subtotal > 50000 ? "Free shipping on orders above ₹50,000" : "Standard delivery in 3-5 business days · ₹499", icon:Truck },
                    { v:"pickup", label:"Store Pickup", sub:"Pick up from a DESKTO store near you — Free", icon:MapPin },
                  ].map(opt => {
                    const Icon = opt.icon;
                    const active = state.delivery.method === opt.v;
                    return (
                      <button key={opt.v} onClick={() => dispatch({type:"setDelivery",delivery:{method:opt.v as DeliveryMethod}})}
                        className={active ? "glass-pill glass-pill-primary" : "glass-pill glass-pill-outline"}
                        style={{ padding:"14px 18px",justifyContent:"flex-start",textAlign:"left" }}>
                        <Icon size={16} />
                        <span style={{ display:"flex",flexDirection:"column",alignItems:"flex-start",gap:2 }}>
                          <span style={{ fontFamily:"'Orbitron',sans-serif",fontSize:11,letterSpacing:"1px" }}>{opt.label}</span>
                          <span style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:10,color:"#CFCFCF",fontWeight:400,letterSpacing:0,textTransform:"none" }}>{opt.sub}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
                {state.delivery.method === "pickup" && (
                  <div style={{ marginTop:16 }}>
                    <AuthField label="Select Pickup Store" value={state.delivery.storeId ?? ""} onChange={v => {
                      // Not great as freeform — convert to a real select below
                    }} placeholder="Choose from list below" />
                    <select value={state.delivery.storeId ?? ""} onChange={e => dispatch({type:"setDelivery",delivery:{storeId:e.target.value}})}
                      style={{ width:"100%",marginTop:8,background:"#151515",border:"1px solid rgba(255,255,255,.12)",borderRadius:8,padding:"11px 12px",fontFamily:"'Space Grotesk',sans-serif",fontSize:13,color:"white",outline:"none" }}>
                      <option value="">— Choose a store —</option>
                      {STORES.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}

            {state.step === "coupon" && (
              <div>
                <h3 style={{ fontFamily:"'Orbitron',sans-serif",fontSize:14,color:"white",marginBottom:16,display:"flex",alignItems:"center",gap:8 }}><Circle size={16} color="#FF1F45" /> Have a Coupon?</h3>
                <p style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:12,color:"#CFCFCF",marginBottom:14,lineHeight:1.7 }}>
                  Try <strong style={{color:"#FF1F45"}}>DESKTO10</strong> for 10% off, or <strong style={{color:"#FF1F45"}}>WELCOME5</strong> for ₹5,000 off on orders above ₹50,000.
                </p>
                <div style={{ display:"flex",gap:10,flexWrap:"wrap" }}>
                  <input value={couponInput} onChange={e=>setCouponInput(e.target.value.toUpperCase())} placeholder="Enter coupon code"
                    style={{ flex:1,minWidth:200,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.09)",borderRadius:8,padding:"11px 12px",fontFamily:"'Space Grotesk',sans-serif",fontSize:13,color:"white",outline:"none" }} />
                  <button onClick={() => {
                    const c = applyCoupon(couponInput, subtotal);
                    if (c) { dispatch({type:"applyCoupon",coupon:c}); setCouponMsg(`Applied ${c.code}`); }
                    else setCouponMsg(couponInput.trim() ? "Invalid coupon or minimum not met." : "Enter a code first.");
                  }} className="glass-pill glass-pill-primary" style={{ padding:"11px 18px",fontSize:10 }}>Apply</button>
                </div>
                {couponMsg && <div className="glass-red" style={{ borderRadius:9,padding:10,marginTop:12,fontFamily:"'Space Grotesk',sans-serif",fontSize:11,color:"#FFC0C8" }}>{couponMsg}</div>}
                {state.coupon && (
                  <div className="glass" style={{ borderRadius:10,padding:14,marginTop:16,display:"flex",alignItems:"center",justifyContent:"space-between",gap:10 }}>
                    <div>
                      <div style={{ fontFamily:"'Orbitron',sans-serif",fontSize:11,color:"#00cc66",letterSpacing:"1px" }}>{state.coupon.code} APPLIED</div>
                      <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:11,color:"#CFCFCF",marginTop:4 }}>
                        {state.coupon.discountPct > 0 ? `${state.coupon.discountPct}% off` : `Flat ₹${state.coupon.flatOff?.toLocaleString("en-IN")} off`}
                      </div>
                    </div>
                    <button onClick={() => { dispatch({type:"clearCoupon"}); setCouponInput(""); setCouponMsg("Coupon removed."); }} className="glass-pill glass-pill-outline" style={{ padding:"7px 12px",fontSize:9 }}><X size={11} /> Remove</button>
                  </div>
                )}
              </div>
            )}

            {state.step === "payment" && (
              <div>
                <h3 style={{ fontFamily:"'Orbitron',sans-serif",fontSize:14,color:"white",marginBottom:16,display:"flex",alignItems:"center",gap:8 }}><CreditCard size={16} color="#FF1F45" /> Payment Method</h3>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(180px,1fr))",gap:10,marginBottom:18 }}>
                  {[
                    { v:"upi", label:"UPI", sub:"GPay, PhonePe, Paytm", icon:Smartphone },
                    { v:"card", label:"Credit / Debit Card", sub:"Visa, Mastercard, RuPay", icon:CreditCard },
                    { v:"netbanking", label:"Net Banking", sub:"All major banks", icon:Banknote },
                    { v:"wallet", label:"Wallet", sub:"Paytm, Amazon Pay", icon:Wallet },
                    { v:"cod", label:"Cash on Delivery", sub:"Pay when you receive", icon:Banknote },
                  ].map(opt => {
                    const Icon = opt.icon;
                    const active = state.payment.method === opt.v;
                    return (
                      <button key={opt.v} onClick={() => dispatch({type:"setPayment",payment:{method:opt.v as PaymentMethod}})}
                        className={active ? "glass-pill glass-pill-primary" : "glass-pill glass-pill-outline"}
                        style={{ padding:"14px 14px",flexDirection:"column",alignItems:"flex-start",gap:8,textAlign:"left" }}>
                        <Icon size={18} />
                        <div>
                          <div style={{ fontFamily:"'Orbitron',sans-serif",fontSize:10,letterSpacing:"1px" }}>{opt.label}</div>
                          <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:10,color:"#CFCFCF",fontWeight:400,letterSpacing:0,textTransform:"none",marginTop:2 }}>{opt.sub}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
                {state.payment.method === "card" && (
                  <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:12 }}>
                    <div style={{ gridColumn:"1 / -1" }}><AuthField label="Card Number" value={state.payment.details?.split("|")[0] ?? ""} onChange={v => dispatch({type:"setPayment",payment:{details:`${v}|${state.payment.details?.split("|")[1] ?? ""}|${state.payment.details?.split("|")[2] ?? ""}`}})} placeholder="•••• •••• •••• 4242" /></div>
                    <AuthField label="Expiry (MM/YY)" value={state.payment.details?.split("|")[1] ?? ""} onChange={v => dispatch({type:"setPayment",payment:{details:`${state.payment.details?.split("|")[0] ?? ""}|${v}|${state.payment.details?.split("|")[2] ?? ""}`}})} placeholder="12/28" />
                    <AuthField label="CVV" type="password" value={state.payment.details?.split("|")[2] ?? ""} onChange={v => dispatch({type:"setPayment",payment:{details:`${state.payment.details?.split("|")[0] ?? ""}|${state.payment.details?.split("|")[1] ?? ""}|${v}`}})} placeholder="•••" />
                  </div>
                )}
                {state.payment.method === "upi" && (
                  <AuthField label="UPI ID" value={state.payment.details ?? ""} onChange={v => dispatch({type:"setPayment",payment:{details:v}})} placeholder="yourname@upi" />
                )}
                {state.payment.method === "netbanking" && (
                  <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:12,color:"#CFCFCF",padding:"12px",background:"rgba(255,255,255,.03)",borderRadius:8 }}>
                    You will be redirected to your bank's secure portal after placing the order.
                  </div>
                )}
                {state.payment.method === "wallet" && (
                  <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:12,color:"#CFCFCF",padding:"12px",background:"rgba(255,255,255,.03)",borderRadius:8 }}>
                    Paytm and Amazon Pay wallets are supported.
                  </div>
                )}
                <div style={{ marginTop:18,padding:12,background:"rgba(0,204,102,.06)",border:"1px solid rgba(0,204,102,.2)",borderRadius:10,display:"flex",alignItems:"center",gap:10 }}>
                  <ShieldCheck size={16} color="#00cc66" />
                  <span style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:11,color:"#00cc66" }}>256-bit SSL encrypted · PCI-DSS compliant · 100% secure checkout</span>
                </div>
              </div>
            )}

            {state.step === "review" && (
              <div>
                <h3 style={{ fontFamily:"'Orbitron',sans-serif",fontSize:14,color:"white",marginBottom:16,display:"flex",alignItems:"center",gap:8 }}><Eye size={16} color="#FF1F45" /> Review Your Order</h3>
                <div style={{ display:"grid",gridTemplateColumns:"1fr 1fr",gap:18 }}>
                  <div>
                    <div style={{ fontFamily:"'Orbitron',sans-serif",fontSize:9,color:"#777",letterSpacing:"1.5px",marginBottom:6 }}>SHIP TO</div>
                    <div className="glass" style={{ borderRadius:9,padding:12,fontFamily:"'Space Grotesk',sans-serif",fontSize:12,color:"#CFCFCF",lineHeight:1.7 }}>
                      <strong style={{ color:"white" }}>{state.address.name}</strong><br />
                      {state.address.line1}{state.address.line2 ? `, ${state.address.line2}` : ""}<br />
                      {state.address.city}, {state.address.state} {state.address.pincode}<br />
                      {state.address.country}<br />
                      📞 {state.address.phone} · ✉ {state.address.email}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontFamily:"'Orbitron',sans-serif",fontSize:9,color:"#777",letterSpacing:"1.5px",marginBottom:6 }}>DELIVERY</div>
                    <div className="glass" style={{ borderRadius:9,padding:12,fontFamily:"'Space Grotesk',sans-serif",fontSize:12,color:"#CFCFCF",lineHeight:1.7 }}>
                      {state.delivery.method === "ship"
                        ? <><Truck size={12} color="#FF1F45" /> Home delivery · 3-5 business days</>
                        : <><MapPin size={12} color="#FF1F45" /> Store pickup · {STORES.find(s => s.id === state.delivery.storeId)?.name ?? "—"}</>}
                    </div>
                  </div>
                  <div style={{ gridColumn:"1 / -1" }}>
                    <div style={{ fontFamily:"'Orbitron',sans-serif",fontSize:9,color:"#777",letterSpacing:"1.5px",marginBottom:6 }}>PAYMENT</div>
                    <div className="glass" style={{ borderRadius:9,padding:12,fontFamily:"'Space Grotesk',sans-serif",fontSize:12,color:"#CFCFCF",lineHeight:1.7 }}>
                      {state.payment.method.toUpperCase()} {state.payment.details ? `· ${state.payment.details}` : ""}
                    </div>
                  </div>
                </div>
                <div style={{ marginTop:18 }}>
                  <div style={{ fontFamily:"'Orbitron',sans-serif",fontSize:9,color:"#777",letterSpacing:"1.5px",marginBottom:6 }}>ITEMS</div>
                  <div style={{ display:"flex",flexDirection:"column",gap:6 }}>
                    {cartRows.map(({product,qty}) => (
                      <div key={product.id} className="glass" style={{ borderRadius:9,padding:10,display:"flex",justifyContent:"space-between",alignItems:"center",fontFamily:"'Space Grotesk',sans-serif",fontSize:12,color:"#CFCFCF" }}>
                        <span>{product.name} <span style={{ color:"#777" }}>× {qty}</span></span>
                        <span style={{ color:"#FF1F45",fontWeight:700 }}>₹{(product.price*qty).toLocaleString("en-IN")}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {state.step === "done" && (
              <div style={{ textAlign:"center",padding:"40px 20px" }}>
                <div style={{ display:"inline-flex",alignItems:"center",justifyContent:"center",width:80,height:80,borderRadius:"50%",background:"linear-gradient(135deg,#00cc66,#006633)",marginBottom:18 }}>
                  <Check size={42} color="white" strokeWidth={3} />
                </div>
                <h2 style={{ fontFamily:"'Orbitron',sans-serif",fontSize:24,color:"white",marginBottom:8,fontWeight:900 }}>ORDER PLACED</h2>
                <p style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:13,color:"#CFCFCF",marginBottom:18 }}>Order ID</p>
                <div className="glass" style={{ display:"inline-block",padding:"10px 20px",borderRadius:8,fontFamily:"'Orbitron',sans-serif",fontSize:14,color:"#FF1F45",letterSpacing:"2px",marginBottom:24 }}>{state.orderId}</div>
                <div style={{ display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:10,marginBottom:24,textAlign:"left" }}>
                  {[
                    { label:"Order Created", status:true, icon:ClipboardCheck },
                    { label:"Inventory Reserved", status:state.status !== "draft", icon:Database },
                    { label:"Payment", status:state.status === "PAID" || state.status === "RESERVED" || state.status === "SHIPPED" || state.status === "DELIVERED", icon:CreditCard },
                    { label:"Packed", status:state.status === "SHIPPED" || state.status === "DELIVERED", icon:Package },
                    { label:"Shipped", status:state.status === "SHIPPED" || state.status === "DELIVERED", icon:Truck },
                    { label:"Delivered", status:state.status === "DELIVERED", icon:Check },
                  ].map((row,i) => {
                    const Icon = row.icon;
                    return (
                      <div key={i} className="glass" style={{ borderRadius:9,padding:12,borderColor:row.status?"rgba(0,204,102,.3)":"rgba(255,255,255,.08)" }}>
                        <div style={{ display:"flex",alignItems:"center",gap:6,marginBottom:6 }}>
                          <Icon size={12} color={row.status?"#00cc66":"#555"} />
                          <span style={{ fontFamily:"'Orbitron',sans-serif",fontSize:8,color:row.status?"#00cc66":"#555",letterSpacing:"1.2px" }}>{row.status?"DONE":"PENDING"}</span>
                        </div>
                        <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:11,color:row.status?"white":"#777" }}>{row.label}</div>
                      </div>
                    );
                  })}
                </div>
                <p style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:12,color:"#CFCFCF",marginBottom:24 }}>
                  Tracking details have been sent to <strong style={{ color:"white" }}>{state.address.email || "your email"}</strong>. Use the admin tool to advance this order through shipping, packing and delivery.
                </p>
                <div style={{ display:"flex",gap:10,justifyContent:"center",flexWrap:"wrap" }}>
                  <a href="/products" onClick={() => { dispatch({type:"reset"}); saveCart({}); }} className="glass-pill glass-pill-outline" style={{ padding:"12px 20px",fontSize:10 }}>Continue Shopping</a>
                  <button onClick={() => {
                    if (state.status === "RESERVED") dispatch({type:"markShipped"});
                    else if (state.status === "SHIPPED") dispatch({type:"markDelivered"});
                  }} className="glass-pill glass-pill-primary" style={{ padding:"12px 20px",fontSize:10 }} disabled={state.status === "DELIVERED" || state.status === "CANCELLED"}>
                    Simulate {state.status === "RESERVED" ? "Ship" : state.status === "SHIPPED" ? "Delivery" : "Closed"}
                  </button>
                </div>
              </div>
            )}

            {/* Footer nav */}
            {state.step !== "done" && (
              <div style={{ display:"flex",justifyContent:"space-between",alignItems:"center",marginTop:24,paddingTop:18,borderTop:"1px solid rgba(255,255,255,.06)",flexWrap:"wrap",gap:10 }}>
                <button onClick={() => { setError(null); dispatch({type:"back"}); }} className="glass-pill glass-pill-outline" style={{ padding:"10px 16px",fontSize:10 }} disabled={state.step === "cart"}>
                  <ChevronLeft size={12} /> Back
                </button>
                <div style={{ fontFamily:"'Space Grotesk',sans-serif",fontSize:11,color:"#777" }}>Step {currentIdx+1} of {CHECKOUT_STEPS.length}</div>
                <button onClick={goNext} className="glass-pill glass-pill-primary" style={{ padding:"12px 22px",fontSize:10 }} disabled={state.payment.processing}>
                  {state.step === "review"
                    ? (state.payment.processing ? "Processing..." : `Place Order · ₹${total.toLocaleString("en-IN")}`)
                    : <>Continue <ChevronRight size={12} /></>}
                </button>
              </div>
            )}
          </div>

          {state.step !== "done" && <OrderSummary />}
        </div>
      </div>
    </section>
    </>
  );
}

// ─────────────── DASHBOARD ROUTER ───────────────
function DashboardRouter({ kind, tab }: { kind: "customer" | "staff" | "admin"; tab?: string | null }) {
  const user = useCurrentUser();
  // Give auth state 600 ms to propagate from localStorage after a fresh signup/login redirect
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setReady(true), 600);
    return () => clearTimeout(t);
  }, []);

  if (!ready) {
    return (
      <div style={{ background: "#050505", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#888", fontFamily: "'Space Grotesk', sans-serif" }}>
        Loading dashboard…
      </div>
    );
  }

  // For admin dashboard, create a demo user if not logged in.
  // Keep this render-only so the route never updates state during render.
  if (kind === "admin" && !user) {
    const demoUser: any = {
      id: "demo-admin",
      name: "Admin Demo",
      email: "admin@deskto.com",
      phone: "+91 98765 43210",
      passwordHash: "",
      role: "admin" as const,
      staffId: "STAFF-001",
      department: "Management",
      emailVerified: true,
      phoneVerified: true,
      status: "active",
      loginAttempts: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    return <AdminDashboard user={demoUser} initialTab={tab} />;
  }

  if (!user) {
    setTimeout(() => {
      toast.error("Please sign in to view your dashboard.");
      window.history.pushState(null, "", "/sign-in");
      window.dispatchEvent(new PopStateEvent("popstate"));
    }, 0);
    return (
      <div style={{ background: "#050505", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#FF1F45", fontFamily: "'Space Grotesk', sans-serif" }}>
        Redirecting to sign-in…
      </div>
    );
  }
  if (user.role !== kind) {
    setTimeout(() => {
      toast.error(`This dashboard is for ${kind} accounts. You are signed in as ${user.role}.`);
      window.history.pushState(null, "", `/dashboard/${user.role}`);
      window.dispatchEvent(new PopStateEvent("popstate"));
    }, 0);
    return (
      <div style={{ background: "#050505", minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", color: "#FF1F45", fontFamily: "'Space Grotesk', sans-serif" }}>
        Role mismatch — redirecting to your dashboard…
      </div>
    );
  }

  return kind === "customer" ? <CustomerDashboard user={user} initialTab={tab} /> :
         kind === "staff"     ? <StaffDashboard user={user} initialTab={tab} /> :
                                <AdminDashboard user={user} initialTab={tab} />;
}


// ─────────────── APP ───────────────
export default function App() {
  const [pathname,setPathname] = useState(window.location.pathname);
  useEffect(() => {
    const syncPath = () => setPathname(window.location.pathname);
    window.addEventListener("popstate", syncPath);
    return () => window.removeEventListener("popstate", syncPath);
  }, []);
  const authRoute = getAuthRouteFromPath(pathname);
  const productCategory = getProductCategoryFromPath(pathname);
  const checkout = isCheckoutPath(pathname);
  const productDetailId = getProductDetailFromPath(pathname);
  const servicesRoute = getServicesRouteFromPath(pathname);
  const dashboardRoute = getDashboardRouteFromPath(pathname);

  return (
    <AppErrorBoundary>
      <div style={{ background:"#050505",color:"white",fontFamily:"'Inter',sans-serif",overflowX:"hidden" }}>
        <GlobalStyles />
        <Toaster />
        {authRoute
          ? <AuthPage mode={authRoute.mode} role={authRoute.role} />
          : dashboardRoute
          ? <DashboardRouter kind={dashboardRoute.kind} tab={dashboardRoute.tab} />
          : checkout
          ? <CheckoutPage />
          : productDetailId !== null
          ? <ProductDetailPage productId={productDetailId} />
          : servicesRoute
          ? <ServicesPage slug={servicesRoute.slug} child={servicesRoute.child} />
          : productCategory
          ? <ProductCatalogPage category={productCategory} />
          : <HomePage />}
      </div>
    </AppErrorBoundary>
  );
}
