export type ServiceIcon = "scan" | "calendar" | "shield" | "cog" | "battery" | "wind";

/** Built-in homepage sections the owner can show/hide and reorder. */
export type BuiltInSectionId =
  | "hero"
  | "trustBar"
  | "services"
  | "howItWorks"
  | "about"
  | "testimonials"
  | "cta";

export type SectionAlign = "left" | "center" | "right";

export type PageSectionEntry = {
  /** Built-in id, or `custom:<id>` for owner-created blocks. */
  id: string;
  enabled: boolean;
  align: SectionAlign;
};

export type CustomBlock = {
  id: string;
  title: string;
  body: string;
  imageUrl: string;
  buttonText: string;
  buttonHref: string;
};

/** Places that can show their own logo instead of the default one. */
export type SiteLogoSlot =
  | "header"
  | "footer"
  | "dashboard"
  | "staffLogin"
  | "customerPortal"
  | "documents";

export type SiteLogoSet = Record<SiteLogoSlot, string>;

/** Logo display size per place, as a percentage of the built-in size. */
export type SiteLogoScaleSet = Record<SiteLogoSlot, number>;

export const MIN_LOGO_SCALE = 50;
export const MAX_LOGO_SCALE = 250;

export const SITE_LOGO_SLOTS: { id: SiteLogoSlot; label: string; hint: string }[] = [
  { id: "header", label: "Website header", hint: "Top of every public page." },
  { id: "footer", label: "Website footer", hint: "Bottom of every public page." },
  { id: "dashboard", label: "Dashboard sidebar", hint: "Staff dashboard navigation." },
  { id: "staffLogin", label: "Staff login screens", hint: "Staff, mechanic, and dispatcher sign-in." },
  { id: "customerPortal", label: "Customer portal", hint: "Client sign-in, registration, and portal header." },
  { id: "documents", label: "Work order & estimate documents", hint: "Printed and shared document letterhead." },
];

export type SiteContent = {
  /** Homepage section order, visibility, and alignment. */
  pageLayout: {
    sections: PageSectionEntry[];
  };
  /** Extra sections the owner adds to the homepage. */
  customBlocks: CustomBlock[];
  site: {
    name: string;
    tagline: string;
    description: string;
    phone: string;
    email: string;
    address: string;
    serviceArea: string;
    hours: { days: string; time: string }[];
  };
  hero: {
    eyebrow: string;
    title: string;
    titleHighlight: string;
    description: string;
    bullets: string[];
    imageCaption: string;
    imageSubcaption: string;
    imageAlt: string;
  };
  trustBar: { label: string; detail: string }[];
  services: { id: string; title: string; description: string; icon: ServiceIcon }[];
  whyUs: { title: string; text: string }[];
  testimonials: { quote: string; name: string; location: string }[];
  howItWorks: { step: string; title: string; text: string }[];
  cta: { title: string; description: string; buttonText: string };
  serviceOptions: string[];
  images: {
    logo: string;
    favicon: string;
    /** Per-place overrides. Empty means "use the default logo". */
    logos: SiteLogoSet;
    /** Per-place display size, 100 = the built-in size. */
    logoScales: SiteLogoScaleSet;
    hero: string;
    about: string;
    services: string;
    contact: string;
  };
  pages: {
    contactTitle: string;
    contactSubtitle: string;
    sidebarDetailsTitle: string;
    sidebarWhyTitle: string;
    phoneLabel: string;
    emailLabel: string;
    locationLabel: string;
    hoursLabel: string;
    form: {
      submitText: string;
      successTitle: string;
      successMessage: string;
      footerNote: string;
    };
  };
  about: {
    label: string;
    title: string;
    subtitle: string;
    paragraph1: string;
    paragraph2: string;
    badgeValue: string;
    badgeLabel: string;
    imageAlt: string;
    anchorId: string;
  };
  sections: {
    services: { label: string; title: string; subtitle: string; bannerText: string; anchorId: string };
    howItWorks: { label: string; title: string; subtitle: string; anchorId: string };
    testimonials: { label: string; title: string; subtitle: string; anchorId: string };
  };
  header: {
    nav: { href: string; label: string }[];
    callButtonText: string;
    portalButtonText: string;
    quoteButtonText: string;
  };
  footer: {
    privacyLabel: string;
    termsLabel: string;
    contactLabel: string;
    staffLoginLabel: string;
  };
};

export const DEFAULT_PAGE_SECTIONS: PageSectionEntry[] = [
  { id: "hero", enabled: true, align: "left" },
  { id: "trustBar", enabled: true, align: "center" },
  { id: "services", enabled: true, align: "left" },
  { id: "howItWorks", enabled: true, align: "left" },
  { id: "about", enabled: true, align: "left" },
  { id: "testimonials", enabled: true, align: "left" },
  { id: "cta", enabled: true, align: "left" },
];

export const BUILT_IN_SECTION_LABELS: Record<BuiltInSectionId, string> = {
  hero: "Hero",
  trustBar: "Trust bar",
  services: "Services",
  howItWorks: "How it works",
  about: "About",
  testimonials: "Reviews",
  cta: "Call to action",
};

export const DEFAULT_CONTENT: SiteContent = {
  pageLayout: {
    sections: DEFAULT_PAGE_SECTIONS.map((s) => ({ ...s })),
  },
  customBlocks: [],
  site: {
    name: "Morton's Mechanical",
    tagline: "Mobile mechanic services — we come to you.",
    description:
      "Professional mobile auto repair and maintenance. Upfront quotes, quality parts, and honest work at your home, office, or roadside.",
    phone: "(555) 123-4567",
    email: "bookings@mortonsmechanical.com",
    address: "Greater Metro Area — mobile service",
    serviceArea: "We travel to you within a 40-mile radius.",
    hours: [
      { days: "Mon – Fri", time: "7:30am – 5:30pm" },
      { days: "Saturday", time: "8:00am – 12:00pm" },
      { days: "Sunday", time: "Closed" },
    ],
  },
  hero: {
    eyebrow: "Professional mobile auto repair",
    title: "Expert care,",
    titleHighlight: "wherever you are",
    description:
      "Mobile mechanic services — we come to you. Skip the tow truck — diagnostics, maintenance, and repairs at your home, office, or roadside.",
    bullets: [
      "Same-day quote responses",
      "Upfront pricing, no surprises",
      "12-month workmanship warranty",
    ],
    imageCaption: "Fully equipped mobile workshop",
    imageSubcaption: "We travel to you within a 40-mile radius.",
    imageAlt: "Mechanic performing engine diagnostics on a vehicle",
  },
  trustBar: [
    { label: "Mobile service", detail: "We travel to you" },
    { label: "Same-day quotes", detail: "Fast response" },
    { label: "12-month warranty", detail: "On our labour" },
    { label: "All makes & models", detail: "Full diagnostics" },
  ],
  services: [
    { id: "diagnostics", title: "Diagnostics", description: "Check-engine lights, fault codes, and electrical issues diagnosed on-site with modern scan tools.", icon: "scan" },
    { id: "maintenance", title: "Scheduled maintenance", description: "Logbook services, oil changes, filters, and fluid top-ups without losing your day at a workshop.", icon: "calendar" },
    { id: "brakes", title: "Brakes & safety", description: "Pads, rotors, brake fluid, and safety inspections — because stopping matters as much as going.", icon: "shield" },
    { id: "engine", title: "Engine & drivetrain", description: "Repairs, belt replacements, cooling system work, and drivetrain issues handled at your location.", icon: "cog" },
    { id: "battery", title: "Battery & charging", description: "Dead battery? Alternator trouble? We test, replace, and get you started again on the spot.", icon: "battery" },
    { id: "ac", title: "A/C & comfort", description: "Air conditioning regas, leak checks, and climate repairs so every drive stays comfortable.", icon: "wind" },
  ],
  whyUs: [
    { title: "Upfront quotes", text: "Clear pricing before any work begins — no surprise invoices." },
    { title: "Quality parts", text: "OEM and premium aftermarket parts, never cheap shortcuts." },
    { title: "Workmanship warranty", text: "12-month warranty on labour for your peace of mind." },
    { title: "Same-day response", text: "We aim to confirm bookings within business hours the same day." },
  ],
  testimonials: [
    { quote: "Car wouldn't start in my driveway and I didn't have time for a tow. Morton came out the same day, figured it out fast, and had me back on the road.", name: "Sarah M.", location: "Home visit" },
    { quote: "Another shop quoted me a ridiculous amount without explaining anything. Morton found the real issue quickly. Honest work, fair price.", name: "David K.", location: "Office car park" },
    { quote: "Showed up when they said they would, diagnosed the problem quickly, and fixed it right there. Just solid, professional service.", name: "James T.", location: "Roadside assist" },
  ],
  howItWorks: [
    { step: "01", title: "Tell us what you need", text: "Request a quote online or call us. Share your location, vehicle, and what's going wrong." },
    { step: "02", title: "We come to you", text: "A qualified mechanic arrives at your home, workplace, or roadside with the right tools and parts." },
    { step: "03", title: "Back on the road", text: "Work is done on-site with upfront pricing. Most jobs finished in a single visit." },
  ],
  cta: {
    title: "Ready to get back on the road?",
    description: "Tell us what's going on. We'll reply the same business day with a quote and availability.",
    buttonText: "Request a free quote",
  },
  serviceOptions: [
    "Oil change", "Engine repair", "Brake service", "Tyre replacement",
    "Diagnostics", "Scheduled maintenance", "Battery / starter", "A/C repair", "Other",
  ],
  images: {
    logo: "/logo.png",
    favicon: "/favicon.ico",
    logos: {
      header: "",
      footer: "",
      dashboard: "",
      staffLogin: "",
      customerPortal: "",
      documents: "",
    },
    logoScales: {
      header: 100,
      footer: 100,
      dashboard: 100,
      staffLogin: 100,
      customerPortal: 100,
      documents: 100,
    },
    hero: "https://images.unsplash.com/photo-1486262715619-67b85e0b08d3?auto=format&fit=crop&w=1600&q=80",
    about: "https://images.unsplash.com/photo-1625047509248-ec889cbff17f?auto=format&fit=crop&w=1200&q=80",
    services: "https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?auto=format&fit=crop&w=1600&q=80",
    contact: "https://images.unsplash.com/photo-1492144534655-ae79c964c9d7?auto=format&fit=crop&w=1600&q=80",
  },
  pages: {
    contactTitle: "Request a Quote",
    contactSubtitle: "Fill out the form and our service advisor will contact you the same day.",
    sidebarDetailsTitle: "Contact details",
    sidebarWhyTitle: "Why book with us",
    phoneLabel: "Phone",
    emailLabel: "Email",
    locationLabel: "Location",
    hoursLabel: "Hours",
    form: {
      submitText: "Submit Quote",
      successTitle: "Request received",
      successMessage: "Thanks — we'll contact you the same business day to confirm details and provide a quote.",
      footerNote: "We aim to confirm bookings within business hours the same day.",
    },
  },
  about: {
    label: "Who we are",
    title: "About Morton's",
    subtitle: "Honest work, clear communication, and service that fits your schedule.",
    paragraph1:
      "Morton's Mechanicals was founded on a simple idea: car trouble shouldn't wreck your whole day. Our mobile mechanics bring skilled, transparent service directly to you.",
    paragraph2:
      "Whether it's a check-engine light, a brake job in your driveway, or an emergency breakdown — we treat every job like it matters, because it does.",
    badgeValue: "12 mo",
    badgeLabel: "Workmanship warranty",
    imageAlt: "Mobile mechanic working on a vehicle at a customer's location",
    anchorId: "about",
  },
  sections: {
    services: {
      label: "What we do",
      title: "Services",
      subtitle: "From routine maintenance to complex diagnostics — one team, one visit.",
      bannerText: "Quality parts, modern diagnostics, and experienced mechanics — delivered to your driveway.",
      anchorId: "services",
    },
    howItWorks: {
      label: "Simple process",
      title: "How it works",
      subtitle: "Three steps. No workshop visit required.",
      anchorId: "how-it-works",
    },
    testimonials: {
      label: "Customer stories",
      title: "Reviews",
      subtitle: "Real feedback from drivers we've helped.",
      anchorId: "reviews",
    },
  },
  header: {
    nav: [
      { href: "/#services", label: "Services" },
      { href: "/#about", label: "About" },
      { href: "/#reviews", label: "Reviews" },
    ],
    callButtonText: "Call Now",
    portalButtonText: "Portal",
    quoteButtonText: "Request Quote",
  },
  footer: {
    privacyLabel: "Privacy",
    termsLabel: "Terms",
    contactLabel: "Contact",
    staffLoginLabel: "Portal",
  },
};

export function phoneHref(phone: string) {
  const digits = phone.replace(/\D/g, "");
  return digits ? `tel:+${digits.startsWith("1") ? digits : "1" + digits}` : "tel:";
}

export function emailHref(email: string) {
  return `mailto:${email}`;
}

/** Logo for one place, falling back to the default logo then the bundled file. */
export function logoFor(images: SiteContent["images"], slot: SiteLogoSlot) {
  return images.logos?.[slot]?.trim() || images.logo?.trim() || DEFAULT_CONTENT.images.logo;
}

export function logoSet(images: SiteContent["images"]): SiteLogoSet {
  return {
    header: logoFor(images, "header"),
    footer: logoFor(images, "footer"),
    dashboard: logoFor(images, "dashboard"),
    staffLogin: logoFor(images, "staffLogin"),
    customerPortal: logoFor(images, "customerPortal"),
    documents: logoFor(images, "documents"),
  };
}

export function logoScaleFor(images: SiteContent["images"], slot: SiteLogoSlot) {
  const raw = Number(images.logoScales?.[slot]);
  if (!Number.isFinite(raw) || raw <= 0) return 100;
  return Math.min(MAX_LOGO_SCALE, Math.max(MIN_LOGO_SCALE, Math.round(raw)));
}

export function logoScaleSet(images: SiteContent["images"]): SiteLogoScaleSet {
  return {
    header: logoScaleFor(images, "header"),
    footer: logoScaleFor(images, "footer"),
    dashboard: logoScaleFor(images, "dashboard"),
    staffLogin: logoScaleFor(images, "staffLogin"),
    customerPortal: logoScaleFor(images, "customerPortal"),
    documents: logoScaleFor(images, "documents"),
  };
}

/** Applies a logo scale to a built-in pixel size. */
export function scaledLogoSize(base: number, scale = 100) {
  const pct = Number.isFinite(scale) && scale > 0 ? scale : 100;
  return Math.round((base * Math.min(MAX_LOGO_SCALE, Math.max(MIN_LOGO_SCALE, pct))) / 100);
}
