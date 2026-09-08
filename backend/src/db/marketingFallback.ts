import { mkdir, readFile, rename, writeFile } from "fs/promises";
import { randomUUID } from "crypto";
import path from "path";

export type MarketingCampaign = {
  id: string;
  name: string;
  platform: string;
  channel: string;
  objective: string;
  status: "ACTIVE" | "PAUSED" | "COMPLETED";
  budget: number;
  spend: number;
  impressions: number;
  clicks: number;
  conversions: number;
  roas: number;
  target_audience?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  created_at: string;
  updated_at: string;
};

export type MarketingCreative = {
  id: string;
  campaign_id?: string | null;
  title: string;
  format: "Video" | "Carousel" | "Single Image" | "Story";
  headline: string;
  primary_text: string;
  cta: string;
  ctr: number;
  conversion_rate: number;
  preview_badge: string;
  status: "ACTIVE" | "PAUSED";
  created_at: string;
};

export type MarketingLead = {
  id: string;
  campaign_name: string;
  platform: string;
  lead_name: string;
  company: string;
  email: string;
  phone: string;
  quality_score: "HOT" | "HIGH_INTENT" | "WARM";
  status: "NEW" | "QUALIFIED" | "SYNCED";
  synced_to_crm: boolean;
  created_at: string;
};

export type MarketingClient = {
  id: string;
  name: string;
  industry: string;
  contact_name: string;
  contact_email: string;
  monthly_retainer: number;
  status: "ACTIVE" | "ONBOARDING" | "PAUSED";
  website?: string;
  created_at: string;
};

export type MarketingClientProject = {
  id: string;
  client_id: string;
  client_name: string;
  title: string;
  category: "Paid Search" | "Paid Social" | "SEO & Content" | "Brand & Creative" | "Email & CRM";
  budget: number;
  spend: number;
  target_roas: number;
  current_roas: number;
  status: "PLANNING" | "IN_PROGRESS" | "IN_REVIEW" | "ACTIVE" | "COMPLETED";
  deadline: string;
  deliverables: string;
  created_at: string;
};

export type MarketingClientAsset = {
  id: string;
  client_id: string;
  client_name: string;
  project_id?: string | null;
  project_title?: string | null;
  name: string;
  asset_type: "Ad Creative" | "Video Script" | "Copywriting" | "Brand Asset" | "Landing Page" | "Report";
  file_format: "Figma" | "Video / MP4" | "Graphic / PNG" | "PDF" | "Drive / Doc";
  asset_url: string;
  status: "APPROVED" | "IN_REVIEW" | "NEEDS_REVISION" | "DRAFT";
  version: string;
  notes?: string;
  created_at: string;
};

type FallbackMarketingStore = {
  campaigns: MarketingCampaign[];
  creatives: MarketingCreative[];
  leads: MarketingLead[];
  clients: MarketingClient[];
  projects: MarketingClientProject[];
  assets: MarketingClientAsset[];
};

const initialCampaigns: MarketingCampaign[] = [
  {
    id: "mkt-camp-001",
    name: "Enterprise ERP Search Acquisition",
    platform: "Google Ads",
    channel: "Search Intent",
    objective: "LEAD_GENERATION",
    status: "ACTIVE",
    budget: 15000,
    spend: 12450,
    impressions: 84200,
    clicks: 4120,
    conversions: 384,
    roas: 5.42,
    target_audience: "CTOs, CFOs, VPs of Operations in Manufacturing & Retail (US/IN)",
    start_date: "2026-08-01",
    end_date: "2026-09-30",
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "mkt-camp-002",
    name: "High-Intent Retargeting & Brand Uplift",
    platform: "Meta Ads",
    channel: "Instagram & FB",
    objective: "CONVERSIONS",
    status: "ACTIVE",
    budget: 10000,
    spend: 8420,
    impressions: 192000,
    clicks: 6240,
    conversions: 265,
    roas: 4.25,
    target_audience: "Website Visitors (Past 60d), Pricing Page Dropped-off Users",
    start_date: "2026-08-10",
    end_date: "2026-09-25",
    created_at: new Date(Date.now() - 22 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "mkt-camp-003",
    name: "C-Suite & Tech Leadership InMail Suite",
    platform: "LinkedIn Ads",
    channel: "Sponsored InMail & Feed",
    objective: "LEAD_GENERATION",
    status: "ACTIVE",
    budget: 12000,
    spend: 9680,
    impressions: 38500,
    clicks: 1940,
    conversions: 218,
    roas: 6.18,
    target_audience: "Founders, Managing Directors, Tech Heads, Company size 50-500",
    start_date: "2026-08-15",
    end_date: "2026-10-15",
    created_at: new Date(Date.now() - 18 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "mkt-camp-004",
    name: "Next-Gen Cloud Architecture 2026 Showcase",
    platform: "YouTube Ads",
    channel: "TrueView In-Stream",
    objective: "BRAND_AWARENESS",
    status: "ACTIVE",
    budget: 8000,
    spend: 5620,
    impressions: 310000,
    clicks: 7450,
    conversions: 142,
    roas: 3.84,
    target_audience: "Tech Enthusiasts, Cloud Architects, Software Engineering Leaders",
    start_date: "2026-08-20",
    end_date: "2026-09-30",
    created_at: new Date(Date.now() - 14 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: "mkt-camp-005",
    name: "Executive Summit & VIP Demo Registration",
    platform: "Google Ads",
    channel: "Performance Max",
    objective: "CONVERSIONS",
    status: "PAUSED",
    budget: 6000,
    spend: 6000,
    impressions: 98000,
    clicks: 3410,
    conversions: 113,
    roas: 4.60,
    target_audience: "Enterprise Decision Makers seeking Next-Gen ERP Migration",
    start_date: "2026-07-15",
    end_date: "2026-08-30",
    created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
    updated_at: new Date().toISOString(),
  },
];

const initialCreatives: MarketingCreative[] = [
  {
    id: "mkt-cr-001",
    campaign_id: "mkt-camp-001",
    title: "10x Faster Invoicing Engine Visual",
    format: "Single Image",
    headline: "Stop Wasting 15 Hours Weekly on Legacy ERP Invoicing",
    primary_text: "Discover ZootechX.ai: Automated GST compliance, real-time developer metrics, and instant payment reconciliation.",
    cta: "Book Executive Demo",
    ctr: 5.12,
    conversion_rate: 8.85,
    preview_badge: "Top Performer",
    status: "ACTIVE",
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: "mkt-cr-002",
    campaign_id: "mkt-camp-002",
    title: "Dark Mode Executive Dashboard Teaser",
    format: "Video",
    headline: "The Luxury Command Center Your Business Deserves",
    primary_text: "Experience frictionless client pipeline visibility with aerospace-grade telemetry and instant Neon Postgres cloud sync.",
    cta: "Explore Live Tour",
    ctr: 4.82,
    conversion_rate: 7.64,
    preview_badge: "Viral Hook",
    status: "ACTIVE",
    created_at: new Date(Date.now() - 16 * 86400000).toISOString(),
  },
  {
    id: "mkt-cr-003",
    campaign_id: "mkt-camp-003",
    title: "C-Suite Case Study Carousel",
    format: "Carousel",
    headline: "How 120+ Enterprises Cut Closing Times by 40%",
    primary_text: "Swipe through verified transformation metrics from Northstar Ventures, Cedar & Co., and Atlas Retail.",
    cta: "Read Case Study",
    ctr: 6.45,
    conversion_rate: 9.30,
    preview_badge: "Highest ROAS",
    status: "ACTIVE",
    created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
  },
  {
    id: "mkt-cr-004",
    campaign_id: "mkt-camp-004",
    title: "Engineering Speed Benchmark 60s Reel",
    format: "Story",
    headline: "From Quotation to GST Invoice in Under 60 Seconds",
    primary_text: "Watch our product lead create, audit, and dispatch an enterprise GST quotation in real-time.",
    cta: "Start 14-Day Pilot",
    ctr: 3.95,
    conversion_rate: 5.40,
    preview_badge: "Scaling Fast",
    status: "ACTIVE",
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
];

const initialLeads: MarketingLead[] = [
  {
    id: "mkt-lead-001",
    campaign_name: "Enterprise ERP Search Acquisition",
    platform: "Google Ads",
    lead_name: "Vikram Singhania",
    company: "Singhania Logistics Corp",
    email: "vikram.s@singhanialogistics.com",
    phone: "+91 98200 44102",
    quality_score: "HOT",
    status: "NEW",
    synced_to_crm: false,
    created_at: new Date(Date.now() - 2 * 3600000).toISOString(),
  },
  {
    id: "mkt-lead-002",
    campaign_name: "C-Suite & Tech Leadership InMail Suite",
    platform: "LinkedIn Ads",
    lead_name: "Elena Rostova",
    company: "Apex Global FinTech",
    email: "elena.rostova@apexfintech.io",
    phone: "+1 415 890 2314",
    quality_score: "HOT",
    status: "QUALIFIED",
    synced_to_crm: false,
    created_at: new Date(Date.now() - 6 * 3600000).toISOString(),
  },
  {
    id: "mkt-lead-003",
    campaign_name: "High-Intent Retargeting & Brand Uplift",
    platform: "Meta Ads",
    lead_name: "Rahul Kothari",
    company: "Kothari Infra Build",
    email: "rahul@kothari-infra.com",
    phone: "+91 99301 88204",
    quality_score: "HIGH_INTENT",
    status: "NEW",
    synced_to_crm: false,
    created_at: new Date(Date.now() - 14 * 3600000).toISOString(),
  },
  {
    id: "mkt-lead-004",
    campaign_name: "Enterprise ERP Search Acquisition",
    platform: "Google Ads",
    lead_name: "Pooja Deshmukh",
    company: "Nova Pharma Tech",
    email: "pooja.d@novapharma.in",
    phone: "+91 97654 32190",
    quality_score: "HIGH_INTENT",
    status: "NEW",
    synced_to_crm: false,
    created_at: new Date(Date.now() - 26 * 3600000).toISOString(),
  },
  {
    id: "mkt-lead-005",
    campaign_name: "Next-Gen Cloud Architecture 2026 Showcase",
    platform: "YouTube Ads",
    lead_name: "Arthur Pendelton",
    company: "Vanguard Systems UK",
    email: "arthur.p@vanguardsys.co.uk",
    phone: "+44 20 7946 0912",
    quality_score: "WARM",
    status: "NEW",
    synced_to_crm: false,
    created_at: new Date(Date.now() - 38 * 3600000).toISOString(),
  },
];

const initialClients: MarketingClient[] = [
  {
    id: "client-001",
    name: "Apex Global Logistics",
    industry: "Supply Chain & Freight",
    contact_name: "Elena Rostova",
    contact_email: "elena.rostova@apexlogistics.io",
    monthly_retainer: 12500,
    status: "ACTIVE",
    website: "https://apexlogistics.io",
    created_at: new Date(Date.now() - 45 * 86400000).toISOString(),
  },
  {
    id: "client-002",
    name: "Zenith Health Systems",
    industry: "Healthcare & MedTech",
    contact_name: "Dr. Marcus Vance",
    contact_email: "m.vance@zenithhealth.org",
    monthly_retainer: 9800,
    status: "ACTIVE",
    website: "https://zenithhealth.org",
    created_at: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: "client-003",
    name: "Aura Retail Collective",
    industry: "Luxury Apparel & D2C",
    contact_name: "Camille Dupont",
    contact_email: "camille@auraretail.com",
    monthly_retainer: 15000,
    status: "ACTIVE",
    website: "https://auraretail.com",
    created_at: new Date(Date.now() - 20 * 86400000).toISOString(),
  },
  {
    id: "client-004",
    name: "Solstice AI Enterprise",
    industry: "B2B SaaS & Cloud",
    contact_name: "Karan Singhania",
    contact_email: "karan@solsticecloud.ai",
    monthly_retainer: 18000,
    status: "ONBOARDING",
    website: "https://solsticecloud.ai",
    created_at: new Date(Date.now() - 5 * 86400000).toISOString(),
  },
];

const initialProjects: MarketingClientProject[] = [
  {
    id: "proj-001",
    client_id: "client-001",
    client_name: "Apex Global Logistics",
    title: "Q4 Enterprise Search & PMax Scale",
    category: "Paid Search",
    budget: 25000,
    spend: 18400,
    target_roas: 5.5,
    current_roas: 5.82,
    status: "ACTIVE",
    deadline: "2026-11-30",
    deliverables: "High-intent search ad groups, Conversions API audit, weekly pacing reports",
    created_at: new Date(Date.now() - 25 * 86400000).toISOString(),
  },
  {
    id: "proj-002",
    client_id: "client-002",
    client_name: "Zenith Health Systems",
    title: "National Clinic Patient Acquisition",
    category: "Paid Social",
    budget: 14000,
    spend: 9200,
    target_roas: 4.2,
    current_roas: 4.6,
    status: "IN_PROGRESS",
    deadline: "2026-10-15",
    deliverables: "Geotargeted Meta reels, localized HIPAA-compliant landing pages",
    created_at: new Date(Date.now() - 18 * 86400000).toISOString(),
  },
  {
    id: "proj-003",
    client_id: "client-003",
    client_name: "Aura Retail Collective",
    title: "Black Friday Creative Sprint & Retargeting",
    category: "Brand & Creative",
    budget: 32000,
    spend: 12100,
    target_roas: 6.0,
    current_roas: 6.34,
    status: "ACTIVE",
    deadline: "2026-11-28",
    deliverables: "16 UGC video variations, dynamic carousel catalog ads, influencer whitelisting",
    created_at: new Date(Date.now() - 12 * 86400000).toISOString(),
  },
  {
    id: "proj-004",
    client_id: "client-004",
    client_name: "Solstice AI Enterprise",
    title: "C-Suite ABM Thought Leadership & InMail",
    category: "Paid Social",
    budget: 20000,
    spend: 4500,
    target_roas: 4.8,
    current_roas: 4.9,
    status: "PLANNING",
    deadline: "2026-12-15",
    deliverables: "Target account list build, executive InMail sequences, gated benchmark report",
    created_at: new Date(Date.now() - 4 * 86400000).toISOString(),
  },
];

const initialAssets: MarketingClientAsset[] = [
  {
    id: "asset-001",
    client_id: "client-001",
    client_name: "Apex Global Logistics",
    project_id: "proj-001",
    project_title: "Q4 Enterprise Search & PMax Scale",
    name: "Apex Enterprise Ad Copy Matrix v2",
    asset_type: "Copywriting",
    file_format: "Drive / Doc",
    asset_url: "https://docs.google.com/document/d/1apex-ad-matrix",
    status: "APPROVED",
    version: "v2.1",
    notes: "Approved by Elena for US & European freight campaigns.",
    created_at: new Date(Date.now() - 15 * 86400000).toISOString(),
  },
  {
    id: "asset-002",
    client_id: "client-002",
    client_name: "Zenith Health Systems",
    project_id: "proj-002",
    project_title: "National Clinic Patient Acquisition",
    name: "Doctor Trust 30s Video Ad Hook Script",
    asset_type: "Video Script",
    file_format: "Video / MP4",
    asset_url: "https://drive.google.com/file/d/zenith-video-hook",
    status: "APPROVED",
    version: "v1.4",
    notes: "Clinical board approved hook addressing rapid telemedicine bookings.",
    created_at: new Date(Date.now() - 10 * 86400000).toISOString(),
  },
  {
    id: "asset-003",
    client_id: "client-003",
    client_name: "Aura Retail Collective",
    project_id: "proj-003",
    project_title: "Black Friday Creative Sprint & Retargeting",
    name: "High-ROAS Story & Reel Motion Creatives",
    asset_type: "Ad Creative",
    file_format: "Figma",
    asset_url: "https://www.figma.com/file/aura-blackfriday-assets",
    status: "IN_REVIEW",
    version: "v3.0",
    notes: "Uploaded 8 variations for Camille's design review before cut-off.",
    created_at: new Date(Date.now() - 3 * 86400000).toISOString(),
  },
  {
    id: "asset-004",
    client_id: "client-004",
    client_name: "Solstice AI Enterprise",
    project_id: "proj-004",
    project_title: "C-Suite ABM Thought Leadership & InMail",
    name: "Enterprise Cloud AI Benchmark PDF Report",
    asset_type: "Brand Asset",
    file_format: "PDF",
    asset_url: "https://assets.solsticecloud.ai/reports/cloud-ai-2026.pdf",
    status: "APPROVED",
    version: "v1.0",
    notes: "Gated PDF whitepaper for LinkedIn sponsored content.",
    created_at: new Date(Date.now() - 2 * 86400000).toISOString(),
  },
];

import os from "os";

const runtimeDir = process.env.VERCEL ? path.join(os.tmpdir(), "zootechx_runtime") : path.join(process.cwd(), ".runtime");
const storePath = path.join(runtimeDir, "marketing-fallback.json");

const emptyStore = (): FallbackMarketingStore => ({
  campaigns: [...initialCampaigns],
  creatives: [...initialCreatives],
  leads: [...initialLeads],
  clients: [...initialClients],
  projects: [...initialProjects],
  assets: [...initialAssets],
});

let memoryCache: FallbackMarketingStore | null = null;

async function readStore(): Promise<FallbackMarketingStore> {
  try {
    const raw = await readFile(storePath, "utf8");
    const data = JSON.parse(raw) as Partial<FallbackMarketingStore>;
    const loaded: FallbackMarketingStore = {
      campaigns: Array.isArray(data.campaigns) ? data.campaigns : [...initialCampaigns],
      creatives: Array.isArray(data.creatives) ? data.creatives : [...initialCreatives],
      leads: Array.isArray(data.leads) ? data.leads : [...initialLeads],
      clients: Array.isArray(data.clients) ? data.clients : [...initialClients],
      projects: Array.isArray(data.projects) ? data.projects : [...initialProjects],
      assets: Array.isArray(data.assets) ? data.assets : [...initialAssets],
    };
    memoryCache = loaded;
    return loaded;
  } catch {
    if (memoryCache) return memoryCache;
    try {
      const defaultPath = path.join(__dirname, "default_data", "marketing-fallback.json");
      const defaultRaw = await readFile(defaultPath, "utf8");
      const defaultData = JSON.parse(defaultRaw) as FallbackMarketingStore;
      memoryCache = defaultData;
      await saveStore(defaultData).catch(() => {});
      return defaultData;
    } catch {}
    const initial = emptyStore();
    try {
      await saveStore(initial);
    } catch {}
    memoryCache = initial;
    return initial;
  }
}

async function saveStore(store: FallbackMarketingStore): Promise<void> {
  memoryCache = store;
  try {
    await mkdir(runtimeDir, { recursive: true });
    const temporary = `${storePath}.tmp`;
    await writeFile(temporary, JSON.stringify(store, null, 2), "utf8");
    await rename(temporary, storePath);
  } catch (err) {
    console.warn("Unable to persist marketing store to disk:", err);
  }
}

export async function getMarketingOverview() {
  const store = await readStore();
  const totalSpend = store.campaigns.reduce((sum, c) => sum + Number(c.spend), 0);
  const totalBudget = store.campaigns.reduce((sum, c) => sum + Number(c.budget), 0);
  const totalClicks = store.campaigns.reduce((sum, c) => sum + Number(c.clicks), 0);
  const totalImpressions = store.campaigns.reduce((sum, c) => sum + Number(c.impressions), 0);
  const totalConversions = store.campaigns.reduce((sum, c) => sum + Number(c.conversions), 0);

  // Attributed revenue calculation based on campaign ROAS * spend
  const attributedRevenue = store.campaigns.reduce(
    (sum, c) => sum + Number(c.spend) * Number(c.roas),
    0
  );
  const blendedRoas = totalSpend > 0 ? Number((attributedRevenue / totalSpend).toFixed(2)) : 0;
  const avgCtr = totalImpressions > 0 ? Number(((totalClicks / totalImpressions) * 100).toFixed(2)) : 0;
  const avgCpa = totalConversions > 0 ? Number((totalSpend / totalConversions).toFixed(2)) : 0;

  const channelDistribution = [
    { name: "Google Ads", spend: 18450, revenue: 95400, roas: 5.17, conversions: 497, color: "#4285F4" },
    { name: "LinkedIn Ads", spend: 9680, revenue: 59822, roas: 6.18, conversions: 218, color: "#0A66C2" },
    { name: "Meta Ads", spend: 8420, revenue: 35785, roas: 4.25, conversions: 265, color: "#E1306C" },
    { name: "YouTube Ads", spend: 5620, revenue: 21580, roas: 3.84, conversions: 142, color: "#FF0000" },
  ];

  const monthlyTrends = [
    { month: "Apr 2026", spend: 28000, revenue: 118000, roas: 4.21, leads: 620 },
    { month: "May 2026", spend: 32500, revenue: 146000, roas: 4.49, leads: 740 },
    { month: "Jun 2026", spend: 36000, revenue: 168000, roas: 4.66, leads: 860 },
    { month: "Jul 2026", spend: 39500, revenue: 189000, roas: 4.78, leads: 990 },
    { month: "Aug 2026", spend: 42170, revenue: 206450, roas: 4.89, leads: 1122 },
    { month: "Sep (Proj)", spend: 45000, revenue: 228000, roas: 5.06, leads: 1250 },
  ];

  const aiInsights = [
    {
      id: "ai-1",
      type: "SCALE_OPPORTUNITY",
      title: "Scale Google Search ERP Acquisition",
      description: "Search Intent ROAS hit 5.42x with a 4.89% CTR. Increasing daily spend by $250 is projected to yield 48 additional qualified enterprise MQLs.",
      impact: "+$24,000 Pipeline Value",
      priority: "HIGH",
    },
    {
      id: "ai-2",
      type: "CREATIVE_REFRESH",
      title: "Ad Fatigue Detected on Meta Video Ad #2",
      description: "Frequency reached 4.6 with a 1.2% dip in CTR over the last 4 days. Recommend cycling in the newly approved Carousel format.",
      impact: "-14% CPA Reduction",
      priority: "MEDIUM",
    },
    {
      id: "ai-3",
      type: "AUDIENCE_INSIGHT",
      title: "LinkedIn InMail High-Intent Conversion Surge",
      description: "Founders and CTOs in Manufacturing show a 9.30% landing page conversion rate—2.8x higher than industry average.",
      impact: "6.18x Peak ROAS",
      priority: "POSITIVE",
    },
  ];

  return {
    totalSpend,
    totalBudget,
    attributedRevenue: Math.round(attributedRevenue),
    blendedRoas,
    totalClicks,
    totalImpressions,
    avgCtr,
    avgCpa,
    totalConversions,
    activeCampaignCount: store.campaigns.filter((c) => c.status === "ACTIVE").length,
    channelDistribution,
    monthlyTrends,
    aiInsights,
  };
}

export async function listMarketingCampaigns(filter?: { platform?: string; status?: string; search?: string }) {
  const store = await readStore();
  let list = [...store.campaigns];
  if (filter?.platform && filter.platform !== "ALL") {
    list = list.filter((c) => c.platform.toLowerCase() === filter.platform!.toLowerCase());
  }
  if (filter?.status && filter.status !== "ALL") {
    list = list.filter((c) => c.status === filter.status);
  }
  if (filter?.search) {
    const query = filter.search.toLowerCase();
    list = list.filter((c) => c.name.toLowerCase().includes(query) || c.channel.toLowerCase().includes(query));
  }
  return list.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function createMarketingCampaign(data: {
  name: string;
  platform: string;
  channel: string;
  objective: string;
  budget: number;
  targetAudience?: string;
  startDate?: string;
  endDate?: string;
}) {
  const store = await readStore();
  const newCamp: MarketingCampaign = {
    id: `mkt-camp-${randomUUID().slice(0, 8)}`,
    name: data.name,
    platform: data.platform,
    channel: data.channel,
    objective: data.objective,
    status: "ACTIVE",
    budget: Number(data.budget),
    spend: 0,
    impressions: 0,
    clicks: 0,
    conversions: 0,
    roas: 0,
    target_audience: data.targetAudience ?? null,
    start_date: data.startDate ?? new Date().toISOString().split("T")[0],
    end_date: data.endDate ?? null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
  store.campaigns.unshift(newCamp);
  await saveStore(store);
  return newCamp;
}

export async function toggleMarketingCampaignStatus(id: string) {
  const store = await readStore();
  const campaign = store.campaigns.find((c) => c.id === id);
  if (!campaign) throw new Error("Campaign not found");
  campaign.status = campaign.status === "ACTIVE" ? "PAUSED" : "ACTIVE";
  campaign.updated_at = new Date().toISOString();
  await saveStore(store);
  return campaign;
}

export async function deleteMarketingCampaign(id: string) {
  const store = await readStore();
  const index = store.campaigns.findIndex((c) => c.id === id);
  if (index === -1) throw new Error("Campaign not found");
  store.campaigns.splice(index, 1);
  await saveStore(store);
  return true;
}

export async function listMarketingCreatives() {
  const store = await readStore();
  return [...store.creatives].sort((a, b) => b.ctr - a.ctr);
}

export async function createMarketingCreative(data: {
  campaignId?: string;
  title: string;
  format: "Video" | "Carousel" | "Single Image" | "Story";
  headline: string;
  primaryText: string;
  cta: string;
}) {
  const store = await readStore();
  const newCr: MarketingCreative = {
    id: `mkt-cr-${randomUUID().slice(0, 8)}`,
    campaign_id: data.campaignId ?? null,
    title: data.title,
    format: data.format,
    headline: data.headline,
    primary_text: data.primaryText,
    cta: data.cta,
    ctr: Number((Math.random() * 2 + 3.5).toFixed(2)),
    conversion_rate: Number((Math.random() * 3 + 5.5).toFixed(2)),
    preview_badge: "New Creative",
    status: "ACTIVE",
    created_at: new Date().toISOString(),
  };
  store.creatives.unshift(newCr);
  await saveStore(store);
  return newCr;
}

export async function listMarketingLeads() {
  const store = await readStore();
  return [...store.leads].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function markMarketingLeadSynced(id: string) {
  const store = await readStore();
  const lead = store.leads.find((l) => l.id === id);
  if (!lead) throw new Error("Marketing lead not found");
  lead.synced_to_crm = true;
  lead.status = "SYNCED";
  await saveStore(store);
  return lead;
}

export async function updateMarketingCampaign(id: string, updates: Partial<MarketingCampaign>) {
  const store = await readStore();
  const campaign = store.campaigns.find((c) => c.id === id);
  if (!campaign) throw new Error("Campaign not found");
  if (updates.name !== undefined) campaign.name = updates.name;
  if (updates.budget !== undefined) campaign.budget = Number(updates.budget);
  if (updates.status !== undefined) campaign.status = updates.status;
  if (updates.platform !== undefined) campaign.platform = updates.platform;
  if (updates.channel !== undefined) campaign.channel = updates.channel;
  if (updates.objective !== undefined) campaign.objective = updates.objective;
  if (updates.target_audience !== undefined) campaign.target_audience = updates.target_audience;
  campaign.updated_at = new Date().toISOString();
  await saveStore(store);
  return campaign;
}

export async function deleteMarketingCreative(id: string) {
  const store = await readStore();
  const index = store.creatives.findIndex((c) => c.id === id);
  if (index === -1) throw new Error("Creative not found");
  store.creatives.splice(index, 1);
  await saveStore(store);
  return true;
}

export async function getUnsyncedMarketingLeads() {
  const store = await readStore();
  return store.leads.filter((l) => !l.synced_to_crm);
}

// ==========================================
// CLIENT MANAGEMENT ENGINE
// ==========================================

// Client CRUD
export async function listMarketingClients() {
  const store = await readStore();
  return [...store.clients].sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function getMarketingClient(id: string) {
  const store = await readStore();
  const client = store.clients.find((c) => c.id === id);
  if (!client) throw new Error("Client not found");
  return client;
}

export async function addMarketingClient(input: Omit<MarketingClient, "id" | "created_at">) {
  const store = await readStore();
  const newClient: MarketingClient = {
    ...input,
    id: `client-${randomUUID().slice(0, 8)}`,
    created_at: new Date().toISOString(),
  };
  store.clients.unshift(newClient);
  await saveStore(store);
  return newClient;
}

export async function updateMarketingClient(id: string, updates: Partial<MarketingClient>) {
  const store = await readStore();
  const client = store.clients.find((c) => c.id === id);
  if (!client) throw new Error("Client not found");
  Object.assign(client, updates);
  // Update denormalized client_name in projects and assets
  if (updates.name) {
    store.projects.filter((p) => p.client_id === id).forEach((p) => (p.client_name = updates.name!));
    store.assets.filter((a) => a.client_id === id).forEach((a) => (a.client_name = updates.name!));
  }
  await saveStore(store);
  return client;
}

export async function deleteMarketingClient(id: string) {
  const store = await readStore();
  const idx = store.clients.findIndex((c) => c.id === id);
  if (idx === -1) throw new Error("Client not found");
  store.clients.splice(idx, 1);
  // Cascade delete projects & assets
  store.projects = store.projects.filter((p) => p.client_id !== id);
  store.assets = store.assets.filter((a) => a.client_id !== id);
  await saveStore(store);
  return true;
}

// Project CRUD
export async function listMarketingClientProjects(clientId?: string) {
  const store = await readStore();
  let list = [...store.projects];
  if (clientId) {
    list = list.filter((p) => p.client_id === clientId);
  }
  return list.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function addMarketingClientProject(input: {
  client_id: string;
  title: string;
  category: MarketingClientProject["category"];
  budget: number;
  target_roas?: number;
  deadline: string;
  deliverables?: string;
}) {
  const store = await readStore();
  const client = store.clients.find((c) => c.id === input.client_id);
  const clientName = client ? client.name : "Client Project";
  const newProj: MarketingClientProject = {
    id: `proj-${randomUUID().slice(0, 8)}`,
    client_id: input.client_id,
    client_name: clientName,
    title: input.title,
    category: input.category,
    budget: Number(input.budget),
    spend: 0,
    target_roas: input.target_roas ? Number(input.target_roas) : 5.0,
    current_roas: input.target_roas ? Number(input.target_roas) : 5.0,
    status: "IN_PROGRESS",
    deadline: input.deadline,
    deliverables: input.deliverables || "Standard campaign deliverables",
    created_at: new Date().toISOString(),
  };
  store.projects.unshift(newProj);
  await saveStore(store);
  return newProj;
}

export async function updateMarketingClientProject(id: string, updates: Partial<MarketingClientProject>) {
  const store = await readStore();
  const proj = store.projects.find((p) => p.id === id);
  if (!proj) throw new Error("Project not found");
  Object.assign(proj, updates);
  if (updates.title) {
    store.assets.filter((a) => a.project_id === id).forEach((a) => (a.project_title = updates.title!));
  }
  await saveStore(store);
  return proj;
}

export async function deleteMarketingClientProject(id: string) {
  const store = await readStore();
  const idx = store.projects.findIndex((p) => p.id === id);
  if (idx === -1) throw new Error("Project not found");
  store.projects.splice(idx, 1);
  await saveStore(store);
  return true;
}

// Asset CRUD
export async function listMarketingClientAssets(clientId?: string, projectId?: string) {
  const store = await readStore();
  let list = [...store.assets];
  if (clientId) list = list.filter((a) => a.client_id === clientId);
  if (projectId) list = list.filter((a) => a.project_id === projectId);
  return list.sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function addMarketingClientAsset(input: {
  client_id: string;
  project_id?: string | null;
  name: string;
  asset_type: MarketingClientAsset["asset_type"];
  file_format: MarketingClientAsset["file_format"];
  asset_url: string;
  status?: MarketingClientAsset["status"];
  version?: string;
  notes?: string;
}) {
  const store = await readStore();
  const client = store.clients.find((c) => c.id === input.client_id);
  const clientName = client ? client.name : "Client Asset";
  const project = input.project_id ? store.projects.find((p) => p.id === input.project_id) : null;
  const newAsset: MarketingClientAsset = {
    id: `asset-${randomUUID().slice(0, 8)}`,
    client_id: input.client_id,
    client_name: clientName,
    project_id: input.project_id || null,
    project_title: project ? project.title : null,
    name: input.name,
    asset_type: input.asset_type,
    file_format: input.file_format,
    asset_url: input.asset_url,
    status: input.status || "IN_REVIEW",
    version: input.version || "v1.0",
    notes: input.notes || "",
    created_at: new Date().toISOString(),
  };
  store.assets.unshift(newAsset);
  await saveStore(store);
  return newAsset;
}

export async function updateMarketingClientAsset(id: string, updates: Partial<MarketingClientAsset>) {
  const store = await readStore();
  const asset = store.assets.find((a) => a.id === id);
  if (!asset) throw new Error("Asset not found");
  Object.assign(asset, updates);
  await saveStore(store);
  return asset;
}

export async function deleteMarketingClientAsset(id: string) {
  const store = await readStore();
  const idx = store.assets.findIndex((a) => a.id === id);
  if (idx === -1) throw new Error("Asset not found");
  store.assets.splice(idx, 1);
  await saveStore(store);
  return true;
}

// Aggregates for Client Management Workspace
export async function getMarketingClientsOverview() {
  const store = await readStore();
  const totalClients = store.clients.length;
  const activeClients = store.clients.filter((c) => c.status === "ACTIVE").length;
  const totalMonthlyRetainer = store.clients.reduce((acc, c) => acc + c.monthly_retainer, 0);
  const totalProjects = store.projects.length;
  const activeProjects = store.projects.filter((p) => p.status === "ACTIVE" || p.status === "IN_PROGRESS").length;
  const totalBudgetManaged = store.projects.reduce((acc, p) => acc + p.budget, 0);
  const totalSpend = store.projects.reduce((acc, p) => acc + p.spend, 0);
  const totalAssets = store.assets.length;
  const assetsInReview = store.assets.filter((a) => a.status === "IN_REVIEW").length;
  const assetsApproved = store.assets.filter((a) => a.status === "APPROVED").length;

  return {
    totalClients,
    activeClients,
    totalMonthlyRetainer,
    totalProjects,
    activeProjects,
    totalBudgetManaged,
    totalSpend,
    totalAssets,
    assetsInReview,
    assetsApproved,
    clientPortfolio: store.clients.map((c) => ({
      name: c.name,
      retainer: c.monthly_retainer,
      projectCount: store.projects.filter((p) => p.client_id === c.id).length,
      assetCount: store.assets.filter((a) => a.client_id === c.id).length,
    })),
  };
}
