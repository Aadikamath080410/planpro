/**************************************************
 * PLANPRO REAL PRICE COMPARISON ENGINE (FUZZY)
 * Single-file | Rule-based | Fuse.js Integrated
 **************************************************/

const fs = require("fs");
const path = require("path");
const readline = require("readline");
const Fuse = require("fuse.js");

/* ================= FUZZY SEARCH HELPERS ================= */

function getBigrams(str) {
  let str1 = str;
  if (str.length === 1) str1 = str + ' ';
  const bigrams = new Set();
  const length = str1.length;
  for (let i = 0; i < length - 1; i++) {
    const bigram = str1.slice(i, i + 2);
    bigrams.add(bigram);
  }
  return bigrams;
}

function intersect(set1, set2) {
  const intersection = new Set();
  set1.forEach(value => {
    if (set2.has(value)) intersection.add(value);
  });
  return intersection;
}

function diceCoefficient(str1, str2) {
  const s1 = (str1 || "").toLowerCase().trim();
  const s2 = (str2 || "").toLowerCase().trim();
  if (s1 === s2) return 1;
  if (s1.length < 2 || s2.length < 2) return 0;
  const b1 = getBigrams(s1);
  const b2 = getBigrams(s2);
  const intersection = intersect(b1, b2);
  return (2 * intersection.size) / (b1.size + b2.size);
}

/* ================= BASIC HELPERS ================= */

function exists(v) {
  return v !== undefined && v !== null && v !== "";
}

function loadJSON(file) {
  return JSON.parse(
    fs.readFileSync(path.join(__dirname, file), "utf-8")
  );
}

/* ================= NORMALIZATION ================= */

function normalizeType(type, site) {
  if (!exists(type)) return null;

  let t = type.toLowerCase().trim();

  if (t.endsWith("s")) t = t.slice(0, -1);

  if (site === "Flipkart" && t.includes("desk")) return "table";

  return t;
}

function normalizeText(str) {
  return str
    .toLowerCase()
    .replace(/[_\-]/g, " ")
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/* ================= FUZZY SUBTYPE ENGINE ================= */

const SUBTYPE_INTENT_MAP = {

  /* ================= TABLES ================= */

  "study table": [
    "study table", "study desk", "computer desk", "writing desk", "student desk", "home desk", "work desk", "studytable", "study_table"
  ],

  "dining table": [
    "dining table", "dinning table", "dinner table", "dining tables", "diningtable", "dinningtable", "dining desk", 
    "wooden dining table", "4 seater dining table", "6 seater dining table", "8 seater dining table", "10 seater dining table"
  ],

  "coffee table": [
    "coffee table", "coffee tables", "coffeetable", "coffee_table", "tea table", "centre table", "center table", "living room table", "small table"
  ],

  /* ================= CHAIRS ================= */

  "gaming chair": [
    "gaming chair", "gaming chairs", "gamer chair", "pc gaming chair", "computer gaming chair", "gamingchair", "gaming_chair"
  ],

  "office chair": [
    "office chair", "office chairs", "desk chair", "work chair", "executive chair", "ergonomic chair", "swivel chair", "officechair"
  ],

  "dining chair": [
    "dining chair", "dinning chair", "dining chairs", "dinning chairs", "diningchair", "dining_chair"
  ],

  "casual chair": [
    "casual chair", "accent chair", "lounge chair", "arm chair", "armchair", "living room chair", "side chair"
  ],

  "rocking chair": [
    "rocking chair", "rocker chair", "rockingchair", "rocker", "swing chair", "wooden rocker"
  ],

  /* ================= SOFAS ================= */

  "sofa set": [
    "sofa set", "sofaset", "living room sofa", "l sofa", "sectional sofa", 
    "l shape sofa", "l shaped sofa", "l-shaped sofa", "3 seater sofa", "2 seater sofa", "couch set"
  ],

  "sofa cum bed": [
    "sofa cum bed", "sofacumbed", "sofa bed", "sofa-bed", "convertible sofa", "foldable sofa bed", "collapsible sofa", 
    "sofa_cum_bed","sofa-cum-bed", "collapsible sofa bed", "sleeper sofa", "pull-out sofa bed"
  ],

  "recliner": [
    "recliner", "recliners", "recliner sofa", "recliner_sofa", "reclining chair", 
    "lazy chair" , "sofa goes down", "recliner sofa chair", "sofa with footrest"
  ],

  /* ================= STORAGE ================= */

  "shoe rack": [
    "shoe rack", "shoe racks", "shoe stand", "footwear rack", "footwear stand", "shoerack"
  ],

  "shelf": [
    "bookshelf", "book shelf", "shelf", "shelves", "wall shelf", "display shelf", 
    "storage shelf", "book rack", "bookrack", "book case", "bookcase", "book  cabinet"
  ],

  "cupboard": [
    "cupboard", "cupboards", "cabinet", "storage cabinet", 
    "wooden cupboard", "wardrobe", "almirah", "wadrobes",  "almari", "closet"
  ],

  /* ================= BEDS (SEPARATED) ================= */

  "single bed": [
    "single bed", "single cot", "1 person bed", "one person bed", "single size bed"
  ],

  "double bed": [
    "double bed", "double cot", "2 person bed", "full size bed", "full bed"
  ],

  "queen bed": [
    "queen bed", "queen size bed", "queen cot"
  ],

  "king bed": [
    "king bed", "king size bed", "king cot"
  ]
};

/* ---- Flatten for Fuse ---- */

const SUBTYPE_INDEX = [];

for (const intent in SUBTYPE_INTENT_MAP) {
  SUBTYPE_INTENT_MAP[intent].forEach(keyword => {
    SUBTYPE_INDEX.push({
      intent,
      keyword: normalizeText(keyword)
    });
  });
}

const fuse = new Fuse(SUBTYPE_INDEX, {
  keys: ["keyword"],
  threshold: 0.35,
  includeScore: true,
  ignoreLocation: true,
  minMatchCharLength: 3
});

function resolveSubtypeIntent(subtype) {
  if (!exists(subtype)) return null;

  const query = normalizeText(subtype);
  const results = fuse.search(query);

  if (!results.length) return null;

  const best = results[0];

  if (best.score > 0.4) return null;

  return best.item.intent;
}

/* ================= HARD FILTER ================= */

function hardFilter(plan, cand, site) {
  try {
    if (!cand || cand.length < 7) return false;
    const pType = plan[6]?.toLowerCase();
    const cType = normalizeType(cand[6], site);

    if (!exists(pType) || !exists(cType)) return false;
    
    // Main type must match exactly (e.g. Table vs Table)
    if (pType !== cType) return false;

    // Subtype intent is used for scoring, not hard filtering
    return true;
  } catch (err) {
    return false;
  }
}

/* ================= DIMENSIONS ================= */

function parseDimensions(dim) {
  if (!exists(dim)) return [0, 0, 0];
  const nums = dim.match(/\d+(\.\d+)?/g)?.map(Number);
  return nums?.length >= 3 ? nums.slice(0, 3) : [0, 0, 0];
}

function dimensionSimilarity(a, b) {
  let score = 0;
  let count = 0;

  for (let i = 0; i < 3; i++) {
    if (!a[i] || !b[i]) continue;
    score += 1 - Math.abs(a[i] - b[i]) / Math.max(a[i], b[i]);
    count++;
  }
  return count ? score / count : 0;
}

/* ================= SIMILARITY ================= */

function similarityScore(plan, cand) {
  // 1. Dimension Score (0 to 1)
  const dimScore = dimensionSimilarity(
    parseDimensions(plan[2]),
    parseDimensions(cand[2])
  );

  // 2. Price Score (0 to 1)
  const priceScore = exists(plan[3]) && exists(cand[3]) && plan[3] > 0 && cand[3] > 0
    ? Math.min(plan[3], cand[3]) / Math.max(plan[3], cand[3])
    : 0.5;

  // 3. Name Similarity (0 to 1)
  const nameScore = diceCoefficient(
    normalizeText(plan[1] || ""),
    normalizeText(cand[1] || "")
  );

  // 4. Subtype Intent (Bonus Score)
  const pIntent = resolveSubtypeIntent(plan[7]);
  const cIntent = resolveSubtypeIntent(cand[7]);
  const intentBonus = (pIntent && cIntent && pIntent === cIntent) ? 1.0 : 0.0;

  // Weighted Total Score
  // Weights: Name(0.4), Dimension(0.3), Intent(0.2), Price(0.1)
  return (nameScore * 0.4) + (dimScore * 0.3) + (intentBonus * 0.2) + (priceScore * 0.1);
}

/* ================= SITE INFERENCE ================= */

function inferSite(id) {
  if (typeof id !== "string") return "Unknown";
  if (id.startsWith("A")) return "Amazon";
  if (id.startsWith("F")) return "Flipkart";
  if (id.startsWith("I")) return "IKEA";
  if (id.startsWith("U")) return "Urban Ladder";
  return "Unknown";
}

/* ================= ADAPTERS ================= */

function adaptRealProduct(p) {
  return [
    p.ID || p.id || null, // 0
    p.Name || p.name || null, // 1
    p.Dimension || p.dimension || p.dimensions || null, // 2
    Number(p.Price ?? p.price ?? 0), // 3
    null, // 4
    null, // 5
    p.Type || p.type || null, // 6
    p.SubType || p.subtype || null, // 7
    p.Brand || p.brand || null, // 8
    p.ImageURL || p.imageUrl || p.imageurl || p.Image || null, // 9
    p.ProductURL || p.productUrl || p.producturl || null // 10
  ];
}

function adaptPlanProProduct(p) {
  return [
    p.ID,
    p.Name,
    p.Dimension,
    Number(p.Price),
    null,
    null,
    p.Type,
    p.SubType,
    p.Brand || null,
    p.ImageURL || null,
    p.ProductURL || null
  ];
}

/* ================= CORE ENGINE ================= */

function compare(planProduct, datasets) {
  const sites = ["Amazon", "Flipkart", "IKEA", "Urban Ladder"];
  const results = Object.fromEntries(sites.map(s => [s, []]));

  datasets.forEach(data => {
    data.forEach(cand => {
      if (!exists(cand[0])) return;

      const site = inferSite(cand[0]);
      if (!results[site]) return;

      if (!hardFilter(planProduct, cand, site)) return;

      const sim = similarityScore(planProduct, cand);
      if (sim < 0.4) return;

      results[site].push({
        id: cand[0],
        name: cand[1],
        imageUrl: cand[9],
        productUrl: cand[10],
        dimension: cand[2],
        brand: cand[8],
        site,
        price: cand[3],
        similarity: Number(sim.toFixed(3))
      });
    });
  });

  return results;
}

/* ================= RUNNER ================= */

const planproData = loadJSON("planpro_data_2.json").map(adaptPlanProProduct);
const amazon = loadJSON("amazon_D.json").map(adaptRealProduct);
const flipkart = loadJSON("flipkart_D.json").map(adaptRealProduct);
const ikea = loadJSON("ikea_D.json").map(adaptRealProduct);
const urbanladder = loadJSON("urbanladder_D.json").map(adaptRealProduct);

const isJsonMode = process.argv.includes("--json-output");

if (!isJsonMode) {
  console.log("\nAVAILABLE PLANPRO PRODUCTS:");
  console.table(planproData.map(p => ({
    id: p[0],
    name: p[1],
    price: p[3]
  })));
}

if (isJsonMode) {
  const inputId = process.argv[process.argv.indexOf("--id") + 1];
  const planProduct = planproData.find(p => p[0] === inputId?.trim());
  if (planProduct) {
    const results = compare(planProduct, [amazon, flipkart, ikea, urbanladder]);
    const finalResults = {};
    for (const site in results) {
       finalResults[site] = results[site]
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 2);
    }
    console.log("JSON_START");
    console.log(JSON.stringify({ selected: planProduct, results: finalResults }));
    console.log("JSON_END");
  }
  process.exit(0);
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

rl.question("\nEnter PLANPRO product ID to compare: ", inputId => {
  const planProduct = planproData.find(p => p[0] === inputId.trim());

  if (!planProduct) {
    console.error("\n❌ Invalid PlanPro ID.");
    rl.close();
    return;
  }

  console.log("\nSELECTED PLANPRO PRODUCT:");
  console.table([{
    id: planProduct[0],
    name: planProduct[1],
    price: planProduct[3],
    type: planProduct[6],
    subtype: planProduct[7]
  }]);

  const results = compare(planProduct, [
    amazon,
    flipkart,
    ikea,
    urbanladder
  ]);

  console.log("\nMATCHED PRODUCTS (TOP-2 PER SITE):");

  for (const site in results) {
    if (results[site].length === 0) {
      console.log(`\n⚠️ No sufficiently similar ${site} products found`);
    } else {
      console.table(
        results[site]
          .sort((a, b) => b.similarity - a.similarity)
          .slice(0, 2)
      );
    }
  }

  rl.close();
});