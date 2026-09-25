import { BrandMatch } from '../types/url';
import { levenshteinDistance } from '../utils/domain-utils';

export const BRAND_DATABASE: Record<string, string[]> = {
  google: ['google.com', 'googleapis.com', 'googlevideo.com', 'youtube.com'],
  microsoft: ['microsoft.com', 'microsoftonline.com', 'live.com', 'office.com', 'outlook.com', 'bing.com', 'azure.com', 'office365.com'],
  apple: ['apple.com', 'icloud.com', 'itunes.com'],
  paypal: ['paypal.com', 'paypalobjects.com'],
  amazon: ['amazon.com', 'aws.amazon.com', 'amazonwebservices.com', 'kindle.com', 'audible.com'],
  facebook: ['facebook.com', 'fb.com', 'messenger.com', 'meta.com'],
  instagram: ['instagram.com'],
  linkedin: ['linkedin.com'],
  netflix: ['netflix.com'],
  docusign: ['docusign.com', 'docusign.net'],
  dropbox: ['dropbox.com', 'dropboxusercontent.com'],
  twitter: ['twitter.com', 'x.com', 't.co'],
  github: ['github.com', 'githubusercontent.com', 'githubassets.com'],
  adobe: ['adobe.com', 'adobeaemcloud.com'],
  chase: ['chase.com', 'jpmorganchase.com'],
  wellsfargo: ['wellsfargo.com'],
  bankofamerica: ['bankofamerica.com'],
  citibank: ['citi.com', 'citibank.com'],
  irs: ['irs.gov'],
  usps: ['usps.com'],
  fedex: ['fedex.com'],
  ups: ['ups.com'],
  dhl: ['dhl.com'],
  ebay: ['ebay.com', 'ebayimg.com'],
  shopify: ['shopify.com'],
  stripe: ['stripe.com'],
  zoom: ['zoom.us'],
  slack: ['slack.com'],
  discord: ['discord.com', 'discordapp.com'],
  steam: ['steampowered.com', 'steamcommunity.com'],
};

export function detectBrandImpersonation(registeredDomain: string, fullDomain: string): BrandMatch | null {
  for (const [brand, legitimateDomains] of Object.entries(BRAND_DATABASE)) {
    if (legitimateDomains.includes(registeredDomain)) {
      return { brand, isLegitimate: true, similarity: 1, legitimateDomains };
    }
  }

  for (const [brand, legitimateDomains] of Object.entries(BRAND_DATABASE)) {
    // Substring match
    if (registeredDomain.includes(brand)) {
      return { brand, isLegitimate: false, similarity: 0.8, legitimateDomains };
    }

    // Typosquatting check using Levenshtein distance
    // Removing the TLD from registeredDomain for distance calculation
    const domainName = registeredDomain.split('.')[0];
    const distance = levenshteinDistance(domainName, brand);
    
    // Consider it impersonation if distance is small relative to length
    if (distance > 0 && distance <= 2 && brand.length > 3) {
      const similarity = 1 - (distance / Math.max(brand.length, domainName.length));
      return { brand, isLegitimate: false, similarity, legitimateDomains };
    }
  }

  return null;
}

export function isKnownLegitimateURL(registeredDomain: string): boolean {
  for (const domains of Object.values(BRAND_DATABASE)) {
    if (domains.includes(registeredDomain)) {
      return true;
    }
  }
  return false;
}
