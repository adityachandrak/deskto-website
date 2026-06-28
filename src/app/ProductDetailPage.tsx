import { useState, useEffect, useRef } from "react";
import {
  Star, Heart, ShoppingCart, Zap, Truck, ShieldCheck, ShieldCheck as ShieldIcon,
  RefreshCw, Plus, Minus, ChevronRight, CheckCircle, Phone, MessageCircle,
  ClipboardCheck, HardDrive, Cpu, Wifi, Package, Eye, Play, X,
  ChevronLeft, ArrowRight, ChevronUp,
} from "lucide-react";
import { toast } from "sonner";
import {
  PRODUCTS, ProductCard, BADGE_CLR, CATEGORY_LABELS, Product,
  Navbar, FooterSection, SectionHeader, Reveal, ScrollToTop,
  loadCart, saveCart, CART_STORAGE_KEY, mergedCatalogProducts,
} from "@/app/App";
import { useWishlist } from "@/app/lib/wishlist";
import { getProductDetails, ProductDetails } from "@/app/lib/productDetails";
import { useDashboardData } from "@/app/lib/dashboardData";

// ─────────────── SMALL UTILITIES ───────────────
function StarRow({ rating, size = 14 }: { rating: number; size?: number }) {
  return (
    <span style={{ display: "inline-flex", gap: 2 }}>
      {Array.from({ length: 5 }).map((_, i) => (
        <Star
          key={i}
          size={size}
          style={{
            fill: i < Math.floor(rating) ? "#FF1F45" : "none",
            color: i < Math.floor(rating) ? "#FF1F45" : "#444",
          }}
        />
      ))}
    </span>
  );
}

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

// ─────────────── BREADCRUMB ───────────────
function BreadcrumbBar({ product }: { product: Product }) {
  const cat = CATEGORY_LABELS[product.category] ?? product.category;
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
        <a href="/" style={{ color: "#777", textDecoration: "none" }}>Home</a>
        <ChevronRight size={12} color="#444" />
        <a href="/products" style={{ color: "#777", textDecoration: "none" }}>Products</a>
        <ChevronRight size={12} color="#444" />
        <a href="/products" style={{ color: "#777", textDecoration: "none" }}>{cat}</a>
        <ChevronRight size={12} color="#444" />
        <span style={{ color: "#FF1F45", fontWeight: 600 }}>{product.name}</span>
      </div>
    </div>
  );
}

// ─────────────── PRODUCT GALLERY ───────────────
function ProductGallery({ product, details }: { product: Product; details: ProductDetails }) {
  const [activeIdx, setActiveIdx] = useState(0);
  const [zoom, setZoom] = useState({ on: false, x: 50, y: 50 });
  const [showModal, setShowModal] = useState<null | "360" | "video">(null);
  const mainRef = useRef<HTMLDivElement>(null);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const el = mainRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = ((e.clientX - r.left) / r.width) * 100;
    const y = ((e.clientY - r.top) / r.height) * 100;
    setZoom({ on: true, x, y });
  };

  const activeImg = details.gallery[activeIdx] ?? product.img;

  return (
    <div>
      <div
        ref={mainRef}
        onMouseMove={onMove}
        onMouseLeave={() => setZoom({ on: false, x: 50, y: 50 })}
        style={{
          position: "relative",
          width: "100%",
          aspectRatio: "1/1",
          background: "#0a0a0a",
          borderRadius: 14,
          overflow: "hidden",
          border: "1px solid rgba(255,255,255,0.07)",
          cursor: zoom.on ? "zoom-out" : "zoom-in",
        }}
      >
        <img
          src={activeImg}
          alt={product.name}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: zoom.on ? "scale(1.8)" : "scale(1)",
            transformOrigin: `${zoom.x}% ${zoom.y}%`,
            transition: zoom.on ? "none" : "transform .25s ease",
            filter: "brightness(.85)",
          }}
        />
        {product.badge && (
          <div
            style={{
              position: "absolute",
              top: 14,
              left: 14,
              background: BADGE_CLR[product.badge] ?? BADGE_CLR.PRO,
              padding: "5px 11px",
              borderRadius: 3,
              fontFamily: "'Orbitron', sans-serif",
              fontSize: 9,
              fontWeight: 700,
              color: "white",
              letterSpacing: "1.5px",
              backdropFilter: "blur(8px)",
              zIndex: 3,
            }}
          >
            {product.badge}
          </div>
        )}
        <button
          onClick={() => setShowModal("360")}
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,31,69,0.5)",
            color: "#FF1F45",
            padding: "7px 12px",
            borderRadius: 6,
            cursor: "pointer",
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 10,
            letterSpacing: "1px",
            display: "flex",
            alignItems: "center",
            gap: 5,
            zIndex: 3,
          }}
        >
          <RefreshCw size={12} /> 360° VIEW
        </button>
        <button
          onClick={() => setShowModal("video")}
          style={{
            position: "absolute",
            top: 56,
            right: 14,
            background: "rgba(0,0,0,0.55)",
            border: "1px solid rgba(255,255,255,0.2)",
            color: "white",
            padding: "7px 12px",
            borderRadius: 6,
            cursor: "pointer",
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 10,
            letterSpacing: "1px",
            display: "flex",
            alignItems: "center",
            gap: 5,
            zIndex: 3,
          }}
        >
          <Play size={12} /> VIDEO
        </button>
        <div
          style={{
            position: "absolute",
            bottom: 14,
            left: 14,
            background: "rgba(0,0,0,0.65)",
            color: "#CFCFCF",
            padding: "5px 10px",
            borderRadius: 4,
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 10,
            display: "flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Eye size={11} /> Hover to zoom
        </div>
      </div>

      <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
        {details.gallery.map((src, i) => (
          <button
            key={i}
            onClick={() => setActiveIdx(i)}
            style={{
              width: 72,
              height: 72,
              padding: 0,
              border: i === activeIdx ? "2px solid #FF1F45" : "1px solid rgba(255,255,255,0.08)",
              borderRadius: 8,
              overflow: "hidden",
              cursor: "pointer",
              background: "#0a0a0a",
            }}
          >
            <img
              src={src}
              alt={`thumb-${i}`}
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </button>
        ))}
      </div>

      <div style={{ marginTop: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        <span
          style={{
            background: product.condition === "second-hand" ? "linear-gradient(135deg,#00cc66,#006633)" : "linear-gradient(135deg,#FF1F45,#cc001a)",
            padding: "5px 11px",
            borderRadius: 3,
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 9,
            fontWeight: 700,
            color: "white",
            letterSpacing: "1.3px",
          }}
        >
          {product.condition === "second-hand" ? "SECOND-HAND" : "FIRST-HAND"}
        </span>
        <span
          style={{
            background: "rgba(255,255,255,0.05)",
            border: "1px solid rgba(255,255,255,0.1)",
            padding: "5px 11px",
            borderRadius: 3,
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 10,
            color: "#CFCFCF",
          }}
        >
          SKU: DT-{product.id.toString().padStart(4, "0")}
        </span>
        {product.inStock ? (
          <span
            style={{
              background: "rgba(0,204,102,0.15)",
              border: "1px solid rgba(0,204,102,0.4)",
              padding: "5px 11px",
              borderRadius: 3,
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 10,
              color: "#00cc66",
              display: "inline-flex",
              alignItems: "center",
              gap: 5,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00cc66" }} />
            IN STOCK
          </span>
        ) : (
          <span
            style={{
              background: "rgba(255,31,69,0.15)",
              border: "1px solid rgba(255,31,69,0.4)",
              padding: "5px 11px",
              borderRadius: 3,
              fontFamily: "'Space Grotesk', sans-serif",
              fontSize: 10,
              color: "#FF1F45",
            }}
          >
            OUT OF STOCK
          </span>
        )}
      </div>

      {showModal && (
        <div
          onClick={() => setShowModal(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.85)",
            backdropFilter: "blur(10px)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              maxWidth: 720,
              width: "100%",
              background: "#0a0a0a",
              borderRadius: 14,
              padding: 24,
              border: "1px solid rgba(255,31,69,0.3)",
            }}
          >
            <button
              onClick={() => setShowModal(null)}
              style={{
                position: "absolute",
                top: 14,
                right: 14,
                background: "transparent",
                border: "none",
                color: "white",
                cursor: "pointer",
              }}
            >
              <X size={20} />
            </button>
            <div style={{ textAlign: "center" }}>
              {showModal === "360" ? (
                <>
                  <RefreshCw size={48} color="#FF1F45" style={{ margin: "0 auto 16px" }} />
                  <h3
                    style={{
                      fontFamily: "'Orbitron', sans-serif",
                      fontSize: 22,
                      color: "white",
                      marginBottom: 8,
                    }}
                  >
                    Interactive 360° View
                  </h3>
                  <p style={{ color: "#CFCFCF", fontSize: 13, marginBottom: 16 }}>
                    Drag to rotate, scroll to zoom — full 360° product visualization.
                  </p>
                  <img
                    src={activeImg}
                    alt="360 preview"
                    style={{ width: "100%", maxWidth: 500, borderRadius: 8 }}
                  />
                </>
              ) : (
                <>
                  <Play size={48} color="#FF1F45" style={{ margin: "0 auto 16px" }} />
                  <h3
                    style={{
                      fontFamily: "'Orbitron', sans-serif",
                      fontSize: 22,
                      color: "white",
                      marginBottom: 8,
                    }}
                  >
                    Product Video
                  </h3>
                  <p style={{ color: "#CFCFCF", fontSize: 13 }}>
                    Official product walkthrough and benchmarks.
                  </p>
                  <div
                    style={{
                      width: "100%",
                      aspectRatio: "16/9",
                      background: "#050505",
                      borderRadius: 8,
                      marginTop: 16,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      border: "1px solid rgba(255,255,255,0.06)",
                    }}
                  >
                    <Play size={64} color="#444" />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────── HERO INFO COLUMN ───────────────
function HeroInfo({ product, details }: { product: Product; details: ProductDetails }) {
  const [qty, setQty] = useState(1);
  const { has, toggle } = useWishlist();
  const wished = has(product.id);

  const discount = product.orig && product.orig > product.price
    ? Math.round(((product.orig - product.price) / product.orig) * 100)
    : 0;

  const addToCart = () => {
    if (!product.inStock) {
      toast.error("This product is out of stock");
      return;
    }
    const cart = loadCart();
    cart[product.id] = (cart[product.id] ?? 0) + qty;
    saveCart(cart);
    toast.success(`${product.name} (×${qty}) added to cart`);
  };

  const buyNow = () => {
    if (!product.inStock) {
      toast.error("Out of stock");
      return;
    }
    const cart = loadCart();
    cart[product.id] = (cart[product.id] ?? 0) + qty;
    saveCart(cart);
    window.location.href = "/checkout";
  };

  const shareProduct = async () => {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title: product.name, text: `Check out ${product.name} on DESKTO`, url });
      } else {
        await navigator.clipboard.writeText(url);
        toast.success("Link copied to clipboard");
      }
    } catch {
      /* user cancelled */
    }
  };

  return (
    <div>
      <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 11, color: "#FF1F45", letterSpacing: "3px", textTransform: "uppercase", marginBottom: 10 }}>
        {product.brand}
      </div>
      <h1
        style={{
          fontFamily: "'Orbitron', sans-serif",
          fontSize: "clamp(24px, 3.4vw, 36px)",
          fontWeight: 800,
          color: "white",
          lineHeight: 1.1,
          marginBottom: 16,
          letterSpacing: "-.5px",
        }}
      >
        {product.name}
      </h1>

      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <StarRow rating={product.rating} size={15} />
          <span style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 15, color: "white", fontWeight: 700 }}>
            {product.rating.toFixed(1)}
          </span>
        </div>
        <span style={{ color: "#444" }}>•</span>
        <span style={{ color: "#CFCFCF", fontSize: 12, fontFamily: "'Space Grotesk', sans-serif" }}>
          {product.reviews.toLocaleString("en-IN")} reviews
        </span>
        <span style={{ color: "#444" }}>•</span>
        <span style={{ color: "#00cc66", fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", display: "inline-flex", alignItems: "center", gap: 4 }}>
          <CheckCircle size={11} /> Verified
        </span>
      </div>

      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 6 }}>
        <span
          style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: 36,
            fontWeight: 700,
            color: "#FF1F45",
            lineHeight: 1,
          }}
        >
          ₹{product.price.toLocaleString("en-IN")}
        </span>
        {product.orig && product.orig > product.price && (
          <>
            <span
              style={{
                fontFamily: "'Rajdhani', sans-serif",
                fontSize: 18,
                color: "#555",
                textDecoration: "line-through",
              }}
            >
              ₹{product.orig.toLocaleString("en-IN")}
            </span>
            <span
              style={{
                background: "#FF1F45",
                color: "white",
                padding: "3px 8px",
                borderRadius: 3,
                fontFamily: "'Orbitron', sans-serif",
                fontSize: 11,
                fontWeight: 700,
              }}
            >
              -{discount}% OFF
            </span>
          </>
        )}
      </div>
      <div style={{ color: "#777", fontSize: 11, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 22 }}>
        Inclusive of all taxes • EMI from ₹{Math.round(product.price / 24).toLocaleString("en-IN")}/mo
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 22 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
          <ShieldIcon size={16} color="#FF1F45" />
          <div>
            <div style={{ color: "#CFCFCF", fontSize: 11, fontFamily: "'Space Grotesk', sans-serif" }}>Warranty</div>
            <div style={{ color: "white", fontSize: 12, fontFamily: "'Orbitron', sans-serif" }}>{product.warrantyMonths} months</div>
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 12px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.06)" }}>
          <Truck size={16} color="#FF1F45" />
          <div>
            <div style={{ color: "#CFCFCF", fontSize: 11, fontFamily: "'Space Grotesk', sans-serif" }}>Delivery by</div>
            <div style={{ color: "white", fontSize: 12, fontFamily: "'Orbitron', sans-serif" }}>{details.delivery.estimatedDate}</div>
          </div>
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 18 }}>
        <span style={{ color: "#CFCFCF", fontSize: 12, fontFamily: "'Space Grotesk', sans-serif" }}>Quantity:</span>
        <div style={{ display: "flex", alignItems: "center", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, overflow: "hidden" }}>
          <button onClick={() => setQty((q) => Math.max(1, q - 1))} style={{ background: "rgba(255,255,255,0.04)", border: "none", color: "white", padding: "8px 12px", cursor: "pointer" }}>
            <Minus size={14} />
          </button>
          <span style={{ padding: "0 16px", fontFamily: "'Rajdhani', sans-serif", fontSize: 16, fontWeight: 700, color: "white", minWidth: 40, textAlign: "center" }}>
            {qty}
          </span>
          <button onClick={() => setQty((q) => Math.min(10, q + 1))} style={{ background: "rgba(255,255,255,0.04)", border: "none", color: "white", padding: "8px 12px", cursor: "pointer" }}>
            <Plus size={14} />
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.5fr 1fr", gap: 10, marginBottom: 10 }}>
        <button
          onClick={addToCart}
          disabled={!product.inStock}
          className="glass-pill glass-pill-primary"
          style={{
            padding: "14px 18px",
            fontSize: 11,
            opacity: product.inStock ? 1 : 0.4,
          }}
        >
          <ShoppingCart size={14} /> {product.inStock ? "ADD TO CART" : "OUT OF STOCK"}
        </button>
        <button
          onClick={buyNow}
          disabled={!product.inStock}
          className="glass-pill glass-pill-outline"
          style={{
            padding: "14px 18px",
            fontSize: 11,
            opacity: product.inStock ? 1 : 0.4,
          }}
        >
          <Zap size={14} /> BUY NOW
        </button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8, marginBottom: 18 }}>
        <button
          onClick={() => { toggle(product.id); toast.success(wished ? "Removed from wishlist" : "Added to wishlist"); }}
          style={{
            background: wished ? "rgba(255,31,69,0.15)" : "rgba(255,255,255,0.04)",
            border: wished ? "1px solid #FF1F45" : "1px solid rgba(255,255,255,0.08)",
            color: wished ? "#FF1F45" : "#CFCFCF",
            padding: "10px 8px",
            borderRadius: 8,
            cursor: "pointer",
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 11,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
          }}
        >
          <Heart size={13} style={{ fill: wished ? "#FF1F45" : "none" }} /> Wishlist
        </button>
        <button
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#CFCFCF",
            padding: "10px 8px",
            borderRadius: 8,
            cursor: "pointer",
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 11,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
          }}
        >
          <ArrowRight size={13} /> Compare
        </button>
        <button
          onClick={shareProduct}
          style={{
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
            color: "#CFCFCF",
            padding: "10px 8px",
            borderRadius: 8,
            cursor: "pointer",
            fontFamily: "'Space Grotesk', sans-serif",
            fontSize: 11,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 5,
          }}
        >
          <ArrowRight size={13} /> Share
        </button>
      </div>

      <div style={{ display: "flex", gap: 10 }}>
        <a
          href={`https://wa.me/${details.support.whatsapp.replace(/\D/g, "")}?text=${encodeURIComponent(`Hi, I'm interested in ${product.name}`)}`}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            flex: 1,
            background: "linear-gradient(135deg, #00cc66, #006633)",
            color: "white",
            padding: "11px",
            borderRadius: 8,
            textAlign: "center",
            textDecoration: "none",
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 10,
            letterSpacing: "1px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <MessageCircle size={13} /> WHATSAPP
        </a>
        <a
          href={`tel:${details.support.phone.replace(/\s/g, "")}`}
          style={{
            flex: 1,
            background: "rgba(255,31,69,0.15)",
            border: "1px solid rgba(255,31,69,0.4)",
            color: "#FF1F45",
            padding: "11px",
            borderRadius: 8,
            textAlign: "center",
            textDecoration: "none",
            fontFamily: "'Orbitron', sans-serif",
            fontSize: 10,
            letterSpacing: "1px",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: 6,
          }}
        >
          <Phone size={13} /> CALL SHOP
        </a>
      </div>

      <div style={{ display: "flex", gap: 14, marginTop: 18, paddingTop: 18, borderTop: "1px solid rgba(255,255,255,0.06)", flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#CFCFCF", fontSize: 11, fontFamily: "'Space Grotesk', sans-serif" }}>
          <Truck size={13} color="#00cc66" /> Free Shipping
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#CFCFCF", fontSize: 11, fontFamily: "'Space Grotesk', sans-serif" }}>
          <RefreshCw size={13} color="#00cc66" /> 7-Day Returns
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 6, color: "#CFCFCF", fontSize: 11, fontFamily: "'Space Grotesk', sans-serif" }}>
          <ShieldIcon size={13} color="#00cc66" /> Genuine Product
        </div>
      </div>
    </div>
  );
}

// ─────────────── SPECIFICATIONS ───────────────
function SpecsSection({ product, details }: { product: Product; details: ProductDetails }) {
  return (
    <section className="section-pad" style={{ background: "#0D0D0D", padding: "64px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
        <SectionHeader eyebrow="TECHNICAL" title="KEY" accent="SPECIFICATIONS" />
        <Reveal>
          <GlassCard style={{ padding: 0 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))" }}>
              {details.fullSpecs.map((s, i) => (
                <div
                  key={s.key}
                  style={{
                    padding: "16px 22px",
                    borderRight: "1px solid rgba(255,255,255,0.04)",
                    borderBottom: "1px solid rgba(255,255,255,0.04)",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 12,
                  }}
                >
                  <div style={{ width: 32, height: 32, borderRadius: 8, background: "rgba(255,31,69,0.1)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <SpecIcon name={s.icon} />
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ color: "#777", fontSize: 10, fontFamily: "'Space Grotesk', sans-serif", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 3 }}>{s.key}</div>
                    <div style={{ color: "white", fontSize: 13, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500, wordBreak: "break-word" }}>{s.value}</div>
                  </div>
                </div>
              ))}
            </div>
          </GlassCard>
        </Reveal>
      </div>
    </section>
  );
}

function SpecIcon({ name }: { name: string }) {
  const sz = 14;
  const c = "#FF1F45";
  switch (name) {
    case "Cpu": return <Cpu size={sz} color={c} />;
    case "Zap": return <Zap size={sz} color={c} />;
    case "HardDrive": return <HardDrive size={sz} color={c} />;
    case "Wifi": return <Wifi size={sz} color={c} />;
    case "Package": return <Package size={sz} color={c} />;
    case "Shield": return <ShieldIcon size={sz} color={c} />;
    default: return <ChevronRight size={sz} color={c} />;
  }
}

// ─────────────── DESCRIPTION ───────────────
function DescriptionSection({ details }: { details: ProductDetails }) {
  return (
    <section className="section-pad" style={{ background: "#050505", padding: "64px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
        <SectionHeader eyebrow="ABOUT" title="PRODUCT" accent="DESCRIPTION" />
        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 22 }}>
          <Reveal>
            <GlassCard>
              <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 18, color: "#FF1F45", marginBottom: 12 }}>Product Overview</h3>
              <p style={{ color: "#CFCFCF", fontSize: 14, lineHeight: 1.75, fontFamily: "'Space Grotesk', sans-serif", whiteSpace: "pre-line" }}>
                {details.description.overview}
              </p>
            </GlassCard>
          </Reveal>

          <Reveal delay={.1}>
            <GlassCard>
              <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 18, color: "#FF1F45", marginBottom: 16 }}>Key Features</h3>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 10 }}>
                {details.description.keyFeatures.map((f, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, color: "#CFCFCF", fontSize: 13, fontFamily: "'Space Grotesk', sans-serif" }}>
                    <CheckCircle size={14} color="#FF1F45" style={{ flexShrink: 0, marginTop: 2 }} />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
            </GlassCard>
          </Reveal>

          <div style={{ display: "grid", gridTemplateColumns: "1.4fr 1fr", gap: 22 }}>
            <Reveal delay={.15}>
              <GlassCard>
                <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 18, color: "#FF1F45", marginBottom: 12 }}>Technical Details</h3>
                <p style={{ color: "#CFCFCF", fontSize: 14, lineHeight: 1.75, fontFamily: "'Space Grotesk', sans-serif" }}>
                  {details.description.technical}
                </p>
              </GlassCard>
            </Reveal>

            <Reveal delay={.2}>
              <GlassCard>
                <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 18, color: "#FF1F45", marginBottom: 12 }}>What's in the Box</h3>
                <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 8 }}>
                  {details.description.boxContents.map((item, i) => (
                    <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, color: "#CFCFCF", fontSize: 13, fontFamily: "'Space Grotesk', sans-serif" }}>
                      <Package size={13} color="#FF1F45" />
                      {item}
                    </li>
                  ))}
                </ul>
              </GlassCard>
            </Reveal>
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────── SECOND-HAND REPORT ───────────────
function SecondHandSection({ details }: { details: ProductDetails }) {
  if (!details.usedExtras) return null;
  const u = details.usedExtras;
  return (
    <section className="section-pad" style={{ background: "#0a0a0a", padding: "64px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
        <SectionHeader eyebrow="CERTIFIED" title="PRE-OWNED" accent="INSPECTION REPORT" />
        <Reveal>
          <GlassCard style={{ border: "1px solid rgba(0,204,102,0.3)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 22 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: "linear-gradient(135deg,#00cc66,#006633)", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <ClipboardCheck size={22} color="white" />
              </div>
              <div>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 18, color: "white", fontWeight: 700 }}>Condition Grade: {u.conditionGrade}</div>
                <div style={{ fontFamily: "'Space Grotesk', sans-serif", fontSize: 12, color: "#00cc66", marginTop: 4 }}>✓ Verified by {u.refurbishedBy}</div>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
              <DetailRow label="Serial Number" value={u.serial} />
              <DetailRow label="Original Purchase" value={u.originalPurchaseDate} />
              <DetailRow label="Remaining Warranty" value={u.remainingWarranty} />
              <DetailRow label="Refurbished By" value={u.refurbishedBy} />
              <DetailRow label="Cosmetic Condition" value={u.cosmetic} />
              <DetailRow label="Functional Status" value={u.functional} />
            </div>

            <div style={{ marginTop: 22, paddingTop: 22, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: "#FF1F45", marginBottom: 10, letterSpacing: "1px" }}>QUALITY CHECK</div>
              <p style={{ color: "#CFCFCF", fontSize: 13, lineHeight: 1.7, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 14 }}>
                {u.qualityCheck}
              </p>
              <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: "#FF1F45", marginBottom: 10, letterSpacing: "1px" }}>TESTED COMPONENTS</div>
              <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 8 }}>
                {u.testedComponents.map((c, i) => (
                  <li key={i} style={{ display: "flex", alignItems: "center", gap: 8, color: "#CFCFCF", fontSize: 12, fontFamily: "'Space Grotesk', sans-serif" }}>
                    <CheckCircle size={13} color="#00cc66" /> {c}
                  </li>
                ))}
              </ul>
            </div>
          </GlassCard>
        </Reveal>
      </div>
    </section>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div style={{ padding: "12px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.05)" }}>
      <div style={{ color: "#777", fontSize: 10, fontFamily: "'Space Grotesk', sans-serif", textTransform: "uppercase", letterSpacing: "1px", marginBottom: 4 }}>{label}</div>
      <div style={{ color: "white", fontSize: 13, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 500 }}>{value}</div>
    </div>
  );
}

// ─────────────── COMPATIBILITY ───────────────
function CompatibilitySection({ details }: { details: ProductDetails }) {
  return (
    <section className="section-pad" style={{ background: "#0D0D0D", padding: "64px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
        <SectionHeader eyebrow="WORKS WITH" title="COMPATIBILITY" accent="& UPGRADES" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 18 }}>
          <CompatCol title="Compatible Components" icon={<Package size={18} color="#FF1F45" />} items={details.compatibility.components} />
          <CompatCol title="Upgrade Options" icon={<Zap size={18} color="#FF1F45" />} items={details.compatibility.upgrades} />
          <CompatCol title="Recommended Accessories" icon={<Star size={18} color="#FF1F45" />} items={details.compatibility.accessories} />
        </div>
      </div>
    </section>
  );
}

function CompatCol({ title, icon, items }: { title: string; icon: React.ReactNode; items: string[] }) {
  return (
    <Reveal>
      <GlassCard>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 14 }}>
          {icon}
          <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 14, color: "white", letterSpacing: ".5px" }}>{title}</h3>
        </div>
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: 10 }}>
          {items.map((it, i) => (
            <li key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, color: "#CFCFCF", fontSize: 12, fontFamily: "'Space Grotesk', sans-serif" }}>
              <ChevronRight size={12} color="#FF1F45" style={{ marginTop: 2, flexShrink: 0 }} /> {it}
            </li>
          ))}
        </ul>
      </GlassCard>
    </Reveal>
  );
}

// ─────────────── DELIVERY ───────────────
function DeliverySection({ details }: { details: ProductDetails }) {
  return (
    <section className="section-pad" style={{ background: "#050505", padding: "48px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
        <SectionHeader eyebrow="LOGISTICS" title="DELIVERY" accent="INFORMATION" />
        <Reveal>
          <GlassCard>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 22 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                  <Truck size={22} color="#FF1F45" />
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 14, color: "white" }}>Estimated Delivery</div>
                </div>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 22, color: "#FF1F45", fontWeight: 700 }}>{details.delivery.estimatedDate}</div>
                <div style={{ color: "#777", fontSize: 11, marginTop: 4, fontFamily: "'Space Grotesk', sans-serif" }}>Standard shipping</div>
              </div>
              <div style={{ paddingTop: 8 }}>
                <CheckRow label="Home Delivery" on={details.delivery.homeDelivery} />
                <CheckRow label="Store Pickup Available" on={details.delivery.storePickup} />
              </div>
              <div>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: "#CFCFCF", marginBottom: 8 }}>Shipping Charges</div>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 24, color: details.delivery.shippingCharge === 0 ? "#00cc66" : "white", fontWeight: 700 }}>
                  {details.delivery.shippingCharge === 0 ? "FREE" : `₹${details.delivery.shippingCharge}`}
                </div>
                {details.delivery.shippingCharge === 0 && (
                  <div style={{ color: "#00cc66", fontSize: 11, marginTop: 4, fontFamily: "'Space Grotesk', sans-serif" }}>Free shipping on orders above ₹50,000</div>
                )}
              </div>
            </div>
          </GlassCard>
        </Reveal>
      </div>
    </section>
  );
}

function CheckRow({ label, on }: { label: string; on: boolean }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8, color: on ? "#00cc66" : "#555", fontSize: 13, fontFamily: "'Space Grotesk', sans-serif" }}>
      <CheckCircle size={14} /> {label}
    </div>
  );
}

// ─────────────── WARRANTY ───────────────
function WarrantySection({ details }: { details: ProductDetails }) {
  return (
    <section className="section-pad" style={{ background: "#0D0D0D", padding: "48px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
        <SectionHeader eyebrow="PROTECTION" title="WARRANTY" accent="COVERAGE" />
        <Reveal>
          <GlassCard>
            <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 20 }}>
              <div style={{ width: 56, height: 56, borderRadius: "50%", background: "linear-gradient(135deg,#FF1F45,#cc001a)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <ShieldIcon size={26} color="white" />
              </div>
              <div>
                <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 24, color: "white", fontWeight: 700 }}>{details.warranty.period}</div>
                <div style={{ color: "#FF1F45", fontSize: 12, fontFamily: "'Space Grotesk', sans-serif", marginTop: 2 }}>{details.warranty.type}</div>
              </div>
            </div>
            <div style={{ marginBottom: 16, color: "#CFCFCF", fontSize: 13, lineHeight: 1.7, fontFamily: "'Space Grotesk', sans-serif" }}>
              <strong style={{ color: "white" }}>Claim Process:</strong> {details.warranty.claimProcess}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
              {[
                { n: 1, t: "Contact Us", d: "WhatsApp / Call" },
                { n: 2, t: "Diagnose", d: "Free pickup & check" },
                { n: 3, t: "Repair / Replace", d: "Under warranty terms" },
              ].map((s) => (
                <div key={s.n} style={{ padding: 12, background: "rgba(255,31,69,0.06)", border: "1px solid rgba(255,31,69,0.2)", borderRadius: 8, textAlign: "center" }}>
                  <div style={{ width: 26, height: 26, borderRadius: "50%", background: "#FF1F45", color: "white", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 6px", fontFamily: "'Orbitron', sans-serif", fontSize: 12, fontWeight: 700 }}>{s.n}</div>
                  <div style={{ color: "white", fontSize: 12, fontFamily: "'Orbitron', sans-serif", marginBottom: 2 }}>{s.t}</div>
                  <div style={{ color: "#777", fontSize: 10, fontFamily: "'Space Grotesk', sans-serif" }}>{s.d}</div>
                </div>
              ))}
            </div>
          </GlassCard>
        </Reveal>
      </div>
    </section>
  );
}

// ─────────────── REVIEWS ───────────────
function ReviewsSection({ product, details }: { product: Product; details: ProductDetails }) {
  const [showAll, setShowAll] = useState(false);
  const visible = showAll ? details.reviews : details.reviews.slice(0, 3);

  return (
    <section className="section-pad" style={{ background: "#050505", padding: "64px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
        <SectionHeader eyebrow="OPINIONS" title="CUSTOMER" accent="REVIEWS" sub={`${product.reviews.toLocaleString("en-IN")} verified ratings`} />

        <div style={{ display: "grid", gridTemplateColumns: "300px 1fr", gap: 22, alignItems: "flex-start" }}>
          <Reveal>
            <GlassCard>
              <div style={{ textAlign: "center", marginBottom: 18 }}>
                <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 56, color: "#FF1F45", fontWeight: 700, lineHeight: 1 }}>{product.rating.toFixed(1)}</div>
                <StarRow rating={product.rating} size={16} />
                <div style={{ color: "#CFCFCF", fontSize: 12, marginTop: 6, fontFamily: "'Space Grotesk', sans-serif" }}>{product.reviews.toLocaleString("en-IN")} ratings</div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {details.ratingBreakdown.map((r) => (
                  <div key={r.stars} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ width: 30, color: "#CFCFCF", fontSize: 11, fontFamily: "'Space Grotesk', sans-serif" }}>{r.stars}★</span>
                    <div style={{ flex: 1, height: 6, background: "rgba(255,255,255,0.06)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ width: `${r.pct}%`, height: "100%", background: "linear-gradient(90deg,#FF1F45,#ff8090)" }} />
                    </div>
                    <span style={{ width: 36, textAlign: "right", color: "#777", fontSize: 10, fontFamily: "'Space Grotesk', sans-serif" }}>{r.pct.toFixed(0)}%</span>
                  </div>
                ))}
              </div>
            </GlassCard>
          </Reveal>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {visible.map((r, i) => (
              <Reveal key={i} delay={i * .05}>
                <GlassCard>
                  <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                    <div style={{ width: 38, height: 38, borderRadius: "50%", background: "linear-gradient(135deg,#FF1F45,#cc001a)", display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Orbitron', sans-serif", fontSize: 14, color: "white", fontWeight: 700 }}>
                      {r.initial}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ color: "white", fontSize: 13, fontFamily: "'Space Grotesk', sans-serif", fontWeight: 600 }}>{r.name}</span>
                        {r.verified && (
                          <span style={{ background: "rgba(0,204,102,0.15)", color: "#00cc66", fontSize: 9, padding: "2px 6px", borderRadius: 3, fontFamily: "'Orbitron', sans-serif", display: "inline-flex", alignItems: "center", gap: 3 }}>
                            <CheckCircle size={9} /> VERIFIED
                          </span>
                        )}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 3 }}>
                        <StarRow rating={r.rating} size={11} />
                        <span style={{ color: "#777", fontSize: 10, fontFamily: "'Space Grotesk', sans-serif" }}>{r.date}</span>
                      </div>
                    </div>
                  </div>
                  <p style={{ color: "#CFCFCF", fontSize: 13, lineHeight: 1.65, fontFamily: "'Space Grotesk', sans-serif", margin: 0 }}>
                    {r.text}
                  </p>
                </GlassCard>
              </Reveal>
            ))}
            {details.reviews.length > 3 && (
              <button
                onClick={() => setShowAll(!showAll)}
                style={{
                  background: "rgba(255,255,255,0.04)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "#FF1F45",
                  padding: "12px",
                  borderRadius: 8,
                  cursor: "pointer",
                  fontFamily: "'Orbitron', sans-serif",
                  fontSize: 10,
                  letterSpacing: "1px",
                }}
              >
                {showAll ? "SHOW LESS" : `SHOW ALL ${details.reviews.length} REVIEWS`}
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

// ─────────────── RELATED PRODUCTS ───────────────
function RelatedProductsSection({ product, details }: { product: Product; details: ProductDetails }) {
  const { store } = useDashboardData();
  const allIds = [...details.related.similar, ...details.related.frequentlyBought, ...details.related.recommended];
  const allProducts = mergedCatalogProducts(store.products);
  const findById = (id: number) => allProducts.find((p) => p.id === id);
  const similar = details.related.similar.map(findById).filter(Boolean) as Product[];
  const freq = details.related.frequentlyBought.map(findById).filter(Boolean) as Product[];
  const rec = details.related.recommended.map(findById).filter(Boolean) as Product[];

  const renderGrid = (title: string, items: Product[]) => {
    if (items.length === 0) return null;
    return (
      <div style={{ marginBottom: 36 }}>
        <h3 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 16, color: "white", marginBottom: 18, letterSpacing: ".5px" }}>
          {title}
        </h3>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
          {items.map((p) => (
            <ProductCard key={p.id} p={p} onAdd={(prod) => {
              const cart = loadCart();
              cart[prod.id] = (cart[prod.id] ?? 0) + 1;
              saveCart(cart);
              toast.success(`${prod.name} added to cart`);
            }} />
          ))}
        </div>
      </div>
    );
  };

  return (
    <section className="section-pad" style={{ background: "#0D0D0D", padding: "64px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
        <SectionHeader eyebrow="YOU MAY ALSO LIKE" title="RELATED" accent="PRODUCTS" />
        {renderGrid("Similar Products", similar)}
        {renderGrid("Frequently Bought Together", freq)}
        {renderGrid("Recommended Accessories", rec)}
        {allIds.length === 0 && (
          <p style={{ textAlign: "center", color: "#777", fontFamily: "'Space Grotesk', sans-serif" }}>
            No related products available.
          </p>
        )}
      </div>
    </section>
  );
}

// ─────────────── SUPPORT ───────────────
function SupportSection({ details }: { details: ProductDetails }) {
  const cards = [
    { icon: <MessageCircle size={24} />, title: "WhatsApp Shop", desc: "Quick replies, share product links", color: "#00cc66", href: `https://wa.me/${details.support.whatsapp.replace(/\D/g, "")}` },
    { icon: <Phone size={24} />, title: "Call Shop", desc: details.support.phone, color: "#FF1F45", href: `tel:${details.support.phone.replace(/\s/g, "")}` },
    { icon: <MessageCircle size={24} />, title: "Ask a Question", desc: "Email us your queries", color: "#00b4ff", href: "mailto:support@deskto.in" },
    { icon: <Zap size={24} />, title: "Live Chat", desc: "Instant chat with experts", color: "#7a00ff", href: "#" },
  ];
  return (
    <section className="section-pad" style={{ background: "#050505", padding: "64px 0" }}>
      <div style={{ maxWidth: 1280, margin: "0 auto", padding: "0 24px" }}>
        <SectionHeader eyebrow="WE'RE HERE" title="NEED HELP?" accent="CONTACT US" />
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 16 }}>
          {cards.map((c, i) => (
            <Reveal key={i} delay={i * .05}>
              <a href={c.href} target={c.href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" style={{ textDecoration: "none" }}>
                <GlassCard style={{ textAlign: "center", cursor: "pointer", transition: "transform .2s, border-color .2s" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = c.color; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.borderColor = "rgba(255,255,255,0.09)"; }}
                >
                  <div style={{ width: 52, height: 52, margin: "0 auto 14px", borderRadius: "50%", background: `${c.color}22`, display: "flex", alignItems: "center", justifyContent: "center", color: c.color }}>
                    {c.icon}
                  </div>
                  <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 13, color: "white", marginBottom: 6 }}>{c.title}</div>
                  <div style={{ color: "#CFCFCF", fontSize: 11, fontFamily: "'Space Grotesk', sans-serif" }}>{c.desc}</div>
                </GlassCard>
              </a>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

// ─────────────── STICKY MOBILE BAR ───────────────
function StickyActionBar({ product }: { product: Product }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 500);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const addToCart = () => {
    if (!product.inStock) {
      toast.error("Out of stock");
      return;
    }
    const cart = loadCart();
    cart[product.id] = (cart[product.id] ?? 0) + 1;
    saveCart(cart);
    toast.success(`${product.name} added to cart`);
  };

  const buyNow = () => {
    if (!product.inStock) return;
    const cart = loadCart();
    cart[product.id] = (cart[product.id] ?? 0) + 1;
    saveCart(cart);
    window.location.href = "/checkout";
  };

  if (!visible) return null;

  return (
    <div
      className="mobile-only"
      style={{
        position: "fixed",
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 200,
        background: "rgba(5,5,5,0.95)",
        backdropFilter: "blur(16px)",
        borderTop: "1px solid rgba(255,31,69,0.3)",
        padding: "12px 16px",
        display: "flex",
        alignItems: "center",
        gap: 10,
      }}
    >
      <div style={{ flex: 1 }}>
        <div style={{ fontFamily: "'Rajdhani', sans-serif", fontSize: 22, color: "#FF1F45", fontWeight: 700, lineHeight: 1 }}>
          ₹{product.price.toLocaleString("en-IN")}
        </div>
        <div style={{ color: "#777", fontSize: 10, fontFamily: "'Space Grotesk', sans-serif" }}>
          {product.inStock ? "In Stock" : "Out of Stock"}
        </div>
      </div>
      <button
        onClick={addToCart}
        disabled={!product.inStock}
        style={{
          padding: "11px 14px",
          background: "transparent",
          border: "1px solid rgba(255,31,69,0.5)",
          color: "#FF1F45",
          borderRadius: 8,
          cursor: "pointer",
          fontFamily: "'Orbitron', sans-serif",
          fontSize: 9,
          letterSpacing: "1px",
        }}
      >
        ADD
      </button>
      <button
        onClick={buyNow}
        disabled={!product.inStock}
        className="glass-pill glass-pill-primary"
        style={{
          padding: "11px 14px",
          fontSize: 9,
          opacity: product.inStock ? 1 : 0.4,
        }}
      >
        BUY NOW
      </button>
    </div>
  );
}

// ─────────────── 404 ───────────────
function NotFoundView() {
  return (
    <div style={{ background: "#050505", minHeight: "100vh", color: "white" }}>
      <Navbar />
      <div style={{ maxWidth: 600, margin: "120px auto", padding: "0 24px", textAlign: "center" }}>
        <div style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 80, color: "#FF1F45", fontWeight: 900, lineHeight: 1 }}>404</div>
        <h2 style={{ fontFamily: "'Orbitron', sans-serif", fontSize: 24, margin: "20px 0 12px" }}>Product Not Found</h2>
        <p style={{ color: "#CFCFCF", fontSize: 14, fontFamily: "'Space Grotesk', sans-serif", marginBottom: 30 }}>
          We couldn't find the product you're looking for. It may have been removed or the link is incorrect.
        </p>
        <a
          href="/products"
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
          <ChevronLeft size={14} /> BROWSE PRODUCTS
        </a>
      </div>
      <FooterSection />
    </div>
  );
}

// ─────────────── MAIN PAGE ───────────────
export default function ProductDetailPage({ productId }: { productId: number }) {
  const { store } = useDashboardData();
  const products = mergedCatalogProducts(store.products);
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [productId]);

  const product = products.find((p) => p.id === productId);
  if (!product) return <NotFoundView />;

  const details = getProductDetails(product, products);

  return (
    <div style={{ background: "#050505", color: "white", minHeight: "100vh", paddingBottom: 80 }}>
      <Navbar />
      <BreadcrumbBar product={product} />

      <section className="section-pad" style={{ padding: "40px 0" }}>
        <div
          style={{
            maxWidth: 1280,
            margin: "0 auto",
            padding: "0 24px",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1.1fr) minmax(0, 1fr)",
            gap: 40,
            alignItems: "flex-start",
          }}
        >
          <Reveal>
            <ProductGallery product={product} details={details} />
          </Reveal>
          <Reveal delay={.1}>
            <HeroInfo product={product} details={details} />
          </Reveal>
        </div>
      </section>

      <SpecsSection product={product} details={details} />
      <DescriptionSection details={details} />
      {details.usedExtras && <SecondHandSection details={details} />}
      <CompatibilitySection details={details} />
      <DeliverySection details={details} />
      <WarrantySection details={details} />
      <ReviewsSection product={product} details={details} />
      <RelatedProductsSection product={product} details={details} />
      <SupportSection details={details} />

      <FooterSection />
      <ScrollToTop />
      <StickyActionBar product={product} />

      {/* Mobile-only responsive grid override */}
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
