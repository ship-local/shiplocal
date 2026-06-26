import { SITE_URL } from '@/lib/site';

const GITHUB_URL = 'https://github.com/ship-local/shiplocal';
const NPM_URL = 'https://www.npmjs.com/package/shiplocal';

const softwareApplicationSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'ShipLocal',
  alternateName: 'ShipLocal Core',
  url: SITE_URL,
  image: `${SITE_URL}/og-image.png`,
  applicationCategory: 'DeveloperApplication',
  applicationSubCategory: 'Developer Tools',
  operatingSystem: 'Windows, macOS, Linux',
  softwareVersion: '0.1.0',
  description:
    'ShipLocal lets developers securely share localhost over HTTPS in seconds. Create public preview URLs, self-host your tunnel server, and collaborate with clients before deployment.',
  keywords: [
    'localhost tunnel',
    'share localhost',
    'ngrok alternative',
    'Cloudflare Tunnel alternative',
    'developer tools',
    'developer collaboration',
    'preview deployment',
    'reverse proxy',
    'websocket tunnel',
    'self-hosted tunnel',
    'open source',
  ],
  downloadUrl: NPM_URL,
  installUrl: NPM_URL,
  codeRepository: GITHUB_URL,
  license: 'https://opensource.org/licenses/MIT',
  offers: {
    '@type': 'Offer',
    price: '0',
    priceCurrency: 'USD',
    availability: 'https://schema.org/InStock',
  },
  author: {
    '@type': 'Organization',
    name: 'ShipLocal',
    url: SITE_URL,
  },
  publisher: {
    '@type': 'Organization',
    name: 'ShipLocal',
    url: SITE_URL,
  },
  sameAs: [GITHUB_URL, NPM_URL],
};

const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'ShipLocal',
  url: SITE_URL,
  logo: `${SITE_URL}/logo.png`,
  sameAs: [GITHUB_URL, NPM_URL],
};

const websiteSchema = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'ShipLocal',
  url: SITE_URL,
};

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}

export function HomeStructuredData() {
  return (
    <>
      <JsonLd data={softwareApplicationSchema} />
      <JsonLd data={organizationSchema} />
      <JsonLd data={websiteSchema} />
    </>
  );
}
