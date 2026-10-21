import json
import math
import re

# ---------- Load Data ----------
with open("intents.json", encoding="utf-8") as f:
    INTENTS = json.load(f)

with open("planpro_data_2.json", encoding="utf-8") as f:
    PLANPRO = json.load(f)

# ---------- Helpers ----------
def normalize(text):
    return re.sub(r"[^a-z0-9\s]", "", text.lower())

def parse_price(p):
    try:
        return float(p)
    except:
        return 0.0

def parse_rating(r):
    try:
        return float(r)
    except:
        return 0.0

# ---------- Catalogue Index Map ----------
def build_catalogue_index(catalogue):
    index = {}
    for p in catalogue:
        pid = p.get("ID") or p.get("id")
        if pid:
            index[str(pid).lower()] = p
    return index

# ---------- Wishlist Builder ----------
def build_wishlist_from_indexes(catalogue, wishlist_indexes):
    index_map = build_catalogue_index(catalogue)
    wishlist = []
    for idx in wishlist_indexes:
        key = idx.strip().lower()
        if key in index_map:
            wishlist.append(index_map[key])
        else:
            print(f"⚠️ Invalid index ignored: {idx}")
    return wishlist

# ---------- Dynamic Price Range Extraction ----------
# Parses expressions like:
#   "below 15000", "under 10k", "less than 8000"
#   "above 5000",  "over 12000", "more than 9000"
#   "between 5000 and 15000", "5000 to 15000"
#   "around 10000", "approximately 8000"  → ±20% window
#
# Returns {"min": float or None, "max": float or None}
# Both None means no price range constraint detected.

def extract_price_range(raw_text):
    text = raw_text.lower().replace(",", "")

    # Expand shorthand like 10k → 10000, 1.5l / 1.5lakh → 150000
    text = re.sub(r"(\d+(\.\d+)?)\s*k\b",
                  lambda m: str(int(float(m.group(1)) * 1000)), text)
    text = re.sub(r"(\d+(\.\d+)?)\s*(l|lakh|lac)\b",
                  lambda m: str(int(float(m.group(1)) * 100000)), text)

    mn, mx = None, None

    # between X and Y  /  X to Y
    m = re.search(
        r"(?:between|from)?\s*(\d+)\s*(?:and|to|-)\s*(\d+)", text)
    if m:
        mn, mx = float(m.group(1)), float(m.group(2))
        return {"min": min(mn, mx), "max": max(mn, mx)}

    # below / under / less than / within / not more than / upto / up to / max
    m = re.search(
        r"(?:below|under|less\s+than|within|not\s+more\s+than|upto|up\s+to|max(?:imum)?)\s*(?:rs\.?|inr|₹)?\s*(\d+)",
        text)
    if m:
        return {"min": None, "max": float(m.group(1))}

    # above / over / more than / at least / minimum / starting from / greater than
    m = re.search(
        r"(?:above|over|more\s+than|at\s+least|minimum|starting\s+from|greater\s+than)\s*(?:rs\.?|inr|₹)?\s*(\d+)",
        text)
    if m:
        return {"min": float(m.group(1)), "max": None}

    # around / approximately / roughly / about  → ±20%
    m = re.search(
        r"(?:around|approximately|roughly|about)\s*(?:rs\.?|inr|₹)?\s*(\d+)",
        text)
    if m:
        val = float(m.group(1))
        return {"min": val * 0.80, "max": val * 1.20}

    # bare currency prefix: ₹10000, rs 10000, inr 10000
    m = re.search(r"(?:rs\.?|inr|₹)\s*(\d+)", text)
    if m:
        val = float(m.group(1))
        return {"min": val * 0.80, "max": val * 1.20}

    return {"min": None, "max": None}


# ---------- Intent Extraction ----------
def extract_intent(user_text):
    text = normalize(user_text)

    intent = {
        "action":          None,
        "product_type":    None,
        "product_subtype": None,
        "constraints":     {},
        "price_range":     {"min": None, "max": None},
        "material":        [],
        "style":           [],
        "usage":           [],
        "signals":         []
    }

    # ---- ACTION ----
    for k, phrases in INTENTS["action"].items():
        if any(p in text for p in phrases):
            intent["action"] = k
    if not intent["action"]:
        intent["action"] = "recommend"

    # ---- PRODUCT TYPE + SUBTYPE ----
    hierarchy = INTENTS.get("product_hierarchy", {})
    detected_type    = None
    detected_subtype = None

    for main_type, data in hierarchy.items():
        for subtype, keywords in data.get("subtypes", {}).items():
            if any(kw in text for kw in keywords):
                detected_type    = main_type
                detected_subtype = subtype
                break
        if detected_subtype:
            break
        if any(kw in text for kw in data.get("keywords", [])):
            detected_type = main_type

    intent["product_type"]    = detected_type
    intent["product_subtype"] = detected_subtype

    # ---- DYNAMIC PRICE RANGE ----
    intent["price_range"] = extract_price_range(user_text)

    # ---- CONSTRAINTS (categorical — kept for backward compat) ----
    for cat, values in INTENTS["constraints"].items():
        for k, phrases in values.items():
            if any(p in text for p in phrases):
                intent["constraints"][cat] = k

    # ---- OTHER GROUPS ----
    for group in ["material", "style", "usage"]:
        for k, phrases in INTENTS[group].items():
            if any(p in text for p in phrases):
                intent[group].append(k)

    for k, phrases in INTENTS["decision_signals"].items():
        if any(p in text for p in phrases):
            intent["signals"].append(k)

    return intent


# ---------- DISPLAY CLEAN INTENT ----------
def format_intent_for_display(intent):
    formatted = intent.copy()
    for key in ["material", "style", "usage", "signals"]:
        if not formatted[key]:
            formatted[key] = "NA"
    if not formatted["product_type"]:
        formatted["product_type"] = "NA"
    if not formatted["product_subtype"]:
        formatted["product_subtype"] = "NA"
    if not formatted["constraints"]:
        formatted["constraints"] = "NA"
    pr = formatted.get("price_range", {})
    if not pr or (pr.get("min") is None and pr.get("max") is None):
        formatted["price_range"] = "NA"
    return formatted


# ---------- RECOMMEND ----------
# Stage 1  — hard filter by main type
# Stage 2  — hard filter by subtype      (only when subtype detected)
# Stage 2.5— hard filter by price range  (only when price range detected)
# Stage 3  — soft scoring on survivors

def _has(field, keyword):
    return keyword in field

def recommend(wishlist, intent):
    scored = []

    main_type = intent["product_type"]
    subtype   = intent["product_subtype"]
    pr        = intent.get("price_range", {})
    pr_min    = pr.get("min")
    pr_max    = pr.get("max")

    for p in wishlist:
        p_type    = normalize(p.get("Type")         or "")
        p_subtype = normalize((p.get("SubType")     or "").replace("_", " "))
        p_name    = normalize(p.get("Name")         or "")
        p_desc    = normalize(p.get("Description")  or "")

        # STAGE 1 — main type hard filter
        if main_type:
            if not (_has(p_type, main_type) or _has(p_subtype, main_type) or _has(p_name, main_type)):
                continue

        # STAGE 2 — subtype hard filter
        if subtype:
            if not (_has(p_subtype, subtype) or _has(p_name, subtype)):
                continue

        # STAGE 2.5 — dynamic price range hard filter
        if pr_min is not None or pr_max is not None:
            item_price = parse_price(p.get("Price"))
            if pr_min is not None and item_price < pr_min:
                continue
            if pr_max is not None and item_price > pr_max:
                continue

        # STAGE 3 — soft scoring
        score = 0

        if subtype:
            if _has(p_subtype, subtype): score += 6
            elif _has(p_name,  subtype): score += 4

        if main_type:
            if _has(p_type, main_type):  score += 3
            elif _has(p_name, main_type): score += 1

        if intent["material"]:
            p_material = normalize(p.get("Material") or "")
            if any(m in p_material for m in intent["material"]):
                score += 2

        if intent["style"]:
            p_style = normalize(p.get("Style") or "")
            if any(s in p_style or s in p_name or s in p_desc for s in intent["style"]):
                score += 2

        if intent.get("signals"):
            for sig in intent["signals"]:
                if sig in p_name or sig in p_desc:
                    score += 1

        # Categorical price bracket bonus (still works alongside range filter)
        if intent.get("constraints") and intent["constraints"].get("price"):
            price_cat  = intent["constraints"]["price"]
            item_price = parse_price(p.get("Price"))
            if price_cat in ("very_low", "budget") and item_price < 15000:
                score += 1
            elif price_cat == "mid" and 15000 <= item_price < 30000:
                score += 1
            elif price_cat in ("high", "premium") and item_price >= 30000:
                score += 1

        scored.append((p, score))

    return scored


# ---------- COMPARE ----------
def compare(recommended):
    results = []
    MAX_PRICE  = 200000.0
    MAX_RATING = 5.0

    for p, base_score in recommended:
        price  = parse_price(p.get("Price"))
        rating = parse_rating(p.get("Rating"))

        price_score  = math.log(MAX_PRICE / price + 1) if price > 0 else 0
        rating_score = (rating / MAX_RATING) * 2 if rating > 0 else 0

        final_score = base_score * 3 + price_score * 1.5 + rating_score * 2

        results.append({
            "id":          p.get("ID"),
            "name":        p.get("Name"),
            "price":       price,
            "rating":      rating,
            "final_score": round(final_score, 3)
        })

    return sorted(results, key=lambda x: x["final_score"], reverse=True)


# ---------- PIPELINE ----------
def intra_recommend_compare(user_text, wishlist):
    intent      = extract_intent(user_text)
    recommended = recommend(wishlist, intent)

    if not recommended:
        return {"intent": intent, "results": []}

    return {"intent": intent, "results": compare(recommended)}


# ---------- CLI RUNNER ----------
if __name__ == "__main__":
    import sys
    import argparse

    parser = argparse.ArgumentParser(description="PlanPro Intra-Site Recommender")
    parser.add_argument("--ids",   type=str, default=None)
    parser.add_argument("--query", type=str, default=None)
    args, unknown = parser.parse_known_args()

    if args.ids and args.query:
        wishlist_indexes = [i.strip() for i in args.ids.split(",")]
        wishlist         = build_wishlist_from_indexes(PLANPRO, wishlist_indexes)

        if not wishlist:
            print("ERROR: Wishlist is empty after validation.")
            sys.exit(1)

        output = intra_recommend_compare(args.query, wishlist)

        print("\nDetected Intent:")
        print(json.dumps(format_intent_for_display(output["intent"]), indent=2))

        if not output["results"]:
            print("\nNo matching products found in your wishlist.")
            sys.exit(0)

        print("\n🏆 Ranked Products:\n")
        for idx, r in enumerate(output["results"], start=1):
            rating_str = f"⭐ {r['rating']}" if r["rating"] else "⭐ N/A"
            print(f"{idx}. {r['id']} | {r['name']} | ₹{r['price']} | {rating_str} | score={r['final_score']}")

    else:
        print("\n🤖 AssistoBot – Intra Recommender & Comparer\n")

        raw_indexes = input("Enter product indexes for your wishlist (comma separated)\nExample: x1,x4,x9\n> ").strip()
        if not raw_indexes:
            print("❌ No wishlist provided.")
            sys.exit()

        wishlist_indexes = raw_indexes.split(",")
        wishlist         = build_wishlist_from_indexes(PLANPRO, wishlist_indexes)

        if not wishlist:
            print("❌ Wishlist is empty after validation.")
            sys.exit()

        print(f"\n✅ Wishlist created with {len(wishlist)} items.\n")

        user_text = input("What are you looking for?\n> ").strip()
        if not user_text:
            print("❌ No input provided.")
            sys.exit()

        output = intra_recommend_compare(user_text, wishlist)

        print("\n🧠 Detected Intent:")
        print(json.dumps(format_intent_for_display(output["intent"]), indent=2))

        if not output["results"]:
            print("\n❌ No matching products found in your wishlist.")
            sys.exit()

        print("\n🏆 Ranked Products:\n")
        for idx, r in enumerate(output["results"], start=1):
            rating_str = f"⭐ {r['rating']}" if r["rating"] else "⭐ N/A"
            print(f"{idx}. {r['id']} | {r['name']} | ₹{r['price']} | {rating_str} | score={r['final_score']}")







# import json
# import math
# import re

# # ---------- Load Data ----------
# with open("intents.json", encoding="utf-8") as f:
#     INTENTS = json.load(f)

# with open("planpro_data_2.json", encoding="utf-8") as f:
#     PLANPRO = json.load(f)

# # ---------- Helpers ----------
# def normalize(text):
#     return re.sub(r"[^a-z0-9\s]", "", str(text).lower())

# def parse_price(p):
#     try:
#         return float(p)
#     except:
#         return 0.0

# def parse_rating(r):
#     try:
#         return float(r)
#     except:
#         return 0.0

# # ---------- SAFE Dynamic Price Segmentation ----------
# def compute_price_segments(wishlist):
#     prices = []

#     for p in wishlist:
#         price = parse_price(p.get("Price"))
#         if price > 0:
#             prices.append(price)

#     prices.sort()

#     if len(prices) < 3:
#         return {"low_max": 15000, "mid_max": 30000}

#     n = len(prices)

#     low_idx = max(0, int(n * 0.33) - 1)
#     mid_idx = max(0, int(n * 0.66) - 1)

#     return {
#         "low_max": prices[low_idx],
#         "mid_max": prices[mid_idx]
#     }

# # ---------- Catalogue Index Map ----------
# def build_catalogue_index(catalogue):
#     index = {}
#     for p in catalogue:
#         pid = p.get("ID") or p.get("id")
#         if pid:
#             index[str(pid).lower()] = p
#     return index

# # ---------- Wishlist Builder ----------
# def build_wishlist_from_indexes(catalogue, wishlist_indexes):
#     index_map = build_catalogue_index(catalogue)
#     wishlist = []
#     for idx in wishlist_indexes:
#         key = idx.strip().lower()
#         if key in index_map:
#             wishlist.append(index_map[key])
#         else:
#             print(f"⚠️ Invalid index ignored: {idx}")
#     return wishlist

# # ---------- Dynamic Price Range Extraction ----------
# def extract_price_range(raw_text):
#     text = str(raw_text).lower().replace(",", "")

#     text = re.sub(r"(\d+(\.\d+)?)\s*k\b",
#                   lambda m: str(int(float(m.group(1)) * 1000)), text)
#     text = re.sub(r"(\d+(\.\d+)?)\s*(l|lakh|lac)\b",
#                   lambda m: str(int(float(m.group(1)) * 100000)), text)

#     m = re.search(r"(?:between|from)?\s*(\d+)\s*(?:and|to|-)\s*(\d+)", text)
#     if m:
#         mn, mx = float(m.group(1)), float(m.group(2))
#         return {"min": min(mn, mx), "max": max(mn, mx)}

#     m = re.search(r"(?:below|under|less\s+than|within|not\s+more\s+than|upto|up\s+to|max(?:imum)?)\s*(?:rs\.?|inr|₹)?\s*(\d+)", text)
#     if m:
#         return {"min": None, "max": float(m.group(1))}

#     m = re.search(r"(?:above|over|more\s+than|at\s+least|minimum|starting\s+from|greater\s+than)\s*(?:rs\.?|inr|₹)?\s*(\d+)", text)
#     if m:
#         return {"min": float(m.group(1)), "max": None}

#     m = re.search(r"(?:around|approximately|roughly|about)\s*(?:rs\.?|inr|₹)?\s*(\d+)", text)
#     if m:
#         val = float(m.group(1))
#         return {"min": val * 0.80, "max": val * 1.20}

#     m = re.search(r"(?:rs\.?|inr|₹)\s*(\d+)", text)
#     if m:
#         val = float(m.group(1))
#         return {"min": val * 0.80, "max": val * 1.20}

#     return {"min": None, "max": None}

# # ---------- Intent Extraction ----------
# def extract_intent(user_text):
#     text = normalize(user_text)

#     intent = {
#         "action": None,
#         "product_type": None,
#         "product_subtype": None,
#         "constraints": {},
#         "price_range": {"min": None, "max": None},
#         "material": [],
#         "style": [],
#         "usage": [],
#         "signals": []
#     }

#     for k, phrases in INTENTS["action"].items():
#         if any(p in text for p in phrases):
#             intent["action"] = k
#     if not intent["action"]:
#         intent["action"] = "recommend"

#     hierarchy = INTENTS.get("product_hierarchy", {})
#     for main_type, data in hierarchy.items():
#         for subtype, keywords in data.get("subtypes", {}).items():
#             if any(kw in text for kw in keywords):
#                 intent["product_type"] = main_type
#                 intent["product_subtype"] = subtype
#                 break
#         if intent["product_subtype"]:
#             break
#         if any(kw in text for kw in data.get("keywords", [])):
#             intent["product_type"] = main_type

#     intent["price_range"] = extract_price_range(user_text)

#     for cat, values in INTENTS["constraints"].items():
#         for k, phrases in values.items():
#             if any(p in text for p in phrases):
#                 intent["constraints"][cat] = k

#     for group in ["material", "style", "usage"]:
#         for k, phrases in INTENTS[group].items():
#             if any(p in text for p in phrases):
#                 intent[group].append(k)

#     for k, phrases in INTENTS["decision_signals"].items():
#         if any(p in text for p in phrases):
#             intent["signals"].append(k)

#     return intent

# # ---------- RECOMMEND ----------
# def _has(field, keyword):
#     return keyword in field

# def recommend(wishlist, intent):
#     scored = []
#     segments = compute_price_segments(wishlist)

#     # print("DEBUG INTENT:", intent)
#     # print("DEBUG SEGMENTS:", segments)

#     for p in wishlist:
#         try:
#             p_type = normalize(p.get("Type") or "")
#             p_subtype = normalize((p.get("SubType") or "").replace("_", " "))
#             p_name = normalize(p.get("Name") or "")
#             p_desc = normalize(p.get("Description") or "")
#             price = parse_price(p.get("Price"))

#             # HARD FILTERS
#             if intent["product_type"]:
#                 if not (_has(p_type, intent["product_type"]) or _has(p_name, intent["product_type"])):
#                     continue

#             if intent["product_subtype"]:
#                 if not (_has(p_subtype, intent["product_subtype"]) or _has(p_name, intent["product_subtype"])):
#                     continue

#             pr = intent.get("price_range", {})
#             if pr.get("min") is not None and price < pr["min"]:
#                 continue
#             if pr.get("max") is not None and price > pr["max"]:
#                 continue

#             # SCORING
#             score = 0

#             if intent["product_subtype"] and _has(p_subtype, intent["product_subtype"]):
#                 score += 6

#             if intent["product_type"] and _has(p_type, intent["product_type"]):
#                 score += 3

#             if intent["material"]:
#                 if any(m in normalize(p.get("Material") or "") for m in intent["material"]):
#                     score += 2

#             if intent["style"]:
#                 if any(s in p_desc or s in p_name for s in intent["style"]):
#                     score += 2

#             if intent["signals"]:
#                 if any(sig in p_desc or sig in p_name for sig in intent["signals"]):
#                     score += 1

#             # SAFE PRICE CATEGORY MATCH
#             if isinstance(intent.get("constraints"), dict):
#                 price_cat = intent["constraints"].get("price")

#                 if price_cat:
#                     if price <= segments["low_max"] and price_cat in ("very_low", "budget"):
#                         score += 2
#                     elif segments["low_max"] < price <= segments["mid_max"] and price_cat == "mid":
#                         score += 2
#                     elif price > segments["mid_max"] and price_cat in ("premium", "high"):
#                         score += 2

#             scored.append((p, score))

#         except Exception as e:
#             print("⚠️ Skipping item due to error:", e)
#             continue

#     return scored

# # ---------- COMPARE ----------
# def compare(recommended):
#     results = []
#     MAX_PRICE = 200000.0
#     MAX_RATING = 5.0

#     for p, base_score in recommended:
#         price = parse_price(p.get("Price"))
#         rating = parse_rating(p.get("Rating"))

#         price_score = math.log(MAX_PRICE / price + 1) if price > 0 else 0
#         rating_score = (rating / MAX_RATING) * 2 if rating > 0 else 0

#         final_score = base_score * 3 + price_score * 1.5 + rating_score * 2

#         results.append({
#             "id": p.get("ID"),
#             "name": p.get("Name"),
#             "price": price,
#             "rating": rating,
#             "final_score": round(final_score, 3)
#         })

#     return sorted(results, key=lambda x: x["final_score"], reverse=True)

# # ---------- PIPELINE ----------
# def intra_recommend_compare(user_text, wishlist):
#     try:
#         intent = extract_intent(user_text)
#         recommended = recommend(wishlist, intent)

#         if not recommended:
#             return {"intent": intent, "results": []}

#         return {"intent": intent, "results": compare(recommended)}

#     except Exception as e:
#         print("🔥 ERROR:", str(e))
#         return {"intent": {}, "results": []}