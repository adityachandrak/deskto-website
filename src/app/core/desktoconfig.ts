import { BusinessConfig } from "./config.schema";

export const DESKTO_CONFIG_PRESET: BusinessConfig = {
  site: {
    name: "DESKTO",
    description: "Premium Custom PC Builder & Repair Services",
    contact: {
      phone: "+91 62604 69111",
      email: "support@deskto.in",
      address: "Shop No. 22, Arvind Nagar, Gwalior, MP 474004",
      whatsappNumber: "+916260469111",
    },
    socials: {
      instagram: "https://instagram.com/deskto",
      youtube: "https://youtube.com/@deskto",
      facebook: "https://facebook.com/deskto",
      twitter: "https://twitter.com/deskto",
    },
    businessHours: "Mon-Sat: 10AM-8PM",
  },
  theme: {
    primaryColor: "#FF1F45", // Signature Red/Pink
    secondaryColor: "#0088ff",
    backgroundColor: "#050505",
    textColor: "#ffffff",
    fontFamily: "Inter",
    borderRadius: "0.625rem",
  },
  features: {
    enableECommerce: true,
    enableRentals: true,
    enableServiceRequests: true,
    enableCustomBuilder: true,
    enableBookingCalendar: false,
  },
  homepageLayout: [
    { sectionId: "hero", enabled: true, displayOrder: 0 },
    { sectionId: "services", enabled: true, displayOrder: 1 },
    { sectionId: "workflow", enabled: true, displayOrder: 2 },
    { sectionId: "featured-builds", enabled: true, displayOrder: 3 },
    { sectionId: "brands", enabled: true, displayOrder: 4 },
    { sectionId: "offers", enabled: true, displayOrder: 5 },
    { sectionId: "news", enabled: true, displayOrder: 6 },
    { sectionId: "testimonials", enabled: true, displayOrder: 7 },
    { sectionId: "faq", enabled: true, displayOrder: 8 },
    { sectionId: "location", enabled: true, displayOrder: 9 },
    { sectionId: "footer", enabled: true, displayOrder: 10 },
  ],
};
