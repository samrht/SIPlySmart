# SIPly Smart 💸  
**Invest with logic, not vibes.**


SIPly Smart exists to **help track you your goals** and show the **math** behind goals.

---

## 🚀 What is SIPly Smart?

A **multi-goal** investment planner that:

✔️ Accounts for **inflation**  
✔️ Uses your **risk profile** to set realistic returns  
✔️ Calculates how much you’ll actually have  
✔️ Tells you the **SIP you *should* be doing**  
✔️ Checks if your **income can even handle** your goals  
✔️ Rates each goal with a **emoji score** 😱🙂😎

You don’t need to pretend you understand the stock market —  
this tool translates everything into **“Are you screwed or not?”** status.

---

---

## 🧮 The Math 


Let:
- **PV** = Current savings  
- **PMT** = Monthly SIP  
- **i** = Annual inflation rate (decimal)  
- **r** = Annual expected return (decimal)  
- **n** = Total months = years × 12  

---

### 📈 1️⃣ Inflation-Adjusted Goal

Real cost of the goal in the future:

\[
FV = PV \(1 + i)^(years)
\]


---

### 💰 2️⃣ Future Value of Current Savings

\[
FV_LumpSum = CurrentSavings × (1 + ReturnRate/12)^Months
\]


---

### 📆 3️⃣ Future Value of Monthly SIP

Future Value of an Annuity:

\[
FV_SIP = MonthlySIP × [((1 + ReturnRate/12)^Months – 1) / (ReturnRate/12)]
\]


---

### 🔄 4️⃣ Total Future Value

\[
FV_Total = FV_LumpSum + FV_SIP
\]

---

### 🎯 5️⃣ Coverage vs Target

\[
Coverage = FV_Total / FutureTarget
\]

\[
Coverage% = Coverage × 100
\]

---

### 🚨 6️⃣ Funding Gap

\[
Gap = FV_Total – FutureTarget
\]

Positive = on track😎  
Negative = shortfall 😭  

---

### 📌 7️⃣ Required SIP (if your current plan sucks)

Solve SIP FV formula for PMT:

\[
RequiredSIP =
(FutureTarget – FV_LumpSum) /
(((1 + ReturnRate/12)^Months – 1) / (ReturnRate/12))
\]

This tells you the **honest** number — reality > optimism.

---

## 😱 → 🐐 Emoji Health Score

| Coverage (vs Inflation Target) | Emoji | Label |
|-------------------------------|-------|------|
| ≥ 120% | 🐐 | Overachiever |
| ≥ 100% | 😎 | On track |
| ≥ 80% | 🙂 | Almost there |
| ≥ 50% | 😬 | Needs work |
| < 50% | 😱 | Very weak |

Because spreadsheets are boring but **fear is a great teacher** 🧠

---


## Features 

| Feature |
|--------|-------------------|
| 🔹 Multi-goal planner | Real life = multiple goals, not one large fairy tale |
| 🔹 Inflation-adjusted targets | Harvard fee ≠ same 5 years later 😌 |
| 🔹 SIP + Lump sum projections | Shows real future value — no Excel nightmares |
| 🔹 Required SIP calculator | Tells you what you *should* invest, not what you feel like |
| 🔹 Emoji-based health score | 😱 → 🐐 — your finances judged visually |
| 🔹 Income sanity check | Because 80% of salary into SIP is called begging |
| 🔹 Priority system | “MacBook vs. Germany MS?” — choose wisely |
| 🔹 “AI-ish” explanation | Turns math into human language |
| 🔹 What-if scenarios | +2 years or +₹2000 SIP = instant clarity |
| 🔹 Export CSV + Copy summary | Give your financial advisor a heart attack |
| 🔹 LocalStorage persistence | Your plans don’t die on refresh |

---

## 🧩 Tech Stack

- **React + TypeScript**
- **Vite**
- **Tailwind CSS** 
- **Recharts** for projections
- **LocalStorage** for persistence

---

## 🧑‍💻 Getting Started

```bash
git clone <your-repo-url>
cd SIPlySmart

npm install
npm run dev
