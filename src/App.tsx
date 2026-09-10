"use client";

import * as React from "react";
import { LiquidGlassFooter } from "./components/liquid-glass-footer";

export default function App() {
  return (
    <main className="relative w-full min-h-[115vh] overflow-x-hidden flex flex-col items-center font-sans selection:bg-white/20 selection:text-white">
      {/* Fixed Background Video */}
      <video
        autoPlay
        loop
        muted
        playsInline
        className="fixed inset-0 w-full h-full object-cover z-[0]"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260429_114316_1c7889ad-2885-410e-b493-98119fee0ddb.mp4"
      />

      {/* Content Wrapper */}
      <div className="relative z-10 w-full max-w-7xl px-6 py-16 flex flex-col flex-1 justify-between min-h-[115vh]">
        {/* Upper CTA Section (Placeholder) */}
        <div className="pt-24 md:pt-40 flex flex-col items-center text-center max-w-3xl mx-auto">
          <span className="inline-block px-4 py-1.5 rounded-full border border-white/20 bg-white/10 text-xs font-semibold uppercase tracking-wider text-white backdrop-blur-md mb-6">
            Lumina Intelligence
          </span>
          <h1 className="text-5xl sm:text-6xl md:text-7xl font-bold tracking-tight text-white leading-[1.08]">
            Clarity on global events,
            <br />
            <em className="font-serif italic font-normal text-white/90">
              shared for all.
            </em>
          </h1>
          <p className="mt-6 text-base sm:text-lg text-white/80 max-w-xl leading-relaxed">
            Lumina provides premium clarity on global events and cosmic wonders — shared with all for free.
          </p>
          <div className="mt-8 flex gap-4">
            <button
              type="button"
              className="h-12 px-8 rounded-2xl bg-white text-black text-sm font-semibold shadow-xl hover:bg-white/90 transition-all active:scale-95"
            >
              Get Started
            </button>
          </div>
        </div>

        {/* Liquid Glass Footer */}
        <LiquidGlassFooter />
      </div>
    </main>
  );
}
