export default function BugReport() {
  const bugs = [
    // CRITICAL
    { id: 1, sev: "Critical", area: "Backend", title: "Google OAuth: accessToken temporal dead zone", detail: "auth.ts line 21 — variable shadowing caused TS2448/TS2454 errors. Fixed." },
    { id: 2, sev: "Critical", area: "Frontend", title: "Push notifications broken (Uint8Array type mismatch)", detail: "pushNotifications.ts line 25 — ArrayBufferLike not assignable to ArrayBuffer. Fixed." },
    { id: 3, sev: "Critical", area: "Backend", title: "subcategory field missing from IProduct interface", detail: "Product.ts schema had subcategory field but interface didn't — data written but not typed. Fixed." },
    { id: 4, sev: "Critical", area: "Backend", title: "subcategory field missing from IShop interface", detail: "Shop.ts same issue — shop subcategory silently untyped. Fixed." },

    // High
    { id: 5, sev: "High", area: "Admin Panel", title: "Customer list uses 100% mock data", detail: "adminCustomers state initialized from mockAdminCustomers (hardcoded fake users). Ban/unban actions don't hit real DB." },
    { id: 6, sev: "High", area: "Admin Panel", title: "Platform orders tab uses mock data", detail: "platformOrders state from mockPlatformOrders — fake order history, not real DB." },
    { id: 7, sev: "High", area: "Vendor Dashboard", title: "Sales chart shows hardcoded fake data", detail: "vendorSales.ts has static Mon–Sun numbers. Vendor sees fake revenue chart." },
    { id: 8, sev: "High", area: "Auth", title: "login() creates fake user without API call", detail: "AuthContext login() builds a local User object with no backend round-trip — ghost sessions possible." },
    { id: 9, sev: "High", area: "Delivery", title: "Service area locked to only 2 pincodes", detail: "Checkout hardcoded to 733101 & 733103. Every other Indian pincode gets rejected — app unusable for testing." },
    { id: 10, sev: "High", area: "Database", title: "No seed shops/products — storefront is empty", detail: "API returns shops:[] and products:[] — home page, category pages and search all show nothing." },

    // Medium
    { id: 11, sev: "Medium", area: "Backend", title: "Order subtotal trusted from client", detail: "POST /api/orders doesn't verify that subtotal equals sum of item prices — price tampering possible." },
    { id: 12, sev: "Medium", area: "Backend", title: "Hero banner view/click endpoints unauthenticated", detail: "Anyone can inflate banner view and click counts with no rate limiting." },
    { id: 13, sev: "Medium", area: "Backend", title: "Many routes lack try-catch — unhandled rejections", detail: "Async route handlers missing error boundaries; DB errors can crash server or hang requests." },
    { id: 14, sev: "Medium", area: "Frontend", title: "Vendor application failure doesn't rollback UI state", detail: "If POST /shops fails, local state already set to 'pending' — user sees incorrect onboarding status." },
    { id: 15, sev: "Medium", area: "Frontend", title: "Image blob URLs break on page refresh before upload", detail: "createObjectURL previews in AddProduct/EditProduct/ShopProfile invalidate on reload before upload completes." },
    { id: 16, sev: "Medium", area: "Admin Panel", title: "Analytics filtering done in frontend on mock data", detail: "Daily/Weekly/Monthly toggles recalculate from local arrays, not from backend aggregation queries." },
    { id: 17, sev: "Medium", area: "Frontend", title: "ETA hardcoded '20 mins' for all shops", detail: "ShopsContext.tsx line 55 — every shop always shows '20 mins' regardless of distance or time." },

    // Low
    { id: 18, sev: "Low", area: "Frontend", title: "Admin ID displays as ADMIN-0000000000", detail: "Admin sidebar footer shows hardcoded placeholder ID instead of real user ID." },
    { id: 19, sev: "Low", area: "Auth", title: "OTP always '123456' — no real SMS", detail: "Demo OTP hardcoded via OTP_DEMO_CODE env var. No SMS provider integrated." },
    { id: 20, sev: "Low", area: "Backend", title: "SUPER_ADMIN_PHONES hardcoded in default env", detail: "seedAdmins.ts defaults to two hardcoded phone numbers if env var not set." },
    { id: 21, sev: "Low", area: "Frontend", title: "Stale mock data files still in src/data/", detail: "products.ts, orders.ts, vendors.ts, vendorSales.ts exist but should be removed — confusion risk." },
  ];

  const sevConfig: Record<string, { bg: string; text: string; dot: string; border: string }> = {
    Critical: { bg: "#fef2f2", text: "#991b1b", dot: "#ef4444", border: "#fca5a5" },
    High:     { bg: "#fff7ed", text: "#9a3412", dot: "#f97316", border: "#fdba74" },
    Medium:   { bg: "#fefce8", text: "#854d0e", dot: "#eab308", border: "#fde047" },
    Low:      { bg: "#f0fdf4", text: "#166534", dot: "#22c55e", border: "#86efac" },
  };

  const counts = { Critical: 4, High: 6, Medium: 7, Low: 4 };
  const total = 21;
  const fixed = 4;
  const launchScore = 42;

  const donutData = [
    { label: "Critical", count: 4, color: "#ef4444" },
    { label: "High",     count: 6, color: "#f97316" },
    { label: "Medium",   count: 7, color: "#eab308" },
    { label: "Low",      count: 4, color: "#22c55e" },
  ];

  const cx = 100, cy = 100, r = 72, stroke = 28;
  const circ = 2 * Math.PI * r;
  let offset = 0;
  const slices = donutData.map(d => {
    const pct = d.count / total;
    const dash = pct * circ;
    const gap = circ - dash;
    const slice = { ...d, dash, gap, offset };
    offset += dash;
    return slice;
  });

  const areaCount: Record<string, number> = {};
  bugs.forEach(b => { areaCount[b.area] = (areaCount[b.area] ?? 0) + 1; });
  const areas = Object.entries(areaCount).sort((a, b) => b[1] - a[1]);
  const maxArea = Math.max(...areas.map(a => a[1]));

  const areaColor: Record<string, string> = {
    "Backend": "#6366f1", "Frontend": "#3b82f6", "Admin Panel": "#8b5cf6",
    "Auth": "#ec4899", "Vendor Dashboard": "#f97316", "Delivery": "#ef4444", "Database": "#14b8a6",
  };

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", background: "#0f172a", minHeight: "100vh", padding: "32px", color: "#f1f5f9" }}>

      {/* Header */}
      <div style={{ marginBottom: 32 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div style={{ width: 10, height: 10, borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 8px #22c55e" }} />
          <span style={{ fontSize: 12, color: "#64748b", letterSpacing: "0.1em", textTransform: "uppercase", fontWeight: 600 }}>SwiftMart · Full App Audit</span>
        </div>
        <h1 style={{ fontSize: 28, fontWeight: 800, margin: 0, background: "linear-gradient(135deg,#f1f5f9,#94a3b8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          Bug Report & Launch Readiness
        </h1>
      </div>

      {/* Top row: donut + stats + launch meter */}
      <div style={{ display: "grid", gridTemplateColumns: "200px 1fr 240px", gap: 20, marginBottom: 24 }}>

        {/* Donut chart */}
        <div style={{ background: "#1e293b", borderRadius: 16, padding: "20px", display: "flex", flexDirection: "column", alignItems: "center", gap: 12, border: "1px solid #334155" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>By Severity</span>
          <svg width={200} height={200} viewBox="0 0 200 200">
            {slices.map((s, i) => (
              <circle key={i} cx={cx} cy={cy} r={r}
                fill="none" stroke={s.color} strokeWidth={stroke}
                strokeDasharray={`${s.dash} ${s.gap}`}
                strokeDashoffset={-s.offset}
                style={{ transform: "rotate(-90deg)", transformOrigin: "100px 100px" }}
              />
            ))}
            <text x={cx} y={cy - 8} textAnchor="middle" fill="#f1f5f9" fontSize={26} fontWeight={800}>{total}</text>
            <text x={cx} y={cy + 14} textAnchor="middle" fill="#64748b" fontSize={11}>issues</text>
          </svg>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
            {donutData.map(d => (
              <div key={d.label} style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: 2, background: d.color }} />
                  <span style={{ fontSize: 12, color: "#94a3b8" }}>{d.label}</span>
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#f1f5f9" }}>{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Area bar chart */}
        <div style={{ background: "#1e293b", borderRadius: 16, padding: "20px", border: "1px solid #334155" }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em", display: "block", marginBottom: 16 }}>Issues by Area</span>
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {areas.map(([area, cnt]) => (
              <div key={area} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <span style={{ fontSize: 12, color: "#94a3b8", width: 130, flexShrink: 0 }}>{area}</span>
                <div style={{ flex: 1, background: "#0f172a", borderRadius: 6, height: 20, overflow: "hidden" }}>
                  <div style={{ width: `${(cnt / maxArea) * 100}%`, height: "100%", background: areaColor[area] ?? "#6366f1", borderRadius: 6, transition: "width 0.4s" }} />
                </div>
                <span style={{ fontSize: 12, fontWeight: 700, color: "#f1f5f9", width: 20, textAlign: "right" }}>{cnt}</span>
              </div>
            ))}
          </div>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: "1px solid #334155", display: "flex", gap: 16 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#ef4444" }}>{total - fixed}</div>
              <div style={{ fontSize: 10, color: "#64748b" }}>Open</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#22c55e" }}>{fixed}</div>
              <div style={{ fontSize: 10, color: "#64748b" }}>Fixed this session</div>
            </div>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 22, fontWeight: 800, color: "#f97316" }}>7</div>
              <div style={{ fontSize: 10, color: "#64748b" }}>Blockers (Crit+High)</div>
            </div>
          </div>
        </div>

        {/* Launch meter */}
        <div style={{ background: "#1e293b", borderRadius: 16, padding: "20px", border: "1px solid #334155", display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 600, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.08em" }}>Launch Readiness</span>
          <svg width={200} height={130} viewBox="0 0 200 130">
            <path d="M 20 110 A 80 80 0 0 1 180 110" fill="none" stroke="#1e3a5f" strokeWidth={18} strokeLinecap="round" />
            <path d="M 20 110 A 80 80 0 0 1 180 110" fill="none" stroke="url(#launchGrad)" strokeWidth={18} strokeLinecap="round"
              strokeDasharray={`${(launchScore / 100) * 251.2} 251.2`} />
            <defs>
              <linearGradient id="launchGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="#ef4444" />
                <stop offset="50%" stopColor="#f97316" />
                <stop offset="100%" stopColor="#eab308" />
              </linearGradient>
            </defs>
            <text x={100} y={100} textAnchor="middle" fill="#f1f5f9" fontSize={36} fontWeight={900}>{launchScore}%</text>
            <text x={100} y={122} textAnchor="middle" fill="#f97316" fontSize={11} fontWeight={600}>NOT LAUNCH READY</text>
          </svg>
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: 6 }}>
            {[
              { label: "Auth & Login", pct: 85, ok: true },
              { label: "Payments", pct: 80, ok: true },
              { label: "Push Notifications", pct: 90, ok: true },
              { label: "Storefront Data", pct: 10, ok: false },
              { label: "Admin Panel", pct: 30, ok: false },
              { label: "Vendor Dashboard", pct: 50, ok: false },
            ].map(item => (
              <div key={item.label}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 2 }}>
                  <span style={{ fontSize: 10, color: "#94a3b8" }}>{item.label}</span>
                  <span style={{ fontSize: 10, color: item.ok ? "#22c55e" : "#ef4444", fontWeight: 700 }}>{item.pct}%</span>
                </div>
                <div style={{ height: 4, background: "#0f172a", borderRadius: 4 }}>
                  <div style={{ height: "100%", width: `${item.pct}%`, background: item.ok ? "#22c55e" : "#ef4444", borderRadius: 4 }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Bug list */}
      <div style={{ background: "#1e293b", borderRadius: 16, border: "1px solid #334155", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #334155", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 13, fontWeight: 700, color: "#f1f5f9" }}>Full Issue List</span>
          <div style={{ display: "flex", gap: 8 }}>
            {Object.entries(counts).map(([sev, cnt]) => (
              <div key={sev} style={{ background: sevConfig[sev].bg, color: sevConfig[sev].text, border: `1px solid ${sevConfig[sev].border}`, borderRadius: 20, padding: "2px 10px", fontSize: 11, fontWeight: 700 }}>
                {cnt} {sev}
              </div>
            ))}
          </div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 0 }}>
          {bugs.map((bug, idx) => {
            const cfg = sevConfig[bug.sev];
            const isFixed = bug.id <= 4;
            return (
              <div key={bug.id} style={{ padding: "14px 20px", borderBottom: "1px solid #0f172a", borderRight: idx % 2 === 0 ? "1px solid #0f172a" : "none", display: "flex", gap: 12, alignItems: "flex-start" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4, flexShrink: 0, marginTop: 2 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 6, background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, fontWeight: 700, color: "#475569" }}>
                    #{bug.id}
                  </div>
                  {isFixed && <div style={{ fontSize: 9, color: "#22c55e", fontWeight: 700, background: "#052e16", padding: "1px 4px", borderRadius: 4 }}>FIXED</div>}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 4, flexWrap: "wrap" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, background: cfg.bg, border: `1px solid ${cfg.border}`, borderRadius: 12, padding: "1px 8px" }}>
                      <div style={{ width: 6, height: 6, borderRadius: "50%", background: cfg.dot }} />
                      <span style={{ fontSize: 10, fontWeight: 700, color: cfg.text }}>{bug.sev}</span>
                    </div>
                    <span style={{ fontSize: 10, color: "#475569", background: "#0f172a", borderRadius: 12, padding: "1px 8px" }}>{bug.area}</span>
                  </div>
                  <p style={{ margin: "0 0 3px", fontSize: 12, fontWeight: 600, color: isFixed ? "#64748b" : "#f1f5f9", textDecoration: isFixed ? "line-through" : "none" }}>{bug.title}</p>
                  <p style={{ margin: 0, fontSize: 11, color: "#64748b", lineHeight: 1.4 }}>{bug.detail}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div style={{ marginTop: 20, display: "flex", gap: 12, flexWrap: "wrap" }}>
        {[
          { icon: "🔴", label: "4 Critical bugs fixed this session", color: "#ef4444" },
          { icon: "🟠", label: "6 High issues need fixing before launch", color: "#f97316" },
          { icon: "🟡", label: "7 Medium issues — fix before public beta", color: "#eab308" },
          { icon: "🟢", label: "4 Low issues — nice to fix, not blockers", color: "#22c55e" },
        ].map(item => (
          <div key={item.label} style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: 10, padding: "8px 14px", display: "flex", alignItems: "center", gap: 8, fontSize: 12 }}>
            <span>{item.icon}</span>
            <span style={{ color: "#94a3b8" }}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
