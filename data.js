// =====================================================================
//  Luca's bulking app — data layer
//  Targets: 3370 kcal · 180g protein · 100-130g carbs · ~230g fat
//  Budget: ~800 NOK/week (Norwegian REMA 1000 / Kiwi prices ~May 2026)
// =====================================================================

export const PROFILE = {
  name: "Luca",
  age: 18,
  heightCm: 190,
  startWeightKg: 75,
  goalWeightKg: 85,
  city: "Oslo",
  latitude: 59.91,
  targetKcal: 3370,
  targetProtein: 180,
  targetCarbs: 110,
  targetCarbsMax: 130,
  targetFat: 230,
  targetWaterMl: 3500,
  targetFiber: 30,
};

// FOOD DATABASE — values per 100 g/ml. Prices approximate REMA/Kiwi spring 2026.
export const FOODS = {
  egg:          { name: "Egg (1 stk ~60g)",       unit: "g",  kcal: 155, p: 13,   c: 1.1, f: 11,   fiber: 0,  pricePer100: 5.0,  micros: { d: 2,   b12: 0.9, iron: 1.2, mg: 12, zinc: 1.3, omega3: 0.1 } },
  butter:       { name: "Smør (butter)",          unit: "g",  kcal: 717, p: 0.9,  c: 0.1, f: 81,   fiber: 0,  pricePer100: 10.0, micros: { d: 1,   b12: 0,   iron: 0,   mg: 2,  zinc: 0,   omega3: 0 } },
  cheese_norv:  { name: "Norvegia ost",           unit: "g",  kcal: 351, p: 27,   c: 0,   f: 27,   fiber: 0,  pricePer100: 9.0,  micros: { d: 0,   b12: 1.5, iron: 0.3, mg: 28, zinc: 3,   omega3: 0 } },
  milk_whole:   { name: "Helmelk",                unit: "ml", kcal: 62,  p: 3.4,  c: 4.7, f: 3.5,  fiber: 0,  pricePer100: 2.2,  micros: { d: 0.3, b12: 0.4, iron: 0,   mg: 10, zinc: 0.4, omega3: 0 } },
  kvarg:        { name: "Tine Kvarg naturell",    unit: "g",  kcal: 65,  p: 11,   c: 4,   f: 0.2,  fiber: 0,  pricePer100: 7.0,  micros: { d: 0,   b12: 0.5, iron: 0,   mg: 12, zinc: 0.5, omega3: 0 } },
  cottage:      { name: "Cottage cheese",         unit: "g",  kcal: 98,  p: 11,   c: 3.4, f: 4.3,  fiber: 0,  pricePer100: 5.5,  micros: { d: 0,   b12: 0.4, iron: 0.1, mg: 8,  zinc: 0.4, omega3: 0 } },
  greek_yog:    { name: "Gresk yoghurt 10%",      unit: "g",  kcal: 130, p: 6,    c: 4,   f: 10,   fiber: 0,  pricePer100: 5.0,  micros: { d: 0,   b12: 0.5, iron: 0,   mg: 11, zinc: 0.5, omega3: 0 } },
  cream:        { name: "Kremfløte 38%",          unit: "ml", kcal: 345, p: 2.2,  c: 2.8, f: 36,   fiber: 0,  pricePer100: 6.5,  micros: { d: 0,   b12: 0.2, iron: 0,   mg: 7,  zinc: 0.2, omega3: 0 } },
  chicken_thigh:{ name: "Kyllinglår u/skinn",     unit: "g",  kcal: 215, p: 24,   c: 0,   f: 13,   fiber: 0,  pricePer100: 11.0, micros: { d: 0,   b12: 0.5, iron: 1,   mg: 22, zinc: 2,   omega3: 0.1 } },
  chicken_brst: { name: "Kyllingfilet",           unit: "g",  kcal: 165, p: 31,   c: 0,   f: 3.6,  fiber: 0,  pricePer100: 13.0, micros: { d: 0,   b12: 0.3, iron: 0.7, mg: 26, zinc: 1,   omega3: 0 } },
  beef_mince:   { name: "Kjøttdeig 14% fett",     unit: "g",  kcal: 217, p: 19,   c: 0,   f: 14,   fiber: 0,  pricePer100: 22.0, micros: { d: 0.1, b12: 2.5, iron: 2.6, mg: 18, zinc: 4.8, omega3: 0.1 } },
  pork_mince:   { name: "Svinedeig",              unit: "g",  kcal: 263, p: 17,   c: 0,   f: 21,   fiber: 0,  pricePer100: 16.0, micros: { d: 0.7, b12: 0.7, iron: 1,   mg: 19, zinc: 2.3, omega3: 0.1 } },
  bacon:        { name: "Bacon",                  unit: "g",  kcal: 540, p: 13,   c: 1.4, f: 53,   fiber: 0,  pricePer100: 14.0, micros: { d: 0.4, b12: 0.7, iron: 0.6, mg: 11, zinc: 1.7, omega3: 0.2 } },
  mackerel_tom: { name: "Stabbur makrell i tomat",unit: "g",  kcal: 196, p: 15,   c: 4,   f: 13,   fiber: 0,  pricePer100: 7.0,  micros: { d: 12,  b12: 9,   iron: 1.4, mg: 30, zinc: 0.8, omega3: 2.5 } },
  tuna_water:   { name: "Tunfisk i vann",         unit: "g",  kcal: 116, p: 26,   c: 0,   f: 1,    fiber: 0,  pricePer100: 14.0, micros: { d: 5,   b12: 2,   iron: 1.3, mg: 28, zinc: 0.5, omega3: 0.3 } },
  salmon:       { name: "Laksefilet",             unit: "g",  kcal: 208, p: 20,   c: 0,   f: 13,   fiber: 0,  pricePer100: 22.0, micros: { d: 11,  b12: 3.2, iron: 0.3, mg: 27, zinc: 0.4, omega3: 2.3 } },
  herring:      { name: "Sild i lake",            unit: "g",  kcal: 217, p: 18,   c: 1,   f: 16,   fiber: 0,  pricePer100: 8.0,  micros: { d: 17,  b12: 14,  iron: 1.1, mg: 32, zinc: 1.1, omega3: 1.7 } },
  oats:         { name: "Havregryn Bjørn",        unit: "g",  kcal: 379, p: 13,   c: 67,  f: 7,    fiber: 10, pricePer100: 2.5,  micros: { d: 0,   b12: 0,   iron: 4.7, mg: 138, zinc: 4, omega3: 0.1 } },
  bread_grov:   { name: "Grovbrød",               unit: "g",  kcal: 250, p: 10,   c: 42,  f: 4,    fiber: 7,  pricePer100: 3.5,  micros: { d: 0,   b12: 0,   iron: 2.5, mg: 70, zinc: 1.5, omega3: 0.1 } },
  rice_brown:   { name: "Brun ris (kokt)",        unit: "g",  kcal: 112, p: 2.6,  c: 23,  f: 0.9,  fiber: 1.8, pricePer100: 1.5, micros: { d: 0,   b12: 0,   iron: 0.4, mg: 43, zinc: 0.6, omega3: 0 } },
  potato:       { name: "Potet (kokt)",           unit: "g",  kcal: 87,  p: 1.9,  c: 20,  f: 0.1,  fiber: 1.8, pricePer100: 1.5, micros: { d: 0,   b12: 0,   iron: 0.4, mg: 22, zinc: 0.3, omega3: 0 } },
  pasta:        { name: "Pasta (kokt)",           unit: "g",  kcal: 158, p: 5.8,  c: 31,  f: 0.9,  fiber: 1.8, pricePer100: 1.5, micros: { d: 0,   b12: 0,   iron: 0.5, mg: 18, zinc: 0.5, omega3: 0 } },
  lentils:      { name: "Linser (kokt)",          unit: "g",  kcal: 116, p: 9,    c: 20,  f: 0.4,  fiber: 8,  pricePer100: 3.0,  micros: { d: 0,   b12: 0,   iron: 3.3, mg: 36, zinc: 1.3, omega3: 0 } },
  beans_brown:  { name: "Brune bønner",           unit: "g",  kcal: 130, p: 8,    c: 22,  f: 0.5,  fiber: 7,  pricePer100: 3.0,  micros: { d: 0,   b12: 0,   iron: 2.5, mg: 40, zinc: 1,   omega3: 0 } },
  peanut_btr:   { name: "Peanøttsmør",            unit: "g",  kcal: 588, p: 25,   c: 20,  f: 50,   fiber: 6,  pricePer100: 10.0, micros: { d: 0,   b12: 0,   iron: 1.9, mg: 168, zinc: 3.3, omega3: 0 } },
  almonds:      { name: "Mandler",                unit: "g",  kcal: 579, p: 21,   c: 22,  f: 50,   fiber: 12, pricePer100: 22.0, micros: { d: 0,   b12: 0,   iron: 3.7, mg: 270, zinc: 3.1, omega3: 0 } },
  walnuts:      { name: "Valnøtter",              unit: "g",  kcal: 654, p: 15,   c: 14,  f: 65,   fiber: 7,  pricePer100: 25.0, micros: { d: 0,   b12: 0,   iron: 2.9, mg: 158, zinc: 3.1, omega3: 9 } },
  broccoli:     { name: "Brokkoli (frossen)",     unit: "g",  kcal: 35,  p: 3,    c: 7,   f: 0.4,  fiber: 3,  pricePer100: 2.0,  micros: { d: 0,   b12: 0,   iron: 0.7, mg: 21, zinc: 0.4, omega3: 0 } },
  spinach:      { name: "Spinat (frossen)",       unit: "g",  kcal: 23,  p: 3,    c: 3,   f: 0.4,  fiber: 2,  pricePer100: 2.5,  micros: { d: 0,   b12: 0,   iron: 2.7, mg: 79, zinc: 0.5, omega3: 0.1 } },
  mixed_veg:    { name: "Frossen grønnsaksmiks",  unit: "g",  kcal: 60,  p: 3,    c: 11,  f: 0.5,  fiber: 4,  pricePer100: 2.0,  micros: { d: 0,   b12: 0,   iron: 1,   mg: 25, zinc: 0.5, omega3: 0 } },
  avocado:      { name: "Avokado",                unit: "g",  kcal: 160, p: 2,    c: 9,   f: 15,   fiber: 7,  pricePer100: 6.0,  micros: { d: 0,   b12: 0,   iron: 0.5, mg: 29, zinc: 0.6, omega3: 0.1 } },
  banana:       { name: "Banan",                  unit: "g",  kcal: 89,  p: 1.1,  c: 23,  f: 0.3,  fiber: 2.6, pricePer100: 2.5, micros: { d: 0,   b12: 0,   iron: 0.3, mg: 27, zinc: 0.2, omega3: 0 } },
  apple:        { name: "Eple",                   unit: "g",  kcal: 52,  p: 0.3,  c: 14,  f: 0.2,  fiber: 2.4, pricePer100: 3.5, micros: { d: 0,   b12: 0,   iron: 0.1, mg: 5,  zinc: 0,   omega3: 0 } },
  blueberries:  { name: "Blåbær (frossen)",       unit: "g",  kcal: 57,  p: 0.7,  c: 14,  f: 0.3,  fiber: 2.4, pricePer100: 5.5, micros: { d: 0,   b12: 0,   iron: 0.3, mg: 6,  zinc: 0.2, omega3: 0 } },
  olive_oil:    { name: "Olivenolje",             unit: "ml", kcal: 884, p: 0,    c: 0,   f: 100,  fiber: 0,  pricePer100: 8.0,  micros: { d: 0,   b12: 0,   iron: 0.6, mg: 0,  zinc: 0,   omega3: 0.8 } },
  whey:         { name: "Myseprotein (whey)",     unit: "g",  kcal: 380, p: 80,   c: 8,   f: 4,    fiber: 0,  pricePer100: 25.0, micros: { d: 0,   b12: 0.5, iron: 0.5, mg: 80, zinc: 1.5, omega3: 0 } },
  coffee:       { name: "Kaffe svart",            unit: "ml", kcal: 1,   p: 0,    c: 0,   f: 0,    fiber: 0,  pricePer100: 0.5,  micros: {} },
  tran:         { name: "Tran",                   unit: "ml", kcal: 902, p: 0,    c: 0,   f: 100,  fiber: 0,  pricePer100: 8.0,  micros: { d: 250, b12: 0,   iron: 0,   mg: 0,  zinc: 0,   omega3: 25 } },
};

// Nordic Nutrition Recommendations (per day, adult male)
export const RDA = {
  d: 20, b12: 2.0, iron: 9, mg: 350, zinc: 9, omega3: 1.6,
};

// MEAL LIBRARY — items use food IDs above with gram amounts
export const MEAL_LIBRARY = {
  bk_omelet: {
    name: "4-egg cheese omelet + avocado",
    phase: "breakfast",
    items: [
      { id: "egg", g: 240 },
      { id: "butter", g: 15 },
      { id: "cheese_norv", g: 50 },
      { id: "avocado", g: 75 },
      { id: "coffee", g: 250 },
    ],
    notes: "Whisk eggs, melt butter on low-med heat, add eggs and cheese, fold. Half avocado on side.",
  },
  bk_skyr: {
    name: "Kvarg + oats + peanut butter",
    phase: "breakfast",
    items: [
      { id: "kvarg", g: 300 },
      { id: "oats", g: 40 },
      { id: "peanut_btr", g: 25 },
      { id: "blueberries", g: 50 },
    ],
    notes: "Mix kvarg with dry oats, top with peanut butter and frozen blueberries. Let sit 5 min.",
  },
  bk_bacon_eggs: {
    name: "Bacon + 3 eggs + cheese",
    phase: "breakfast",
    items: [
      { id: "bacon", g: 60 },
      { id: "egg", g: 180 },
      { id: "cheese_norv", g: 40 },
      { id: "coffee", g: 250 },
    ],
    notes: "Fry bacon, remove. Crack eggs in bacon fat, top with cheese, cover until set.",
  },
  bk_herring: {
    name: "Herring + 2 eggs + grovbrød",
    phase: "breakfast",
    items: [
      { id: "herring", g: 80 },
      { id: "egg", g: 120 },
      { id: "bread_grov", g: 40 },
      { id: "butter", g: 10 },
    ],
    notes: "Norwegian classic — huge in omega-3 and vitamin D.",
  },

  pw_oats: {
    name: "Oats + whey + PB + milk (pre-workout)",
    phase: "lunch",
    preWorkout: true,
    items: [
      { id: "oats", g: 75 },
      { id: "whey", g: 30 },
      { id: "peanut_btr", g: 30 },
      { id: "milk_whole", g: 250 },
      { id: "banana", g: 50 },
    ],
    notes: "Cook oats with milk 3 min, stir in whey off-heat, top with PB and half banana. Eat 90 min pre-lift.",
  },
  pw_ricebowl: {
    name: "Rice + chicken thigh bowl (pre-workout)",
    phase: "lunch",
    preWorkout: true,
    items: [
      { id: "rice_brown", g: 150 },
      { id: "chicken_thigh", g: 180 },
      { id: "olive_oil", g: 20 },
      { id: "mixed_veg", g: 150 },
      { id: "cheese_norv", g: 25 },
    ],
    notes: "Reheat batch-cooked rice + chicken. Stir-fry frozen veg 5 min. Top with cheese.",
  },
  pw_pasta: {
    name: "Pasta + beef + olive oil (pre-workout)",
    phase: "lunch",
    preWorkout: true,
    items: [
      { id: "pasta", g: 130 },
      { id: "beef_mince", g: 150 },
      { id: "olive_oil", g: 20 },
      { id: "broccoli", g: 100 },
      { id: "cheese_norv", g: 30 },
    ],
    notes: "Brown beef, drain. Add cooked pasta, broccoli, olive oil, grated cheese.",
  },
  pw_potato: {
    name: "Potato + mackerel + avocado (pre-workout)",
    phase: "lunch",
    preWorkout: true,
    items: [
      { id: "potato", g: 200 },
      { id: "mackerel_tom", g: 200 },
      { id: "avocado", g: 100 },
      { id: "olive_oil", g: 15 },
    ],
    notes: "Microwave potato 6 min. Open can of mackerel. Mash avocado on top. Cheap omega-3 + D bomb.",
  },

  ln_tuna_salad: {
    name: "Tuna + avocado + grovbrød",
    phase: "lunch",
    items: [
      { id: "tuna_water", g: 150 },
      { id: "avocado", g: 100 },
      { id: "bread_grov", g: 40 },
      { id: "olive_oil", g: 10 },
      { id: "cheese_norv", g: 30 },
    ],
    notes: "Quick school lunch — pack the night before.",
  },
  ln_chicken_salad: {
    name: "Chicken + cheese + nuts salad",
    phase: "lunch",
    items: [
      { id: "chicken_brst", g: 180 },
      { id: "cheese_norv", g: 40 },
      { id: "almonds", g: 30 },
      { id: "avocado", g: 75 },
      { id: "olive_oil", g: 15 },
      { id: "spinach", g: 100 },
    ],
    notes: "Use leftover chicken. Mix in a bowl with olive oil.",
  },
  ln_mackerel: {
    name: "Mackerel in tomato + grovbrød + cheese",
    phase: "lunch",
    items: [
      { id: "mackerel_tom", g: 200 },
      { id: "bread_grov", g: 50 },
      { id: "cheese_norv", g: 40 },
      { id: "butter", g: 15 },
    ],
    notes: "Cheapest high-omega-3 lunch in Norway. ~25 NOK total.",
  },

  sn_yogurt_almonds: { name: "Greek yogurt + almonds",     phase: "snack", items: [{ id: "greek_yog", g: 200 }, { id: "almonds", g: 20 }] },
  sn_kvarg_pb:       { name: "Kvarg + peanut butter",      phase: "snack", items: [{ id: "kvarg", g: 250 }, { id: "peanut_btr", g: 30 }] },
  sn_cottage_walnut: { name: "Cottage cheese + peanut butter",   phase: "snack", items: [{ id: "cottage", g: 250 }, { id: "peanut_btr", g: 25 }] },
  sn_cheese_almonds: { name: "Cheese cubes + almonds",     phase: "snack", items: [{ id: "cheese_norv", g: 50 }, { id: "almonds", g: 20 }] },

  dn_chicken_broc: {
    name: "Chicken thigh + broccoli + cheese",
    phase: "dinner",
    items: [
      { id: "chicken_thigh", g: 220 },
      { id: "broccoli", g: 200 },
      { id: "olive_oil", g: 25 },
      { id: "cheese_norv", g: 40 },
    ],
    notes: "Roast thighs 25 min @ 200°C. Steam broccoli, toss with olive oil + cheese.",
  },
  dn_salmon: {
    name: "Salmon + spinach + potato",
    phase: "dinner",
    items: [
      { id: "salmon", g: 140 },
      { id: "spinach", g: 150 },
      { id: "potato", g: 150 },
      { id: "butter", g: 20 },
      { id: "olive_oil", g: 20 },
    ],
    notes: "Sear salmon skin-side 4 min, flip 2 min. Wilt spinach in butter. Boiled potatoes. (Salmon is the budget splurge of the week.)",
  },
  dn_taco_bowl: {
    name: "Beef taco bowl (no shell)",
    phase: "dinner",
    items: [
      { id: "beef_mince", g: 200 },
      { id: "cheese_norv", g: 50 },
      { id: "avocado", g: 100 },
      { id: "mixed_veg", g: 200 },
      { id: "olive_oil", g: 20 },
    ],
    notes: "Brown beef + taco seasoning over warmed veg, top with cheese and avocado.",
  },
  dn_pork_lentils: {
    name: "Pork mince + lentils + spinach",
    phase: "dinner",
    items: [
      { id: "pork_mince", g: 180 },
      { id: "lentils", g: 200 },
      { id: "spinach", g: 150 },
      { id: "olive_oil", g: 20 },
      { id: "cheese_norv", g: 30 },
    ],
    notes: "Cheap iron-rich dinner. Brown pork, stir in lentils + spinach, top with cheese.",
  },
  dn_chicken_curry: {
    name: "Chicken + cream curry + rice",
    phase: "dinner",
    items: [
      { id: "chicken_thigh", g: 200 },
      { id: "cream", g: 100 },
      { id: "rice_brown", g: 100 },
      { id: "mixed_veg", g: 200 },
      { id: "olive_oil", g: 15 },
    ],
    notes: "Brown chicken, add curry powder, cream, veg. Simmer 10 min. Over rice.",
  },

  ev_cottage:       { name: "Cottage cheese + peanut butter", phase: "evening", items: [{ id: "cottage", g: 300 }, { id: "peanut_btr", g: 30 }], notes: "Slow-digesting casein before bed." },
  ev_kvarg_almonds: { name: "Kvarg + almonds",                phase: "evening", items: [{ id: "kvarg", g: 250 }, { id: "almonds", g: 30 }] },
  ev_milk_pb:       { name: "Warm milk + peanut butter",      phase: "evening", items: [{ id: "milk_whole", g: 300 }, { id: "peanut_btr", g: 30 }] },
};

// WEEKLY MEAL PLAN — days 1..7 = Mon..Sun
export const WEEK_PLAN = {
  1: { day: "Monday",    workout: "push",  meals: ["bk_omelet",    "pw_oats",         "sn_yogurt_almonds", "dn_chicken_broc",  "ev_cottage"] },
  2: { day: "Tuesday",   workout: "pull",  meals: ["bk_skyr",      "pw_ricebowl",     "sn_kvarg_pb",       "dn_pork_lentils",  "ev_kvarg_almonds"] },
  3: { day: "Wednesday", workout: "legs",  meals: ["bk_bacon_eggs","pw_potato",       "sn_cottage_walnut", "dn_salmon",        "ev_milk_pb"] },
  4: { day: "Thursday",  workout: "rest",  meals: ["bk_omelet",    "ln_mackerel",     "sn_cheese_almonds", "dn_taco_bowl",     "ev_cottage"] },
  5: { day: "Friday",    workout: "push",  meals: ["bk_skyr",      "pw_pasta",        "sn_yogurt_almonds", "dn_chicken_curry", "ev_kvarg_almonds"] },
  6: { day: "Saturday",  workout: "pull",  meals: ["bk_herring",   "pw_oats",         "sn_kvarg_pb",       "dn_chicken_broc",  "ev_milk_pb"] },
  7: { day: "Sunday",    workout: "legs",  meals: ["bk_bacon_eggs","ln_chicken_salad","sn_cottage_walnut", "dn_pork_lentils",  "ev_cottage"] },
};

// WORKOUT — PPL 6-day
export const EXERCISES = {
  bench:        { name: "Barbell bench press",      muscle: "chest" },
  inc_db_press: { name: "Incline DB press",          muscle: "chest" },
  ohp:          { name: "Overhead press (barbell)",  muscle: "shoulders" },
  lat_raise:    { name: "DB lateral raise",          muscle: "side delts" },
  dips:         { name: "Dips",                      muscle: "chest/tris" },
  tri_pushdown: { name: "Triceps pushdown",          muscle: "triceps" },
  cable_fly:    { name: "Cable chest fly",           muscle: "chest" },
  deadlift:     { name: "Conventional deadlift",     muscle: "back/posterior" },
  pullup:       { name: "Pull-ups (weighted if possible)", muscle: "lats" },
  barbell_row:  { name: "Barbell row",               muscle: "mid back" },
  lat_pulldown: { name: "Lat pulldown",              muscle: "lats" },
  face_pull:    { name: "Face pulls",                muscle: "rear delts" },
  bb_curl:      { name: "Barbell curl",              muscle: "biceps" },
  hammer_curl:  { name: "Hammer curl",               muscle: "biceps/brachialis" },
  squat:        { name: "Back squat",                muscle: "quads" },
  rdl:          { name: "Romanian deadlift",         muscle: "hams/glutes" },
  leg_press:    { name: "Leg press",                 muscle: "quads" },
  leg_curl:     { name: "Lying leg curl",            muscle: "hamstrings" },
  walking_lunge:{ name: "Walking lunges (DB)",        muscle: "quads/glutes" },
  calf_raise:   { name: "Standing calf raise",        muscle: "calves" },
  hanging_leg:  { name: "Hanging leg raise",          muscle: "abs" },
};

export const WORKOUTS = {
  push: {
    name: "Push — Chest / Shoulders / Triceps",
    exercises: [
      { id: "bench",        sets: 4, reps: "6-8",   rir: 2, note: "Heavy compound — focus on form." },
      { id: "ohp",          sets: 3, reps: "8-10",  rir: 2 },
      { id: "inc_db_press", sets: 3, reps: "10-12", rir: 1 },
      { id: "lat_raise",    sets: 4, reps: "12-15", rir: 0, note: "Burn-out, full ROM." },
      { id: "cable_fly",    sets: 3, reps: "12-15", rir: 1 },
      { id: "tri_pushdown", sets: 3, reps: "10-12", rir: 1 },
    ],
  },
  pull: {
    name: "Pull — Back / Biceps",
    exercises: [
      { id: "deadlift",     sets: 3, reps: "5",     rir: 2, note: "Skip on week 3 if back fatigued — sub in RDL." },
      { id: "pullup",       sets: 4, reps: "6-10",  rir: 2 },
      { id: "barbell_row",  sets: 3, reps: "8-10",  rir: 1 },
      { id: "lat_pulldown", sets: 3, reps: "10-12", rir: 1 },
      { id: "face_pull",    sets: 3, reps: "15-20", rir: 0 },
      { id: "bb_curl",      sets: 3, reps: "8-10",  rir: 1 },
      { id: "hammer_curl",  sets: 3, reps: "10-12", rir: 1 },
    ],
  },
  legs: {
    name: "Legs — Quads / Hams / Calves / Abs",
    exercises: [
      { id: "squat",        sets: 4, reps: "6-8",   rir: 2, note: "Pre-workout carb meal essential." },
      { id: "rdl",          sets: 3, reps: "8-10",  rir: 2 },
      { id: "leg_press",    sets: 3, reps: "10-12", rir: 1 },
      { id: "leg_curl",     sets: 3, reps: "10-12", rir: 1 },
      { id: "walking_lunge",sets: 3, reps: "10/leg",rir: 1 },
      { id: "calf_raise",   sets: 4, reps: "12-15", rir: 0 },
      { id: "hanging_leg",  sets: 3, reps: "10-15", rir: 0 },
    ],
  },
  rest: { name: "Rest day", exercises: [], note: "Light walk 30-45 min. Stretch. Eat normally — recovery feeds growth." },
};

export const PROGRESSION = {
  1: { label: "Week 1 — Introduce",   loadFactor: 1.000, intensityNote: "RIR 2-3. Focus on form, build the habit." },
  2: { label: "Week 2 — Build",       loadFactor: 1.025, intensityNote: "RIR 1-2. Add 2-5 kg to compounds where form holds." },
  3: { label: "Week 3 — Push",        loadFactor: 1.050, intensityNote: "RIR 0-1 on last set. Beat last week by 1 rep or 2.5 kg." },
};

// SCHOOL — Thursday alternates Week A (short, ends 11:40) / Week B (long, 15:30)
export const SCHOOL = {
  1: { day: "Monday",    start: "08:15", end: "14:15" },
  2: { day: "Tuesday",   start: "10:00", end: "15:30" },
  3: { day: "Wednesday", start: "08:15", end: "14:15" },
  4: { day: "Thursday",  start: "08:15", endA: "11:40", endB: "15:30" },
  5: { day: "Friday",    start: "10:00", end: "15:30" },
  6: { day: "Saturday",  start: null,    end: null },
  7: { day: "Sunday",    start: null,    end: null },
};

export const SUPPLEMENTS = [
  { id: "vitd",     name: "Vitamin D3",            dose: "25 mcg", when: "morning",  reason: "Oslo latitude — sun synthesis impossible Oct–Mar. Helsedirektoratet recommends." },
  { id: "tran",     name: "Tran (cod-liver oil)",  dose: "5 ml",   when: "morning",  reason: "Omega-3 + extra D + A. Norwegian tradition. ~5 ml = 10 mcg D + 1.2 g omega-3." },
  { id: "mag",      name: "Magnesium",             dose: "300 mg", when: "evening",  reason: "Heavy lifting + cramps. Helps sleep and insulin sensitivity." },
  { id: "creatine", name: "Creatine monohydrate",  dose: "5 g",    when: "anytime",  reason: "Most evidence-backed supplement. Daily, timing doesn't matter." },
];

// SUN / VITAMIN D LOGIC FOR OSLO (59.9°N)
export const SUN_LOGIC = {
  monthsWithSun: [5, 6, 7, 8],
  mcgPerMinPerUV: 0.4, // rough: 25 mcg from 15 min @ UV4 with arms+legs exposed
  warningWinter: "Between October and March in Oslo, your skin cannot make Vitamin D from sunlight (sun angle too low). Supplement 25-50 mcg D3 daily.",
};
