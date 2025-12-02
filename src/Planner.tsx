import React, { useEffect, useMemo, useState } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

type RiskProfile = "conservative" | "moderate" | "aggressive";

type Inputs = {
  goalName: string;
  goalType: string;
  targetAmount: string;
  years: string;
  currentSavings: string;
  monthlyContribution: string;
  annualReturn: string;
  inflationRate: string;
  monthsInvested: string;
  priority: string; // 1–5
};

type ProjectionPoint = {
  month: number;
  yearLabel: string;
  value: number;
};

type Results = {
  fvLump: number;
  fvSip: number;
  fvTotal: number;
  gap: number;
  monthlyRequired: number | null;
  projection: ProjectionPoint[];
  healthEmoji: string;
  healthLabel: string;
  coverage: number; // fvTotal / effectiveTarget
  effectiveTarget: number;
};

type Goal = {
  id: number;
  inputs: Inputs;
  results: Results | null;
};

type StoredState = {
  goals: Goal[];
  riskProfile: RiskProfile;
  monthlyIncome: string;
};

const STORAGE_KEY = "goal-planner-v1";

const formatINR = (value: number) =>
  "₹" + value.toLocaleString("en-IN", { maximumFractionDigits: 0 });

const getHealthScore = (
  fvTotal: number,
  effectiveTarget: number
): { emoji: string; label: string } => {
  if (effectiveTarget <= 0) {
    return { emoji: "🤷", label: "Set a goal first" };
  }

  const coverage = fvTotal / effectiveTarget;

  if (coverage < 0.5) return { emoji: "😱", label: "Very weak – huge shortfall" };
  if (coverage < 0.8) return { emoji: "😬", label: "Needs work – underfunded" };
  if (coverage < 1.0) return { emoji: "🙂", label: "Almost there – close to target" };
  if (coverage < 1.3) return { emoji: "😎", label: "On track – goal covered" };
  return { emoji: "🐐", label: "Overachiever – well above target" };
};

const getRiskReturn = (risk: RiskProfile): number => {
  switch (risk) {
    case "conservative":
      return 8;
    case "aggressive":
      return 16;
    case "moderate":
    default:
      return 12;
  }
};

const getRiskLabel = (risk: RiskProfile): string => {
  if (risk === "conservative") {
    return "Conservative – lower risk, lower expected return.";
  }
  if (risk === "aggressive") {
    return "Aggressive – higher risk, higher expected return.";
  }
  return "Moderate – balanced risk and return.";
};

const initialInputs = (): Inputs => ({
  goalName: "Master's abroad fund",
  goalType: "Education",
  targetAmount: "1500000",
  years: "5",
  currentSavings: "50000",
  monthlyContribution: "10000",
  annualReturn: "12",
  inflationRate: "5",
  monthsInvested: "0",
  priority: "3",
});

const computeResults = (inputs: Inputs): Results => {
  const baseTarget = Number(inputs.targetAmount) || 0;
  const years = Number(inputs.years) || 0;
  const inflation = Number(inputs.inflationRate) || 0;

  const inflationFactor =
    years > 0 && inflation > 0 ? Math.pow(1 + inflation / 100, years) : 1;

  const effectiveTarget = baseTarget * inflationFactor;

  const currentSavings = Number(inputs.currentSavings) || 0;
  const monthlyContribution = Number(inputs.monthlyContribution) || 0;
  const annualReturn = Number(inputs.annualReturn) || 0;

  const months = Math.max(1, Math.round(years * 12));
  const r = annualReturn / 100;
  const rm = r / 12;

  let fvLump = 0;
  let fvSip = 0;

  if (r === 0) {
    fvLump = currentSavings;
    fvSip = monthlyContribution * months;
  } else {
    fvLump = currentSavings * Math.pow(1 + rm, months);
    fvSip = monthlyContribution * ((Math.pow(1 + rm, months) - 1) / rm);
  }

  const fvTotal = fvLump + fvSip;
  const gap = fvTotal - effectiveTarget;

  const needed = effectiveTarget - fvLump;
  let monthlyRequired: number | null = null;

  if (needed <= 0) {
    monthlyRequired = 0;
  } else {
    if (r === 0) {
      monthlyRequired = needed / months;
    } else {
      const denom = Math.pow(1 + rm, months) - 1;
      monthlyRequired = (needed * rm) / denom;
    }
  }

  const projection: ProjectionPoint[] = [];
  let value = currentSavings;

  for (let m = 1; m <= months; m++) {
    if (r === 0) {
      value += monthlyContribution;
    } else {
      value = value * (1 + rm) + monthlyContribution;
    }

    if (m === 1 || m % 6 === 0 || m === months) {
      projection.push({
        month: m,
        yearLabel: `${(m / 12).toFixed(1)}y`,
        value,
      });
    }
  }

  const { emoji, label } = getHealthScore(fvTotal, effectiveTarget);
  const coverage = effectiveTarget > 0 ? fvTotal / effectiveTarget : 0;

  return {
    fvLump,
    fvSip,
    fvTotal,
    gap,
    monthlyRequired,
    projection,
    healthEmoji: emoji,
    healthLabel: label,
    coverage,
    effectiveTarget,
  };
};

const explainPlan = (
  inputs: Inputs,
  results: Results,
  riskProfile: RiskProfile,
  monthlyIncome: number | null
): string => {
  const target = results.effectiveTarget;
  const currentSip = Number(inputs.monthlyContribution) || 0;
  const coverage = results.coverage;
  const sipNeeded = results.monthlyRequired ?? 0;
  const sipDiff = sipNeeded - currentSip;

  const riskText =
    riskProfile === "conservative"
      ? "You’re using a conservative profile, which prioritises stability over high returns."
      : riskProfile === "moderate"
      ? "You’re using a moderate profile, which balances risk and growth."
      : "You’re using an aggressive profile, which relies on higher market returns and more volatility.";

  const incomeNote =
    monthlyIncome && monthlyIncome > 0
      ? ` This single goal currently uses about ${(
          (currentSip / monthlyIncome) *
          100
        ).toFixed(1)}% of your monthly income.`
      : "";

  if (target <= 0) {
    return `You haven’t really set a proper inflation-adjusted target yet. Define a realistic goal amount and duration so this planner can stop guessing and start actually helping you. ${riskText}`;
  }

  if (coverage < 0.5) {
    return `Right now, your plan is funding less than half of your inflation-adjusted target. Either increase your monthly contribution, extend the time horizon, or lower the goal. ${riskText}${incomeNote}`;
  }

  if (coverage < 0.8) {
    if (sipDiff > 0) {
      return `You’re underfunded: your current SIP of ${formatINR(
        currentSip
      )} gets you partially there, but you need around ${formatINR(
        Math.round(sipDiff)
      )} more per month to fully cover this inflation-adjusted goal. ${riskText}${incomeNote}`;
    }
    return `Your plan is underfunded but not hopeless. A mix of slightly higher SIPs, a longer duration, or trimming the goal amount can push this into the “on track” zone. ${riskText}${incomeNote}`;
  }

  if (coverage < 1.0) {
    if (sipDiff > 0) {
      return `You’re close to the finish line. Increase your monthly SIP by about ${formatINR(
        Math.round(sipDiff)
      )} or extend the duration a bit to comfortably meet the inflation-adjusted target. ${riskText}${incomeNote}`;
    }
    return `This plan is almost hitting your inflation-adjusted target. Stay consistent and don’t panic-sell during market dips. ${riskText}${incomeNote}`;
  }

  if (coverage < 1.3) {
    if (sipDiff < -100) {
      return `You’re comfortably on track and maybe even slightly overfunding this goal. You could reduce your SIP or redirect some surplus towards another goal. ${riskText}${incomeNote}`;
    }
    return `You’re on track to meet this goal. Just keep the SIP going and avoid impulsive changes. ${riskText}${incomeNote}`;
  }

  return `You’re massively overfunding this goal relative to the inflation-adjusted target. You can afford to lower this SIP a bit and redirect money towards other goals (or your sanity). ${riskText}${incomeNote}`;
};

const Planner: React.FC = () => {
  const [riskProfile, setRiskProfile] = useState<RiskProfile>("moderate");
  const [goals, setGoals] = useState<Goal[]>([
    { id: 1, inputs: initialInputs(), results: null },
  ]);
  const [activeGoalId, setActiveGoalId] = useState<number>(1);
  const [monthlyIncome, setMonthlyIncome] = useState<string>("");
  const [darkMode] = useState<boolean>(true);


  // Load from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed: StoredState = JSON.parse(stored);
        if (parsed.goals && parsed.goals.length > 0) {
          setGoals(parsed.goals);
          setActiveGoalId(parsed.goals[0].id);
        }
        if (parsed.riskProfile) setRiskProfile(parsed.riskProfile);
        if (parsed.monthlyIncome) setMonthlyIncome(parsed.monthlyIncome);
      }
    } catch {
      // ignore
    }
  }, []);

  // Save to localStorage
  useEffect(() => {
    const toStore: StoredState = { goals, riskProfile, monthlyIncome };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
    } catch {
      // ignore
    }
  }, [goals, riskProfile, monthlyIncome]);

  const activeGoal = goals.find((g) => g.id === activeGoalId) ?? goals[0];

  const handleInputChange =
    (field: keyof Inputs) =>
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      const value = e.target.value;
      setGoals((prev) =>
        prev.map((g) =>
          g.id === activeGoal.id
            ? { ...g, inputs: { ...g.inputs, [field]: value } }
            : g
        )
      );
    };

  const handleRiskChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = Number(e.target.value);
    const profile: RiskProfile =
      val === 1 ? "conservative" : val === 3 ? "aggressive" : "moderate";
    setRiskProfile(profile);

    const newReturn = getRiskReturn(profile).toString();
    setGoals((prev) =>
      prev.map((g) =>
        g.id === activeGoal.id
          ? { ...g, inputs: { ...g.inputs, annualReturn: newReturn } }
          : g
      )
    );
  };

  const calculateForGoal = (goalId: number) => {
    setGoals((prev) =>
      prev.map((g) =>
        g.id === goalId ? { ...g, results: computeResults(g.inputs) } : g
      )
    );
  };

  const addGoal = () => {
    setGoals((prev) => {
      const nextId = prev.length ? Math.max(...prev.map((g) => g.id)) + 1 : 1;
      const baseInputs = initialInputs();
      const newGoal: Goal = {
        id: nextId,
        inputs: {
          ...baseInputs,
          goalName: `New goal ${nextId}`,
        },
        results: null,
      };
      return [...prev, newGoal];
    });
    setActiveGoalId(() => {
      const ids = goals.map((g) => g.id);
      const maxId = ids.length ? Math.max(...ids) : 0;
      return maxId + 1;
    });
  };

  const removeGoal = (id: number) => {
    if (goals.length === 1) return;
    const filtered = goals.filter((g) => g.id !== id);
    setGoals(filtered);
    if (activeGoalId === id && filtered.length) {
      setActiveGoalId(filtered[0].id);
    }
  };

  const monthlyIncomeNum = Number(monthlyIncome) || 0;

  const { totalCurrentSip, totalRequiredSip } =
    useMemo(() => {
      let totalSip = 0;
      let totalRequired = 0;
      let coverageSum = 0;
      let coverageCount = 0;

      goals.forEach((g) => {
        const sip = Number(g.inputs.monthlyContribution) || 0;
        totalSip += sip;

        if (g.results && g.results.monthlyRequired !== null) {
          totalRequired += Math.max(0, g.results.monthlyRequired);
        }
        if (g.results && g.results.coverage > 0) {
          coverageSum += g.results.coverage;
          coverageCount += 1;
        }
      });

      const avgCoverage = coverageCount > 0 ? coverageSum / coverageCount : 0;

      let label = "Getting started 🐣";
      if (avgCoverage >= 1 && avgCoverage < 1.2) label = "On track ✅";
      else if (avgCoverage >= 1.2) label = "Overprepared 🐐";
      else if (avgCoverage >= 0.7) label = "Almost there 🙂";
      else if (avgCoverage > 0) label = "High risk of shortfall 🔥";

      return {
        totalCurrentSip: totalSip,
        totalRequiredSip: totalRequired,
        badge: label,
      };
    }, [goals]);

  const recommendedAllocation = useMemo(() => {
    if (!monthlyIncomeNum || monthlyIncomeNum <= 0) return null;

    const safeMax = monthlyIncomeNum * 0.4; // 40% of income
    const totalPriority = goals.reduce((sum, g) => {
      const p = Number(g.inputs.priority) || 1;
      const norm = Math.max(1, Math.min(5, p));
      return sum + norm;
    }, 0);

    if (totalPriority === 0) return null;

    return goals.map((g) => {
      const p = Number(g.inputs.priority) || 1;
      const norm = Math.max(1, Math.min(5, p));
      const share = (norm / totalPriority) * safeMax;
      return {
        id: g.id,
        name: g.inputs.goalName || `Goal ${g.id}`,
        suggestedSip: Math.round(share),
      };
    });
  }, [goals, monthlyIncomeNum]);

  const conflictMessage = useMemo(() => {
    if (!monthlyIncomeNum || monthlyIncomeNum <= 0) {
      return "Add your monthly income to see if your total SIPs make any sense.";
    }

    if (!totalRequiredSip) {
      return "Calculate your goals to see if your plan clashes with your income.";
    }

    const requiredPct = (totalRequiredSip / monthlyIncomeNum) * 100;

    if (requiredPct > 60) {
      return `You'd need about ${requiredPct.toFixed(
        1
      )}% of your income in SIPs. Mathematically possible, practically unhinged. Either reduce some goals or extend timelines.`;
    }

    if (requiredPct > 40) {
      return `Total required SIP is about ${requiredPct.toFixed(
        1
      )}% of your income. Ambitious but doable if you're disciplined and not living on constant food delivery.`;
    }

    if (requiredPct > 20) {
      return `Total required SIP is about ${requiredPct.toFixed(
        1
      )}% of your income. That's a healthy range for long-term goals.`;
    }

    return `Total required SIP is only ${requiredPct.toFixed(
      1
    )}% of your income. Either your goals are tiny or you're playing it very safe.`;
  }, [monthlyIncomeNum, totalRequiredSip]);

  const scenarioResults = useMemo(() => {
    if (!activeGoal) return null;
    const base = activeGoal.inputs;

    const scenarioPlus2Years = computeResults({
      ...base,
      years: (Number(base.years) + 2 || 2).toString(),
    });

    const scenarioPlus2kSip = computeResults({
      ...base,
      monthlyContribution: (
        (Number(base.monthlyContribution) || 0) + 2000
      ).toString(),
    });

    const scenarioMinus2LTarget = computeResults({
      ...base,
      targetAmount: Math.max(
        0,
        (Number(base.targetAmount) || 0) - 200000
      ).toString(),
    });

    return { scenarioPlus2Years, scenarioPlus2kSip, scenarioMinus2LTarget };
  }, [activeGoal]);

  const activeExplanation =
    activeGoal && activeGoal.results
      ? explainPlan(
          activeGoal.inputs,
          activeGoal.results,
          riskProfile,
          monthlyIncomeNum || null
        )
      : "";

  const maxValueForChart =
    activeGoal && activeGoal.results && activeGoal.results.projection.length
      ? Math.max(...activeGoal.results.projection.map((p) => p.value))
      : 0;

  const advisorSummary = useMemo(() => {
    if (!activeGoal) return "";

    const r = activeGoal.results;
    const i = activeGoal.inputs;

    const lines: string[] = [
      `Goal: ${i.goalName || "Unnamed goal"}`,
      `Type: ${i.goalType || "Not specified"}`,
      `Time horizon: ${i.years || "-"} years`,
      i.targetAmount
        ? `Base target today: ${formatINR(Number(i.targetAmount))}`
        : "",
      r
        ? `Inflation-adjusted target at ${i.inflationRate || 0}%: ${formatINR(
            Math.round(r.effectiveTarget)
          )}`
        : "",
      i.currentSavings
        ? `Current savings: ${formatINR(Number(i.currentSavings))}`
        : "",
      i.monthlyContribution
        ? `Current monthly SIP: ${formatINR(
            Number(i.monthlyContribution)
          )}`
        : "",
      r
        ? `Projected total at ${i.annualReturn || 0}%: ${formatINR(
            Math.round(r.fvTotal)
          )}`
        : "",
      r
        ? `Coverage vs inflation-adjusted target: ${(r.coverage * 100).toFixed(
            1
          )}%`
        : "",
      r && r.monthlyRequired !== null
        ? `Required monthly SIP to fully fund: ${formatINR(
            Math.max(0, r.monthlyRequired)
          )}`
        : "",
      `Risk profile: ${riskProfile}`,
    ];

    return lines.filter((line) => line.trim().length > 0).join("\n");
  }, [activeGoal, riskProfile]);

  const handleCopySummary = () => {
    if (!advisorSummary) return;
    if (navigator && navigator.clipboard) {
      navigator.clipboard.writeText(advisorSummary).catch(() => {});
    }
  };

  const handleExportCSV = () => {
    if (!goals.length) return;

    const headers = [
      "Goal ID",
      "Goal Name",
      "Goal Type",
      "Priority",
      "Base Target",
      "Inflation Rate",
      "Inflation Adjusted Target",
      "Years",
      "Current Savings",
      "Monthly SIP",
      "Expected Return",
      "Projected Total",
      "Coverage %",
      "Health Label",
    ];

    const rows = goals.map((g) => {
      const i = g.inputs;
      const r = g.results;
      const target = Number(i.targetAmount) || 0;
      const eff = r?.effectiveTarget ?? 0;
      const coverage = r?.coverage ? r.coverage * 100 : 0;

      const vals = [
        g.id,
        i.goalName || "",
        i.goalType || "",
        i.priority || "",
        target ? Math.round(target) : "",
        i.inflationRate || "",
        eff ? Math.round(eff) : "",
        i.years || "",
        i.currentSavings || "",
        i.monthlyContribution || "",
        i.annualReturn || "",
        r ? Math.round(r.fvTotal) : "",
        r ? coverage.toFixed(1) : "",
        r?.healthLabel || "",
      ];

      return vals
        .map((v) => {
          const s = String(v ?? "");
          return `"${s.replace(/"/g, '""')}"`;
        })
        .join(",");
    });

    const csv = [headers.join(","), ...rows].join("\n");
    const blob = new Blob([csv], {
      type: "text/csv;charset=utf-8;",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "goals-dashboard.csv";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  

  const riskSliderValue =
    riskProfile === "conservative"
      ? 1
      : riskProfile === "aggressive"
      ? 3
      : 2;

  // Theme-aware classes
  const cardClass = darkMode
    ? "bg-slate-900/70 border border-slate-800"
    : "bg-white border border-slate-300 shadow-sm";

  const subCardClass = darkMode
    ? "bg-slate-950 border border-slate-800"
    : "bg-slate-50 border border-slate-200";

  const chipClass = darkMode
    ? "bg-slate-950 border border-slate-800"
    : "bg-slate-100 border border-slate-300";

  return (
    <div
      className={
        darkMode
          ? "min-h-screen bg-slate-950 text-slate-50"
          : "min-h-screen bg-slate-100 text-slate-900"
      }
    >
      <div className="flex justify-center px-4 py-8">
        <div className="w-full max-w-5xl space-y-6">
          {/* Header */}
          <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
            <div className="space-y-2">
              <h1 className="text-3xl font-bold tracking-tight">
                Goal-Based Investment Planner
              </h1>
              <p className="text-sm text-slate-400 max-w-3xl">
                Multi-goal planner with risk profiles, inflation-aware
                targets, conflict checks, and a mildly judgmental “AI”
                that tells you if your plan makes sense.
              </p>
            </div>
            
          </header>

          {/* Risk + Income */}
          <section className="grid md:grid-cols-2 gap-4">
            <div className={`${cardClass} rounded-2xl p-4 flex flex-col gap-3`}>
              <div>
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                  Risk profile
                </p>
                <p className="text-sm">
                  {riskProfile === "conservative"
                    ? "Conservative"
                    : riskProfile === "aggressive"
                    ? "Aggressive"
                    : "Moderate"}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {getRiskLabel(riskProfile)}
                </p>
              </div>
              <div className="flex-1 flex flex-col gap-1">
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={1}
                  value={riskSliderValue}
                  onChange={handleRiskChange}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-[11px] text-slate-500">
                  <span>Conservative</span>
                  <span>Moderate</span>
                  <span>Aggressive</span>
                </div>
              </div>
            </div>

            <div className={`${cardClass} rounded-2xl p-4 space-y-3 text-sm`}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Monthly income
                  </p>
                  <p className="text-xs text-slate-500">
                    Used to sanity-check all your SIPs together.
                  </p>
                </div>
                <input
                  type="text"
                  value={monthlyIncome}
                  onChange={(e) => setMonthlyIncome(e.target.value)}
                  className="w-32 rounded-xl bg-slate-950 border border-slate-700 px-3 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  placeholder="₹"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-1">
                  <p className="text-slate-400">
                    Current SIP across goals
                  </p>
                  <p className="font-semibold">
                    {totalCurrentSip ? formatINR(totalCurrentSip) : "—"}
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-slate-400">
                    Required SIP (sum of all goals)
                  </p>
                  <p className="font-semibold">
                    {totalRequiredSip
                      ? formatINR(Math.round(totalRequiredSip))
                      : "—"}
                  </p>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                {conflictMessage}
              </p>
            </div>
          </section>

          {/* Goals selector */}
          <section className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap gap-2">
              {goals.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => setActiveGoalId(goal.id)}
                  className={`px-3 py-1.5 rounded-full text-xs border transition ${
                    goal.id === activeGoalId
                      ? "bg-emerald-500 text-slate-950 border-emerald-400"
                      : "bg-slate-900 text-slate-200 border-slate-700 hover:border-emerald-500/70"
                  }`}
                >
                  {goal.inputs.goalName || `Goal ${goal.id}`}
                </button>
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={addGoal}
                className="px-3 py-1.5 rounded-full text-xs bg-slate-900 border border-slate-700 hover:border-emerald-500/80 transition"
              >
                + Add goal
              </button>
              {goals.length > 1 && (
                <button
                  onClick={() => removeGoal(activeGoal.id)}
                  className="px-3 py-1.5 rounded-full text-xs bg-slate-900 border border-rose-700 text-rose-300 hover:bg-rose-900/30 transition"
                >
                  Remove active
                </button>
              )}
            </div>
          </section>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Inputs card */}
            <div className={`${cardClass} rounded-2xl p-5 space-y-4 text-sm`}>
              <h2 className="text-lg font-semibold">Goal settings</h2>

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="block text-slate-300">Goal name</label>
                  <input
                    type="text"
                    value={activeGoal.inputs.goalName}
                    onChange={handleInputChange("goalName")}
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    placeholder="e.g. Master's abroad fund"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-slate-300">Goal type</label>
                  <select
                    value={activeGoal.inputs.goalType}
                    onChange={handleInputChange("goalType")}
                    className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  >
                    <option>Education</option>
                    <option>Travel</option>
                    <option>Emergency</option>
                    <option>Retirement</option>
                    <option>Big purchase</option>
                    <option>Other</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-slate-300">
                      Target amount (₹)
                    </label>
                    <input
                      type="text"
                      value={activeGoal.inputs.targetAmount}
                      onChange={handleInputChange("targetAmount")}
                      className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-slate-300">
                      Time horizon (years)
                    </label>
                    <input
                      type="text"
                      value={activeGoal.inputs.years}
                      onChange={handleInputChange("years")}
                      className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="5"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-slate-300">
                      Expected inflation (%)
                    </label>
                    <input
                      type="text"
                      value={activeGoal.inputs.inflationRate}
                      onChange={handleInputChange("inflationRate")}
                      className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="5"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-slate-300">
                      Priority (1–5)
                    </label>
                    <input
                      type="text"
                      value={activeGoal.inputs.priority}
                      onChange={handleInputChange("priority")}
                      className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="3"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-slate-300">
                      Current savings (₹)
                    </label>
                    <input
                      type="text"
                      value={activeGoal.inputs.currentSavings}
                      onChange={handleInputChange("currentSavings")}
                      className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-slate-300">
                      Monthly contribution (₹)
                    </label>
                    <input
                      type="text"
                      value={activeGoal.inputs.monthlyContribution}
                      onChange={handleInputChange("monthlyContribution")}
                      className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block text-slate-300">
                      Expected annual return (%)
                      <span className="text-[10px] text-slate-500">
                        {" "}
                        (auto-set by risk, editable)
                      </span>
                    </label>
                    <input
                      type="text"
                      value={activeGoal.inputs.annualReturn}
                      onChange={handleInputChange("annualReturn")}
                      className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-slate-300">
                      Contribution streak (months)
                    </label>
                    <input
                      type="text"
                      value={activeGoal.inputs.monthsInvested}
                      onChange={handleInputChange("monthsInvested")}
                      className="w-full rounded-xl bg-slate-950 border border-slate-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      placeholder="0"
                    />
                  </div>
                </div>

                <button
                  onClick={() => calculateForGoal(activeGoal.id)}
                  className="w-full mt-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold py-2 text-sm transition"
                >
                  Calculate plan
                </button>
              </div>
            </div>

            {/* Results + AI explanation */}
            <div className="space-y-4">
              <div className={`${cardClass} rounded-2xl p-5 space-y-4 text-sm`}>
                <h2 className="text-lg font-semibold">Summary</h2>

                {!activeGoal.results ? (
                  <p className="text-sm text-slate-400">
                    Fill the fields and hit{" "}
                    <span className="font-semibold text-slate-200">
                      Calculate plan
                    </span>{" "}
                    to see your projection.
                  </p>
                ) : (
                  <>
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div className="space-y-1">
                        <p className="text-slate-400">Goal</p>
                        <p className="font-semibold">
                          {activeGoal.inputs.goalName}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-slate-400">Type</p>
                        <p className="font-semibold">
                          {activeGoal.inputs.goalType}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-slate-400">
                          Target today (base)
                        </p>
                        <p className="font-semibold">
                          {activeGoal.inputs.targetAmount
                            ? formatINR(
                                Number(activeGoal.inputs.targetAmount)
                              )
                            : "—"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-slate-400">
                          Inflation-adjusted target
                        </p>
                        <p className="font-semibold">
                          {formatINR(
                            Math.round(activeGoal.results.effectiveTarget)
                          )}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-slate-400">
                          Projected total
                        </p>
                        <p className="font-semibold">
                          {formatINR(activeGoal.results.fvTotal)}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-slate-400">
                          Coverage vs infl. target
                        </p>
                        <p className="font-semibold">
                          {(activeGoal.results.coverage * 100).toFixed(1)}%
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-slate-400">
                          Monthly SIP now
                        </p>
                        <p className="font-semibold">
                          {formatINR(
                            Number(
                              activeGoal.inputs.monthlyContribution
                            ) || 0
                          )}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-slate-400">
                          From current savings
                        </p>
                        <p className="font-semibold">
                          {formatINR(activeGoal.results.fvLump)}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-slate-400">
                          From monthly investing
                        </p>
                        <p className="font-semibold">
                          {formatINR(activeGoal.results.fvSip)}
                        </p>
                      </div>

                      <div className="space-y-1">
                        <p className="text-slate-400">
                          Contribution streak
                        </p>
                        <p className="font-semibold">
                          {activeGoal.inputs.monthsInvested || "0"} months
                        </p>
                      </div>
                    </div>

                    <div
                      className={`mt-2 rounded-xl px-3 py-2 text-sm ${
                        activeGoal.results.gap >= 0
                          ? "bg-emerald-900/40 border border-emerald-700 text-emerald-200"
                          : "bg-rose-900/40 border border-rose-700 text-rose-200"
                      }`}
                    >
                      {activeGoal.results.gap >= 0 ? (
                        <>
                          <p className="font-semibold">
                            You are on track 🎉
                          </p>
                          <p>
                            You are projected to exceed your
                            inflation-adjusted goal by{" "}
                            <span className="font-semibold">
                              {formatINR(
                                Math.abs(activeGoal.results.gap)
                              )}
                            </span>
                            .
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="font-semibold">
                            You have a shortfall ⚠️
                          </p>
                          <p>
                            Projected shortfall vs infl. target:{" "}
                            <span className="font-semibold">
                              {formatINR(
                                Math.abs(activeGoal.results.gap)
                              )}
                            </span>
                            .
                          </p>
                        </>
                      )}
                    </div>

                    <div
                      className={`mt-2 rounded-xl p-3 text-sm flex items-center justify-between gap-3 ${subCardClass}`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-3xl">
                          {activeGoal.results.healthEmoji}
                        </span>
                        <div>
                          <p className="font-semibold">
                            Financial health score
                          </p>
                          <p className="text-xs text-slate-400">
                            {activeGoal.results.healthLabel}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div
                      className={`mt-2 rounded-xl p-3 text-sm space-y-1 ${subCardClass}`}
                    >
                      <p className="font-semibold">
                        Required monthly contribution
                      </p>
                      {activeGoal.results.monthlyRequired !== null && (
                        <p className="text-lg font-bold">
                          {formatINR(
                            Math.max(
                              0,
                              activeGoal.results.monthlyRequired
                            )
                          )}
                        </p>
                      )}
                      <p className="text-xs text-slate-500">
                        To reach the inflation-adjusted target in{" "}
                        {activeGoal.inputs.years} years at{" "}
                        {activeGoal.inputs.annualReturn}% expected annual
                        return.
                      </p>
                    </div>
                  </>
                )}
              </div>

              <div className={`${cardClass} rounded-2xl p-5 space-y-3 text-sm`}>
                <div className="flex items-center justify-between gap-2">
                  <h2 className="text-lg font-semibold flex items-center gap-2">
                    Plan explanation
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full border ${chipClass}`}
                    >
                      “AI-ish” summary
                    </span>
                  </h2>
                </div>
                {!activeGoal.results ? (
                  <p className="text-sm text-slate-400">
                    Once you calculate a plan, this section will explain
                    what your numbers actually mean in normal-person
                    language.
                  </p>
                ) : (
                  <p className="text-sm leading-relaxed">
                    {activeExplanation}
                  </p>
                )}

                {activeGoal.results && scenarioResults && (
                  <div className="mt-3 border-t border-slate-800 pt-3 text-xs space-y-2">
                    <p className="text-slate-400 font-semibold">
                      Quick what-if scenarios
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                      <div className={`rounded-lg p-2 ${subCardClass}`}>
                        <p className="text-[11px] text-slate-400">
                          +2 years horizon
                        </p>
                        <p className="font-semibold">
                          {formatINR(
                            Math.round(
                              scenarioResults.scenarioPlus2Years.fvTotal
                            )
                          )}
                        </p>
                      </div>
                      <div className={`rounded-lg p-2 ${subCardClass}`}>
                        <p className="text-[11px] text-slate-400">
                          +₹2000 SIP
                        </p>
                        <p className="font-semibold">
                          {formatINR(
                            Math.round(
                              scenarioResults.scenarioPlus2kSip.fvTotal
                            )
                          )}
                        </p>
                      </div>
                      <div className={`rounded-lg p-2 ${subCardClass}`}>
                        <p className="text-[11px] text-slate-400">
                          -₹2L target
                        </p>
                        <p className="font-semibold">
                          {formatINR(
                            Math.round(
                              scenarioResults
                                .scenarioMinus2LTarget.fvTotal
                            )
                          )}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Chart */}
          <div className={`${cardClass} rounded-2xl p-5 space-y-3`}>
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">
                Projected portfolio growth – {activeGoal.inputs.goalName}
              </h2>
              <p className="text-[11px] text-slate-500">
                Based on your current monthly plan and risk profile.
              </p>
            </div>

            {!activeGoal.results ||
            !activeGoal.results.projection.length ||
            !maxValueForChart ? (
              <p className="text-sm text-slate-400">
                Run a calculation to see how this goal is expected to grow
                over time.
              </p>
            ) : (
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={activeGoal.results.projection}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="yearLabel" />
                    <YAxis />
                    <Tooltip
                      formatter={(value: any) =>
                        formatINR(Number(value) || 0)
                      }
                      labelFormatter={(label: any) => `Time: ${label}`}
                    />
                    <Line
                      type="monotone"
                      dataKey="value"
                      stroke="#34d399"
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Dashboard */}
          <div className={`${cardClass} rounded-2xl p-5 space-y-3 text-sm`}>
            <h2 className="text-lg font-semibold">Goals dashboard</h2>
            {goals.length === 0 ? (
              <p className="text-sm text-slate-400">
                You deleted everything. Bold choice.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-xs border-separate border-spacing-y-1">
                  <thead className="text-slate-400">
                    <tr>
                      <th className="text-left px-2 py-1">Goal</th>
                      <th className="text-left px-2 py-1">Type</th>
                      <th className="text-right px-2 py-1">Target</th>
                      <th className="text-right px-2 py-1">
                        Infl. target
                      </th>
                      <th className="text-right px-2 py-1">
                        Projected
                      </th>
                      <th className="text-center px-2 py-1">
                        Coverage
                      </th>
                      <th className="text-center px-2 py-1">
                        Score
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {goals.map((g) => {
                      const i = g.inputs;
                      const r = g.results;
                      const target = Number(i.targetAmount) || 0;
                      const eff = r?.effectiveTarget ?? 0;
                      const coverage =
                        r && eff > 0 ? (r.fvTotal / eff) * 100 : 0;

                      return (
                        <tr
                          key={g.id}
                          className={`rounded-xl ${
                            g.id === activeGoalId
                              ? "bg-slate-800/80"
                              : "bg-slate-900/80"
                          }`}
                        >
                          <td className="px-2 py-2">
                            <button
                              onClick={() => setActiveGoalId(g.id)}
                              className="text-left text-slate-100 hover:text-emerald-400 text-xs font-semibold"
                            >
                              {i.goalName || `Goal ${g.id}`}
                            </button>
                          </td>
                          <td className="px-2 py-2 text-left text-slate-300">
                            {i.goalType || "—"}
                          </td>
                          <td className="px-2 py-2 text-right text-slate-200">
                            {target ? formatINR(target) : "—"}
                          </td>
                          <td className="px-2 py-2 text-right text-slate-200">
                            {r
                              ? formatINR(
                                  Math.round(r.effectiveTarget)
                                )
                              : "—"}
                          </td>
                          <td className="px-2 py-2 text-right text-slate-200">
                            {r ? formatINR(Math.round(r.fvTotal)) : "—"}
                          </td>
                          <td className="px-2 py-2 text-center text-slate-200">
                            {r && eff
                              ? `${coverage.toFixed(0)}%`
                              : "—"}
                          </td>
                          <td className="px-2 py-2 text-center">
                            {r ? r.healthEmoji : "•"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {recommendedAllocation && (
              <div className="mt-3 border-t border-slate-800 pt-3 text-xs space-y-1">
                <p className="text-slate-400 font-semibold">
                  Suggested SIP split (40% of income by priority)
                </p>
                <div className="flex flex-wrap gap-2">
                  {recommendedAllocation.map((rec) => (
                    <div
                      key={rec.id}
                      className={`rounded-full px-3 py-1 ${chipClass}`}
                    >
                      <span className="font-semibold">
                        {rec.name}:
                      </span>{" "}
                      <span>{formatINR(rec.suggestedSip)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Share / export */}
          <div className={`${cardClass} rounded-2xl p-5 space-y-3 text-sm`}>
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">
                Share with advisor / future you
              </h2>
              <div className="flex gap-2">
                <button
                  onClick={handleCopySummary}
                  className={`text-xs px-3 py-1.5 rounded-full border ${chipClass} transition`}
                >
                  Copy summary
                </button>
                <button
                  onClick={handleExportCSV}
                  className={`text-xs px-3 py-1.5 rounded-full border ${chipClass} transition`}
                >
                  Export CSV
                </button>
              </div>
            </div>
            <p className="text-xs text-slate-500">
              Use this summary if you want to send your plan to a financial
              advisor, or just paste it into an email to your future self
              when you forget what you were doing.
            </p>
            <textarea
              value={advisorSummary}
              readOnly
              className={`w-full h-32 rounded-xl px-3 py-2 text-xs font-mono text-slate-200 resize-none ${subCardClass}`}
            />
          </div>

          <p className="text-[11px] text-slate-500 text-center mt-2">
            This tool is for planning, not for blaming me when the market
            dips. Or when you ignore the 😱 score and then act surprised.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Planner;
