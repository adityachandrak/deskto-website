export interface BusinessConfig {
  site: {
    name: string;
    description: string;
    contact: {
      phone: string;
      email: string;
      address: string;
      whatsappNumber?: string;
    };
    socials: {
      instagram?: string;
      youtube?: string;
      facebook?: string;
      twitter?: string;
    };
    businessHours: string;
  };
  theme: {
    primaryColor: string;
    secondaryColor: string;
    backgroundColor: string;
    textColor: string;
    fontFamily: string;
    borderRadius: string;
  };
  features: {
    enableECommerce: boolean;
    enableRentals: boolean;
    enableServiceRequests: boolean;
    enableCustomBuilder: boolean;
    enableBookingCalendar: boolean;
  };
  homepageLayout: {
    sectionId: string;
    enabled: boolean;
    displayOrder: number;
    props?: Record<string, any>;
  }[];
}

export function validateBusinessConfig(data: any): BusinessConfig {
  if (!data || typeof data !== "object") {
    throw new Error("Configuration data must be a valid JSON object");
  }

  const site = data.site || {};
  const contact = site.contact || {};
  const socials = site.socials || {};
  const theme = data.theme || {};
  const features = data.features || {};
  const homepageLayout = Array.isArray(data.homepageLayout) ? data.homepageLayout : [];

  // Enforce types and provide clean, robust default fallbacks
  return {
    site: {
      name: typeof site.name === "string" && site.name.trim() !== "" ? site.name.trim() : "DESKTO",
      description: typeof site.description === "string" ? site.description.trim() : "Premium Business Services",
      contact: {
        phone: typeof contact.phone === "string" ? contact.phone.trim() : "+91-9876543210",
        email: typeof contact.email === "string" ? contact.email.trim() : "support@deskto.in",
        address: typeof contact.address === "string" ? contact.address.trim() : "Shop No. 22, Arvind Nagar, Gwalior, MP 474004",
        whatsappNumber: typeof contact.whatsappNumber === "string" ? contact.whatsappNumber.trim() : "+91-62604-69111",
      },
      socials: {
        instagram: typeof socials.instagram === "string" ? socials.instagram.trim() : "https://instagram.com/deskto",
        youtube: typeof socials.youtube === "string" ? socials.youtube.trim() : "https://youtube.com/@deskto",
        facebook: typeof socials.facebook === "string" ? socials.facebook.trim() : "https://facebook.com/deskto",
        twitter: typeof socials.twitter === "string" ? socials.twitter.trim() : "https://twitter.com/deskto",
      },
      businessHours: typeof site.businessHours === "string" ? site.businessHours.trim() : "Mon-Sat: 10AM-8PM",
    },
    theme: {
      primaryColor: typeof theme.primaryColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(theme.primaryColor) ? theme.primaryColor : "#FF1F45",
      secondaryColor: typeof theme.secondaryColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(theme.secondaryColor) ? theme.secondaryColor : "#0088ff",
      backgroundColor: typeof theme.backgroundColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(theme.backgroundColor) ? theme.backgroundColor : "#050505",
      textColor: typeof theme.textColor === "string" && /^#[0-9A-Fa-f]{6}$/.test(theme.textColor) ? theme.textColor : "#ffffff",
      fontFamily: typeof theme.fontFamily === "string" && theme.fontFamily.trim() !== "" ? theme.fontFamily.trim() : "Inter",
      borderRadius: typeof theme.borderRadius === "string" && theme.borderRadius.trim() !== "" ? theme.borderRadius.trim() : "0.625rem",
    },
    features: {
      enableECommerce: typeof features.enableECommerce === "boolean" ? features.enableECommerce : true,
      enableRentals: typeof features.enableRentals === "boolean" ? features.enableRentals : true,
      enableServiceRequests: typeof features.enableServiceRequests === "boolean" ? features.enableServiceRequests : true,
      enableCustomBuilder: typeof features.enableCustomBuilder === "boolean" ? features.enableCustomBuilder : true,
      enableBookingCalendar: typeof features.enableBookingCalendar === "boolean" ? features.enableBookingCalendar : false,
    },
    homepageLayout: homepageLayout.map((item: any, idx: number) => ({
      sectionId: typeof item?.sectionId === "string" && item.sectionId.trim() !== "" ? item.sectionId.trim() : `section-${idx}`,
      enabled: typeof item?.enabled === "boolean" ? item.enabled : true,
      displayOrder: typeof item?.displayOrder === "number" ? item.displayOrder : idx,
      props: item?.props && typeof item.props === "object" ? item.props : {},
    })),
  };
}
