import Lottie from "lottie-react";
import { useEffect, useState } from "react";

const LOTTIE_URL = "https://lottie.host/443a3c76-2558-4228-9249-0047811d0c36/LJpVwEm3aA.json";

export function AnimatedLoginBackground() {
  const [animationData, setAnimationData] = useState<object | null>(null);

  useEffect(() => {
    fetch(LOTTIE_URL)
      .then(r => r.json())
      .then(setAnimationData)
      .catch(() => {});
  }, []);

  return (
    <div className="fixed inset-0 z-0 bg-[#080808] overflow-hidden" aria-hidden="true">
      {animationData && (
        <Lottie
          animationData={animationData}
          loop
          autoplay
          style={{
            position: "absolute",
            inset: 0,
            width: "100%",
            height: "100%",
          }}
        />
      )}
      {/* Gradient so the login form stays readable over the animation */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: "linear-gradient(to top, rgba(8,8,8,0.88) 25%, rgba(8,8,8,0.15) 100%)",
        }}
      />
    </div>
  );
}
