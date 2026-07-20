import { Link } from "wouter";
import { SEO } from "@/components/SEO";

/**
 * HTML Sitemap — human-readable and LLM-readable index of all public pages.
 * Gives AI crawlers that do execute JS a navigable map of the whole site,
 * and helps users find pages that aren't in the main nav.
 */

const SECTIONS = [
  {
    heading: "Main Pages",
    links: [
      { href: "/",         label: "Home",         desc: "SwiftMart homepage — grocery & daily essentials delivery in Balurghat" },
      { href: "/shops",    label: "Shops",         desc: "Browse all local shops in Balurghat available on SwiftMart" },
      { href: "/products", label: "All Products",  desc: "Full product catalogue across all categories" },
      { href: "/grocery",  label: "Grocery Store", desc: "Shop fresh groceries, kirana items, and daily staples" },
      { href: "/search",   label: "Search",        desc: "Search for any product, shop, or category" },
      { href: "/categories", label: "Categories",  desc: "Browse products by category" },
    ],
  },
  {
    heading: "Product Categories",
    links: [
      { href: "/category/grocery",           label: "Grocery & Kirana",       desc: "Rice, dal, atta, oil, spices and packaged staples" },
      { href: "/category/fruits-vegetables", label: "Fruits & Vegetables",    desc: "Fresh seasonal fruits, vegetables, and leafy greens" },
      { href: "/category/dairy",             label: "Dairy & Eggs",           desc: "Milk, curd, paneer, butter, cheese and eggs" },
      { href: "/category/bakery",            label: "Bakery & Sweets",        desc: "Bread, biscuits, cakes, rasgulla, and Bengali sweets" },
      { href: "/category/snacks",            label: "Snacks",                 desc: "Chips, namkeen, biscuits and evening snacks" },
      { href: "/category/drinks",            label: "Beverages & Drinks",     desc: "Cold drinks, juices, tea, coffee and water" },
      { href: "/category/medicine",          label: "Medicines & Pharmacy",   desc: "OTC medicines, vitamins, first-aid and healthcare products" },
      { href: "/category/household",         label: "Household Essentials",   desc: "Cleaning supplies, detergents and home care products" },
      { href: "/category/personal-care",     label: "Personal Care",          desc: "Shampoo, soap, skincare and grooming products" },
    ],
  },
  {
    heading: "Legal & Support",
    links: [
      { href: "/contact-support",     label: "Contact & Support",     desc: "Get help with orders, payments, and deliveries" },
      { href: "/privacy",             label: "Privacy Policy",        desc: "How SwiftMart collects, uses and protects your data" },
      { href: "/terms",               label: "Terms & Conditions",    desc: "Rules and guidelines for using SwiftMart" },
      { href: "/refund-cancellation", label: "Refund & Cancellation", desc: "Our policy for order cancellations, returns and refunds" },
    ],
  },
  {
    heading: "Vendor & Partner",
    links: [
      { href: "/vendor-register", label: "Become a Vendor", desc: "Register your local Balurghat shop and start selling on SwiftMart" },
    ],
  },
];

export default function SitemapPage() {
  return (
    <>
      <SEO
        title="Site Map"
        description="Complete index of all SwiftMart pages — shops, products, categories, legal pages and support for our Balurghat grocery delivery service."
        canonical="/sitemap"
      />
      <div className="max-w-3xl mx-auto px-4 py-8 pb-24 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-1">Site Map</h1>
          <p className="text-sm text-muted-foreground">
            A complete directory of all public pages on{" "}
            <a href="https://swiftmart.space/" className="text-primary hover:underline font-medium">swiftmart.space</a>
            {" "}— Balurghat's 10-minute grocery delivery service.
          </p>
        </div>

        {SECTIONS.map(section => (
          <section key={section.heading}>
            <h2 className="text-base font-bold text-foreground uppercase tracking-wide mb-3 pb-2 border-b border-border/40">
              {section.heading}
            </h2>
            <ul className="space-y-2">
              {section.links.map(({ href, label, desc }) => (
                <li key={href} className="flex items-start gap-3 group">
                  <span className="text-primary mt-0.5 shrink-0 text-xs font-bold">→</span>
                  <div>
                    <Link
                      href={href}
                      className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors"
                    >
                      {label}
                    </Link>
                    <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}

        <section>
          <h2 className="text-base font-bold text-foreground uppercase tracking-wide mb-3 pb-2 border-b border-border/40">
            Machine-Readable Resources
          </h2>
          <ul className="space-y-2">
            {[
              { href: "/sitemap.xml", label: "XML Sitemap",  desc: "Structured sitemap for search engine crawlers" },
              { href: "/llms.txt",    label: "llms.txt",     desc: "Plain-text summary of SwiftMart for LLM and AI crawlers" },
              { href: "/robots.txt",  label: "robots.txt",   desc: "Crawler access rules including AI bot directives" },
            ].map(({ href, label, desc }) => (
              <li key={href} className="flex items-start gap-3 group">
                <span className="text-primary mt-0.5 shrink-0 text-xs font-bold">→</span>
                <div>
                  <a
                    href={href}
                    className="text-sm font-semibold text-foreground group-hover:text-primary transition-colors"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {label}
                  </a>
                  <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
                </div>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
