import { useLocation } from "wouter";
import { Helmet } from "react-helmet-async";

const SITE_NAME = "SwiftMart";
const BASE_URL = "https://swiftmart.space";
const DEFAULT_OG_IMAGE = `${BASE_URL}/opengraph.jpg`;
const DEFAULT_TITLE = "SwiftMart Balurghat | Grocery, Food, Medicine & Quick Commerce Delivery";
const DEFAULT_DESCRIPTION =
  "Order groceries, vegetables, fruits, food, medicines, dairy, bakery, sweets and daily essentials from trusted local shops in Balurghat with SwiftMart. Fast local delivery.";

interface SEOProps {
  title?: string;
  description?: string;
  canonical?: string;
  ogImage?: string;
  ogType?: "website" | "article" | "product";
  noIndex?: boolean;
  keywords?: string;
  jsonLd?: object | object[];
}

export function SEO({
  title = DEFAULT_TITLE,
  description = DEFAULT_DESCRIPTION,
  canonical,
  ogImage = DEFAULT_OG_IMAGE,
  ogType = "website",
  noIndex = false,
  keywords,
  jsonLd,
}: SEOProps) {
  const [location] = useLocation();
  const fullTitle = title === DEFAULT_TITLE ? title : `${title} | ${SITE_NAME}`;
  // Always produce a canonical: use the explicit prop if given, otherwise derive
  // from the current route so every page self-references correctly.
  const canonicalPath = canonical ?? (location.split("?")[0].replace(/\/$/, "") || "/");
  const canonicalUrl = `${BASE_URL}${canonicalPath}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      {keywords && <meta name="keywords" content={keywords} />}
      {noIndex ? (
        <meta name="robots" content="noindex,nofollow" />
      ) : (
        <meta name="robots" content="index,follow" />
      )}
      <link rel="canonical" href={canonicalUrl} />

      {/* Open Graph */}
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={ogImage} />
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={SITE_NAME} />
      <meta property="og:url" content={canonicalUrl} />

      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={fullTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={ogImage} />

      {/* JSON-LD Structured Data */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(Array.isArray(jsonLd) ? { "@context": "https://schema.org", "@graph": jsonLd } : jsonLd)}
        </script>
      )}
    </Helmet>
  );
}

export { DEFAULT_TITLE, DEFAULT_DESCRIPTION, BASE_URL, SITE_NAME };

// ── Route-based robots manager ────────────────────────────────────────────────
// Mount once inside <WouterRouter>. Automatically sets noindex,nofollow on
// private/auth/account routes and index,follow on all public pages.

const NOINDEX_PREFIXES: string[] = [
  "/auth",
  "/complete-profile",
  "/cart",
  "/checkout",
  "/order",        // covers /order/success/:id and /orders
  "/orders",
  "/profile",
  "/notifications",
  "/vendor-register",
  "/vendor-status",
  "/vendor",
  "/admin",
  "/delivery-dashboard",
  "/delivery",
  "/delete-account",
];

function isPrivateRoute(path: string): boolean {
  return NOINDEX_PREFIXES.some(
    (prefix) => path === prefix || path.startsWith(prefix + "/"),
  );
}

export function RobotsManager() {
  const [location] = useLocation();
  const robots = isPrivateRoute(location) ? "noindex,nofollow" : "index,follow";
  return (
    <Helmet>
      <meta name="robots" content={robots} />
    </Helmet>
  );
}
