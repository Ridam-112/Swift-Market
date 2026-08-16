import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { Palette, RefreshCw, Save, Check, Sparkles, Sliders, Type, LayoutTemplate } from "lucide-react";
import { motion } from "framer-motion";

interface ThemeConfig {
  primaryColor: string;
  secondaryColor: string;
  borderRadius: number;
  fontFamily: string;
  customTokens?: Record<string, unknown>;
}

const DEFAULT_THEME: ThemeConfig = {
  primaryColor: "#E23744",
  secondaryColor: "#000000",
  borderRadius: 12,
  fontFamily: "Outfit",
};

const COLOR_PRESETS = [
  { name: "Zomato Red", color: "#E23744" },
  { name: "Swiggy Orange", color: "#FC8019" },
  { name: "Zepto Violet", color: "#7B2CBF" },
  { name: "Blinkit Yellow", color: "#F7C948" },
  { name: "Emerald Green", color: "#10B981" },
  { name: "Royal Blue", color: "#2563EB" },
  { name: "Midnight Black", color: "#18181B" },
];

const FONT_OPTIONS = [
  { label: "Outfit (Modern & Clean)", value: "Outfit" },
  { label: "Inter (Classic & Readable)", value: "Inter" },
  { label: "Plus Jakarta Sans (Trendy)", value: "Plus Jakarta Sans" },
  { label: "Poppins (Friendly & Rounded)", value: "Poppins" },
  { label: "System Default", value: "system-ui, -apple-system, sans-serif" },
];

export function ThemeConfigTab() {
  const [theme, setTheme] = useState<ThemeConfig>(DEFAULT_THEME);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const fetchThemeConfig = async () => {
    setLoading(true);
    try {
      const res = await api.get<{ success: boolean; theme: ThemeConfig }>("/theme-config");
      if (res.success && res.theme) {
        setTheme({
          primaryColor: res.theme.primaryColor || DEFAULT_THEME.primaryColor,
          secondaryColor: res.theme.secondaryColor || DEFAULT_THEME.secondaryColor,
          borderRadius: typeof res.theme.borderRadius === "number" ? res.theme.borderRadius : DEFAULT_THEME.borderRadius,
          fontFamily: res.theme.fontFamily || DEFAULT_THEME.fontFamily,
        });
      }
    } catch (err) {
      console.error("Failed to load theme config:", err);
      toast.error("Using default theme settings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchThemeConfig();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.put<{ success: boolean; message?: string; theme: ThemeConfig }>("/admin/theme-config", theme);
      if (res.success) {
        toast.success(res.message || "Theme configuration saved successfully!");
      } else {
        toast.error("Failed to save theme config");
      }
    } catch (err: any) {
      console.error("Failed to update theme config:", err);
      toast.error(err?.response?.data?.message || err?.message || "Failed to update theme configuration");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[350px] gap-3">
        <RefreshCw className="w-8 h-8 text-primary animate-spin" />
        <p className="text-sm text-gray-500 font-medium">Loading remote theme configuration...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <Palette className="w-6 h-6 text-primary" />
            <h2 className="text-xl font-bold text-gray-900">Hybrid Design System — Remote Theme Config</h2>
          </div>
          <p className="text-sm text-gray-500 mt-1">
            Dynamically adjust branding tokens (Primary Color, Radius, Typography) served live to web & mobile clients.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            onClick={fetchThemeConfig}
            disabled={saving}
            className="flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Reset
          </Button>
          <Button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 bg-primary text-white hover:opacity-95"
          >
            {saving ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save Changes
          </Button>
        </div>
      </div>

      {/* Main Grid: Controls & Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Controls Section */}
        <div className="lg:col-span-6 space-y-6 bg-white p-6 rounded-2xl border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 flex items-center gap-2 text-base border-b pb-3">
            <Sliders className="w-5 h-5 text-gray-700" />
            Design Tokens
          </h3>

          {/* Primary Color */}
          <div className="space-y-3">
            <label className="text-sm font-semibold text-gray-700 block">Primary Brand Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={theme.primaryColor}
                onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                className="w-12 h-10 rounded-lg cursor-pointer border border-gray-200 p-1"
              />
              <Input
                type="text"
                value={theme.primaryColor}
                onChange={(e) => setTheme({ ...theme, primaryColor: e.target.value })}
                placeholder="#E23744"
                className="font-mono text-sm uppercase max-w-[160px]"
              />
            </div>

            {/* Presets */}
            <div className="flex flex-wrap gap-2 pt-1">
              {COLOR_PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  onClick={() => setTheme({ ...theme, primaryColor: preset.color })}
                  className="flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full border border-gray-200 hover:border-gray-400 transition-colors"
                >
                  <span className="w-3 h-3 rounded-full" style={{ backgroundColor: preset.color }} />
                  {preset.name}
                  {theme.primaryColor.toLowerCase() === preset.color.toLowerCase() && (
                    <Check className="w-3 h-3 text-emerald-600" />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Secondary Color */}
          <div className="space-y-3 pt-2">
            <label className="text-sm font-semibold text-gray-700 block">Secondary Accent Color</label>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={theme.secondaryColor}
                onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                className="w-12 h-10 rounded-lg cursor-pointer border border-gray-200 p-1"
              />
              <Input
                type="text"
                value={theme.secondaryColor}
                onChange={(e) => setTheme({ ...theme, secondaryColor: e.target.value })}
                placeholder="#000000"
                className="font-mono text-sm uppercase max-w-[160px]"
              />
            </div>
          </div>

          {/* Border Radius */}
          <div className="space-y-3 pt-2">
            <div className="flex justify-between items-center">
              <label className="text-sm font-semibold text-gray-700">Border Radius</label>
              <span className="text-xs font-mono font-bold bg-gray-100 px-2 py-0.5 rounded-md text-gray-800">
                {theme.borderRadius}px
              </span>
            </div>
            <input
              type="range"
              min="0"
              max="24"
              step="2"
              value={theme.borderRadius}
              onChange={(e) => setTheme({ ...theme, borderRadius: parseInt(e.target.value, 10) || 0 })}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[11px] text-gray-400 font-mono">
              <span>0px (Sharp)</span>
              <span>12px (Rounded)</span>
              <span>24px (Pill)</span>
            </div>
          </div>

          {/* Font Family */}
          <div className="space-y-3 pt-2">
            <label className="text-sm font-semibold text-gray-700 flex items-center gap-2">
              <Type className="w-4 h-4 text-gray-600" />
              Font Family
            </label>
            <select
              value={theme.fontFamily}
              onChange={(e) => setTheme({ ...theme, fontFamily: e.target.value })}
              className="w-full h-10 rounded-lg border border-gray-200 px-3 text-sm bg-white font-medium focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {FONT_OPTIONS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Visual Preview Section */}
        <div className="lg:col-span-6 bg-slate-900 text-white p-6 rounded-2xl border border-slate-800 flex flex-col justify-between space-y-6">
          <div>
            <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <LayoutTemplate className="w-5 h-5 text-amber-400" />
                <h3 className="font-bold text-white text-base">Live Component Preview</h3>
              </div>
              <Badge variant="outline" className="text-xs border-slate-700 text-slate-300 flex gap-1 items-center">
                <Sparkles className="w-3 h-3 text-amber-400" /> Real-time
              </Badge>
            </div>

            {/* Dynamic Card Container */}
            <div
              className="bg-slate-950 p-5 border border-slate-800 space-y-5 transition-all duration-200 shadow-xl"
              style={{
                borderRadius: `${theme.borderRadius}px`,
                fontFamily: theme.fontFamily,
              }}
            >
              {/* Product Header */}
              <div className="flex items-center justify-between">
                <span
                  className="px-2.5 py-0.5 text-xs font-bold text-white uppercase tracking-wider"
                  style={{
                    backgroundColor: theme.secondaryColor,
                    borderRadius: `${Math.max(4, theme.borderRadius / 2)}px`,
                  }}
                >
                  ⚡ 10 MIN DELIVERY
                </span>
                <span className="text-xs text-slate-400 font-medium">Balurghat Store</span>
              </div>

              {/* Sample Title */}
              <div>
                <h4 className="text-lg font-bold text-white" style={{ fontFamily: theme.fontFamily }}>
                  SwiftMart Dynamic Button & Card
                </h4>
                <p className="text-xs text-slate-400 mt-0.5">
                  Visual representation of client UI rendering with active remote tokens.
                </p>
              </div>

              {/* Mock Input */}
              <div className="space-y-1.5">
                <label className="text-xs text-slate-400">Search Products</label>
                <div
                  className="bg-slate-900 border border-slate-800 px-3 py-2 text-sm text-slate-200 flex items-center justify-between"
                  style={{ borderRadius: `${Math.max(4, theme.borderRadius / 2)}px` }}
                >
                  <span>Fresh Amul Milk (1L)...</span>
                  <span className="text-xs text-slate-500">🔍</span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-2">
                <button
                  className="flex-1 py-2.5 px-4 font-bold text-white text-sm shadow-lg transition-transform active:scale-95 flex items-center justify-center gap-2"
                  style={{
                    backgroundColor: theme.primaryColor,
                    borderRadius: `${theme.borderRadius}px`,
                    fontFamily: theme.fontFamily,
                  }}
                >
                  <span>Add to Cart</span>
                  <span className="bg-white/20 px-1.5 py-0.5 text-xs rounded">₹62</span>
                </button>

                <button
                  className="py-2.5 px-4 font-semibold text-slate-300 text-sm border border-slate-700 hover:bg-slate-800"
                  style={{
                    borderRadius: `${theme.borderRadius}px`,
                    fontFamily: theme.fontFamily,
                  }}
                >
                  Wishlist
                </button>
              </div>
            </div>
          </div>

          {/* Token Summary Footer */}
          <div className="bg-slate-950/80 p-3.5 rounded-xl border border-slate-800/80 font-mono text-xs text-slate-400 space-y-1">
            <div className="flex justify-between">
              <span>Primary Color:</span>
              <span className="text-white font-bold">{theme.primaryColor}</span>
            </div>
            <div className="flex justify-between">
              <span>Border Radius:</span>
              <span className="text-white font-bold">{theme.borderRadius}px</span>
            </div>
            <div className="flex justify-between">
              <span>Font Family:</span>
              <span className="text-white font-bold">{theme.fontFamily}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
