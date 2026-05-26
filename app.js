// =====================================================================
//  Luca Bulk — main app logic (v2)
// =====================================================================
import {
  PROFILE, FOODS, RDA, MEAL_LIBRARY, MEAL_CYCLE, WORKOUT_WEEK, EXERCISES, WORKOUTS,
  PROGRESSION, SCHOOL, SUPPLEMENTS, SUN_LOGIC, GLUCOSE_CONTEXTS, getAlternatives,
} from "./data.js";

// ---------- Storage ----------
const KEY = "luca-bulk-v2";
const defaultState = () => ({
  profile: { ...PROFILE },
  weekRefDate: null,
  weekRefIsA: true,
  cycleAnchor: null,   // ISO date of cycle day 1 (Mon Week A)
  mealOverrides: {},   // { "YYYY-MM-DD": { 0: "bk_skyr", 2: "sn_eggs_nuts" } } — meal index -> mealId
  log: {},
  customFoods: {},
  notes: "",
});

let S = load();
// Migrate from v1 if present
if (!localStorage.getItem(KEY)) {
  const old = localStorage.getItem("luca-bulk-v1");
  if (old) try { S = Object.assign(defaultState(), JSON.parse(old)); save(); } catch {}
}

function load() {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState();
    return Object.assign(defaultState(), JSON.parse(raw));
  } catch { return defaultState(); }
}
function save() { localStorage.setItem(KEY, JSON.stringify(S)); }
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
function dayOfWeek(d = new Date()) { const w = d.getDay(); return w === 0 ? 7 : w; }
function fmtDate(d = new Date()) { return d.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "short" }); }
function fmtShort(d) { return d.toLocaleDateString("en-GB", { weekday: "short", day: "numeric", month: "short" }); }
function addDays(d, n) { const r = new Date(d); r.setDate(r.getDate() + n); return r; }
function isThursdayA(d = new Date()) {
  if (!S.weekRefDate) return S.weekRefIsA;
  const anchor = new Date(S.weekRefDate);
  const diffWeeks = Math.floor((d - anchor) / (7 * 86400 * 1000));
  return diffWeeks % 2 === 0 ? S.weekRefIsA : !S.weekRefIsA;
}
function cycleDay(d = new Date()) {
  // Returns 1..14
  const dow = dayOfWeek(d);
  const isA = isThursdayA(d);
  return isA ? dow : dow + 7;
}
function getWeekIndex(d = new Date()) {
  const tmp = new Date(d.valueOf());
  tmp.setHours(0,0,0,0);
  tmp.setDate(tmp.getDate() + 3 - ((tmp.getDay() + 6) % 7));
  const week1 = new Date(tmp.getFullYear(), 0, 4);
  const wn = 1 + Math.round(((tmp - week1) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  return ((wn - 1) % 3) + 1;
}

// ---------- Macro math ----------
function getMealId(date, slotIdx) {
  const d = isoDate(date);
  if (S.mealOverrides[d] && S.mealOverrides[d][slotIdx]) return S.mealOverrides[d][slotIdx];
  const cd = cycleDay(date);
  return MEAL_CYCLE[cd].meals[slotIdx];
}
function getDayMeals(date) {
  const cd = cycleDay(date);
  return MEAL_CYCLE[cd].meals.map((_, i) => getMealId(date, i));
}
function mealMacros(mealId) {
  const m = MEAL_LIBRARY[mealId];
  if (!m) return { kcal: 0, p: 0, c: 0, f: 0, fiber: 0, micros: {}, cost: 0 };
  let kcal=0,p=0,c=0,f=0,fiber=0,cost=0;
  const micros = { d:0, b12:0, iron:0, mg:0, zinc:0, omega3:0 };
  for (const it of m.items) {
    const food = FOODS[it.id]; if (!food) continue;
    const factor = it.g / 100;
    kcal += food.kcal * factor; p += food.p * factor; c += food.c * factor; f += food.f * factor;
    fiber += (food.fiber||0) * factor; cost += food.pricePer100 * factor;
    if (food.micros) for (const k of Object.keys(micros)) micros[k] += (food.micros[k]||0) * factor;
  }
  return { kcal: round(kcal), p: round(p,1), c: round(c,1), f: round(f,1), fiber: round(fiber,1), micros: roundObj(micros), cost: round(cost,1) };
}
function round(n, d=0) { const k = Math.pow(10,d); return Math.round(n*k)/k; }
function roundObj(o) { const r={}; for (const k of Object.keys(o)) r[k] = round(o[k],2); return r; }
function dayMacros(date = new Date()) {
  const meals = getDayMeals(date);
  const t = { kcal:0,p:0,c:0,f:0,fiber:0,cost:0,micros:{d:0,b12:0,iron:0,mg:0,zinc:0,omega3:0} };
  for (const mid of meals) {
    const m = mealMacros(mid);
    for (const k of ["kcal","p","c","f","fiber","cost"]) t[k] += m[k];
    for (const k of Object.keys(t.micros)) t.micros[k] += m.micros[k]||0;
  }
  return roundTotals(t);
}
function loggedMacrosToday() {
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
    t.kcal += (food.kcal||0)*factor; t.p += (food.p||0)*factor; t.c += (food.c||0)*factor;
    t.f += (food.f||0)*factor; t.fiber += (food.fiber||0)*factor; t.cost += (food.pricePer100||0)*factor;
    if (food.micros) for (const k of Object.keys(t.micros)) t.micros[k] += (food.micros[k]||0)*factor;
  }
  for (const sid of log.supps) {
    if (sid === "vitd") t.micros.d += 25;
    if (sid === "tran") { t.micros.d += 10; t.micros.omega3 += 1.2; }
    if (sid === "mag")  t.micros.mg += 300;
  }
  if (log.sun) {
    const month = new Date().getMonth() + 1;
    if (SUN_LOGIC.monthsWithSun.includes(month)) t.micros.d += (log.sun.min || 0) * (log.sun.uv || 0) * SUN_LOGIC.mcgPerMinPerUV;
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
const tabs = ["today","plan","scan","glucose","stats","settings"];
const titles = { today:"Today", plan:"Plan", scan:"Scan", glucose:"Glucose", stats:"Stats", settings:"Settings" };
document.querySelectorAll(".tabbar button").forEach(btn => btn.addEventListener("click", () => switchTab(btn.dataset.tab)));
function switchTab(name) {
  document.querySelectorAll(".tabbar button").forEach(b => b.classList.toggle("active", b.dataset.tab === name));
  document.querySelectorAll(".view").forEach(v => v.classList.toggle("active", v.id === "view-"+name));
  document.getElementById("page-title").textContent = titles[name];
  document.getElementById("page-date").textContent = fmtDate();
  render[name]();
  window.scrollTo(0, 0);
  if (name !== "scan") stopScanner();
}

// ---------- Toast / sheet ----------
function toast(msg) {
  const t = document.getElementById("toast");
  t.textContent = msg; t.classList.add("show");
  clearTimeout(toast._t); toast._t = setTimeout(() => t.classList.remove("show"), 1800);
}
function openSheet(title, bodyHtml, onMount) {
  const sheet = document.getElementById("sheet");
  sheet.innerHTML = `<div class="sheet-inner">
    <div class="sheet-head">
      <h3>${title}</h3>
      <button class="sheet-close" id="sheet-close">✕</button>
    </div>
    <div class="sheet-body">${bodyHtml}</div>
  </div>`;
  sheet.classList.add("show");
  document.getElementById("sheet-close").addEventListener("click", closeSheet);
  sheet.addEventListener("click", e => { if (e.target.id === "sheet") closeSheet(); });
  if (onMount) onMount(sheet);
}
function closeSheet() { document.getElementById("sheet").classList.remove("show"); }

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
  const date = new Date();
  // Pre-start: hide meals/macros/workout until the program officially starts.
  const startStr = PROFILE.programStartDate;
  if (startStr) {
    const today = isoDate(date);
    if (today < startStr) {
      const start = new Date(startStr + "T00:00:00");
      const msLeft = start - date;
      const daysLeft = Math.max(1, Math.ceil(msLeft / 86400000));
      const niceDate = start.toLocaleDateString("en-GB", { weekday: "long", day: "numeric", month: "long" });
      const v0 = document.getElementById("view-today");
      v0.innerHTML = `
        <div class="card hero">
          <div class="hero-day">Bulk starts ${niceDate}</div>
          <div class="hero-workout">${daysLeft} day${daysLeft === 1 ? "" : "s"} to go</div>
          <div class="hero-prog">Today is a free day — eat normally, rest up.</div>
        </div>
        <div class="card">
          <h2>Use today to prep</h2>
          <ul style="margin:6px 0 0 18px; padding:0; line-height:1.7;">
            <li>Open the <b>Plan</b> tab and look over the 14-day rotation</li>
            <li>Tap any day to see meals and shopping list</li>
            <li>Open the <b>Glucose</b> tab and log a baseline reading</li>
            <li>In <b>Settings</b>, double-check your weight / targets / Thursday cycle</li>
          </ul>
        </div>
        <div class="card">
          <h2>Change the start date</h2>
          <div class="text-dim small">Open <code>data.js</code> and edit <code>PROFILE.programStartDate</code>. The Today tab returns to normal once the date matches.</div>
        </div>
      `;
      return;
    }
  }
  const dow = dayOfWeek(date);
  const cd = cycleDay(date);
  const meals = getDayMeals(date);
  const planned = dayMacros(date);
  const logged = loggedMacrosToday();
  const log = todayLog();
  const isWA = isThursdayA(date);
  const isThu = dow === 4;
  const wkLabel = isThu ? (isWA ? " · short Thursday (ends 11:40)" : " · long Thursday (ends 15:30)") : "";
  const wo = WORKOUTS[WORKOUT_WEEK[dow].workout];
  const wkIdx = getWeekIndex(date);
  const prog = PROGRESSION[wkIdx];

  const v = document.getElementById("view-today");
  v.innerHTML = `
    <div class="card hero">
      <div class="hero-day">${WORKOUT_WEEK[dow].day} · Day ${cd} of 14${wkLabel}</div>
      <div class="hero-workout">${wo.name}</div>
      <div class="hero-prog">${prog.label} · ${prog.intensityNote}</div>
    </div>

    <div class="card">
      <h2>Macros today</h2>
      ${macroBar("Calories", logged.kcal, S.profile.targetKcal, "fill-k", " kcal")}
      ${macroBar("Protein",  logged.p,    S.profile.targetProtein, "fill-p", " g")}
      ${macroBar("Carbs",    logged.c,    S.profile.targetCarbs,   "fill-c", " g")}
      ${macroBar("Fat",      logged.f,    S.profile.targetFat,     "fill-f", " g")}
      <div class="text-dim small" style="margin-top:8px">Planned: ${planned.kcal} kcal · ${planned.p}P / ${planned.c}C / ${planned.f}F · ~${planned.cost} NOK</div>
    </div>

    <div class="card">
      <h2>Water · ${log.water} / ${S.profile.targetWaterMl} ml</h2>
      <div class="water-row" id="water-cups"></div>
      <div class="water-buttons">
        <button class="big" data-water="250">+ 250 ml</button>
        <button class="big" data-water="500">+ 500 ml</button>
        <button class="big" data-water="-250">– 250</button>
      </div>
    </div>

    <div class="card">
      <h2>Meals — tap to mark eaten · swap to change</h2>
      ${meals.map((id, i) => renderMealRow(id, i)).join("")}
    </div>

    <div class="card">
      <h2>Workout — ${wo.name}</h2>
      ${wo.note ? `<div class="hint">${wo.note}</div>` : ""}
      ${wo.exercises.length ? wo.exercises.map(ex => renderExerciseRow(ex)).join("") : `<div class="hint">${wo.note || "Recovery day."}</div>`}
    </div>

    <div class="card">
      <h2>Supplements</h2>
      ${SUPPLEMENTS.map(s => `
        <div class="supp-row">
          <div>
            <div class="supp-name">${s.name}</div>
            <div class="small text-dim">${s.dose} · ${s.when}</div>
          </div>
          <button class="btn ${log.supps.includes(s.id)?'btn-primary':''}" data-supp="${s.id}">
            ${log.supps.includes(s.id) ? "✓ Taken" : "Mark taken"}
          </button>
        </div>
      `).join("")}
    </div>

    <div class="card">
      <h2>Sun exposure</h2>
      <div class="input-row">
        <label>Minutes outside</label>
        <input type="number" class="big-input" id="sun-min" value="${log.sun?.min || 0}" min="0" max="240">
      </div>
      <div class="input-row">
        <label>UV index</label>
        <input type="number" class="big-input" id="sun-uv" value="${log.sun?.uv || 0}" min="0" max="11" step="0.5">
      </div>
      <button class="btn btn-primary big" id="save-sun">Save sun exposure</button>
      ${renderSunStatus(log)}
    </div>

    <div class="card">
      <h2>Quick glucose entry</h2>
      <div class="text-dim small" style="margin-bottom:6px">Tap the Glucose tab for full logging with meal context + insulin tracking.</div>
      <div class="quick-glucose">
        <input type="number" id="qgl-val" class="big-input" placeholder="mmol/L" step="0.1" min="0" max="30">
        <button class="btn btn-primary" id="qgl-save">+ Log</button>
      </div>
    </div>
  `;

  // Water cups
  const cupsEl = document.getElementById("water-cups");
  const cups = Math.round(S.profile.targetWaterMl / 250);
  const full = Math.floor(log.water / 250);
  cupsEl.innerHTML = Array.from({length: cups}, (_, i) => `<div class="water-cup ${i<full?'full':''}"></div>`).join("");

  // Bindings
  v.querySelectorAll("[data-water]").forEach(b => b.addEventListener("click", () => {
    log.water = Math.max(0, log.water + parseInt(b.dataset.water));
    save(); render.today(); toast(`Water: ${log.water} ml`);
  }));
  v.querySelectorAll("[data-meal-toggle]").forEach(b => b.addEventListener("click", () => {
    const id = b.dataset.mealToggle;
    const i = log.mealsDone.indexOf(id);
    if (i >= 0) log.mealsDone.splice(i, 1); else log.mealsDone.push(id);
    save(); render.today();
  }));
  v.querySelectorAll("[data-meal-swap]").forEach(b => b.addEventListener("click", e => {
    e.stopPropagation();
    const slotIdx = parseInt(b.dataset.mealSwap);
    const currentId = b.dataset.currentId;
    // Cycle through every meal in this slot (bk_, ln_, pw_, sn_, dn_, ev_).
    const prefix = currentId.split("_")[0] + "_";
    const allOptions = Object.keys(MEAL_LIBRARY).filter(id => id.startsWith(prefix));
    if (allOptions.length <= 1) { toast("Only one meal in this slot"); return; }
    const next = allOptions[(allOptions.indexOf(currentId) + 1) % allOptions.length];
    const dateKey = isoDate();
    S.mealOverrides[dateKey] = S.mealOverrides[dateKey] || {};
    S.mealOverrides[dateKey][slotIdx] = next;
    save();
    render.today();
    toast(`Swapped → ${MEAL_LIBRARY[next].name}`);
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
    save(); render.today(); toast(`Sun: ${m} min @ UV ${u}`);
  });
  v.querySelector("#qgl-save").addEventListener("click", () => {
    const val = parseFloat(v.querySelector("#qgl-val").value);
    if (isNaN(val)) return toast("Enter a value");
    const now = new Date().toTimeString().slice(0,5);
    log.glucose = log.glucose || [];
    log.glucose.push({ t: now, v: val, ctx: "other", n: "" });
    save(); toast(`Glucose ${val} logged`); v.querySelector("#qgl-val").value = "";
  });
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

function renderMealRow(id, slotIdx) {
  const meal = MEAL_LIBRARY[id];
  if (!meal) return `<div class="meal">Unknown meal</div>`;
  const macros = mealMacros(id);
  const log = todayLog();
  const checked = log.mealsDone.includes(id);
  const itemsStr = meal.items.map(it => {
    const f = FOODS[it.id]; if (!f) return "";
    return `${it.g}${f.unit||"g"} ${f.name}`;
  }).join(" · ");
  return `<div class="meal ${checked?'meal-checked':''}">
    <div class="meal-head" data-meal-toggle="${id}">
      <span class="meal-name">${meal.name}${meal.preWorkout?'<span class="pre-workout-badge">pre-WO</span>':''}</span>
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
    <div class="meal-actions">
      <button class="btn-small" data-meal-toggle="${id}">${checked?'Unmark':'Mark eaten'}</button>
      <button class="btn-small" data-meal-swap="${slotIdx}" data-current-id="${id}">Swap meal →</button>
    </div>
  </div>`;
}

function openMealSwap(slotIdx, currentId) {
  const alts = getAlternatives(currentId);
  const dateKey = isoDate();
  const html = `
    <div class="text-dim small" style="margin-bottom:10px">Pick an alternative for this slot today. The change is saved for today only — your normal rotation comes back tomorrow.</div>
    ${alts.map(id => {
      const m = MEAL_LIBRARY[id]; const mm = mealMacros(id);
      return `<button class="swap-option" data-pick="${id}">
        <div class="swap-name">${m.name}${m.preWorkout?'<span class="pre-workout-badge">pre-WO</span>':''}</div>
        <div class="swap-macros"><span class="m-p">${mm.p}P</span> <span class="m-c">${mm.c}C</span> <span class="m-f">${mm.f}F</span> · ${mm.kcal} kcal · ~${mm.cost} NOK</div>
      </button>`;
    }).join("")}
  `;
  openSheet("Swap meal", html, sheet => {
    sheet.querySelectorAll("[data-pick]").forEach(b => b.addEventListener("click", () => {
      S.mealOverrides[dateKey] = S.mealOverrides[dateKey] || {};
      S.mealOverrides[dateKey][slotIdx] = b.dataset.pick;
      save(); closeSheet(); render.today(); toast("Meal swapped for today");
    }));
  });
}

function renderExerciseRow(ex) {
  const e = EXERCISES[ex.id];
  const log = todayLog();
  const sets = log.workout[ex.id] || [];
  const wkIdx = getWeekIndex();
  const factor = PROGRESSION[wkIdx].loadFactor;
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
  if (!SUN_LOGIC.monthsWithSun.includes(month)) return `<div class="vitd-warning">${SUN_LOGIC.warningWinter}</div>`;
  if (!log.sun || !log.sun.min || !log.sun.uv) return `<div class="text-dim small" style="margin-top:8px">Log your sun exposure to estimate vit-D synthesis.</div>`;
  const mcg = log.sun.min * log.sun.uv * SUN_LOGIC.mcgPerMinPerUV;
  return `<div style="margin-top:8px">
    Estimated vitamin D from sun today: <b>${round(mcg,1)} mcg</b>
    <div class="vitd-bar"><div class="vitd-fill" style="width:${Math.min(100,(mcg/RDA.d)*100)}%"></div></div>
  </div>`;
}

// ===================== PLAN VIEW =====================
render.plan = function() {
  const v = document.getElementById("view-plan");
  const today = new Date();
  const dow = dayOfWeek(today);
  const startOfThisWeek = addDays(today, -(dow - 1));

  // 3-week workout calendar
  let weeksHtml = "";
  for (let wk = 0; wk < 3; wk++) {
    const wkStart = addDays(startOfThisWeek, wk * 7);
    let dayCells = "";
    for (let i = 0; i < 7; i++) {
      const d = addDays(wkStart, i);
      const ddow = dayOfWeek(d);
      const wo = WORKOUT_WEEK[ddow];
      const isToday = isoDate(d) === isoDate(today);
      const thuLabel = ddow === 4 ? (isThursdayA(d) ? "A short" : "B long") : "";
      const cd = cycleDay(d);
      dayCells += `<div class="day-cell ${isToday?'today':''}">
        <span class="day-name">${wo.day.slice(0,3)}</span>
        <span class="day-num">${d.getDate()}</span>
        <span class="day-w ${wo.workout}">${wo.workout}</span>
        ${thuLabel ? `<span class="text-dim small">${thuLabel}</span>` : ""}
        <span class="text-dim small">d${cd}</span>
      </div>`;
    }
    const wkLabel = PROGRESSION[getWeekIndex(wkStart)].label;
    weeksHtml += `<div class="card">
      <h2>${wkLabel} · ${isoDate(wkStart)}</h2>
      <div class="week-row">${dayCells}</div>
      <div class="text-dim small" style="margin-top:8px">${PROGRESSION[getWeekIndex(wkStart)].intensityNote}</div>
    </div>`;
  }

  // Shopping list — next 7 days
  const shopping = {};
  let shopCost = 0;
  for (let i = 0; i < 7; i++) {
    const d = addDays(today, i);
    const meals = getDayMeals(d);
    for (const mid of meals) {
      const m = MEAL_LIBRARY[mid]; if (!m) continue;
      for (const it of m.items) {
        shopping[it.id] = (shopping[it.id] || 0) + it.g;
        const f = FOODS[it.id]; if (f) shopCost += f.pricePer100 * it.g / 100;
      }
    }
  }
  const shopRows = Object.entries(shopping)
    .sort(([,a],[,b]) => b - a)
    .map(([id, g]) => {
      const f = FOODS[id]; if (!f) return "";
      const cost = (f.pricePer100 * g / 100).toFixed(1);
      const display = g >= 1000 ? `${(g/1000).toFixed(2)} kg` : `${Math.round(g)} ${f.unit||'g'}`;
      return `<div class="shop-row"><span>${f.name}</span><span class="shop-amt">${display}</span><span class="shop-cost">${cost} NOK</span></div>`;
    }).join("");

  // Next 14 days meals (each with its own shopping list)
  let upcomingHtml = "";
  for (let i = 0; i < 14; i++) {
    const d = addDays(today, i);
    const meals = getDayMeals(d);
    const macros = dayMacros(d);
    const isToday = i === 0;
    const wo = WORKOUT_WEEK[dayOfWeek(d)];

    // Aggregate this day's ingredients
    const dayIng = {};
    for (const mid of meals) {
      const m = MEAL_LIBRARY[mid]; if (!m) continue;
      for (const it of m.items) dayIng[it.id] = (dayIng[it.id] || 0) + it.g;
    }
    let dayShopCost = 0;
    const dayShopRows = Object.entries(dayIng)
      .sort(([,a],[,b]) => b - a)
      .map(([id, g]) => {
        const f = FOODS[id]; if (!f) return "";
        const cost = f.pricePer100 * g / 100;
        dayShopCost += cost;
        const display = g >= 1000 ? `${(g/1000).toFixed(2)} kg` : `${Math.round(g)} ${f.unit||'g'}`;
        return `<div class="shop-row"><span>${f.name}</span><span class="shop-amt">${display}</span><span class="shop-cost">${cost.toFixed(1)} NOK</span></div>`;
      }).join("");

    upcomingHtml += `<div class="card ${isToday?'today-card':''}">
      <h2>${fmtShort(d)}${isToday?' · TODAY':''} · ${wo.workout}</h2>
      <div class="text-dim small">${macros.kcal} kcal · ${macros.p}P / ${macros.c}C / ${macros.f}F · ${macros.cost} NOK</div>
      ${meals.map(id => {
        const m = MEAL_LIBRARY[id]; const mm = mealMacros(id);
        const itemsStr = m.items.map(it => {
          const f = FOODS[it.id]; if (!f) return "";
          return `${it.g}${f.unit||"g"} ${f.name}`;
        }).filter(Boolean).join(" · ");
        return `<div class="meal-mini">
          <div class="meal-mini-name">${m.name}${m.preWorkout?'<span class="pre-workout-badge">pre-WO</span>':''}</div>
          <div class="small" style="margin-top:4px">${itemsStr}</div>
          <div class="text-dim small" style="margin-top:2px">${mm.kcal} kcal · ${mm.p}P/${mm.c}C/${mm.f}F · ~${mm.cost} NOK</div>
        </div>`;
      }).join("")}
      <details class="day-shop" open>
        <summary>🛒 Shopping list for this day · ${round(dayShopCost)} NOK</summary>
        <div class="shop-list" style="margin-top:8px">${dayShopRows}</div>
      </details>
    </div>`;
  }

  v.innerHTML = `
    <div class="card">
      <h2>3-Week Workout Calendar</h2>
      <div class="text-dim small">PPL × 2, Thursday rest. Load auto-increases each week. d# = day in your 14-day meal cycle.</div>
    </div>
    ${weeksHtml}

    <div class="card">
      <h2>Shopping list — next 7 days</h2>
      <div class="text-dim small" style="margin-bottom:8px">Total: ~${round(shopCost)} NOK · go shopping before Monday</div>
      <div class="shop-list">${shopRows}</div>
    </div>

    <div class="card">
      <h2>Next 14 days — full meal plan</h2>
      <div class="text-dim small">Your diet rotates over 14 days so it doesn't get boring.</div>
    </div>
    ${upcomingHtml}
  `;
};

// ===================== SCAN VIEW =====================
let scannerInstance = null;
function stopScanner() {
  if (scannerInstance) {
    try { scannerInstance.stop().then(()=>scannerInstance.clear()).catch(()=>{}); } catch {}
    scannerInstance = null;
  }
}
render.scan = function() {
  const v = document.getElementById("view-scan");
  v.innerHTML = `
    <div class="card">
      <h2>Scan barcode</h2>
      <div id="qr-reader" class="scan-stage"></div>
      <div class="btn-row">
        <button class="btn btn-primary big" id="start-scan">📷 Start camera</button>
        <button class="btn big" id="stop-scan">Stop</button>
      </div>
      <div id="scan-result"></div>
      <div class="text-dim small" style="margin-top:8px">First time: iPhone will ask for camera permission — tap Allow.</div>
    </div>

    <div class="card">
      <h2>Or pick a food manually</h2>
      <input type="text" id="food-search" class="big-input" placeholder="Search e.g. kvarg, oats, chicken…" style="width:100%; margin-bottom:8px">
      <div id="food-results"></div>
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
    // Search BOTH built-in FOODS and previously-scanned customFoods, so a
    // milk you scanned last week is one search away today.
    const combined = { ...FOODS, ...(S.customFoods || {}) };
    const results = Object.entries(combined)
      .filter(([id, f]) => f && f.name && f.name.toLowerCase().includes(q))
      .slice(0, 20)
      .map(([id, f]) => foodPickRow(id, f)).join("");
    document.getElementById("food-results").innerHTML = q ? (results || `<div class="text-dim small">No match. Scan it instead, or check spelling.</div>`) : "";
  });
  renderTodayExtras();
};
function foodPickRow(id, f) {
  return `<div class="row" style="padding:10px 0;border-bottom:1px solid var(--border)">
    <div>
      <div style="font-weight:600">${f.name}</div>
      <div class="text-dim small">${f.kcal} kcal · ${f.p}P/${f.c}C/${f.f}F per 100${f.unit||'g'}</div>
    </div>
    <button class="btn btn-primary" data-pick-food="${id}">Add</button>
  </div>`;
}
function renderTodayExtras() {
  const log = todayLog();
  const el = document.getElementById("today-extras"); if (!el) return;
  if (!log.extras || !log.extras.length) { el.innerHTML = `<div class="text-dim small">Nothing logged outside the meal plan yet.</div>`; return; }
  el.innerHTML = log.extras.map((ex, i) => {
    const food = FOODS[ex.foodId] || S.customFoods[ex.foodId]; if (!food) return "";
    const f = ex.g/100;
    return `<div class="row" style="padding:10px 0;border-bottom:1px solid var(--border)">
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

document.addEventListener("click", e => {
  const t = e.target.closest("[data-pick-food]");
  if (t) promptAmountAndLog(t.dataset.pickFood);
});

function promptAmountAndLog(foodId, defaultG=100) {
  const food = FOODS[foodId] || S.customFoods[foodId]; if (!food) return;
  const unit = food.unit || "g";
  const html = `
    <div class="text-dim small" style="margin-bottom:8px">${food.name}<br>${food.kcal} kcal · ${food.p}P/${food.c}C/${food.f}F per 100${unit}</div>
    <div class="input-row">
      <label>Amount (${unit})</label>
      <input type="number" id="amt-input" class="big-input" value="${defaultG}" min="0" step="1" style="width:120px" autofocus>
    </div>
    <div class="text-dim small" id="amt-preview"></div>
    <button class="btn btn-primary big" id="amt-save" style="width:100%; margin-top:14px">Log it</button>
  `;
  openSheet(`Log ${food.name}`, html, sheet => {
    const input = sheet.querySelector("#amt-input");
    const preview = sheet.querySelector("#amt-preview");
    const updatePreview = () => {
      const g = parseFloat(input.value) || 0;
      const f = g/100;
      preview.innerHTML = `Will log: <b>${round(food.kcal*f)} kcal</b> · ${round(food.p*f,1)}P / ${round(food.c*f,1)}C / ${round(food.f*f,1)}F`;
    };
    input.addEventListener("input", updatePreview); updatePreview();
    sheet.querySelector("#amt-save").addEventListener("click", () => {
      const g = parseFloat(input.value);
      if (isNaN(g) || g <= 0) return toast("Enter an amount");
      const log = todayLog(); log.extras = log.extras || [];
      log.extras.push({ foodId, g });
      save(); closeSheet(); toast(`+${g}${unit} ${food.name}`);
      if (document.querySelector('[data-tab="scan"]').classList.contains("active")) renderTodayExtras();
      if (document.querySelector('[data-tab="today"]').classList.contains("active")) render.today();
    });
  });
}

async function startScanner() {
  const result = document.getElementById("scan-result");
  result.innerHTML = `<div class="text-dim small">Starting camera…</div>`;
  if (!window.Html5Qrcode) {
    result.innerHTML = `<div class="vitd-warning">Scanner library not loaded. Reload the page and try again.</div>`;
    return;
  }
  try {
    stopScanner();
    const supportedFormats = window.Html5QrcodeSupportedFormats ? [
      window.Html5QrcodeSupportedFormats.EAN_13,
      window.Html5QrcodeSupportedFormats.EAN_8,
      window.Html5QrcodeSupportedFormats.UPC_A,
      window.Html5QrcodeSupportedFormats.UPC_E,
      window.Html5QrcodeSupportedFormats.CODE_128,
      window.Html5QrcodeSupportedFormats.QR_CODE,
    ] : undefined;
    scannerInstance = new window.Html5Qrcode("qr-reader", supportedFormats ? { formatsToSupport: supportedFormats } : undefined);
    await scannerInstance.start(
      { facingMode: "environment" },
      { fps: 10, qrbox: { width: 280, height: 180 }, aspectRatio: 1.333 },
      async (decoded) => {
        await scannerInstance.stop(); scannerInstance.clear(); scannerInstance = null;
        result.innerHTML = `<div class="scan-result">Scanned: <b>${decoded}</b><br><span class="text-dim small">Looking up Open Food Facts…</span></div>`;
        await lookupBarcode(decoded);
      },
      () => {}
    );
  } catch (e) {
    console.error(e);
    result.innerHTML = `<div class="vitd-warning">Camera blocked. On iPhone: Settings → Safari → Camera → Allow. Then reload this app.</div>`;
  }
}

async function lookupBarcode(code) {
  const result = document.getElementById("scan-result");
  try {
    const r = await fetch(`https://world.openfoodfacts.org/api/v0/product/${code}.json`);
    const j = await r.json();
    if (j.status !== 1) {
      result.innerHTML = `<div class="scan-result">Product not in Open Food Facts (${code}). <button class="btn" id="manual-food">Enter manually</button></div>`;
      document.getElementById("manual-food").addEventListener("click", () => manualFoodEntry(code));
      return;
    }
    const p = j.product, nutr = p.nutriments || {};
    const brand = p.brands ? p.brands.split(",")[0].trim() : "";
    const fullName = [brand, p.product_name || p.generic_name].filter(Boolean).join(" — ") || `Unknown (${code})`;
    const food = {
      name: fullName,
      unit: (p.serving_quantity_unit || "g").toLowerCase().includes("ml") ? "ml" : "g",
      kcal: round(nutr["energy-kcal_100g"] || (nutr["energy_100g"]||0)/4.184),
      p: round(nutr.proteins_100g || 0, 1),
      c: round(nutr.carbohydrates_100g || 0, 1),
      f: round(nutr.fat_100g || 0, 1),
      fiber: round(nutr.fiber_100g || 0, 1),
      pricePer100: 0, micros: {},
    };
    S.customFoods[code] = food; save();
    const imgUrl = p.image_front_small_url || p.image_url || "";
    const servingHint = p.serving_size ? `<div class="text-dim small">Typical serving: ${p.serving_size}</div>` : "";
    result.innerHTML = `<div class="scan-result">
      <div class="row" style="gap:12px;align-items:flex-start">
        ${imgUrl ? `<img src="${imgUrl}" alt="" style="width:64px;height:64px;object-fit:contain;background:#fff;border-radius:8px;flex-shrink:0">` : ""}
        <div style="flex:1">
          <div style="font-weight:600">${food.name}</div>
          <div class="text-dim small">${food.kcal} kcal · ${food.p}P / ${food.c}C / ${food.f}F per 100${food.unit}</div>
          ${servingHint}
        </div>
      </div>
      <button class="btn btn-primary big" id="log-scanned" style="margin-top:10px;width:100%">Log amount →</button>
    </div>`;
    document.getElementById("log-scanned").addEventListener("click", () => promptAmountAndLog(code));
  } catch (e) {
    result.innerHTML = `<div class="vitd-warning">Lookup failed (offline?). You can still log manually below.</div>`;
  }
}
function manualFoodEntry(code) {
  const name = prompt("Product name?"); if (!name) return;
  const kcal = parseFloat(prompt("Calories per 100g?")) || 0;
  const p = parseFloat(prompt("Protein per 100g?")) || 0;
  const c = parseFloat(prompt("Carbs per 100g?")) || 0;
  const f = parseFloat(prompt("Fat per 100g?")) || 0;
  S.customFoods[code] = { name, kcal, p, c, f, fiber: 0, pricePer100: 0, unit: "g", micros: {} };
  save(); promptAmountAndLog(code);
}

// ===================== GLUCOSE VIEW =====================
render.glucose = function() {
  const v = document.getElementById("view-glucose");
  const log = todayLog();
  const meals = getDayMeals(new Date());

  // Aggregate per-meal stats (today)
  const linkedByMeal = {};
  (log.glucose||[]).forEach((g, idx) => {
    if (g.mealSlot !== undefined) {
      linkedByMeal[g.mealSlot] = linkedByMeal[g.mealSlot] || [];
      linkedByMeal[g.mealSlot].push(g);
    }
  });

  // Today's time-in-range
  const todays = log.glucose || [];
  const lo = S.profile.glucoseLowMmol, hi = S.profile.glucoseHighMmol;
  const tir = todays.length ? Math.round(todays.filter(g => g.v >= lo && g.v <= hi).length / todays.length * 100) : 0;
  const above = todays.filter(g => g.v > hi).length;
  const below = todays.filter(g => g.v < lo).length;

  v.innerHTML = `
    <div class="card hero">
      <div class="hero-day">Today's blood sugar</div>
      <div class="row" style="margin-top:8px">
        <div><b style="font-size:28px">${tir}%</b><div class="small text-dim">in range (${lo}-${hi})</div></div>
        <div><b style="font-size:28px;color:var(--danger)">${above}</b><div class="small text-dim">above</div></div>
        <div><b style="font-size:28px;color:var(--accent-2)">${below}</b><div class="small text-dim">below</div></div>
        <div><b style="font-size:28px">${todays.length}</b><div class="small text-dim">readings</div></div>
      </div>
    </div>

    <div class="card">
      <h2>Log new reading</h2>
      <div class="input-row">
        <label>Value (mmol/L)</label>
        <input type="number" id="gl-val" class="big-input" step="0.1" min="0" max="30" placeholder="e.g. 6.4" style="width:120px">
      </div>
      <div class="input-row">
        <label>Time</label>
        <input type="time" id="gl-time" class="big-input" value="${new Date().toTimeString().slice(0,5)}" style="width:120px">
      </div>
      <div class="input-row">
        <label>Context</label>
        <select id="gl-ctx" class="big-input">
          ${GLUCOSE_CONTEXTS.map(c => `<option value="${c.id}">${c.label}</option>`).join("")}
        </select>
      </div>
      <div class="input-row">
        <label>Link to meal (optional)</label>
        <select id="gl-meal" class="big-input">
          <option value="">— none —</option>
          ${meals.map((mid, i) => `<option value="${i}">${MEAL_LIBRARY[mid]?.name || "?"}</option>`).join("")}
        </select>
      </div>
      <div class="input-row">
        <label>Insulin units (optional)</label>
        <input type="number" id="gl-ins" class="big-input" step="0.5" min="0" max="100" placeholder="rapid units" style="width:120px">
      </div>
      <div class="input-row">
        <label>Note</label>
        <input type="text" id="gl-note" class="big-input" placeholder="anything — e.g. felt low, high carb meal" style="flex:2">
      </div>
      <button class="btn btn-primary big" id="gl-save" style="width:100%; margin-top:10px">Save reading</button>
    </div>

    <div class="card">
      <h2>Today's readings</h2>
      ${todays.length === 0 ? `<div class="text-dim small">No readings logged yet.</div>` :
        todays.slice().reverse().map((g, ri) => {
          const idx = todays.length - 1 - ri;
          const ctx = GLUCOSE_CONTEXTS.find(c => c.id === g.ctx)?.label || g.ctx || "—";
          const ml = g.mealSlot !== undefined ? `→ ${MEAL_LIBRARY[meals[g.mealSlot]]?.name || ""}` : "";
          const cls = g.v < lo ? "g-low" : g.v > hi ? "g-high" : "g-ok";
          return `<div class="g-row">
            <div class="g-val ${cls}">${g.v}</div>
            <div class="g-meta">
              <div><b>${g.t}</b> · ${ctx} ${ml}</div>
              <div class="small text-dim">${g.ins ? `${g.ins}U insulin · ` : ''}${g.n || ''}</div>
            </div>
            <button class="btn-small btn-danger" data-del-gl="${idx}">×</button>
          </div>`;
        }).join("")
      }
    </div>

    <div class="card">
      <h2>Per-meal correlation (today)</h2>
      ${Object.keys(linkedByMeal).length === 0 ?
        `<div class="text-dim small">Tag glucose readings to specific meals to see how each meal + insulin combo affects your sugar. Useful for tuning your carb-to-insulin ratio.</div>` :
        Object.entries(linkedByMeal).map(([slot, gs]) => {
          const mid = meals[slot]; const m = MEAL_LIBRARY[mid]; if (!m) return "";
          const mac = mealMacros(mid);
          const pre = gs.find(g => g.ctx === "pre_meal");
          const p1 = gs.find(g => g.ctx === "post_1h");
          const p2 = gs.find(g => g.ctx === "post_2h");
          const ins = gs.find(g => g.ins);
          let advice = "";
          if (pre && p2 && p2.v - pre.v > 3) advice = `<div class="advice">High post-meal rise (+${(p2.v-pre.v).toFixed(1)} mmol/L). Possibly under-dosed for these ${mac.c}g carbs — discuss carb:insulin ratio with your diabetes nurse.</div>`;
          else if (pre && p2 && pre.v - p2.v > 3) advice = `<div class="advice">Big drop (-${(pre.v-p2.v).toFixed(1)} mmol/L). Possibly over-dosed — risk of hypo.</div>`;
          else if (pre && p2) advice = `<div class="advice ok">Looks well-matched. Change: ${(p2.v-pre.v).toFixed(1)} mmol/L over 2h.</div>`;
          return `<div class="meal-mini" style="margin-bottom:10px">
            <div class="meal-mini-name">${m.name} — ${mac.c}g carbs · ${ins ? ins.ins + 'U insulin' : 'no insulin logged'}</div>
            <div class="small">
              ${pre ? `pre: <b>${pre.v}</b> · ` : ''}
              ${p1 ? `+1h: <b>${p1.v}</b> · ` : ''}
              ${p2 ? `+2h: <b>${p2.v}</b>` : ''}
            </div>
            ${advice}
          </div>`;
        }).join("")
      }
    </div>

    <div class="card">
      <h2>Last 7 days</h2>
      ${render7DayGlucose()}
    </div>
  `;

  // Bindings
  document.getElementById("gl-save").addEventListener("click", () => {
    const val = parseFloat(document.getElementById("gl-val").value);
    if (isNaN(val)) return toast("Enter a value");
    const time = document.getElementById("gl-time").value || new Date().toTimeString().slice(0,5);
    const ctx = document.getElementById("gl-ctx").value;
    const mealSlotRaw = document.getElementById("gl-meal").value;
    const ins = parseFloat(document.getElementById("gl-ins").value) || null;
    const n = document.getElementById("gl-note").value;
    const entry = { t: time, v: val, ctx, n };
    if (mealSlotRaw !== "") entry.mealSlot = parseInt(mealSlotRaw);
    if (ins) entry.ins = ins;
    log.glucose = log.glucose || [];
    log.glucose.push(entry);
    log.glucose.sort((a,b) => a.t.localeCompare(b.t));
    save(); render.glucose(); toast("Logged");
  });
  v.querySelectorAll("[data-del-gl]").forEach(b => b.addEventListener("click", () => {
    if (!confirm("Delete this reading?")) return;
    log.glucose.splice(parseInt(b.dataset.delGl), 1);
    save(); render.glucose();
  }));
};

function render7DayGlucose() {
  const lo = S.profile.glucoseLowMmol, hi = S.profile.glucoseHighMmol;
  const rows = [];
  for (let i = 6; i >= 0; i--) {
    const d = isoDate(addDays(new Date(), -i));
    const dl = S.log[d]; if (!dl || !dl.glucose || dl.glucose.length === 0) continue;
    const vals = dl.glucose.map(g => g.v);
    const avg = vals.reduce((a,b)=>a+b,0) / vals.length;
    const tir = Math.round(dl.glucose.filter(g => g.v >= lo && g.v <= hi).length / dl.glucose.length * 100);
    rows.push({ d, n: dl.glucose.length, avg, tir });
  }
  if (rows.length === 0) return `<div class="text-dim small">No readings in the last 7 days.</div>`;
  return rows.map(r => `<div class="g-summary">
    <span>${r.d}</span>
    <span>${r.n} readings</span>
    <span>avg <b>${r.avg.toFixed(1)}</b></span>
    <span class="${r.tir >= 70 ? 'g-ok' : 'g-warn'}">${r.tir}% TIR</span>
  </div>`).join("");
}

// ===================== STATS VIEW =====================
render.stats = function() {
  const v = document.getElementById("view-stats");
  const logged = loggedMacrosToday();
  const log = todayLog();

  const weights = Object.entries(S.log)
    .filter(([d, l]) => l.weight)
    .map(([d, l]) => ({ d, w: l.weight }))
    .sort((a,b) => a.d.localeCompare(b.d));
  const latestWeight = weights.length ? weights[weights.length-1] : null;
  const goalDelta = latestWeight ? round(S.profile.goalWeightKg - latestWeight.w, 1) : "—";

  function microCell(name, val, target, unit) {
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
      <h2>Today vs targets</h2>
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
        ${microCell("Vit D",  logged.micros.d,     RDA.d,     " mcg")}
        ${microCell("Vit B12",logged.micros.b12,   RDA.b12,   " mcg")}
        ${microCell("Iron",   logged.micros.iron,  RDA.iron,  " mg")}
        ${microCell("Magnesium",logged.micros.mg,  RDA.mg,    " mg")}
        ${microCell("Zinc",   logged.micros.zinc,  RDA.zinc,  " mg")}
        ${microCell("Omega-3",logged.micros.omega3,RDA.omega3," g")}
      </div>
    </div>

    <div class="card">
      <h2>Body weight</h2>
      <div class="row">
        <div>
          <div style="font-size:28px;font-weight:700">${latestWeight ? latestWeight.w + " kg" : "—"}</div>
          <div class="text-dim small">${latestWeight ? "logged " + latestWeight.d : "no weight logged"} · goal ${S.profile.goalWeightKg} kg (${goalDelta>=0?'+':''}${goalDelta} kg to go)</div>
        </div>
        <button class="btn btn-primary big" id="log-weight">Log today</button>
      </div>
      ${weights.length > 1 ? renderWeightSparkline(weights) : ""}
    </div>

    <div class="card">
      <h2>Vitamin D status (Oslo)</h2>
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
  let html = `<div class="text-dim small">Oslo (59.9°N). Sun synthesis only possible May-August.</div>`;
  if (!sunPossible) html += `<div class="vitd-warning">${SUN_LOGIC.warningWinter}</div>`;
  else html += `<div class="text-dim small" style="margin-top:6px">Sun-D possible this month. Aim for 20-30 min midday with bare skin when UV ≥ 3.</div>`;
  let total = 0;
  for (let i = 0; i < 7; i++) {
    const d = isoDate(addDays(new Date(), -i));
    const dl = S.log[d]; if (!dl) continue;
    let dayD = 0;
    for (const id of dl.mealsDone||[]) dayD += mealMacros(id).micros.d || 0;
    for (const e of dl.extras||[]) {
      const food = FOODS[e.foodId] || S.customFoods[e.foodId];
      if (food && food.micros) dayD += (food.micros.d||0) * e.g/100;
    }
    for (const sid of dl.supps||[]) { if (sid==="vitd") dayD+=25; if (sid==="tran") dayD+=10; }
    if (dl.sun && SUN_LOGIC.monthsWithSun.includes(new Date(d).getMonth()+1)) dayD += (dl.sun.min||0)*(dl.sun.uv||0)*SUN_LOGIC.mcgPerMinPerUV;
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
      <div class="input-row"><label>Name</label><input type="text" id="p-name" class="big-input" value="${S.profile.name}"></div>
      <div class="input-row"><label>Age</label><input type="number" id="p-age" class="big-input" value="${S.profile.age}" style="width:80px"></div>
      <div class="input-row"><label>Height (cm)</label><input type="number" id="p-h" class="big-input" value="${S.profile.heightCm}" style="width:80px"></div>
      <div class="input-row"><label>Goal weight (kg)</label><input type="number" id="p-gw" class="big-input" value="${S.profile.goalWeightKg}" style="width:80px"></div>
      <button class="btn btn-primary big" id="save-profile">Save profile</button>
    </div>

    <div class="card">
      <h2>Macro targets (daily)</h2>
      <div class="input-row"><label>Calories</label><input type="number" id="t-k" class="big-input" value="${S.profile.targetKcal}" style="width:90px"></div>
      <div class="input-row"><label>Protein (g)</label><input type="number" id="t-p" class="big-input" value="${S.profile.targetProtein}" style="width:90px"></div>
      <div class="input-row"><label>Carbs (g)</label><input type="number" id="t-c" class="big-input" value="${S.profile.targetCarbs}" style="width:90px"></div>
      <div class="input-row"><label>Fat (g)</label><input type="number" id="t-f" class="big-input" value="${S.profile.targetFat}" style="width:90px"></div>
      <div class="input-row"><label>Water (ml)</label><input type="number" id="t-w" class="big-input" value="${S.profile.targetWaterMl}" style="width:90px"></div>
      <button class="btn btn-primary big" id="save-targets">Save targets</button>
    </div>

    <div class="card">
      <h2>Glucose range</h2>
      <div class="input-row"><label>Low (mmol/L)</label><input type="number" id="g-lo" class="big-input" step="0.1" value="${S.profile.glucoseLowMmol}" style="width:90px"></div>
      <div class="input-row"><label>High (mmol/L)</label><input type="number" id="g-hi" class="big-input" step="0.1" value="${S.profile.glucoseHighMmol}" style="width:90px"></div>
      <button class="btn btn-primary big" id="save-glucose">Save range</button>
    </div>

    <div class="card">
      <h2>Thursday week (A / B)</h2>
      <div class="text-dim small" style="margin-bottom:8px">Tell the app what kind of Thursday <b>this week</b> is. It will alternate from there.</div>
      <div class="input-row">
        <label>This week is…</label>
        <select id="thu-pick" class="big-input">
          <option value="A" ${isThursdayA()?'selected':''}>Week A — short Thursday (ends 11:40)</option>
          <option value="B" ${!isThursdayA()?'selected':''}>Week B — long Thursday (ends 15:30)</option>
        </select>
      </div>
      <button class="btn btn-primary big" id="save-thu">Save Thursday cycle</button>
    </div>

    <div class="card">
      <h2>About</h2>
      <div class="small text-dim">
        Built for Luca · Oslo · T1D · bulking 75→85 kg.<br>
        <b>Medical disclaimer:</b> Review carb/insulin plan with your endocrinologist or diabetes nurse before changing your routine.<br>
        Data is stored locally on your phone. Barcode lookups via Open Food Facts.
      </div>
    </div>

    <div class="card">
      <h2>Danger zone</h2>
      <button class="btn btn-danger big" id="reset-today">Reset today's log</button>
      <button class="btn btn-danger big" id="reset-all" style="margin-top:8px">Erase ALL data</button>
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
  document.getElementById("save-glucose").addEventListener("click", () => {
    S.profile.glucoseLowMmol = parseFloat(document.getElementById("g-lo").value) || S.profile.glucoseLowMmol;
    S.profile.glucoseHighMmol = parseFloat(document.getElementById("g-hi").value) || S.profile.glucoseHighMmol;
    save(); toast("Range saved");
  });
  document.getElementById("save-thu").addEventListener("click", () => {
    const choice = document.getElementById("thu-pick").value;
    const t = new Date(); const mon = addDays(t, -(dayOfWeek(t)-1));
    S.weekRefDate = isoDate(mon);
    S.weekRefIsA = (choice === "A");
    save(); render.settings(); toast(`This week's Thursday: ${choice}`);
  });
  document.getElementById("reset-today")?.addEventListener("click", () => {
    if (!confirm("Reset today's log? Logged meals, water, glucose, weight, and workout for today will be cleared.")) return;
    const d = isoDate();
    S.log[d] = { water: 0, mealsDone: [], glucose: [], weight: null, sun: null, supps: [], extras: [], workout: {} };
    save();
    render.settings();
    toast("Today's log reset");
  });
  document.getElementById("reset-all")?.addEventListener("click", () => {
    if (!confirm("ERASE ALL DATA? This deletes everything stored locally: profile, logs, custom foods, settings. Cannot be undone.")) return;
    if (!confirm("Really wipe everything? Tap OK to confirm.")) return;
    localStorage.removeItem(KEY);
    localStorage.removeItem("luca-bulk-v1");
    location.reload();
  });
};

// ---------- Init ----------
document.getElementById("page-date").textContent = fmtDate();
switchTab("today");

// Service worker — auto-update: re-check sw.js on focus / every 30 min,
// activate new SW immediately, reload the page once it takes control.
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("./sw.js").then(reg => {
    // Periodic update poll while the app is open
    setInterval(() => reg.update().catch(() => {}), 30 * 60 * 1000);
    // Check whenever the tab regains focus (e.g. PWA brought to foreground)
    window.addEventListener("focus", () => reg.update().catch(() => {}));
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "visible") reg.update().catch(() => {});
    });
    // If a new SW is waiting, tell it to activate now
    function activateWaiting() {
      if (reg.waiting) reg.waiting.postMessage("SKIP_WAITING");
    }
    if (reg.waiting) activateWaiting();
    reg.addEventListener("updatefound", () => {
      const nw = reg.installing;
      if (!nw) return;
      nw.addEventListener("statechange", () => {
        if (nw.state === "installed" && navigator.serviceWorker.controller) activateWaiting();
      });
    });
  }).catch(err => console.warn("SW registration failed:", err));

  // When a new SW takes control, reload once to pick up fresh assets.
  let reloading = false;
  navigator.serviceWorker.addEventListener("controllerchange", () => {
    if (reloading) return;
    reloading = true;
    location.reload();
  });
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
