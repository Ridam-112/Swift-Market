/**
 * WhatsAppButton — sticky floating WhatsApp chat button.
 * Critical for Indian market: customers expect instant WhatsApp support.
 * Hidden on admin/vendor/delivery routes so it only shows for customers and guests.
 */
import { useLocation } from "wouter";

const WA_NUMBER = "916296118949";
const WA_MESSAGE = encodeURIComponent("Hi SwiftMart! I need help with my order.");
const WA_URL = `https://wa.me/${WA_NUMBER}?text=${WA_MESSAGE}`;

const HIDDEN_PREFIXES = ["/admin", "/vendor", "/delivery", "/auth", "/complete-profile", "/vendor-register", "/vendor-status"];

export function WhatsAppButton() {
  const [location] = useLocation();
  if (HIDDEN_PREFIXES.some(p => location.startsWith(p))) return null;

  return (
    <a
      href={WA_URL}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with SwiftMart support on WhatsApp"
      className="fixed bottom-20 right-4 md:bottom-6 md:right-6 z-50 w-13 h-13 flex items-center justify-center rounded-full shadow-lg transition-transform hover:scale-110 active:scale-95"
      style={{ width: 52, height: 52, backgroundColor: "#25D366" }}
    >
      {/* WhatsApp SVG — inline so no extra asset fetch */}
      <svg
        viewBox="0 0 32 32"
        fill="white"
        xmlns="http://www.w3.org/2000/svg"
        className="w-7 h-7"
        aria-hidden="true"
      >
        <path d="M16 2C8.268 2 2 8.268 2 16c0 2.49.648 4.83 1.782 6.862L2 30l7.338-1.755A13.94 13.94 0 0016 30c7.732 0 14-6.268 14-14S23.732 2 16 2zm0 25.6a11.54 11.54 0 01-5.88-1.608l-.42-.25-4.354 1.042 1.075-4.24-.274-.434A11.56 11.56 0 014.4 16C4.4 9.593 9.593 4.4 16 4.4S27.6 9.593 27.6 16 22.407 27.6 16 27.6zm6.344-8.658c-.347-.174-2.055-1.014-2.374-1.13-.318-.115-.55-.173-.781.174-.231.346-.896 1.13-1.099 1.362-.202.23-.404.26-.751.086-.347-.174-1.464-.54-2.789-1.72-1.031-.918-1.726-2.052-1.928-2.399-.202-.347-.022-.534.152-.707.156-.155.347-.405.52-.607.174-.202.231-.347.347-.578.115-.231.058-.433-.029-.607-.087-.174-.782-1.882-1.07-2.578-.282-.678-.569-.586-.782-.596l-.665-.012c-.231 0-.607.086-.925.433-.317.347-1.213 1.187-1.213 2.893 0 1.706 1.243 3.355 1.416 3.587.174.231 2.447 3.733 5.929 5.235.829.358 1.476.571 1.981.731.832.264 1.59.227 2.188.138.668-.1 2.055-.84 2.344-1.65.29-.81.29-1.506.202-1.65-.087-.145-.318-.231-.665-.405z" />
      </svg>
    </a>
  );
}
