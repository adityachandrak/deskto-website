import type { LucideIcon } from "lucide-react";
import {
  Wrench, Monitor, Zap, Database, Package, RefreshCw, Wifi, Gamepad2,
} from "lucide-react";

export type ServicePricingTier = {
  name: "Basic" | "Standard" | "Premium";
  price: string;
  period?: string;
  bullets: string[];
  highlight?: boolean;
};

export type ServiceFaq = { q: string; a: string };

export type Service = {
  slug: string;
  title: string;
  icon: LucideIcon;
  color: string;
  tag: string;
  sub: string;
  longDescription: string;
  includedServices: string[];
  pricingTiers: ServicePricingTier[];
  faqs: ServiceFaq[];
  relatedSlugs: string[];
  ctaLabel: string;
};

export const SERVICES: Service[] = [
  {
    slug: "repair",
    title: "PC & Laptop Repair",
    icon: Wrench,
    color: "#FF1F45",
    tag: "24hr Turnaround",
    sub: "Expert diagnosis & repair for all PC, laptop, and gaming-rig hardware.",
    longDescription:
      "Whether it's a dead laptop, a gaming PC that won't boot, a MacBook with water damage, or a motherboard that needs micro-soldering, DESKTO's certified engineers diagnose and fix it fast. We use genuine parts, run a 24-hour stress test on every repair, and back every job with a written warranty. Most repairs are completed within 24-72 hours.",
    includedServices: [
      "Desktop Repair",
      "Laptop Repair",
      "Gaming PC Repair",
      "MacBook Repair",
      "Motherboard Repair",
      "Hardware Diagnosis",
      "Water Damage",
      "Boot Issues",
      "No Display",
      "Overheating",
    ],
    pricingTiers: [
      {
        name: "Basic",
        price: "₹499",
        period: "/diagnostic",
        bullets: [
          "Hardware health check",
          "Written diagnosis report",
          "Repair quote (free if you proceed)",
          "Pickup & drop available",
        ],
      },
      {
        name: "Standard",
        price: "₹1,499",
        period: "/repair",
        highlight: true,
        bullets: [
          "All Basic features",
          "Genuine replacement parts",
          "24-hour stress test",
          "30-day repair warranty",
        ],
      },
      {
        name: "Premium",
        price: "₹4,999+",
        period: "/motherboard",
        bullets: [
          "Micro-soldering & BGA rework",
          "Schematic-level diagnosis",
          "Genuine OEM components",
          "6-month repair warranty",
        ],
      },
    ],
    faqs: [
      {
        q: "How long does a typical repair take?",
        a: "Most standard repairs (RAM, SSD, fan, screen) are completed within 24-48 hours. Motherboard-level and micro-soldering jobs may take 3-5 working days. We provide a written timeline before starting work.",
      },
      {
        q: "Do you use genuine parts?",
        a: "Yes — all replacement parts are sourced from authorised distributors or OEM channels. You receive a parts invoice along with the final repair bill.",
      },
      {
        q: "Is there a warranty on repairs?",
        a: "Every repair includes a written warranty: 30 days for standard repairs, 6 months for motherboard and BGA work. Warranty excludes physical and liquid damage after the repair.",
      },
      {
        q: "Do you offer pickup and drop?",
        a: "Yes — free pickup and drop within 15 km of any DESKTO store for repairs above ₹1,499. Remote locations handled via insured courier.",
      },
    ],
    relatedSlugs: ["custom-pc", "upgrade", "software", "remote-it"],
    ctaLabel: "Book Repair",
  },
  {
    slug: "custom-pc",
    title: "Custom PC Solutions",
    icon: Monitor,
    color: "#7a00ff",
    tag: "100% Custom",
    sub: "Bespoke builds from budget rigs to extreme gaming and AI workstations.",
    longDescription:
      "Tell us what you want to do, and we'll build the perfect machine for it. Our custom-build service covers everything from a sub-₹50,000 office rig to a ₹5 lakh+ extreme gaming or AI workstation. Every build goes through a 24-hour stress test, an OS + driver clean install, and a personalised handover session where we walk you through your new machine.",
    includedServices: [
      "Custom Gaming PC",
      "Office PC",
      "Editing Workstation",
      "Streaming PC",
      "AI Workstation",
      "RGB Builds",
      "Liquid Cooling",
      "Component Compatibility",
      "Budget Planner",
    ],
    pricingTiers: [
      {
        name: "Basic",
        price: "₹49,999",
        period: "/build",
        bullets: [
          "Office / home use build",
          "Air cooling, no RGB",
          "1-year build warranty",
          "Free OS install + drivers",
        ],
      },
      {
        name: "Standard",
        price: "₹1,49,999",
        period: "/build",
        highlight: true,
        bullets: [
          "Gaming / creator build",
          "AIO liquid cooling",
          "Tempered-glass RGB case",
          "3-year build warranty",
          "24h stress test + bench report",
        ],
      },
      {
        name: "Premium",
        price: "₹3,99,999+",
        period: "/build",
        bullets: [
          "Flagship GPU + CPU",
          "Custom hardline loop cooling",
          "Personalised laser engraving",
          "Lifetime build support",
          "On-site build available",
        ],
      },
    ],
    faqs: [
      {
        q: "How long does a custom build take?",
        a: "Most builds are completed in 5-7 working days. Premium builds with custom hardline loops or rare parts may take 2-3 weeks.",
      },
      {
        q: "Can I supply my own parts?",
        a: "Yes — you can bring your own parts, or buy from us at competitive prices. We charge a fixed assembly fee (₹2,499 Standard, ₹4,999 Premium hardline) regardless of parts source.",
      },
      {
        q: "Do you provide a parts compatibility guarantee?",
        a: "Absolutely. Our engineers review every build for BIOS, PSU wattage, clearance, and airflow. If a part you choose is incompatible, we suggest alternatives before starting.",
      },
      {
        q: "What about future upgrades?",
        a: "Every DESKTO build is designed with upgradability in mind — modular PSU, spare RAM slots, additional M.2 bays, and headroom for a larger GPU. We log your build's exact spec for future service.",
      },
    ],
    relatedSlugs: ["upgrade", "marketplace", "repair", "rental"],
    ctaLabel: "Build Your PC",
  },
  {
    slug: "upgrade",
    title: "Upgrade & Optimization",
    icon: Zap,
    color: "#ffcc00",
    tag: "Same-Day Service",
    sub: "Breathe new life into your existing PC with expert upgrades.",
    longDescription:
      "Don't replace — upgrade. Our upgrade service covers everything from a simple RAM bump to a full GPU swap. We migrate your data, optimise your OS for the new hardware, and run benchmarks to make sure you're getting the performance you paid for. Most upgrades are completed the same day.",
    includedServices: [
      "RAM Upgrade",
      "SSD Upgrade",
      "GPU Upgrade",
      "CPU Upgrade",
      "PSU Upgrade",
      "Cooling Upgrade",
      "BIOS Update",
      "Performance Tuning",
      "Cable Management",
    ],
    pricingTiers: [
      {
        name: "Basic",
        price: "₹299",
        period: "/install",
        bullets: [
          "Single-component install",
          "Basic driver update",
          "Same-day turnaround",
        ],
      },
      {
        name: "Standard",
        price: "₹999",
        period: "/install",
        highlight: true,
        bullets: [
          "RAM / SSD / GPU / PSU swap",
          "OS optimisation for new hardware",
          "Driver clean install",
          "30-day upgrade warranty",
        ],
      },
      {
        name: "Premium",
        price: "₹2,999",
        period: "/tune-up",
        bullets: [
          "Full system overhaul",
          "Thermal paste reapplication",
          "Custom fan curve + RGB sync",
          "Cable management",
          "Pre/post benchmark report",
        ],
      },
    ],
    faqs: [
      {
        q: "Will my data be safe during an upgrade?",
        a: "Yes. We back up your critical data before any hardware swap. If we're replacing your boot drive, we clone your existing OS to the new drive so you can boot straight back in.",
      },
      {
        q: "Can you source the upgrade parts?",
        a: "Yes — we can supply parts at competitive prices, or you can bring your own. We recommend our supply chain for warranty and compatibility reasons.",
      },
      {
        q: "How do I know if an upgrade is worth it?",
        a: "Bring your PC in for a free 15-minute consultation. Our engineers will tell you whether an upgrade makes sense or whether a full rebuild is more cost-effective.",
      },
      {
        q: "Do you handle laptops too?",
        a: "Yes — RAM and SSD upgrades on most laptops. GPU/CPU upgrades are generally not possible on laptops due to soldered components.",
      },
    ],
    relatedSlugs: ["custom-pc", "repair", "software", "marketplace"],
    ctaLabel: "Upgrade Now",
  },
  {
    slug: "software",
    title: "Software & Data Services",
    icon: Database,
    color: "#00b4ff",
    tag: "Data-Safe",
    sub: "Clean installs, data recovery, and full software support.",
    longDescription:
      "Software issues can cripple even the fastest hardware. DESKTO's software team handles clean Windows installs, driver issues, Office and productivity setup, antivirus hardening, and — most critically — data recovery from failed HDDs and SSDs. We work in a certified clean-room environment for mechanical drive recovery.",
    includedServices: [
      "Windows Installation",
      "Driver Installation",
      "Office Installation",
      "Antivirus",
      "Data Backup",
      "HDD Recovery",
      "SSD Recovery",
      "Virus Removal",
      "OS Optimization",
    ],
    pricingTiers: [
      {
        name: "Basic",
        price: "₹499",
        period: "/install",
        bullets: [
          "Windows + driver install",
          "Essential software setup",
          "Driver + Windows update",
        ],
      },
      {
        name: "Standard",
        price: "₹1,499",
        period: "/setup",
        highlight: true,
        bullets: [
          "Windows + Office + Antivirus",
          "Browser, email, productivity setup",
          "User data migration",
          "30-day software support",
        ],
      },
      {
        name: "Premium",
        price: "₹4,999+",
        period: "/recovery",
        bullets: [
          "HDD / SSD data recovery",
          "Clean-room environment",
          "No data, no fee guarantee",
          "Encrypted backup of recovered data",
        ],
      },
    ],
    faqs: [
      {
        q: "What if my HDD is clicking / not detected?",
        a: "Stop using the drive immediately. Continued power-on can permanently destroy data. Bring it in for a free diagnostic — our clean-room recovery has a 90%+ success rate on mechanical drives.",
      },
      {
        q: "Do you install macOS / Linux?",
        a: "Yes — we install macOS on supported hardware, and any Linux distribution (Ubuntu, Fedora, Mint, Arch, etc.) with full driver support.",
      },
      {
        q: "Can you remove a virus without losing my files?",
        a: "Yes, in most cases. We isolate the infection, clean the system, and verify your data is intact before handing back. For ransomware cases, we evaluate on a case-by-case basis.",
      },
      {
        q: "How long does data recovery take?",
        a: "Software-level recovery: 1-2 days. Mechanical clean-room recovery: 3-7 days depending on damage severity.",
      },
    ],
    relatedSlugs: ["upgrade", "repair", "remote-it", "marketplace"],
    ctaLabel: "Get Support",
  },
  {
    slug: "rental",
    title: "Rental Solutions",
    icon: Package,
    color: "#ff6b00",
    tag: "From ₹499/day",
    sub: "Gaming PCs, laptops, and full setups for events, projects, and more.",
    longDescription:
      "Need a high-end gaming rig for a weekend tournament? A fleet of laptops for a corporate training? A workstation for a short video project? DESKTO rents it all. Flexible daily / weekly / monthly plans, free delivery within 15 km, and on-call technical support for the duration of your rental.",
    includedServices: [
      "Gaming PC Rental",
      "Laptop Rental",
      "Office Desktop Rental",
      "Project Rental",
      "Event Rental",
      "Student Rental",
      "Corporate Rental",
    ],
    pricingTiers: [
      {
        name: "Basic",
        price: "₹499",
        period: "/day",
        bullets: [
          "Office desktop / entry laptop",
          "Pre-installed OS + Office",
          "Free delivery (15 km)",
        ],
      },
      {
        name: "Standard",
        price: "₹1,499",
        period: "/day",
        highlight: true,
        bullets: [
          "Gaming PC or workstation",
          "Latest-gen GPU + CPU",
          "Peripherals included (KB + mouse + monitor)",
          "On-call support",
        ],
      },
      {
        name: "Premium",
        price: "₹4,999+",
        period: "/day",
        bullets: [
          "Flagship gaming / editing rig",
          "Multi-monitor setups",
          "On-site setup + technician",
          "Insurance included",
        ],
      },
    ],
    faqs: [
      {
        q: "Do I need to pay a security deposit?",
        a: "Yes — a refundable security deposit applies (typically 1x the daily rental). It's fully refunded on safe return of the equipment.",
      },
      {
        q: "What if the equipment fails during my rental?",
        a: "We provide a like-for-like replacement within 4 hours (in-city) or 24 hours (outstation). Your project won't be held up.",
      },
      {
        q: "Can I extend my rental?",
        a: "Yes, subject to availability. Just call us at least 24 hours before your rental ends to extend.",
      },
      {
        q: "Do you deliver outside the city?",
        a: "Yes — for rentals of 7+ days, we offer insured courier delivery across India. Shipping charges apply.",
      },
    ],
    relatedSlugs: ["custom-pc", "marketplace", "remote-it", "gaming-hub"],
    ctaLabel: "Rent Now",
  },
  {
    slug: "marketplace",
    title: "Sell Used Products",
    icon: RefreshCw,
    color: "#00cc66",
    tag: "Instant Quote",
    sub: "Sell used laptops, gaming PCs, components, and accessories for fast cash.",
    longDescription:
      "Turn your old tech into value with DESKTO. Sell used laptops, desktops, gaming PCs, GPUs, monitors, peripherals, and accessories after a transparent inspection and market-rate valuation. We verify condition, securely wipe storage, provide a buyback quote, and pay quickly by bank transfer or store credit. Non-working systems can also be accepted for parts after inspection.",
    includedServices: [
      "Sell Used Products",
      "Sell Old Laptop",
      "Sell Gaming PC",
      "Sell Components",
      "Sell Accessories",
      "Trade-In",
      "Data Wipe Certificate",
      "Pickup & Inspection",
    ],
    pricingTiers: [
      {
        name: "Basic",
        price: "Free",
        period: "/quote",
        bullets: [
          "Walk-in valuation",
          "Instant quote",
          "No obligation",
        ],
      },
      {
        name: "Standard",
        price: "Market",
        period: "rate",
        highlight: true,
        bullets: [
          "Best market-rate offer",
          "Same-day bank transfer",
          "Free pickup (15 km)",
          "Data wipe certificate",
        ],
      },
      {
        name: "Premium",
        price: "+15%",
        period: "credit",
        bullets: [
          "Trade-in toward new purchase",
          "15% bonus credit",
          "Priority valuation",
          "Priority support",
        ],
      },
    ],
    faqs: [
      {
        q: "How do you determine the buyback price?",
        a: "We check current market value, condition grade, and demand. Our quote is valid for 7 days. We match or beat any competitor's written quote.",
      },
      {
        q: "Is my data safe when I sell?",
        a: "Yes — every drive is securely wiped (NIST 800-88 standard) and you receive a Data Wipe Certificate for your records.",
      },
      {
        q: "What's the warranty on used products?",
        a: "6-month DESKTO warranty on all used products, covering functional defects. Cosmetic wear is disclosed upfront in the listing.",
      },
      {
        q: "Can I trade in a non-working system?",
        a: "Yes — we accept non-working systems for parts. The buyback price will be lower, but we'll still pick it up for free.",
      },
    ],
    relatedSlugs: ["custom-pc", "upgrade", "repair", "software"],
    ctaLabel: "Sell Used Product",
  },
  {
    slug: "remote-it",
    title: "Remote & Business IT Support",
    icon: Wifi,
    color: "#ff6b80",
    tag: "Online 24/7",
    sub: "Remote troubleshooting and full office IT maintenance.",
    longDescription:
      "From a one-off TeamViewer session to a full multi-site office IT contract, DESKTO's remote and business IT team has you covered. We support Windows, macOS, and Linux; configure networks, servers, and CCTV; and provide proactive maintenance to stop problems before they start.",
    includedServices: [
      "Remote Troubleshooting",
      "TeamViewer Support",
      "Software Fix",
      "Network Setup",
      "Router Configuration",
      "Server Installation",
      "CCTV Installation",
      "Office IT Maintenance",
    ],
    pricingTiers: [
      {
        name: "Basic",
        price: "₹299",
        period: "/session",
        bullets: [
          "Single 30-min remote session",
          "TeamViewer / AnyDesk",
          "Pay per issue",
        ],
      },
      {
        name: "Standard",
        price: "₹2,999",
        period: "/month",
        highlight: true,
        bullets: [
          "Up to 5 devices",
          "Unlimited remote sessions",
          "Email + phone support",
          "Monthly health report",
        ],
      },
      {
        name: "Premium",
        price: "₹14,999",
        period: "/month",
        bullets: [
          "Up to 25 devices",
          "On-site visits included",
          "Network + server management",
          "CCTV installation",
          "4-hour SLA",
        ],
      },
    ],
    faqs: [
      {
        q: "Is remote support secure?",
        a: "Yes — we use enterprise TeamViewer / AnyDesk with end-to-end encryption. Sessions are logged and you can disconnect at any time. We never store passwords.",
      },
      {
        q: "What if my issue can't be fixed remotely?",
        a: "We'll send a technician on-site (covered under Standard+ plans) or arrange pickup for further diagnosis. You won't be charged extra for the diagnosis.",
      },
      {
        q: "Do you support macOS and Linux?",
        a: "Yes — our engineers are certified across Windows, macOS, and the major Linux distributions (Ubuntu, Fedora, Debian, Arch).",
      },
      {
        q: "Can you help with a one-time setup, not a contract?",
        a: "Absolutely. Our Basic per-session plan works for one-off needs like setting up a new router or installing CCTV. No long-term commitment required.",
      },
    ],
    relatedSlugs: ["software", "repair", "custom-pc", "upgrade"],
    ctaLabel: "Connect Now",
  },
  {
    slug: "gaming-hub",
    title: "Gaming Hub",
    icon: Gamepad2,
    color: "#cc001a",
    tag: "Updated Daily",
    sub: "News, reviews, and tips for the Indian gaming community.",
    longDescription:
      "Stay on top of the gaming world with DESKTO's editorial team. We cover the latest hardware launches, esports tournaments, and game releases — with a focus on the Indian scene. Benchmark results, hands-on reviews, optimisation tips, and a community blog where you can share your own builds.",
    includedServices: [
      "Gaming News",
      "Latest Hardware",
      "Esports Updates",
      "New Game Releases",
      "Gaming Tips",
      "Benchmark Results",
      "Reviews",
      "Community Blog",
    ],
    pricingTiers: [
      {
        name: "Basic",
        price: "Free",
        period: "/read",
        bullets: [
          "Daily news articles",
          "Public blog access",
          "Weekly newsletter",
        ],
      },
      {
        name: "Standard",
        price: "₹199",
        period: "/month",
        highlight: true,
        bullets: [
          "Ad-free reading",
          "Early access to reviews",
          "Benchmark database",
          "Member-only Discord",
        ],
      },
      {
        name: "Premium",
        price: "₹999",
        period: "/month",
        bullets: [
          "All Standard features",
          "1-on-1 build consultation",
          "Beta access to tools",
          "Featured build slot",
        ],
      },
    ],
    faqs: [
      {
        q: "Is the content free?",
        a: "Most of our news, reviews, and tips are free. We offer a paid Standard membership for ad-free reading, early access, and our private Discord.",
      },
      {
        q: "Can I contribute articles?",
        a: "Yes! We accept community submissions. Reach out via the Contact page with a writing sample.",
      },
      {
        q: "Do you review products from any brand?",
        a: "We accept review units from any brand, but all reviews are independently written. We disclose any sponsorship clearly in the article.",
      },
      {
        q: "Can I suggest topics?",
        a: "Absolutely. Drop us a note via the Contact page or in our Discord.",
      },
    ],
    relatedSlugs: ["custom-pc", "marketplace", "rental", "upgrade"],
    ctaLabel: "Explore",
  },
];

export function getServiceBySlug(slug: string): Service | undefined {
  return SERVICES.find((s) => s.slug === slug);
}

export function getAllServices(): Service[] {
  return SERVICES;
}
