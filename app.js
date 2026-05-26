// =====================================================================
//  Luca Bulk — main app logic
// =====================================================================
import {
  PROFILE, FOODS, RDA, MEAL_LIBRARY, WEEK_PLAN, EXERCISES, WORKOUTS,
  PROGRESSION, SCHOOL, SUPPLEMENTS, SUN_LOGIC,
} from "./data.js";

// ---------- Storage ----------
const KEY = "luca-bulk-v1";
const defaultState = () => ({
  profile: { ...PROFILE },
  weekRefDate: null,       // anchor date for Thursday A/B cycle (ISO date)
  weekRefIsA: true,        // is the anchor a "Week A" (short Thursday)?
  log: {},                 // { "YYYY-MM-DD": { water:0, mealsDone:[ids], glucose:[{t,v,n}], weight, sun:{min,uv}, supps:[ids], extras:[{foodId, g}], workout:{[exId]:[{w,r}]} } }
  customFoods: {},         // foods scanned from Open Food Facts: { barcode: { name, kcal, p, c, f, unit:'g' } }
  notes: "",
});

let S = load();

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    const v = JSON.parse(raw);
    return Object.assign(defaultState(), v);
  } catch { return defaultState(); }
}
function save() {
  localStorage.setItem(KEY, JSON.stringify(S));
}
function todayLog() {
  const d = isoDate();
  if (!S.log[d]) {
    S.log[d] = { water: 0, mealsDone: [], glucose: [], weight: null, sun: null, supps: [], extras: [], workout: {} };
    save();
  }
  return S.log[d];
}

// ---------- Date helpers ----------
function isoDate(d = new Date()) { return d.toISOString().slice(0, 10); }
function dayOfWeek(d = new Date()) {  // Mon=1..Sun=7
  const w = d.getDay(); return w === 0 ? 7 : w;
}
function fmtDate(d = new Date()) {
  return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" });
}
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function isThursdayA(d = new Date()) {
  // 2-week cycle. If anchor not set, default to "this week = A".
  if (!S.weekRefDate) return S.weekRefIsA;
  const anchor = new Date(S.weekRefDate);
  const diffWeeks = Math.floor((d - anchor) / (7 * 86400 * 1000));
  // even diff = same as anchor; odd diff = opposite
  return diffWeeks % 2 === 0 ? S.weekRefIsA : !S.weekRefIsA;
}
function getWeekIndex(d = new Date()) {
  // Returns 1..3 for the 3-week progressive overload cycle (rolling).
  // Use ISO week number mod 3 + 1 so it cycles continuously.
  const tmp = new Date(d.valueOf());
  tmp.setHours(0,0,0,0);
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
  const week1 = new Date(tmp.getFullYear(), 0, 4);
  const wn = 1 + Math.round(((tmp - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return ((wn - 1) % 3) + 1;
}

// ---------- Macro math ----------
function mealMacros(mealId) {
  const m = MEAL_LIBRARY[mealId];
  if (!m) return { kcal: 0, p: 0, c: 0, f: 0, fiber: 0, micros: {}, cost: 0 };
  let kcal=0,p=0,c=0,f=0,fiber=0,cost=0;
  const micros = { d:0, b12:0, iron:0, mg:0, zinc:0, omega3:0 };
  for (const it of m.items) {
    const food = FOODS[it.id]; if (!food) continue;
    const factor = it.g / 100;
    kcal += food.kcal * factor;
    p += food.p * factor;
    c += food.c * factor;
    f += food.f * factor;
    fiber += (food.fiber||0) * factor;
    cost += food.pricePer100 * factor;
    if (food.micros) for (const k of Object.keys(micros)) micros[k] += (food.micros[k]||0) * factor;
  }
  return { kcal: round(kcal), p: round(p,1), c: round(c,1), f: round(f,1), fiber: round(fiber,1), micros: roundObj(micros), cost: round(cost,1) };
}
function round(n, d=0) { const k = Math.pow(10,d); return Math.round(n*k)/k; }
function roundObj(o) { const r={}; for (const k of Object.keys(o)) r[k] = round(o[k],2); return r; }
function dayMacros(dow=null) {
  dow = dow ?? dayOfWeek();
  const plan = WEEK_PLAN[dow];
  const totals = { kcal:0,p:0,c:0,f:0,fiber:0,cost:0,micros:{d:0,b12:0,iron:0,mg:0,zinc:0,omega3:0} };
  for (const mid of plan.meals) {
    const m = mealMacros(mid);
    for (const k of ["kcal","p","c","f","fiber","cost"]) totals[k] += m[k];
    for (const k of Object.keys(totals.micros)) totals.micros[k] += m.micros[k]||0;
  }
  return roundTotals(totals);
}
function loggedMacrosToday() {
  // Sums macros from extras (scanned/custom items the user logged)
  const log = todayLog();
  const t = { kcal:0,p:0,c:0,f:0,fiber:0,cost:0,micros:{d:0,b12:0,iron:0,mg:0,zinc:0,omega3:0} };
  for (const id of log.mealsDone) {
    const m = mealMacros(id);
    t.kcal += m.kcal; t.p += m.p; t.c += m.c; t.f += m.f; t.fiber += m.fiber; t.cost += m.cost;
    for (const k of Object.keys(t.micros)) t.micros[k] += m.micros[k]||0;
  }
  for (const ex of (log.extras || [])) {
    const food = FOODS[ex.foodId] || S.customFoods[ex.foodId];
    if (!food) continue;
    const factor = ex.g / 100;
    t.kcal += (food.kcal||0)*factor;
    t.p += (food.p||0)*factor;
    t.c += (food.c||0)*factor;
    t.f += (food.f||0)*factor;
    t.fiber += (food.fiber||0)*factor;
    t.cost += (food.pricePer100||0)*factor;
    if (food.micros) for (const k of Object.keys(t.micros)) t.micros[k] += (food.micros[k]||0)*factor;
  }
  // Supplements add micros only
  for (const sid of log.supps) {
    if (sid === "vitd") t.micros.d += 25;
    if (sid === "tran") { t.micros.d += 10; t.micros.omega3 += 1.2; }
    if (sid === "mag")  t.micros.mg += 300;
  }
  // Sun exposure -> vitamin D
  if (log.sun) {
    const month = new Date().getMonth() + 1;
    if (SUN_LOGIC.monthsWithSun.includes(month)) {
      t.micros.d += (log.sun.min || 0) * (log.sun.uv || 0) * SUN_LOGIC.mcgPerMinPerUV;
    }
  }
  return roundTotals(t);
}
function roundTotals(t) {
  t.kcal = round(t.kcal); t.p = round(t.p,1); t.c = round(t.c,1); t.f = round(t.f,1);
  t.fiber = round(t.fiber,1); t.cost = round(t.cost,1);
  for (const k of Object.keys(t.micros)) t.micros[k] = round(t.micros[k],1);
  return t;
}

// ---------- Tab navigation ----------
const tabs = ["today","plan","scan","stats","settings"];
const titles = { today:"Today", plan:"3-Week Plan", scan:"Scan Food", stats:"Stats & Micros", settings:"Settings" };
document.querySelectorAll(".tabbar button").forEach(btn => {
  btn.addEventListener("click", () => switchTab(btn.dataset.tab));
});
function switchTab(name) {
  document.querySelectorAll(".tabbar button").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === "view-"+name));
  document.getElementById("page-title").textContent = titles[name];
  document.getElementById("page-date").textContent = fmtDate();
  render[name]();
  window.scrollTo(0, 0);
  if (name !== "scan") stopScanner();
}

// ---------- Toast ----------
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 1800);
}

// ---------- Macro bar component ----------
function macroBar(label, val, target, fillClass, unit="g") {
  const pct = Math.min(100, target ? (val/target)*100 : 0);
  return `<div class="macro-row">
    <span class="macro-label">${label}</span>
    <div class="macro-bar-bg"><div class="macro-bar-fill ${fillClass}" style="width:${pct}%"></div></div>
    <span class="macro-val"><b>${val}</b>/${target}${unit}</span>
  </div>`;
}

// ===================== TODAY VIEW =====================
const render = {};
render.today = function() {
  const dow = dayOfWeek();
  const plan = WEEK_PLAN[dow];
  const planned = dayMacros();
  const logged = loggedMacrosToday();
  const log = todayLog();
  const isWA = isThursdayA();
  const isThu = dow === 4;
  const wkLabel = isThu ? (isWA ? " (Week A — short, ends 11:40)" : " (Week B — long, ends 15:30)") : "";
  const wo = WORKOUTS[plan.workout];
  const wkIdx = getWeekIndex();
  const prog = PROGRESSION[wkIdx];

  const v = document.getElementById("view-today");
  v.innerHTML = `
    <!-- Day summary card -->
    <div class="card">
      <h2>${plan.day}${wkLabel} · ${prog.label}</h2>
      <h3>${wo.name}</h3>
      ${wo.note ? `<div class="sub">${wo.note}</div>` : ""}
      <div class="sub">${prog.intensityNote}</div>
    </div>

    <!-- Macros -->
    <div class="card">
      <h2>Today's Macros — Logged vs Target</h2>
      ${macroBar("Calories", logged.kcal, S.profile.targetKcal, "fill-k", " kcal")}
      ${macroBar("Protein",  logged.p,    S.profile.targetProtein, "fill-p", " g")}
      ${macroBar("Carbs",    logged.c,    S.profile.targetCarbs,   "fill-c", " g")}
      ${macroBar("Fat",      logged.f,    S.profile.targetFat,     "fill-f", " g")}
      <div class="text-dim small" style="margin-top:8px">Planned today: ${planned.kcal} kcal · ${planned.p}P / ${planned.c}C / ${planned.f}F · ~${planned.cost} NOK</div>
    </div>

    <!-- Water -->
    <div class="card">
      <h2>Water · ${log.water} / ${S.profile.targetWaterMl} ml</h2>
      <div class="water-row" id="water-cups"></div>
      <div class="water-buttons">
        <button data-water="250">+ 250 ml</button>
        <button data-water="500">+ 500 ml</button>
        <button data-water="-250">– 250 ml</button>
      </div>
    </div>

    <!-- Meals -->
    <div class="card">
      <h2>Today's Meals</h2>
      ${plan.meals.map(id => renderMealRow(id)).join("")}
      <div class="text-dim small" style="margin-top:8px">Tap a meal to mark eaten · pre-workout is the carb-heavy one</div>
    </div>

    <!-- Workout -->
    <div class="card">
      <h2>Workout — ${wo.name}</h2>
      ${wo.exercises.length ? wo.exercises.map((ex, i) => renderExerciseRow(ex, i)).join("") :
        `<div class="sub">${wo.note || "Recovery day."}</div>`}
    </div>

    <!-- Supplements & sun -->
    <div class="card">
      <h2>Supplements & Sun</h2>
      ${SUPPLEMENTS.map(s => `
        <div class="row" style="padding:8px 0; border-bottom:1px solid var(--border)">
          <div>
            <div style="font-weight:600">${s.name}</div>
            <div class="small text-dim">${s.dose} · ${s.when}</div>
          </div>
          <button class="btn ${log.supps.includes(s.id)?'btn-primary':''}" data-supp="${s.id}">
            ${log.supps.includes(s.id) ? "✓ Taken" : "Take"}
          </button>
        </div>
      `).join("")}
      <div style="padding-top:10px">
        <div style="font-weight:600; margin-bottom:6px">Sun exposure today</div>
        <div class="input-row">
          <label>Minutes outside (skin exposed)</label>
          <input type="number" id="sun-min" value="${log.sun?.min || 0}" min="0" max="240" style="width:80px">
        </div>
        <div class="input-row">
          <label>UV index now</label>
          <input type="number" id="sun-uv" value="${log.sun?.uv || 0}" min="0" max="11" style="width:80px">
        </div>
        <button class="btn btn-primary" id="save-sun">Save sun exposure</button>
        ${renderSunStatus(log)}
      </div>
    </div>

    <!-- Glucose log (manual spot-checks) -->
    <div class="card">
      <h2>Glucose spot-check (manual, alongside your CGM)</h2>
      <div class="input-row">
        <label>Reading</label>
        <input type="number" id="gl-val" placeholder="mmol/L" step="0.1" min="0" max="30" style="width:90px">
      </div>
      <div class="input-row">
        <label>Note (optional)</label>
        <input type="text" id="gl-note" placeholder="pre-meal, post-workout, low feeling…">
      </div>
      <button class="btn btn-primary" id="save-glucose">Log reading</button>
      <div class="glucose-log">
        ${(log.glucose||[]).slice().reverse().map(g => `
          <div><span>${g.t} — <b>${g.v}</b> mmol/L</span><span class="text-dim">${g.n||""}</span></div>
        `).join("") || `<div class="text-dim small" style="padding:6px 0">No readings logged today</div>`}
      </div>
    </div>

    <!-- Today's budget -->
    <div class="card">
      <h2>Today's planned cost</h2>
      <div class="budget-line"><span>Planned meals</span><span>${planned.cost} NOK</span></div>
      <div class="budget-line"><span>Logged so far</span><span>${logged.cost} NOK</span></div>
      <div class="budget-line"><span>Daily budget target</span><span>~114 NOK</span></div>
    </div>
  `;

  // Water cups visualization
  const cupsEl = document.getElementById("water-cups");
  const cups = Math.round(S.profile.targetWaterMl / 250);
  const full = Math.floor(log.water / 250);
  cupsEl.innerHTML = Array.from({length: cups}, (_, i) => `<div class="water-cup ${i<full?'full':''}"></div>`).join("");

  // Bindings
  v.querySelectorAll("[data-water]").forEach(b => b.addEventListener("click", () => {
    log.water = Math.max(0, log.water + parseInt(b.dataset.water));
    save(); render.today(); toast(`Water: ${log.water} ml`);
  }));
  v.querySelectorAll("[data-meal-id]").forEach(b => b.addEventListener("click", () => {
    const id = b.dataset.mealId;
    const i = log.mealsDone.indexOf(id);
    if (i >= 0) log.mealsDone.splice(i, 1); else log.mealsDone.push(id);
    save(); render.today();
  }));
  v.querySelectorAll("[data-supp]").forEach(b => b.addEventListener("click", () => {
    const id = b.dataset.supp;
    const i = log.supps.indexOf(id);
    if (i >= 0) log.supps.splice(i,1); else log.supps.push(id);
    save(); render.today();
  }));
  v.querySelector("#save-sun").addEventListener("click", () => {
    const m = parseInt(v.querySelector("#sun-min").value) || 0;
    const u = parseFloat(v.querySelector("#sun-uv").value) || 0;
    log.sun = { min: m, uv: u };
    save(); render.today();
    toast(`Sun: ${m} min @ UV ${u}`);
  });
  v.querySelector("#save-glucose").addEventListener("click", () => {
    const val = parseFloat(v.querySelector("#gl-val").value);
    if (isNaN(val)) return toast("Enter a value");
    const note = v.querySelector("#gl-note").value;
    const now = new Date().toTimeString().slice(0,5);
    log.glucose = log.glucose || [];
    log.glucose.push({ t: now, v: val, n: note });
    save(); render.today(); toast("Glucose logged");
  });
  // Exercise log inputs
  v.querySelectorAll("[data-exid]").forEach(inp => inp.addEventListener("change", () => {
    const exId = inp.dataset.exid;
    const setNum = parseInt(inp.dataset.set);
    const field = inp.dataset.field;
    log.workout[exId] = log.workout[exId] || [];
    log.workout[exId][setNum] = log.workout[exId][setNum] || { w: "", r: "" };
    log.workout[exId][setNum][field] = inp.value;
    save();
  }));
};

function renderMealRow(id) {
  const meal = MEAL_LIBRARY[id];
  const macros = mealMacros(id);
  const log = todayLog();
  const checked = log.mealsDone.includes(id);
  const itemsStr = meal.items.map(it => {
    const f = FOODS[it.id]; if (!f) return "";
    return `${it.g}${f.unit||"g"} ${f.name}`;
  }).join(" · ");
  return `<div class="meal ${checked?'meal-checked':''}" data-meal-id="${id}">
    <div class="meal-head">
      <span class="meal-name">${meal.name}${meal.preWorkout?'<span class="pre-workout-badge">pre-workout</span>':''}</span>
      <span class="meal-phase">${meal.phase}</span>
    </div>
    <div class="meal-macros">
      <span class="m-p">${macros.p}P</span>
      <span class="m-c">${macros.c}C</span>
      <span class="m-f">${macros.f}F</span>
      <span>${macros.kcal} kcal</span>
      <span class="text-dim">~${macros.cost} NOK</span>
    </div>
    <div class="meal-items">${itemsStr}</div>
    ${meal.notes ? `<div class="meal-notes">${meal.notes}</div>` : ""}
  </div>`;
}

function renderExerciseRow(ex, idx) {
  const e = EXERCISES[ex.id];
  const log = todayLog();
  const sets = log.workout[ex.id] || [];
  const wkIdx = getWeekIndex();
  const prog = PROGRESSION[wkIdx];
  const factor = prog.loadFactor;
  let setRows = "";
  for (let i = 0; i < ex.sets; i++) {
    const s = sets[i] || {};
    setRows += `<div class="set-grid">
      <span class="set-num">${i+1}</span>
      <input type="number" inputmode="decimal" placeholder="kg" value="${s.w||''}" data-exid="${ex.id}" data-set="${i}" data-field="w">
      <input type="number" inputmode="numeric" placeholder="reps" value="${s.r||''}" data-exid="${ex.id}" data-set="${i}" data-field="r">
      <span class="set-num">${s.w&&s.r?'✓':''}</span>
    </div>`;
  }
  return `<div class="exercise">
    <div class="exercise-name">${e.name}</div>
    <div class="exercise-sub">${ex.sets} sets × ${ex.reps} · ${e.muscle} · RIR ${ex.rir} · ×${factor.toFixed(3)} load</div>
    ${ex.note ? `<div class="exercise-note">${ex.note}</div>` : ""}
    ${setRows}
  </div>`;
}

function renderSunStatus(log) {
  const month = new Date().getMonth() + 1;
  if (!SUN_LOGIC.monthsWithSun.includes(month)) {
    return `<div class="vitd-warning">${SUN_LOGIC.warningWinter}</div>`;
  }
  if (!log.sun || !log.sun.min || !log.sun.uv) {
    return `<div class="text-dim small" style="margin-top:8px">Log your sun exposure to estimate vit-D synthesis.</div>`;
  }
  const mcg = log.sun.min * log.sun.uv * SUN_LOGIC.mcgPerMinPerUV;
  return `<div style="margin-top:8px">
    Estimated vitamin D from sun today: <b>${round(mcg,1)} mcg</b>
    <div class="vitd-bar"><div class="vitd-fill" style="width:${Math.min(100,(mcg/RDA.d)*100)}%"></div></div>
    <div class="text-dim small">Target: ${RDA.d} mcg/day (with food + supplement, not just sun).</div>
  </div>`;
}

// ===================== PLAN VIEW =====================
render.plan = function() {
  const v = document.getElementById("view-plan");
  const today = new Date();
  const dow = dayOfWeek(today);
  // Show 3 weeks: this week + next 2
  const startOfThisWeek = addDays(today, -(dow - 1));
  let weeksHtml = "";
  for (let wk = 0; wk < 3; wk++) {
    const wkStart = addDays(startOfThisWeek, wk * 7);
    const wkLabel = PROGRESSION[getWeekIndex(addDays(wkStart, 0))].label;
    let dayCells = "";
    for (let i = 0; i < 7; i++) {
      const d = addDays(wkStart, i);
      const ddow = dayOfWeek(d);
      const plan = WEEK_PLAN[ddow];
      const isToday = isoDate(d) === isoDate(today);
      const thuLabel = ddow === 4 ? (isThursdayA(d) ? "A 11:40" : "B 15:30") : "";
      dayCells += `<div class="day-cell ${isToday?'today':''}">
        <span class="day-name">${plan.day.slice(0,3)}</span>
        <span class="day-num">${d.getDate()}</span>
        <span class="day-w ${plan.workout}">${plan.workout}</span>
        ${thuLabel ? `<span class="text-dim small">${thuLabel}</span>` : ""}
      </div>`;
    }
    weeksHtml += `<div class="card">
      <h2>${wkLabel} · ${isoDate(wkStart)}</h2>
      <div class="week-row">${dayCells}</div>
      <div class="text-dim small" style="margin-top:8px">${PROGRESSION[((getWeekIndex(wkStart)-1)%3)+1].intensityNote}</div>
    </div>`;
  }

  // Daily meal-plan rotation card
  let mealsHtml = "";
  for (let d = 1; d <= 7; d++) {
    const plan = WEEK_PLAN[d];
    const macros = dayMacros(d);
    mealsHtml += `<div class="card">
      <h2>${plan.day} — ${WORKOUTS[plan.workout].name.split(" —")[0]}</h2>
      <div class="text-dim small">${macros.kcal} kcal · ${macros.p}P / ${macros.c}C / ${macros.f}F · ${macros.cost} NOK</div>
      ${plan.meals.map(id => {
        const m = MEAL_LIBRARY[id]; const mm = mealMacros(id);
        return `<div class="meal">
          <div class="meal-head"><span class="meal-name">${m.name}${m.preWorkout?'<span class="pre-workout-badge">pre-workout</span>':''}</span><span class="meal-phase">${m.phase}</span></div>
          <div class="meal-macros"><span class="m-p">${mm.p}P</span><span class="m-c">${mm.c}C</span><span class="m-f">${mm.f}F</span><span>${mm.kcal} kcal</span><span class="text-dim">~${mm.cost} NOK</span></div>
        </div>`;
      }).join("")}
    </div>`;
  }

  // Weekly shopping & budget summary
  let weeklyCost = 0;
  for (let d = 1; d <= 7; d++) weeklyCost += dayMacros(d).cost;
  v.innerHTML = `
    <div class="card">
      <h2>3-Week Workout Calendar</h2>
      <div class="text-dim small" style="margin-bottom:8px">Push/Pull/Legs × 2, Sunday rest. Load auto-increases each week.</div>
    </div>
    ${weeksHtml}
    <div class="card">
      <h2>Weekly Budget Estimate</h2>
      <div class="budget-line"><span>Sum of 7 daily meal plans</span><span>${round(weeklyCost)} NOK</span></div>
      <div class="budget-line"><span>Your budget cap</span><span>800 NOK</span></div>
      <div class="text-dim small" style="margin-top:6px">If over: swap chicken thighs for whole chicken, drop salmon for mackerel-in-tomato, buy oats and PB in bulk.</div>
    </div>
    <div class="card">
      <h2>Weekly Meal Rotation</h2>
      <div class="text-dim small" style="margin-bottom:8px">This is your default 7-day cycle. Tap into Today to mark meals eaten.</div>
    </div>
    ${mealsHtml}
  `;
};

// ===================== SCAN VIEW =====================
let scanner = null;
let scannerStream = null;
function stopScanner() {
  if (scanner && scanner.reset) try { scanner.reset(); } catch {}
  if (scannerStream) { scannerStream.getTracks().forEach(t => t.stop()); scannerStream = null; }
}

render.scan = function() {
  const v = document.getElementById("view-scan");
  v.innerHTML = `
    <div class="card">
      <h2>Scan Barcode (or QR)</h2>
      <div class="scan-stage" id="scan-stage">
        <video id="scan-video" playsinline muted></video>
        <div class="scan-reticle"></div>
      </div>
      <div class="btn-row">
        <button class="btn btn-primary" id="start-scan">Start camera</button>
        <button class="btn" id="stop-scan">Stop</button>
      </div>
      <div id="scan-result"></div>
    </div>

    <div class="card">
      <h2>Or pick a food manually</h2>
      <input type="text" id="food-search" placeholder="Search e.g. kvarg, oats…" style="width:100%; padding:10px; background:var(--bg-card-2); border:1px solid var(--border); color:var(--text); border-radius:8px">
      <div id="food-results" style="margin-top:10px"></div>
    </div>

    <div class="card">
      <h2>Today's logged extras</h2>
      <div id="today-extras"></div>
    </div>
  `;

  document.getElementById("start-scan").addEventListener("click", startScanner);
  document.getElementById("stop-scan").addEventListener("click", stopScanner);
  document.getElementById("food-search").addEventListener("input", e => {
    const q = e.target.value.toLowerCase().trim();
    const results = Object.entries(FOODS)
      .filter(([id, f]) => f.name.toLowerCase().includes(q))
      .slice(0, 12)
      .map(([id, f]) => foodPickRow(id, f)).join("");
    document.getElementById("food-results").innerHTML = q ? (results || `<div class="text-dim small">No match.</div>`) : "";
  });
  renderTodayExtras();
};

function foodPickRow(id, f) {
  return `<div class="row" style="padding:8px 0;border-bottom:1px solid var(--border)">
    <div>
      <div style="font-weight:600">${f.name}</div>
      <div class="text-dim small">${f.kcal} kcal · ${f.p}P/${f.c}C/${f.f}F per 100${f.unit||'g'}</div>
    </div>
    <button class="btn btn-primary" data-pick-food="${id}">Add</button>
  </div>`;
}

function renderTodayExtras() {
  const log = todayLog();
  const el = document.getElementById("today-extras");
  if (!el) return;
  if (!log.extras || !log.extras.length) {
    el.innerHTML = `<div class="text-dim small">Nothing logged outside the meal plan yet.</div>`;
    return;
  }
  el.innerHTML = log.extras.map((ex, i) => {
    const food = FOODS[ex.foodId] || S.customFoods[ex.foodId];
    if (!food) return "";
    const f = ex.g/100;
    return `<div class="row" style="padding:8px 0;border-bottom:1px solid var(--border)">
      <div>
        <div style="font-weight:600">${food.name}</div>
        <div class="text-dim small">${ex.g}${food.unit||'g'} · ${round(food.kcal*f)} kcal · ${round(food.p*f,1)}P/${round(food.c*f,1)}C/${round(food.f*f,1)}F</div>
      </div>
      <button class="btn btn-danger" data-remove-extra="${i}">Remove</button>
    </div>`;
  }).join("");
  el.querySelectorAll("[data-remove-extra]").forEach(b => b.addEventListener("click", () => {
    log.extras.splice(parseInt(b.dataset.removeExtra), 1); save(); renderTodayExtras(); toast("Removed");
  }));
}

// Listen for "add food" clicks (delegation)
document.addEventListener("click", e => {
  const t = e.target.closest("[data-pick-food]");
  if (t) {
    const id = t.dataset.pickFood;
    promptAmountAndLog(id);
  }
});

function promptAmountAndLog(foodId, defaultG=100) {
  const food = FOODS[foodId] || S.customFoods[foodId];
  if (!food) return;
  const unit = food.unit || "g";
  const g = prompt(`How many ${unit} of ${food.name}?`, defaultG);
  if (g === null) return;
  const n = parseFloat(g);
  if (isNaN(n) || n <= 0) return;
  const log = todayLog();
  log.extras = log.extras || [];
  log.extras.push({ foodId, g: n });
  save();
  toast(`+${n}${unit} ${food.name}`);
  renderTodayExtras();
  // Re-render today macros if visible
  if (document.querySelector('[data-tab="today"]').classList.contains("active")) render.today();
}

async function startScanner() {
  const result = document.getElementById("scan-result");
  result.innerHTML = `<div class="text-dim small">Starting camera…</div>`;
  if (!window.ZXingBrowser) {
    result.innerHTML = `<div class="vitd-warning">Scanner library failed to load. Use manual search below.</div>`;
    return;
  }
  try {
    const codeReader = new window.ZXingBrowser.BrowserMultiFormatReader();
    scanner = codeReader;
    const video = document.getElementById("scan-video");
    const controls = await codeReader.decodeFromVideoDevice(undefined, video, async (res, err) => {
      if (res) {
        const code = res.getText();
        codeReader.reset();
        result.innerHTML = `<div class="scan-result">Scanned: <b>${code}</b><br><span class="text-dim small">Looking up Open Food Facts…</span></div>`;
        await lookupBarcode(code);
      }
    });
    scanner = controls;
  } catch (e) {
    result.innerHTML = `<div class="vitd-warning">Camera blocked or not available. On iPhone: Settings → Safari → Camera → Allow.</div>`;
    console.error(e);
  }
}

async function lookupBarcode(code) {
  const result = document.getElementById("scan-result");
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
    const j = await r.json();
    if (j.status !== 1) {
      result.innerHTML = `<div class="scan-result">Not found in Open Food Facts (${code}). <button class="btn" id="manual-food">Enter manually</button></div>`;
      document.getElementById("manual-food").addEventListener("click", () => manualFoodEntry(code));
      return;
    }
    const p = j.product;
    const nutr = p.nutriments || {};
    const food = {
      name: p.product_name || p.generic_name || `Unknown (${code})`,
      unit: "g",
      kcal: round(nutr["energy-kcal_100g"] || (nutr["energy_100g"]||0)/4.184),
      p: round(nutr.proteins_100g || 0, 1),
      c: round(nutr.carbohydrates_100g || 0, 1),
      f: round(nutr.fat_100g || 0, 1),
      fiber: round(nutr.fiber_100g || 0, 1),
      pricePer100: 0,
      micros: {},
    };
    S.customFoods[code] = food;
    save();
    result.innerHTML = `<div class="scan-result">
      <div style="font-weight:600">${food.name}</div>
      <div class="text-dim small">${food.kcal} kcal · ${food.p}P / ${food.c}C / ${food.f}F per 100g</div>
      <div class="btn-row"><button class="btn btn-primary" id="log-scanned">Log amount eaten</button></div>
    </div>`;
    document.getElementById("log-scanned").addEventListener("click", () => promptAmountAndLog(code));
  } catch (e) {
    result.innerHTML = `<div class="vitd-warning">Lookup failed (offline?). You can still log manually.</div>`;
  }
}

function manualFoodEntry(code) {
  const name = prompt("Product name?");
  if (!name) return;
  const kcal = parseFloat(prompt("Calories per 100g?")) || 0;
  const p = parseFloat(prompt("Protein per 100g?")) || 0;
  const c = parseFloat(prompt("Carbs per 100g?")) || 0;
  const f = parseFloat(prompt("Fat per 100g?")) || 0;
  S.customFoods[code] = { name, kcal, p, c, f, fiber: 0, pricePer100: 0, unit: "g", micros: {} };
  save();
  promptAmountAndLog(code);
}

// ===================== STATS VIEW =====================
render.stats = function() {
  const v = document.getElementById("view-stats");
  const logged = loggedMacrosToday();
  const log = todayLog();

  // 7-day average
  const days = [];
  for (let i = 0; i < 7; i++) {
    const d = isoDate(addDays(new Date(), -i));
    const dl = S.log[d];
    if (dl) days.push(dl);
  }
  const wkLog = days.length;

  // Body weight history
  const weights = Object.entries(S.log)
    .filter(([d, l]) => l.weight)
    .map(([d, l]) => ({ d, w: l.weight }))
    .sort((a,b) => a.d.localeCompare(b.d));
  const latestWeight = weights.length ? weights[weights.length-1] : null;
  const goalDelta = latestWeight ? round(S.profile.goalWeightKg - latestWeight.w, 1) : "—";

  // Micros — show today's intake vs RDA
  function microCell(name, key, val, target, unit) {
    const pct = target ? Math.round((val/target)*100) : 0;
    const cls = pct >= 100 ? "ok" : pct < 50 ? "low" : "";
    return `<div class="micro-cell ${cls}">
      <div class="micro-name">${name}</div>
      <div class="micro-val">${val}${unit}</div>
      <div class="micro-pct">${pct}% of ${target}${unit}</div>
    </div>`;
  }

  v.innerHTML = `
    <div class="card">
      <h2>Today vs Targets</h2>
      ${macroBar("Calories", logged.kcal, S.profile.targetKcal, "fill-k", " kcal")}
      ${macroBar("Protein",  logged.p,    S.profile.targetProtein, "fill-p", " g")}
      ${macroBar("Carbs",    logged.c,    S.profile.targetCarbs,   "fill-c", " g")}
      ${macroBar("Fat",      logged.f,    S.profile.targetFat,     "fill-f", " g")}
      ${macroBar("Fiber",    logged.fiber, S.profile.targetFiber,  "fill-p", " g")}
      ${macroBar("Water",    log.water,    S.profile.targetWaterMl,"fill-k", " ml")}
    </div>

    <div class="card">
      <h2>Micronutrients today</h2>
      <div class="micros-grid">
        ${microCell("Vit D",  "d",     logged.micros.d,     RDA.d,     " mcg")}
        ${microCell("Vit B12","b12",   logged.micros.b12,   RDA.b12,   " mcg")}
        ${microCell("Iron",   "iron",  logged.micros.iron,  RDA.iron,  " mg")}
        ${microCell("Magnesium","mg",  logged.micros.mg,    RDA.mg,    " mg")}
        ${microCell("Zinc",   "zinc",  logged.micros.zinc,  RDA.zinc,  " mg")}
        ${microCell("Omega-3","omega3",logged.micros.omega3,RDA.omega3," g")}
      </div>
      <div class="text-dim small" style="margin-top:8px">Includes food + supplements + estimated sun-D (Oslo months only).</div>
    </div>

    <div class="card">
      <h2>Body weight</h2>
      <div class="row">
        <div>
          <div style="font-size:24px;font-weight:700">${latestWeight ? latestWeight.w + " kg" : "—"}</div>
          <div class="text-dim small">${latestWeight ? "logged " + latestWeight.d : "no weight logged"} · goal ${S.profile.goalWeightKg} kg (${goalDelta>=0?'+':''}${goalDelta} kg to go)</div>
        </div>
        <button class="btn btn-primary" id="log-weight">Log today</button>
      </div>
      ${weights.length > 1 ? renderWeightSparkline(weights) : ""}
    </div>

    <div class="card">
      <h2>7-day glance</h2>
      <div class="text-dim small">Days with entries in the last week: ${wkLog}/7</div>
    </div>

    <div class="card">
      <h2>Vitamin D status (Oslo-aware)</h2>
      ${renderVitDStatus()}
    </div>
  `;

  document.getElementById("log-weight").addEventListener("click", () => {
    const w = parseFloat(prompt("Body weight today (kg)?", latestWeight?.w || S.profile.startWeightKg));
    if (isNaN(w)) return;
    todayLog().weight = w; save(); render.stats(); toast(`Weight: ${w} kg`);
  });
};

function renderWeightSparkline(weights) {
  const w = 300, h = 60, pad = 6;
  const vals = weights.map(p => p.w);
  const min = Math.min(...vals) - 0.5, max = Math.max(...vals) + 0.5;
  const x = i => pad + (i / (weights.length - 1)) * (w - 2 * pad);
  const y = v => h - pad - ((v - min) / (max - min)) * (h - 2 * pad);
  const path = weights.map((p, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(p.w).toFixed(1)}`).join(" ");
  return `<svg width="100%" height="${h}" viewBox="0 0 ${w} ${h}" style="margin-top:8px">
    <path d="${path}" fill="none" stroke="var(--accent)" stroke-width="2"/>
    ${weights.map((p,i) => `<circle cx="${x(i)}" cy="${y(p.w)}" r="2.5" fill="var(--accent)"/>`).join("")}
  </svg>`;
}

function renderVitDStatus() {
  const month = new Date().getMonth() + 1;
  const sunPossible = SUN_LOGIC.monthsWithSun.includes(month);
  const log = todayLog();
  let html = `<div class="text-dim small">Oslo latitude (59.9°N). Sun synthesis only possible May–August.</div>`;
  if (!sunPossible) {
    html += `<div class="vitd-warning">${SUN_LOGIC.warningWinter}</div>`;
  } else {
    html += `<div class="text-dim small" style="margin-top:6px">Sun-D is possible this month. Aim for 20–30 min midday with arms+legs exposed when UV ≥ 3.</div>`;
  }
  // 7-day vit-D total
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const d = isoDate(addDays(new Date(), -i));
    const dl = S.log[d];
    if (!dl) continue;
    let dayD = 0;
    for (const id of dl.mealsDone||[]) dayD += mealMacros(id).micros.d || 0;
    for (const e of dl.extras||[]) {
      const food = FOODS[e.foodId] || S.customFoods[e.foodId];
      if (food && food.micros) dayD += (food.micros.d||0) * e.g/100;
    }
    for (const sid of dl.supps||[]) { if (sid==="vitd") dayD+=25; if (sid==="tran") dayD+=10; }
    if (dl.sun && SUN_LOGIC.monthsWithSun.includes(new Date(d).getMonth()+1)) {
      dayD += (dl.sun.min||0)*(dl.sun.uv||0)*SUN_LOGIC.mcgPerMinPerUV;
    }
    total += dayD;
  }
  html += `<div style="margin-top:10px">7-day vitamin D total: <b>${round(total,1)} mcg</b> (target: ${RDA.d*7} mcg)</div>`;
  html += `<div class="vitd-bar"><div class="vitd-fill" style="width:${Math.min(100,(total/(RDA.d*7))*100)}%"></div></div>`;
  return html;
}

// ===================== SETTINGS VIEW =====================
render.settings = function() {
  const v = document.getElementById("view-settings");
  v.innerHTML = `
    <div class="card">
      <h2>Profile</h2>
      <div class="input-row"><label>Name</label><input type="text" id="p-name" value="${S.profile.name}"></div>
      <div class="input-row"><label>Age</label><input type="number" id="p-age" value="${S.profile.age}" style="width:80px"></div>
      <div class="input-row"><label>Height (cm)</label><input type="number" id="p-h" value="${S.profile.heightCm}" style="width:80px"></div>
      <div class="input-row"><label>Goal weight (kg)</label><input type="number" id="p-gw" value="${S.profile.goalWeightKg}" style="width:80px"></div>
      <button class="btn btn-primary" id="save-profile">Save profile</button>
    </div>

    <div class="card">
      <h2>Daily macro targets</h2>
      <div class="input-row"><label>Calories</label><input type="number" id="t-k" value="${S.profile.targetKcal}" style="width:90px"></div>
      <div class="input-row"><label>Protein (g)</label><input type="number" id="t-p" value="${S.profile.targetProtein}" style="width:90px"></div>
      <div class="input-row"><label>Carbs (g)</label><input type="number" id="t-c" value="${S.profile.targetCarbs}" style="width:90px"></div>
      <div class="input-row"><label>Fat (g)</label><input type="number" id="t-f" value="${S.profile.targetFat}" style="width:90px"></div>
      <div class="input-row"><label>Water (ml)</label><input type="number" id="t-w" value="${S.profile.targetWaterMl}" style="width:90px"></div>
      <button class="btn btn-primary" id="save-targets">Save targets</button>
    </div>

    <div class="card">
      <h2>Thursday week cycle (A / B)</h2>
      <div class="text-dim small" style="margin-bottom:8px">Set which kind of Thursday <b>this week</b> is. The app will alternate every week from there.</div>
      <div class="input-row">
        <label>This week's Thursday is…</label>
        <select id="thu-pick">
          <option value="A" ${isThursdayA()?'selected':''}>Week A — short (ends 11:40)</option>
          <option value="B" ${!isThursdayA()?'selected':''}>Week B — long (ends 15:30)</option>
        </select>
      </div>
      <button class="btn btn-primary" id="save-thu">Save Thursday cycle</button>
    </div>

    <div class="card">
      <h2>School schedule (display only)</h2>
      ${Object.values(SCHOOL).map(s => `
        <div class="budget-line"><span>${s.day}</span><span>${s.start ? `${s.start} → ${s.end || (isThursdayA()?s.endA:s.endB) || "—"}` : "off"}</span></div>
      `).join("")}
    </div>

    <div class="card">
      <h2>About this app</h2>
      <div class="small text-dim">
        Built for Luca · Oslo · T1D · bulking 75→85 kg.<br>
        <b>Medical disclaimer:</b> This app gives general nutrition and training guidance. It is not medical advice. Please review the carb/insulin plan with your endocrinologist or diabetes nurse before changing your routine.<br>
        Food prices are estimates from REMA 1000 / Kiwi spring 2026; check your receipt.<br>
        Barcode data via Open Food Facts (free, community-maintained).<br>
        Data is stored locally in your phone's browser — nothing is sent anywhere.
      </div>
    </div>

    <div class="card">
      <h2>Danger zone</h2>
      <button class="btn btn-danger" id="reset-today">Reset today's log</button>
      <button class="btn btn-danger" id="reset-all" style="margin-top:8px">Erase ALL data</button>
    </div>
  `;

  document.getElementById("save-profile").addEventListener("click", () => {
    S.profile.name = document.getElementById("p-name").value;
    S.profile.age = parseInt(document.getElementById("p-age").value) || S.profile.age;
    S.profile.heightCm = parseInt(document.getElementById("p-h").value) || S.profile.heightCm;
    S.profile.goalWeightKg = parseFloat(document.getElementById("p-gw").value) || S.profile.goalWeightKg;
    save(); toast("Profile saved");
  });
  document.getElementById("save-targets").addEventListener("click", () => {
    S.profile.targetKcal = parseInt(document.getElementById("t-k").value) || S.profile.targetKcal;
    S.profile.targetProtein = parseInt(document.getElementById("t-p").value) || S.profile.targetProtein;
    S.profile.targetCarbs = parseInt(document.getElementById("t-c").value) || S.profile.targetCarbs;
    S.profile.targetFat = parseInt(document.getElementById("t-f").value) || S.profile.targetFat;
    S.profile.targetWaterMl = parseInt(document.getElementById("t-w").value) || S.profile.targetWaterMl;
    save(); toast("Targets saved");
  });
  document.getElementById("save-thu").addEventListener("click", () => {
    const v = document.getElementById("thu-pick").value;
    // Anchor on this week's Monday
    const t = new Date(); const mon = addDays(t, -(dayOfWeek(t)-1));
    S.weekRefDate = isoDate(mon);
    S.weekRefIsA = (v === "A");
    save(); render.settings(); toast(`This week's Thursday: ${v}`);
  });
  document.getElementById("reset-today").addEventListener("click", () => {
    if (confirm("Reset today's log? (water, meals checked, glucose, sun, workout sets)")) {
      delete S.log[isoDate()]; save(); render.today(); toast("Today cleared");
    }
  });
  document.getElementById("reset-all").addEventListener("click", () => {
    if (confirm("Erase ALL data permanently?")) { localStorage.removeItem(KEY); S = defaultState(); render.settings(); toast("All data erased"); }
  });
};

// ---------- Init ----------
document.getElementById("page-date").textContent = fmtDate();
switchTab("today");

// Service worker
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").catch(err => console.warn("SW registration failed:", err));
}

// Re-render today at midnight rollover (best effort)
setInterval(() => {
  const stillToday = document.querySelector('[data-tab="today"]').classList.contains("active");
  if (stillToday) {
    const cur = document.getElementById("page-date").textContent;
    const now = fmtDate();
    if (cur !== now) { document.getElementById("page-date").textContent = now; render.today(); }
  }
}, 60000);
