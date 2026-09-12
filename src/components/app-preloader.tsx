"use client";

import React, { useEffect, useState } from "react";
import { ParticleWave } from "@/components/ui/particle-wave";

export function AppPreloader() {
  const [visible, setVisible] = useState(true);
  const [unmounted, setUnmounted] = useState(false);

  useEffect(() => {
    // Check if force previewed via ?preloader query
    const params = new URLSearchParams(window.location.search);
    const force = params.has("preloader");

    if (!force) {
      const hasSeen = sessionStorage.getItem("sc_preloader_seen");
      if (hasSeen) {
        setUnmounted(true);
        return;
      }
    }

    // Smooth fade out after 2.5s
    const timerFade = setTimeout(() => {
      setVisible(false);
      try {
        sessionStorage.setItem("sc_preloader_seen", "1");
      } catch {}
    }, 2500);

    // Unmount canvas after transition to free up GPU & memory
    const timerUnmount = setTimeout(() => {
      setUnmounted(true);
    }, 3200);

    return () => {
      clearTimeout(timerFade);
      clearTimeout(timerUnmount);
    };
  }, []);

  if (unmounted) return null;

  return (
    <div
      role="status"
      aria-label="Loading Smark Connect"
      className={`fixed inset-0 z-[99999] flex flex-col justify-between bg-[#05030a] text-white overflow-hidden transition-opacity duration-700 ease-out select-none ${
        visible ? "opacity-100" : "opacity-0 pointer-events-none"
      }`}
    >
      {/* Interactive 3D Particle Wave Canvas */}
      <ParticleWave />

      {/* Subtle Pitch Dark Purple Ambient Vignette */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(112,26,189,0.18)_0%,rgba(5,3,10,0.65)_85%)]" />

      {/* On the Top: Smark Connect Written in Bold */}
      <header className="relative z-20 flex w-full flex-col items-center justify-center pt-8 sm:pt-14 px-6 text-center">
        <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-white font-sans drop-shadow-[0_4px_30px_rgba(168,85,247,0.55)]">
          Smark Connect
        </h1>
        <p className="mt-2.5 text-xs sm:text-sm font-semibold tracking-[0.25em] uppercase text-purple-300/90">
          Your AI CMO
        </p>
      </header>

      {/* Top Left Floating Indicator matching DemoOne */}
      <div className="absolute top-5 left-5 z-20 hidden sm:block text-slate-400 text-xs font-mono pointer-events-none">
        <p className="font-bold text-white tracking-wide">Smark Connect</p>
        <p className="text-[11px] opacity-60 mt-0.5">Move your mouse to interact</p>
      </div>

      {/* Bottom Status Indicator */}
      <footer className="relative z-20 flex flex-col items-center justify-center pb-8 sm:pb-12 px-6 text-center pointer-events-none">
        <div className="flex items-center gap-2.5 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 backdrop-blur-md shadow-lg shadow-purple-950/30">
          <span className="relative flex size-2">
            <span className="absolute inline-flex size-full rounded-full bg-purple-400 animate-ping opacity-75" />
            <span className="relative inline-flex size-2 rounded-full bg-purple-400 shadow-[0_0_8px_#c084fc]" />
          </span>
          <span className="text-xs font-mono text-slate-300">
            Initializing Autonomous Intelligence...
          </span>
        </div>
        <p className="mt-2.5 text-[11px] text-slate-500 font-mono">
          Move your mouse to interact with the particle wave
        </p>
      </footer>
    </div>
  );
}

export default AppPreloader;
