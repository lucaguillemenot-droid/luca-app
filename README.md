# Luca Bulk — Personal PWA

A Progressive Web App built for Luca (18, T1D, Oslo) to support a 75→85 kg lean bulk on an ~800 NOK/week food budget. Push/Pull/Legs 6-day split, ~3,300 kcal/day at ~120g carbs (with the carbs concentrated pre-workout), Vitamin D tracking with Oslo-latitude awareness, barcode scanning via Open Food Facts, and a manual glucose log to sit alongside your Libre/Dexcom.

## How to install on your iPhone

The app is a **Progressive Web App (PWA)**. To make it appear on your home screen like a real app, it needs to be hosted at a URL. The fastest free way (no signup, takes 60 seconds):

**Option A — Netlify Drop (recommended, free, instant)**
1. On a computer, open https://app.netlify.com/drop
2. Drag the entire `luca-app` folder into the page
3. Netlify gives you a URL like `https://amazing-cookie-12345.netlify.app`
4. On your iPhone, open that URL in **Safari** (not Chrome)
5. Tap the **Share** button (square with arrow up) at the bottom
6. Scroll down and tap **Add to Home Screen**
7. Name it "Luca Bulk", tap **Add**

The app now lives on your home screen. Open it — it runs full-screen with no Safari UI, works offline (after first load), and remembers all your data on your phone.

**Option B — GitHub Pages** (if you have a GitHub account)
1. Create a new repo, upload all files in `luca-app/`
2. Settings → Pages → enable from `main` branch root
3. Use the resulting URL on your iPhone (same Safari steps above)

**Option C — Run locally for testing**
- Mac/Linux: `cd luca-app && python3 -m http.server 8000`, then open `http://localhost:8000` in Safari on your computer (you can't install to iPhone home screen from localhost, but you can preview).

## What's in each tab

- **Today** — Your day at a glance: meal plan with macros & cost, water counter (target 3,500 ml), today's workout with set logger, supplements check-off, sun-exposure logger (minutes × UV index → estimated mcg vitamin D), and a manual glucose spot-check log.
- **Plan** — Next 3 weeks of workouts as a calendar (PPL × 2, Sunday rest, with rolling progressive overload). Below that: your full 7-day meal rotation, weekly cost estimate.
- **Scan** — Tap "Start camera", point at any barcode (food package). The app pulls the product from Open Food Facts (millions of European products including most Norwegian groceries), then you enter how many grams you ate. Falls back to a manual food search of the built-in Norwegian DB.
- **Stats** — Today's macros vs targets, micronutrient grid (Vit D, B12, iron, magnesium, zinc, omega-3) vs Nordic RDA, 7-day vitamin D total, body-weight sparkline.
- **Settings** — Profile, daily macro targets (editable), **Thursday week A/B picker** (set this once — see below), school schedule display, danger zone (reset).

## First-run checklist

1. Open **Settings** → "Thursday week cycle" → pick whether **this week's Thursday** is the short one (Week A, ends 11:40) or long one (Week B, ends 15:30). The app alternates automatically from there.
2. **Stats** → "Log today" — log your starting body weight (75 kg).
3. **Today** → take Vitamin D + Tran in the morning, mark them done.
4. Done. Just open the app each morning.

## The numbers (calculated for you)

- **BMR + 6-day training**: ~2,870 kcal/day maintenance
- **Bulk surplus** (+0.5 kg/week target): ~3,370 kcal/day
- **Protein** 180 g (2.4 g/kg — high for muscle gain)
- **Carbs** ~110 g (your soft cap; realistic delivery 100-140 g) with 50-80 g concentrated in the pre-workout meal
- **Fat** ~230 g (the rest of the calories — high-fat bulk works well for T1D)
- **Water** 3,500 ml/day
- **Weekly food cost** ~880 NOK (slightly over your 800 cap; swap meals or buy in bulk to drop further)

## Push/Pull/Legs split

- **Mon** Push (chest/shoulders/triceps)
- **Tue** Pull (back/biceps)
- **Wed** Legs (quads/hams/calves/abs)
- **Thu** Rest (best recovery day — no school conflict either)
- **Fri** Push
- **Sat** Pull
- **Sun** Legs

Each exercise shows sets × rep range × RIR (reps-in-reserve). Progressive overload runs on a 3-week cycle:
- Week 1 — Introduce (RIR 2-3, get form solid)
- Week 2 — Build (+2.5% load, RIR 1-2)
- Week 3 — Push (+5% load from week 1, RIR 0-1)

The app shows the load multiplier next to each exercise. Log your top-set weight × reps in the input boxes; it saves to your phone.

## Vitamin D — important for you in Oslo

At 59.9°N latitude, your skin **cannot synthesize vitamin D from sunlight** between October and March (sun angle too low, regardless of cloud cover). From May to August it works with 20-30 minutes of midday sun on bare arms + legs when UV ≥ 3. The app:

- Shows a warning during Oct-Mar
- Has a sun logger (minutes × UV index → estimated mcg D synthesized)
- Tracks supplemental D from your D3 capsule (25 mcg) and Tran (10 mcg D + 1.2g omega-3) in your daily total
- Aggregates a 7-day vitamin D total vs the Nordic RDA (20 mcg/day, often 25+ recommended in winter)

## Important medical note

This app gives general nutrition and training guidance built from your stated goals. **It is not medical advice and is not a substitute for your diabetes care team.** Please review the carb/insulin plan with your endocrinologist or diabetes nurse before changing your routine, especially:

- The shift to ~120 g carbs concentrated pre-workout (your insulin timing/dosing will need to adapt)
- The 6-day training schedule (insulin sensitivity changes substantially with lifting)
- Any new supplements

The glucose log in this app is for your own notes — it does **not** read from your Libre/Dexcom (that requires their official app). Keep using your CGM as primary.

## Data privacy

Everything is stored in your phone's browser localStorage. Nothing is sent to any server (except Open Food Facts when you scan a barcode, which only sends the barcode number). Erasing browser data or uninstalling the home-screen app wipes your log.

## File layout (for the curious)

```
luca-app/
  index.html             — shell with 5-tab layout
  app.js                 — all logic (storage, rendering, scanner, calculations)
  data.js                — foods, meals, workouts, schedule, supplements
  style.css              — dark mobile-first styling
  manifest.webmanifest   — PWA install metadata
  sw.js                  — service worker (offline caching)
  icon-192.png           — home-screen icon
  icon-512.png           — high-res icon
```

Tweak `data.js` to swap meals, change food prices, or add exercises. The app re-renders automatically.
