import React from "react";
import Planner from "./Planner";

const App: React.FC = () => {
  const scrollToPlanner = () => {
    const el = document.getElementById("planner-section");
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50">
      {/* Top hero / landing section */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-lg">
              ₹
            </div>
            <div className="flex flex-col leading-tight">
              <span className="font-semibold text-sm">SIPly Smart</span>
              <span className="text-[11px] text-slate-400">
                Invest with logic, not vibes.
              </span>
            </div>
          </div>
          <button
            onClick={scrollToPlanner}
            className="text-xs px-3 py-1.5 rounded-full bg-emerald-500 text-slate-950 font-semibold hover:bg-emerald-400 transition"
          >
            Open Planner
          </button>
        </div>
      </header>

      {/* Hero + description */}
      <section className="max-w-5xl mx-auto px-4 pt-8 pb-4">
        <div className="grid md:grid-cols-[1.4fr,1fr] gap-6 items-center">
          <div className="space-y-3">
            <p className="inline-flex items-center gap-2 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-3 py-1 text-[11px] text-emerald-200">
              <span className="text-xs">💸</span>
              <span>Goal-based investing for students & young professionals</span>
            </p>
            <h1 className="text-3xl md:text-4xl font-bold tracking-tight">
              Stop guessing your SIP.  
              <span className="text-emerald-400 block">
                See if your goals actually add up.
              </span>
            </h1>
            <p className="text-sm text-slate-300 max-w-xl">
              SIPly Smart helps you plan multiple goals &mdash; like higher studies,
              travel, and emergency funds &mdash; while checking if your income,
              timelines, and investments are actually realistic. Less delulu, more math.
            </p>
            <div className="grid sm:grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <p className="font-semibold mb-1">🎯 Multi-goal planner</p>
                <p className="text-slate-400">
                  Add several goals, set priorities, and see how they fight for your money.
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <p className="font-semibold mb-1">📈 Inflation-aware math</p>
                <p className="text-slate-400">
                  Targets are adjusted for inflation, returns, and time &mdash; not vibes.
                </p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-900/60 p-3">
                <p className="font-semibold mb-1">😱→🐐 Emoji score</p>
                <p className="text-slate-400">
                  Instant “you&apos;re screwed / you&apos;re safe” feedback on each goal.
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <button
                onClick={scrollToPlanner}
                className="px-4 py-2 rounded-xl bg-emerald-500 text-slate-950 font-semibold text-sm hover:bg-emerald-400 transition"
              >
                Start planning now
              </button>
              <p className="text-[11px] text-slate-500">
                No login, no data upload, everything runs in your browser.
              </p>
            </div>
          </div>
          <div className="hidden md:block">
            <div className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4 text-xs space-y-2 shadow-lg shadow-emerald-500/10">
              <p className="text-slate-400 mb-1">Preview</p>
              <div className="flex items-center justify-between text-[11px]">
                <span className="font-semibold">MS Abroad Fund</span>
                <span className="rounded-full bg-emerald-500/10 text-emerald-300 px-2 py-0.5 border border-emerald-500/40">
                  😎 On track
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-1">
                <div className="space-y-0.5">
                  <p className="text-slate-500">Inflation target</p>
                  <p className="font-semibold">₹18,40,000</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-slate-500">Projected value</p>
                  <p className="font-semibold">₹19,20,000</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-slate-500">Coverage</p>
                  <p className="font-semibold">104%</p>
                </div>
                <div className="space-y-0.5">
                  <p className="text-slate-500">Monthly SIP</p>
                  <p className="font-semibold">₹10,000</p>
                </div>
              </div>
              <div className="mt-2 h-16 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-[10px] text-slate-500">
                📊 Live planner below &mdash; scroll or click &quot;Start planning&quot;.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Actual planner app */}
      <main id="planner-section" className="pt-4">
        <Planner />
      </main>

      <footer className="border-t border-slate-800 mt-6">
        <div className="max-w-5xl mx-auto px-4 py-4 text-[11px] text-slate-500 flex flex-wrap justify-between gap-2">
          <span>Built as a fintech hackathon project.</span>
          <span>Not investment advice. Don&apos;t sue us if you ignore 😱.</span>
        </div>
      </footer>
    </div>
  );
};

export default App;
