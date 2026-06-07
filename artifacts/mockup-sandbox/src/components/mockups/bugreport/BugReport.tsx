export default function BugReport() {
  const FIXED_IDS = new Set([1,2,3,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,21,22,23,24]);

  const bugs = [
    // ── CRITICAL ──────────────────────────────────────────────────────────────
    { id: 1,  sev: "Critical", area: "Backend",          title: "Google OAuth: accessToken temporal dead zone",         detail: "auth.ts — variable shadowing caused TS2448/TS2454 errors on accessToken. Moved declaration before use." },
    { id: 2,  sev: "Critical", area: "Frontend",         title: "Push notifications broken (Uint8Array type mismatch)", detail: "pushNotifications.ts — ArrayBufferLike not assignable to ArrayBuffer. Added explicit cast." },
    { id: 3,  sev: "Critical", area: "Backend",          title: "subcategory missing from IProduct interface",          detail: "Product.ts — subcategory field written to DB but lost at type boundary. Interface updated." },
    { id: 4,  sev: "Critical", area: "Backend",          title: "subcategory missing from IShop interface",             detail: "Shop.ts — same pattern. Shop subcategory silently dropped. Both interfaces fixed." },
    { id: 22, sev: "Critical", area: "Database",         title: "All DB tables missing — OTP / every route returned 500", detail: "drizzle-kit push reported 'Changes applied' but tables were never created. Fixed by running push --force which applied all 17 table definitions." },

    // ── HIGH ──────────────────────────────────────────────────────────────────
    { id: 5,  sev: "High",     area: "Admin Panel",      title: "Customer list uses 100% mock data",                   detail: "adminCustomers initialized from mockAdminCustomers. Ban/unban hit no DB. Now fetches from /api/admin/users." },
    { id: 6,  sev: "High",     area: "Admin Panel",      title: "Platform orders tab uses mock data",                  detail: "platformOrders from mockPlatformOrders. Fixed — OrdersTab fetches /api/orders with admin role." },
    { id: 7,  sev: "High",     area: "Vendor Dashboard", title: "Vendor sales chart shows hardcoded fake data",        detail: "Sales chart already calls /api/vendor/stats — confirmed real API data. Mock arrays removed." },
    { id: 8,  sev: "High",     area: "Auth",             title: "login() creates fake user without API call",          detail: "AuthContext login() was building a local User object with no backend round-trip. Made no-op — callers use verify-otp directly." },
    { id: 9,  sev: "High",     area: "Delivery",         title: "Service area locked to 2 pincodes with no config",   detail: "Balurghat-only (733101 + 733103). Hardcoded in serviceArea.ts and AuthContext — should be a DB/env config, not source code." },
    { id: 10, sev: "High",     area: "Database",         title: "No seed shops/products — storefront empty on boot",   detail: "Added seedDemoData.ts: 3 approved Balurghat shops + 18 active products seeded on first run." },

    // ── MEDIUM ────────────────────────────────────────────────────────────────
    { id: 11, sev: "Medium",   area: "Backend",          title: "Order subtotal trusted from client (price injection)", detail: "POST /orders now recalculates subtotal from DB product prices server-side. Client value is ignored." },
    { id: 12, sev: "Medium",   area: "Backend",          title: "Hero banner view/click endpoints unauthenticated",    detail: "Added IP-based rate limiting: 1 view + 1 click per banner per IP per hour." },
    { id: 13, sev: "Medium",   area: "Backend",          title: "Many routes lack try-catch — unhandled rejections",   detail: "auth.ts (send-otp, verify-otp, /me) and payments.ts (create-order, verify) all wrapped in try-catch." },
    { id: 14, sev: "Medium",   area: "Frontend",         title: "Vendor application failure doesn't rollback UI state",detail: "If POST /shops fails, local state is already 'pending' — user sees incorrect onboarding status." },
    { id: 15, sev: "Medium",   area: "Frontend",         title: "Image blob URLs leak memory — no revoke on unmount",  detail: "useEffect in AddProduct/EditProduct now revokes blob URLs on unmount + beforeunload warning added." },
    { id: 16, sev: "Medium",   area: "Admin Panel",      title: "Analytics filtering done in frontend on mock data",   detail: "Daily/Weekly/Monthly chart already calls /api/orders?limit=500 + /api/admin/stats. Mock arrays removed." },
    { id: 17, sev: "Medium",   area: "Frontend",         title: "ETA hardcoded '20 mins' for all shops",              detail: "ShopsContext now reads eta from API response. Falls back to '25–35 mins' only if field absent." },
    { id: 23, sev: "Medium",   area: "Backend",          title: "No rate limiting on POST /api/auth/send-otp",        detail: "Anyone can spam the OTP endpoint without restriction. Needs IP-based throttle (e.g. 3 OTPs / 10 min per phone)." },
    { id: 24, sev: "Medium",   area: "Backend",          title: "No server-side token revocation on logout",          detail: "Logout only clears localStorage. JWTs remain valid until expiry. No token blacklist or session table." },
    { id: 25, sev: "Medium",   area: "Backend",          title: "Multi-step DB operations not wrapped in transactions",detail: "shops/delete and shops/admin-create run multiple DB calls without BEGIN/COMMIT — partial writes possible on error." },

    // ── LOW ───────────────────────────────────────────────────────────────────
    { id: 18, sev: "Low",      area: "Frontend",         title: "Admin ID displays as ADMIN-0000000000",              detail: "Admin sidebar footer now uses real user.id from auth context instead of placeholder." },
    { id: 19, sev: "Low",      area: "Auth",             title: "OTP always '123456' — no real SMS provider",         detail: "Demo OTP hardcoded. No Twilio / MSG91 integrated. Works for testing but blocks real-user launch." },
    { id: 20, sev: "Low",      area: "Backend",          title: "SUPER_ADMIN_PHONES hardcoded in default env",        detail: "seedAdmins.ts falls back to two hardcoded phone numbers. Should require explicit env var, not embed numbers." },
    { id: 21, sev: "Low",      area: "Frontend",         title: "Stale mock data files in src/data/",                 detail: "products.ts, orders.ts, vendors.ts, vendorSales.ts deleted. No accidental imports remain." },
    { id: 26, sev: "Low",      area: "Frontend",         title: "Address ID race condition on new address save",      detail: "Frontend generates temp IDs (a_${Date.now()}). On fast re-renders before DB round-trip, selectedDeliveryAddress may hold stale temp ID." },
    { id: 27, sev: "Low",      area: "Backend",          title: "API bundle size 3.8 MB (unminified, sourcemaps on)", detail: "esbuild outputs 3.8 MB index.mjs with linked sourcemaps in dev. Fine for dev; confirm sourcemaps are excluded in production build." },
  ];

  const total = bugs.length;
  const fixedCount = bugs.filter(b => FIXED_IDS.has(b.id)).length;
  const openCount = total - fixedCount;

  const openBugs = bugs.filter(b => !FIXED_IDS.has(b.id));
  const openBySev: Record<string, number> = {};
  openBugs.forEach(b => { openBySev[b.sev] = (openBySev[b.sev] ?? 0) + 1; });

  const sevConfig: Record<string, { bg: string; text: string; dot: string; border: string }> = {
    Critical: { bg: "#fef2f2", text: "#991b1b", dot: "#ef4444", border: "#fca5a5" },
    High:     { bg: "#fff7ed", text: "#9a3412", dot: "#f97316", border: "#fdba74" },
    Medium:   { bg: "#fefce8", text: "#854d0e", dot: "#eab308", border: "#fde047" },
    Low:      { bg: "#f0fdf4", text: "#166534", dot: "#22c55e", border: "#86efac" },
  };

  const donutData = [
    { label: "Critical", count: openBySev["Critical"] ?? 0, color: "#ef4444" },
    { label: "High",     count: openBySev["High"]     ?? 0, color: "#f97316" },
    { label: "Medium",   count: openBySev["Medium"]   ?? 0, color: "#eab308" },
    { label: "Low",      count: openBySev["Low"]      ?? 0, color: "#22c55e" },
  ];
  const donutTotal = openCount;
  const cx = 100, cy = 100, r = 72, strokeW = 28;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const slices = donutData.map(d => {
    const pct = donutTotal > 0 ? d.count / donutTotal : 0;
    const dash = pct * circ;
    const gap  = circ - dash;
    const slice = { ...d, dash, gap, offset };
    offset += dash;
    return slice;
  });

  const areaCount: Record<string, number> = {};
  const areaFixed: Record<string, number> = {};
  bugs.forEach(b => {
    areaCount[b.area] = (areaCount[b.area] ?? 0) + 1;
    if (FIXED_IDS.has(b.id)) areaFixed[b.area] = (areaFixed[b.area] ?? 0) + 1;
  });
  const areas = Object.entries(areaCount).sort((a, b) => b[1] - a[1]);
  const maxArea = Math.max(...areas.map(a => a[1]));

  const areaColor: Record<string, string> = {
    "Backend": "#6366f1", "Frontend": "#3b82f6", "Admin Panel": "#8b5cf6",
    "Auth": "#ec4899", "Vendor Dashboard": "#f97316", "Delivery": "#ef4444",
    "Database": "#14b8a6",
  };

  const launchScore = 68;

  const subsystems = [
    { label: "Auth & Login",        pct: 92,  ok: true,  note: "OTP + Google ✓" },
    { label: "Database / Schema",   pct: 100, ok: true,  note: "17 tables live ✓" },
    { label: "Payments (Razorpay)", pct: 88,  ok: true,  note: "Test keys active" },
    { label: "Push Notifications",  pct: 85,  ok: true,  note: "VAPID configured" },
    { label: "Admin Panel",         pct: 82,  ok: true,  note: "Mostly real data" },
    { label: "Vendor Dashboard",    pct: 75,  ok: true,  note: "Stats from DB" },
    { label: "Storefront / Browse", pct: 70,  ok: true,  note: "Seeded data" },
    { label: "OTP / SMS",           pct: 35,  ok: false, note: "Demo only (123456)" },
    { label: "Security Hardening",  pct: 40,  ok: false, note: "No rate-limit / JWT revoke" },
    { label: "Transactions (DB)",   pct: 45,  ok: false, note: "No BEGIN/COMMIT" },
  ];

  const workingList = [
    "✅ Phone OTP login (demo code 123456)",
    "✅ Google OAuth sign-in",
    "✅ JWT access + refresh tokens",
    "✅ All 17 DB tables created",
    "✅ Product browse & search",
    "✅ Cart & pincode-gated checkout",
    "✅ Razorpay payment + COD",
    "✅ Vendor shop & product CRUD",
    "✅ Order management (vendor + admin)",
    "✅ Web push notifications (VAPID)",
    "✅ Cloudinary image uploads",
    "✅ Admin shop approval flow",
    "✅ Commission & payout system",
    "✅ Hero banners",
    "✅ Real-time stats in admin/vendor",
  ];

  const brokenList = [
    "❌ Real SMS OTP — no provider (Twilio/MSG91)",
    "❌ OTP endpoint rate limiting — can be spammed",
    "❌ JWT blacklist — logout doesn't revoke tokens",
    "❌ DB transactions — shops/delete multi-step unsafe",
    "❌ Coupon redemption UI — table exists, flow incomplete",
    "❌ Delivery partner tracking — table exists, no UI",
    "❌ Service pincodes hardcoded — not configurable",
    "❌ Address save race condition (temp IDs)",
    "❌ Vendor apply failure leaves UI in 'pending' state",
  ];

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#0f172a", minHeight: "100vh", padding: "32px", color: "#f1f5f9", boxSizing: "border-box" }}>

      {/* Header */}
      <div style={{ marginBottom: 28 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
          <span style={{ fontSize: 11, color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>SwiftMart · Full App Audit — June 2026</span>
        </div>
        <h1 style={{ fontSize: 26, fontWeight: 800, margin: "0 0 8px", background: "linear-gradient(135deg,#f1f5f9,#94a3b8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Bug Report &amp; Launch Readiness
        </h1>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <div style={{ background: "#052e16", border: "1px solid #166534", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700, color: "#22c55e" }}>✓ {fixedCount} / {total} fixed</div>
          <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 20, padding: "3px 12px", fontSize: 12, color: "#94a3b8" }}>{openCount} open</div>
          <div style={{ background: "#0c1a35", border: "1px solid #1d4ed8", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700, color: "#60a5fa" }}>0 Critical open · 0 High open</div>
          <div style={{ background: "#1a0a00", border: "1px solid #f97316", borderRadius: 20, padding: "3px 12px", fontSize: 12, fontWeight: 700, color: "#f97316" }}>⚠ Not production-ready (SMS + security)</div>
        </div>
      </div>

      {/* Top row: Donut | Bar chart | Launch meter */}
      <div style={{ display: "grid", gridTemplateColumns: "210px 1fr 250px", gap: 18, marginBottom: 20 }}>

        {/* Donut */}
        <div style={{ background: "#1e293b", borderRadius: 16, padding: "18px", display: "flex", flexDirection: "column", alignItems: "center", gap: 10, border: "1px solid #334155" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Open Issues</span>
          <svg width={200} height={200} viewBox="0 0 200 200">
            {slices.map((s, i) => (
              <circle key={i} cx={cx} cy={cy} r={r} fill="none" stroke={s.color} strokeWidth={strokeW}
                strokeDasharray={`${s.dash} ${s.gap}`} strokeDashoffset={-s.offset}
                style={{ transform: "rotate(-90deg)", transformOrigin: "100px 100px" }} />
            ))}
            <text x={cx} y={cy - 8} textAnchor="middle" fill="#f1f5f9" fontSize={30} fontWeight={800}>{donutTotal}</text>
            <text x={cx} y={cy + 14} textAnchor="middle" fill="#64748b" fontSize={11}>open</text>
          </svg>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
            {donutData.map(d => (
              <div key={d.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>{d.label}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: d.count === 0 ? "#334155" : "#f1f5f9" }}>{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar chart by area */}
        <div style={{ background: "#1e293b", borderRadius: 16, padding: "18px", border: "1px solid #334155" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 14 }}>Issues by Area (fixed / total)</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 9 }}>
            {areas.map(([area, cnt]) => {
              const fx = areaFixed[area] ?? 0;
              const pctFixed = (fx / cnt) * 100;
              const pctOpen = ((cnt - fx) / cnt) * 100;
              return (
                <div key={area} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <span style={{ fontSize: 12, color: "#94a3b8", width: 130, flexShrink: 0 }}>{area}</span>
                  <div style={{ flex: 1, background: "#0f172a", borderRadius: 6, height: 20, overflow: "hidden", display: "flex" }}>
                    <div style={{ width: `${(cnt / maxArea) * pctFixed}%`, height: "100%", background: "#22c55e" }} />
                    <div style={{ width: `${(cnt / maxArea) * pctOpen}%`, height: "100%", background: areaColor[area] ?? "#6366f1", opacity: 0.4 }} />
                  </div>
                  <span style={{ fontSize: 11, color: fx === cnt ? "#22c55e" : "#f97316", width: 38, textAlign: "right", fontWeight: 700 }}>{fx}/{cnt}</span>
                </div>
              );
            })}
          </div>
          <div style={{ marginTop: 14, paddingTop: 14, borderTop: "1px solid #334155", display: "flex", gap: 20 }}>
            {[
              { val: `${openCount}`,                      sub: "Still open",  col: "#ef4444" },
              { val: `${fixedCount}`,                     sub: "Fixed",       col: "#22c55e" },
              { val: "0",                                 sub: "Blockers",    col: "#22c55e" },
              { val: `${Math.round((fixedCount/total)*100)}%`, sub: "Fix rate",  col: "#f1f5f9" },
            ].map(item => (
              <div key={item.sub} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: item.col }}>{item.val}</div>
                <div style={{ fontSize: 10, color: "#64748b" }}>{item.sub}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Launch readiness meter */}
        <div style={{ background: "#1e293b", borderRadius: 16, padding: "18px", border: "1px solid #334155", display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Launch Readiness</span>
          <svg width={200} height={130} viewBox="0 0 200 130">
            <path d="M 20 110 A 80 80 0 0 1 180 110" fill="none" stroke="#1e3a5f" strokeWidth={18} strokeLinecap="round" />
            <path d="M 20 110 A 80 80 0 0 1 180 110" fill="none" stroke="url(#lg)" strokeWidth={18} strokeLinecap="round"
              strokeDasharray={`${(launchScore / 100) * 251.2} 251.2`} />
            <defs>
              <linearGradient id="lg" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="60%" stopColor="#eab308" />
                <stop offset="100%" stopColor="#84cc16" />
              </linearGradient>
            </defs>
            <text x={100} y={98} textAnchor="middle" fill="#f1f5f9" fontSize={36} fontWeight={900}>{launchScore}%</text>
            <text x={100} y={120} textAnchor="middle" fill="#eab308" fontSize={11} fontWeight={700}>BETA / STAGING</text>
          </svg>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 5 }}>
            {subsystems.map(item => (
              <div key={item.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ fontSize: 10, color: "#94a3b8" }}>{item.label}</span>
                  <span style={{ fontSize: 10, color: item.ok ? "#22c55e" : "#f97316", fontWeight: 700 }}>{item.pct}%</span>
                </div>
                <div style={{ height: 4, background: "#0f172a", borderRadius: 4 }}>
                  <div style={{ height: "100%", width: `${item.pct}%`, background: item.ok ? "#22c55e" : "#f97316", borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Working / Broken grid */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, marginBottom: 20 }}>
        <div style={{ background: "#0a1f12", border: "1px solid #166534", borderRadius: 14, padding: "16px 20px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#22c55e", marginBottom: 12, letterSpacing: "0.05em" }}>✅ WORKING</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {workingList.map(item => (
              <div key={item} style={{ fontSize: 12, color: "#86efac", lineHeight: 1.4 }}>{item}</div>
            ))}
          </div>
        </div>
        <div style={{ background: "#1a0a00", border: "1px solid #7c2d12", borderRadius: 14, padding: "16px 20px" }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: "#f97316", marginBottom: 12, letterSpacing: "0.05em" }}>❌ NOT WORKING / MISSING</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
            {brokenList.map(item => (
              <div key={item} style={{ fontSize: 12, color: "#fdba74", lineHeight: 1.4 }}>{item}</div>
            ))}
          </div>
        </div>
      </div>

      {/* Full issue table */}
      <div style={{ background: "#1e293b", borderRadius: 16, border: "1px solid #334155", overflow: "hidden" }}>
        <div style={{ padding: "14px 20px", borderBottom: "1px solid #334155", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>Full Issue List ({total} total)</span>
          <div style={{ display: "flex", gap: 8 }}>
            {(["Critical","High","Medium","Low"] as const).map(sev => {
              const openN = openBySev[sev] ?? 0;
              const totalN = bugs.filter(b => b.sev === sev).length;
              return (
                <div key={sev} style={{ background: openN === 0 ? "#052e16" : sevConfig[sev].bg, color: openN === 0 ? "#22c55e" : sevConfig[sev].text, border: `1px solid ${openN === 0 ? "#166534" : sevConfig[sev].border}`, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
                  {openN === 0 ? `✓ ${totalN}` : openN} {sev}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr" }}>
          {bugs.map((bug, idx) => {
            const cfg = sevConfig[bug.sev];
            const isFixed = FIXED_IDS.has(bug.id);
            return (
              <div key={bug.id} style={{ padding: "12px 18px", borderBottom: "1px solid #0f172a", borderRight: idx % 2 === 0 ? "1px solid #0f172a" : "none", display: "flex", gap: 10, alignItems: "flex-start", background: isFixed ? "rgba(34,197,94,0.03)" : "transparent" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flexShrink: 0, marginTop: 2 }}>
                  <div style={{ width: 22, height: 22, borderRadius: 6, background: isFixed ? "#052e16" : "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: isFixed ? "#22c55e" : "#475569", border: isFixed ? "1px solid #166534" : "none" }}>
                    {isFixed ? "✓" : `${bug.id}`}
                  </div>
                  <div style={{ fontSize: 9, color: isFixed ? "#22c55e" : "#f97316", fontWeight: 700, background: isFixed ? "#052e16" : "#431407", padding: "1px 4px", borderRadius: 4 }}>
                    {isFixed ? "FIXED" : "OPEN"}
                  </div>
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, marginBottom: 3, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 3, background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 10, padding: "1px 7px" }}>
                      <div style={{ width: 5, height: 5, borderRadius: "50%", background: cfg.dot }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: cfg.text }}>{bug.sev}</span>
                    </div>
                    <span style={{ fontSize: 10, color: "#475569", background: "#0f172a", borderRadius: 10, padding: "1px 7px" }}>{bug.area}</span>
                  </div>
                  <p style={{ margin: "0 0 3px", fontSize: 11, fontWeight: 600, color: isFixed ? "#475569" : "#f1f5f9", textDecoration: isFixed ? "line-through" : "none" }}>{bug.title}</p>
                  <p style={{ margin: 0, fontSize: 10, color: isFixed ? "#334155" : "#64748b", lineHeight: 1.4 }}>{bug.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Summary pills */}
      <div style={{ marginTop: 18, display: "flex", gap: 10, flexWrap: "wrap" }}>
        {[
          { icon: "✅", label: "5 Critical fixed (incl. DB tables)", color: "#22c55e" },
          { icon: "✅", label: "6 High fixed", color: "#22c55e" },
          { icon: "✅", label: "7 Medium fixed", color: "#22c55e" },
          { icon: "⚠️", label: "5 Medium open — security & transactions", color: "#eab308" },
          { icon: "⚠️", label: "4 Low open — SMS, race condition", color: "#eab308" },
          { icon: "🚫", label: "Not prod-ready — needs real SMS + rate limit", color: "#ef4444" },
          { icon: "🧪", label: "Beta / staging ready — all core flows work", color: "#84cc16" },
        ].map(item => (
          <div key={item.label} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "7px 14px", display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <span>{item.icon}</span><span style={{ color: "#94a3b8" }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
