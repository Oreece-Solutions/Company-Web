// Pure HTML analysis for the site-check function (no Deno APIs, so it can be
// tested with Node). Every issue is something a person can see on the page.

export interface SiteCheckResult {
  status: string;
  finalUrl: string;
  seconds: number;
  kb: number;
  https: boolean;
  viewport: boolean;
  form: boolean;
  quoteWords: boolean;
  onlineBooking: boolean;
  telLink: boolean;
  whatsapp: boolean;
  copyright: number | null;
  title: string | null;
  metaDescription: boolean;
  platform: string;
  privateSite: boolean;
  issues: string[];
}

const PLATFORMS: [string, string][] = [
  ['Wix', 'wix.com'],
  ['Squarespace', 'squarespace'],
  ['Shopify', 'cdn.shopify'],
  ['Webflow', 'webflow'],
  ['GoDaddy builder', 'godaddy'],
  ['Hostinger', 'hostinger'],
  ['Weebly', 'weebly'],
  ['Duda', 'dudaone'],
  ['Next.js', '__next'],
  ['Elementor', 'elementor'],
  ['WordPress', 'wp-content'],
];

export function detectPlatform(html: string) {
  const h = html.toLowerCase();
  return PLATFORMS.find(([, sig]) => h.includes(sig))?.[0] ?? 'custom/unknown';
}

export function analyseHtml(
  html: string,
  meta: { status: number; finalUrl: string; seconds: number },
  currentYear = new Date().getFullYear(),
): SiteCheckResult {
  const low = html.toLowerCase();
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const title = titleMatch ? titleMatch[1].replace(/\s+/g, ' ').trim().slice(0, 120) : null;
  const years = [...low.matchAll(/(?:©|&copy;|copyright)\s*(?:\d{4}\s*[-–]\s*)?(20\d\d)/g)].map((m) => Number(m[1]));
  const copyright = years.length ? Math.max(...years) : null;
  const privateSite = /this site is currently private|coming soon|under construction|account (has been )?suspended/.test(low);
  const mailtoBroken = /href=["']mailto:(https?:|www\.)/.test(low);
  const deadSocial = /href=["']#["'][^>]*(aria-label|title)=["'](facebook|instagram|tiktok|youtube|linkedin)/.test(low)
    || /&quot;label&quot;:&quot;(facebook|tiktok|youtube|instagram)&quot;,&quot;href&quot;:&quot;#&quot;/.test(low);

  const result: SiteCheckResult = {
    status: String(meta.status),
    finalUrl: meta.finalUrl,
    seconds: Math.round(meta.seconds * 10) / 10,
    kb: Math.round(html.length / 1024),
    https: meta.finalUrl.startsWith('https://'),
    viewport: /name=["']?viewport/.test(low),
    form: low.includes('<form'),
    quoteWords: /(get a|free|instant|request a)\s+(quote|estimate)/.test(low),
    onlineBooking: /book (now|online)|booking|calendly|launch27|bookingkoala|zenmaid|jobber|servicem8|gettimely/.test(low),
    telLink: low.includes('href="tel:') || low.includes("href='tel:"),
    whatsapp: low.includes('wa.me') || low.includes('whatsapp'),
    copyright,
    title,
    metaDescription: /name=["']description["']/.test(low),
    platform: detectPlatform(html),
    privateSite,
    issues: [],
  };

  const issues = result.issues;
  if (meta.status >= 400) issues.push(`The homepage returns an error (HTTP ${meta.status})`);
  if (privateSite) issues.push('Visitors see a private / coming-soon / suspended page instead of the site');
  if (!result.https) issues.push('The site does not load over HTTPS');
  if (!result.viewport) issues.push('No mobile viewport tag, so it may not display properly on phones');
  if (!result.telLink) issues.push('No click-to-call phone link on the homepage');
  if (!result.form && !result.quoteWords) issues.push('No quote or enquiry form on the homepage');
  if (mailtoBroken) issues.push('The email link is broken (mailto points to a web address)');
  if (deadSocial) issues.push('Social media icons link nowhere (#)');
  if (!title) issues.push('The homepage has no page title');
  else if (/^(home|untitled|my site)\b/i.test(title)) issues.push(`Generic page title ("${title}")`);
  if (!result.metaDescription) issues.push('No meta description for search results');
  if (copyright !== null && copyright < currentYear - 1) issues.push(`Footer copyright says ${copyright}`);
  if (result.kb > 1500) issues.push(`Heavy homepage HTML (${result.kb} KB): test the speed at pagespeed.web.dev`);
  return result;
}

// Only public http(s) hosts: blocks localhost, private ranges and metadata IPs.
export function isPublicHost(hostname: string) {
  const h = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (!h || h === 'localhost' || h.endsWith('.localhost') || h.endsWith('.local') || h.endsWith('.internal')) return false;
  if (!h.includes('.') && !h.includes(':')) return false;
  const v4 = h.match(/^(\d+)\.(\d+)\.(\d+)\.(\d+)$/);
  if (v4) {
    const [a, b] = [Number(v4[1]), Number(v4[2])];
    if (a === 10 || a === 127 || a === 0 || a >= 224) return false;
    if (a === 169 && b === 254) return false;
    if (a === 172 && b >= 16 && b <= 31) return false;
    if (a === 192 && b === 168) return false;
    if (a === 100 && b >= 64 && b <= 127) return false;
  }
  if (h.includes(':')) {
    if (h === '::1' || h === '::' || h.startsWith('fc') || h.startsWith('fd') || h.startsWith('fe80') || h.startsWith('::ffff:')) return false;
  }
  return true;
}
