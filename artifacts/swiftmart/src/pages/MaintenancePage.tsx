import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { MessageCircle, Phone, RefreshCw, AlertTriangle, Clock, ShieldAlert } from "lucide-react";

export default function MaintenancePage() {
  const [copied, setCopied] = useState(false);
  const phoneNumber = "6296118949";
  const whatsappUrl = `https://wa.me/91${phoneNumber}?text=${encodeURIComponent("Hello SwiftMart! Ami ekta order dite chai.")}`;

  const copyPhone = () => {
    navigator.clipboard.writeText(phoneNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <>
      <Helmet>
        <title>SwiftMart — We Will Be Back Soon | Under Maintenance</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-[#0a0a0f] text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans select-none">
        {/* Background glow & mesh */}
        <div
          className="pointer-events-none fixed top-[-100px] left-1/2 -translate-x-1/2 w-[700px] h-[500px] rounded-full opacity-30 blur-[100px]"
          style={{
            background: "radial-gradient(circle, #f59e0b 0%, #10b981 40%, transparent 70%)",
          }}
        />

        {/* Card */}
        <div className="relative w-full max-w-[560px] bg-gradient-to-b from-[#16171f] to-[#101118] border border-amber-500/30 rounded-3xl p-6 sm:p-10 text-center shadow-2xl shadow-amber-950/20 backdrop-blur-xl">
          
          {/* Brand header */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 to-amber-600 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-amber-500/30">
              🛒
            </div>
            <div className="text-left">
              <span className="text-2xl font-black tracking-tight text-white block leading-none">
                Swift<span className="text-amber-400">Mart</span>
              </span>
              <span className="text-[10px] text-amber-400/80 font-bold uppercase tracking-wider">
                Fastest Local Delivery
              </span>
            </div>
          </div>

          {/* Animated gear & maintenance badge */}
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold tracking-wide px-4 py-1.5 rounded-full mb-5 animate-pulse">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>WEBSITE MAINTENANCE</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug mb-3">
            We Will Be Back Soon!
          </h1>
          
          <p className="text-base sm:text-lg font-semibold text-amber-300/90 mb-2">
            ওয়েবসাইটে টেকনিক্যাল আপগ্রেডের কাজ চলছে
          </p>

          <p className="text-sm text-slate-400 leading-relaxed mb-6 max-w-md mx-auto">
            আপনাদের আরও ভালো শপিং অভিজ্ঞতা দিতে সার্ভার অপ্টিমাইজ করা হচ্ছে। খুব শীঘ্রই ওয়েবসাইট সম্পূর্ণরূপে সচল হবে।
          </p>

          {/* WhatsApp Order Action Box (Prominent) */}
          <div className="bg-gradient-to-b from-emerald-950/50 to-emerald-900/20 border-2 border-emerald-500/40 rounded-2xl p-5 mb-6 text-left shadow-lg shadow-emerald-950/50">
            <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm uppercase tracking-wide mb-1.5">
              <MessageCircle className="w-5 h-5 fill-emerald-400 text-emerald-950" />
              <span>জরুরি অর্ডার করতে চান?</span>
            </div>
            
            <p className="text-xs sm:text-sm text-slate-300 mb-4 font-medium">
              ওয়েবসাইটে কাজ চলাকালীন যেকোনো মুদি, মিষ্টি, খাবার বা অন্যান্য সামগ্রী অর্ডার করতে সরাসরি WhatsApp-এ মেসেজ করুন:
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-3 rounded-xl shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] text-sm"
              >
                <MessageCircle className="w-5 h-5 fill-current" />
                <span>WhatsApp এ অর্ডার করুন</span>
              </a>

              <a
                href={`tel:${phoneNumber}`}
                className="inline-flex items-center justify-center gap-2 bg-slate-800 hover:bg-slate-700 text-white font-bold px-4 py-3 rounded-xl border border-slate-700 transition-all text-sm"
              >
                <Phone className="w-4 h-4 text-emerald-400" />
                <span>{phoneNumber}</span>
              </a>
            </div>

            <div className="mt-3 text-center sm:text-left flex items-center justify-between text-[11px] text-emerald-400/80 pt-2 border-t border-emerald-500/20">
              <span>📱 হেল্পলাইন: <strong>+91 {phoneNumber}</strong></span>
              <button 
                onClick={copyPhone}
                type="button"
                className="text-xs text-amber-300 hover:underline font-semibold"
              >
                {copied ? "✓ Copied!" : "Copy Number"}
              </button>
            </div>
          </div>

          {/* Refresh Action */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={() => window.location.reload()}
              type="button"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white px-4 py-2 rounded-lg bg-slate-800/40 hover:bg-slate-800 border border-slate-800 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>পেজ রিফ্রেশ করুন (Reload)</span>
            </button>
          </div>

        </div>

        {/* Footer */}
        <p className="mt-6 text-xs text-slate-600 font-medium">
          © {new Date().getFullYear()} SwiftMart Technologies. We will be back online shortly.
        </p>
      </div>
    </>
  );
}
