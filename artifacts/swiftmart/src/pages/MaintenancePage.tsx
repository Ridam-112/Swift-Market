import { useEffect, useState } from "react";
import { Helmet } from "react-helmet-async";
import { MessageCircle, Phone, RefreshCw, AlertTriangle, Smartphone, Store, Sparkles, ShoppingBag } from "lucide-react";

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
        <title>SwiftMart — Upgrading for You | We Will Be Back Soon</title>
        <meta name="robots" content="noindex, nofollow" />
      </Helmet>

      <div className="min-h-screen bg-[#090a10] text-white flex flex-col items-center justify-center p-4 sm:p-6 relative overflow-hidden font-sans select-none">
        {/* Background ambient lighting */}
        <div
          className="pointer-events-none fixed top-[-120px] left-1/2 -translate-x-1/2 w-[750px] h-[550px] rounded-full opacity-35 blur-[110px]"
          style={{
            background: "radial-gradient(circle, #f59e0b 0%, #6366f1 40%, #10b981 70%, transparent 85%)",
          }}
        />

        {/* Main Card */}
        <div className="relative w-full max-w-[580px] bg-gradient-to-b from-[#151722]/95 to-[#0d0e15]/95 border border-amber-500/25 rounded-3xl p-6 sm:p-10 text-center shadow-2xl shadow-purple-950/20 backdrop-blur-2xl">
          
          {/* Brand header */}
          <div className="flex items-center justify-center gap-3 mb-6">
            <div className="w-12 h-12 bg-gradient-to-br from-amber-400 via-amber-500 to-orange-500 rounded-2xl flex items-center justify-center text-2xl shadow-lg shadow-amber-500/30">
              🛒
            </div>
            <div className="text-left">
              <span className="text-2xl font-black tracking-tight text-white block leading-none">
                Swift<span className="text-amber-400">Mart</span>
              </span>
              <span className="text-[10px] text-amber-400/90 font-bold uppercase tracking-widest">
                Fastest Hyperlocal Delivery
              </span>
            </div>
          </div>

          {/* Animated badge */}
          <div className="inline-flex items-center gap-2 bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-bold tracking-wide px-4 py-1.5 rounded-full mb-4 animate-pulse">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>MAJOR SYSTEM UPGRADE IN PROGRESS</span>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-snug mb-2">
            We Will Be Back Soon!
          </h1>
          
          <p className="text-base font-bold text-amber-300 mb-3">
            ওয়েবসাইটে বড় ধরনের আপগ্রেডের কাজ চলছে 🚀
          </p>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed mb-6 max-w-lg mx-auto">
            আপনাদের আরও সুপারফাস্ট ও দুর্দান্ত শপিং অভিজ্ঞতা দিতে আমাদের পুরো প্ল্যাটফর্ম অপ্টিমাইজ করা হচ্ছে। অনুগ্রহ করে একটু ধৈর্য ধরুন — খুব শীঘ্রই নতুন রূপ নিয়ে ফিরছি!
          </p>

          {/* Feature Highlights Banner */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 mb-6 text-left">
            <div className="bg-slate-900/80 border border-indigo-500/30 rounded-xl p-3 flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 mt-0.5">
                <Smartphone className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">SwiftMart App আসছে!</p>
                <p className="text-[11px] text-indigo-200/80">Play Store এ খুব শীঘ্রই অফিশিয়াল অ্যাপ লঞ্চ হচ্ছে।</p>
              </div>
            </div>

            <div className="bg-slate-900/80 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <Store className="w-4 h-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-white">আরও অনেক নতুন দোকান!</p>
                <p className="text-[11px] text-amber-200/80">আপনার শহরের সেরা সব শপ ও নতুন প্রোডাক্ট অ্যাড হচ্ছে।</p>
              </div>
            </div>
          </div>

          {/* WhatsApp Order Action Box */}
          <div className="bg-gradient-to-b from-emerald-950/60 to-emerald-900/25 border-2 border-emerald-500/40 rounded-2xl p-5 mb-6 text-left shadow-xl shadow-emerald-950/40">
            <div className="flex items-center gap-2 text-emerald-400 font-extrabold text-sm uppercase tracking-wide mb-1.5">
              <ShoppingBag className="w-4 h-4 text-emerald-400" />
              <span>জরুরি অর্ডার করতে চান?</span>
            </div>
            
            <p className="text-xs text-slate-200 mb-4 font-medium leading-relaxed">
              ওয়েবসাইটে কাজ চলাকালীন যেকোনো মুদি, মিষ্টি, কেক, খাবার বা অন্যান্য সামগ্রী অর্ডার করতে সরাসরি WhatsApp-এ যোগাযোগ করুন:
            </p>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <a
                href={whatsappUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black px-5 py-3 rounded-xl shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02] active:scale-[0.98] text-sm"
              >
                <MessageCircle className="w-4 h-4 fill-current" />
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

            <div className="mt-3 text-center sm:text-left flex items-center justify-between text-[11px] text-emerald-400/90 pt-2.5 border-t border-emerald-500/20">
              <span>📱 সরাসরি হেল্পলাইন: <strong>+91 {phoneNumber}</strong></span>
              <button 
                onClick={copyPhone}
                type="button"
                className="text-xs text-amber-300 hover:underline font-bold"
              >
                {copied ? "✓ Copied!" : "Copy Number"}
              </button>
            </div>
          </div>

          {/* Refresh Action */}
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={() => window.location.reload()}
              type="button"
              className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white px-4 py-2 rounded-lg bg-slate-800/50 hover:bg-slate-800 border border-slate-700/60 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>পেজ রিফ্রেশ করুন (Check Status)</span>
            </button>
          </div>

        </div>

        {/* Footer */}
        <p className="mt-6 text-xs text-slate-600 font-medium">
          © {new Date().getFullYear()} SwiftMart Technologies. Thank you for your patience!
        </p>
      </div>
    </>
  );
}
