#!/usr/bin/env python3
"""
add_image_urls.py

Reads one or more marketplace JSON files (Amazon/IKEA), fetches each product's ProductURL,
extracts the product image (via og:image, link[rel=image_src], JSON-LD or first large <img>),
and writes a new JSON file with an added "ImageURL" field for each item.

This script DOES NOT modify the original file. It writes a new file named
`<orig_filename>_with_images.json` in the same folder.

Usage examples:
  python add_image_urls.py amazon_D.json ikea_D.json
  python add_image_urls.py --concurrency 8 --limit 100 amazon_D.json

Requirements:
  pip install requests beautifulsoup4

"""

import argparse
import json
import time
import re
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor, as_completed
from urllib.parse import urlparse, urljoin

import requests
from bs4 import BeautifulSoup

HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
                  " (KHTML, like Gecko) Chrome/117.0.0.0 Safari/537.36 ImageURLFetcher/1.0",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
} 
REQUEST_TIMEOUT = 8


def extract_image_from_html(html):
    soup = BeautifulSoup(html, "html.parser")

    # 1) Open Graph / Twitter tags
    for prop in ("og:image", "og:image:secure_url", "twitter:image", "twitter:image:src"):
        tag = soup.find("meta", property=prop) or soup.find("meta", attrs={"name": prop})
        if tag and tag.get("content"):
            return tag["content"]

    # 2) link rel="image_src" (explicit) or rel="preload" but only if it is an image
    link_img = soup.find("link", rel="image_src")
    if link_img and link_img.get("href"):
        href = link_img.get("href")
        if href and href.lower().split('?')[0].endswith(('.jpg', '.jpeg', '.png', '.webp', '.gif')):
            return href

    preload = soup.find("link", rel="preload")
    if preload and preload.get("href"):
        href = preload.get("href")
        if preload.get('as') == 'image' or (href and href.lower().split('?')[0].endswith(('.jpg', '.jpeg', '.png', '.webp', '.gif'))):
            return href

    # 3) JSON-LD (application/ld+json) with image field
    for script in soup.find_all("script", type="application/ld+json"):
        try:
            data = json.loads(script.string or "null")
        except Exception:
            continue

        # handle dict or list
        def find_image(obj):
            if isinstance(obj, dict):
                if "image" in obj and obj["image"]:
                    return obj["image"]
                # sometimes image is an object like {"@type":"ImageObject","url":"..."}
                if "url" in obj and obj["url"]:
                    return obj["url"]
                for v in obj.values():
                    if isinstance(v, (dict, list)):
                        i = find_image(v)
                        if i:
                            return i
            if isinstance(obj, list):
                for el in obj:
                    i = find_image(el)
                    if i:
                        return i
            return None

        img = find_image(data)
        if img:
            if isinstance(img, list):
                return img[0]
            return img

    # 4) attempt to find images in <img> tags, preferring srcset, data-src, data-image
    def parse_srcset(s):
        # pick largest width candidate (if available) or first URL
        parts = [p.strip() for p in (s or "").split(',') if p.strip()]
        best = None
        best_w = 0
        for p in parts:
            tokens = p.split()
            url = tokens[0]
            w = 0
            if len(tokens) > 1 and tokens[1].endswith('w'):
                try:
                    w = int(tokens[1][:-1])
                except Exception:
                    w = 0
            if w > best_w:
                best_w = w
                best = url
            if best is None:
                best = url
        return best

    # Amazon-specific: check data-a-dynamic-image (JSON mapping of URLs -> sizes)
    img = soup.find("img", attrs={"data-a-dynamic-image": True})
    if img:
        try:
            data = json.loads(img.get("data-a-dynamic-image") or "{}")
            if isinstance(data, dict):
                for k in data.keys():
                    if k and not k.startswith("data:"):
                        return k
        except Exception:
            pass

    # Amazon landing image often has data-old-hires or id=landingImage
    img = soup.find("img", id="landingImage")
    if img:
        for attr in ("data-old-hires", "data-src", "data-lazy", "src"):
            val = img.get(attr)
            if val and not val.startswith("data:"):
                return val

    imgs = soup.find_all("img")
    for img in imgs:
        # check common lazy attributes
        for attr in ("srcset", "data-srcset", "data-src", "data-lazy", "data-image", "src"):
            val = img.get(attr)
            if not val:
                continue
            if attr.endswith("srcset"):
                cand = parse_srcset(val)
            else:
                cand = val
            if cand and not cand.strip().startswith("data:"):
                return cand

    # fallback: search raw HTML for JS-embedded image URLs (prefer hiRes / SL/SX/SY variants)
    html = str(soup)
    # 1) explicit hiRes fields (common in Amazon colorImages JSON)
    m = re.search(r"['\"]hiRes['\"]\s*[:=]\s*['\"](https?:\\?/\\?/[^'\"]+)['\"]", html, re.I)
    if m:
        url = m.group(1).replace('\\/','/')
        return url if url.startswith('http') else ('https:' + url)

    # 2) prefer Amazon images with _SL/_SX/_SY size tokens (higher res)
    m = re.search(r"(https?:)?//[^\"\'\s]*/images/I/[^\"\'\s]+\._S(?:L|X|Y)\d+_[^\"\'\s]*\.(?:jpg|jpeg|png|webp)", html, re.I)
    if m:
        url = m.group(0)
        return url if url.startswith('http') else ('https:' + url)

    # 3) generic image URL fallback
    m = re.search(r"(https?:)?//[^\s'\"]+\.(?:jpg|jpeg|png|webp|gif)(?:\?[^'\"\s>]*)?", html, re.I)
    if m:
        url = m.group(0)
        return url if url.startswith("http") else ("https:" + url)

    return None


def amazon_asin_image(asin):
    # expanded common Amazon media patterns; some hosts/variants may work where others fail
    candidates = [
        f"https://m.media-amazon.com/images/I/{asin}.jpg",
        f"https://m.media-amazon.com/images/I/{asin}._SY300_.jpg",
        f"https://m.media-amazon.com/images/I/{asin}._SX300_.jpg",
        f"https://m.media-amazon.com/images/I/{asin}._AC_SL1500_.jpg",
        f"https://images-na.ssl-images-amazon.com/images/I/{asin}.jpg",
        f"https://images-na.ssl-images-amazon.com/images/I/{asin}._SX300_.jpg",
        f"https://images-na.ssl-images-amazon.com/images/I/{asin}._AC_SL1500_.jpg",
    ]
    # dedupe while preserving order
    seen = set()
    out = []
    for c in candidates:
        if c and c not in seen:
            seen.add(c)
            out.append(c)
    return out


def verify_image_url(url, referer=None):
    try:
        # 1) try HEAD first
        resp = requests.head(url, headers=HEADERS, timeout=REQUEST_TIMEOUT, allow_redirects=True)
        if resp.status_code == 200:
            ctype = resp.headers.get("Content-Type", "")
            if ctype and ctype.startswith("image/"):
                return True
        # 2) try GET
        resp = requests.get(url, headers=HEADERS, timeout=REQUEST_TIMEOUT, stream=True)
        if resp.status_code == 200:
            ctype = resp.headers.get("Content-Type", "")
            if ctype and ctype.startswith("image/"):
                return True
        # 3) if referer provided, try GET with Referer header (some Amazon hosts require it)
        if referer:
            hdrs = dict(HEADERS)
            hdrs["Referer"] = referer
            hdrs["Accept"] = "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"
            resp = requests.get(url, headers=hdrs, timeout=REQUEST_TIMEOUT, stream=True)
            if resp.status_code == 200:
                ctype = resp.headers.get("Content-Type", "")
                if ctype and ctype.startswith("image/"):
                    return True
    except Exception:
        return False
    return False


# Helpers to normalize / resolve URLs so they are clickable (absolute) and optionally verified
def make_absolute_url(base, url):
    if not url:
        return None
    url = url.strip()
    # protocol-relative
    if url.startswith("//"):
        return "https:" + url
    if url.startswith("http://") or url.startswith("https://"):
        return url
    # absolute path
    if url.startswith("/"):
        p = urlparse(base)
        return f"{p.scheme}://{p.netloc}{url}"
    # relative path
    try:
        return urljoin(base, url)
    except Exception:
        return url


def normalize_and_verify(img_url, base_url):
    if not img_url:
        return None
    candidate = make_absolute_url(base_url, img_url)
    if not candidate:
        return None
    # prefer verified image (pass referer so hosts like Amazon may accept it)
    if verify_image_url(candidate, referer=base_url):
        return candidate
    # try https fallback
    if candidate.startswith("http://"):
        alt = "https://" + candidate[len("http://"):]
        if verify_image_url(alt, referer=base_url):
            return alt
    return None




def fetch_image_for_item(item, tries=2, delay=1.0):
    # If item already has ImageURL (Flipkart style), try to normalize to clickable URL
    product_url = item.get("ProductURL")
    if not product_url:
        # no page to resolve relative URLs from
        if item.get("ImageURL"):
            item["ImageURL"] = item["ImageURL"] if item["ImageURL"] else None
        else:
            item["ImageURL"] = None
        return item

    # normalize existing ImageURL if present
    if item.get("ImageURL"):
        norm = make_absolute_url(product_url, item["ImageURL"])
        if norm:
            lower = norm.lower().split('?')[0]
            if verify_image_url(norm, referer=product_url) or any(lower.endswith(ext) for ext in ('.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif', '.bmp')):
                item["ImageURL"] = norm
                return item

    # Try fetching page
    try:
        resp = requests.get(product_url, headers=HEADERS, timeout=REQUEST_TIMEOUT)
        if resp.status_code == 200 and resp.text:
            img = extract_image_from_html(resp.text)
            if img:
                norm = normalize_and_verify(img, product_url)
                if norm:
                    item["ImageURL"] = norm
                    return item
                # fallback: if absolute-looking URL ends with image extension or verifies, accept it
                abs_img = make_absolute_url(product_url, img)
                if abs_img:
                    lower = abs_img.lower().split('?')[0]
                    if any(lower.endswith(ext) for ext in ('.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif', '.bmp')) or verify_image_url(abs_img):
                        item["ImageURL"] = abs_img
                        return item
    except Exception:
        pass

    # Amazon-specific fallback: try construct via ASIN
    if "amazon." in product_url:
        m = re.search(r"/dp/([A-Z0-9]{8,12})|/gp/product/([A-Z0-9]{8,12})", product_url)
        asin = None
        if m:
            asin = m.group(1) or m.group(2)
        if asin:
            # prefer verified candidates (try with referer to help Amazon hosts)
            for c in amazon_asin_image(asin):
                if verify_image_url(c, referer=product_url):
                    item["ImageURL"] = c
                    return item
            # fallback: return first candidate that looks like an image (clickable), even if verification failed
            for c in amazon_asin_image(asin):
                if c:
                    lc = c.lower().split('?')[0]
                    if any(lc.endswith(ext) for ext in ('.jpg', '.jpeg', '.png', '.webp', '.gif', '.svg', '.avif', '.bmp')) or '/images/I/' in c:
                        item["ImageURL"] = c
                        return item

    # nothing found
    item["ImageURL"] = None
    return item


def process_file(path: Path, concurrency: int = 5, limit: int = 0, dry: bool = False):
    print(f"Processing {path} (dry={dry})...")
    data = json.loads(path.read_text(encoding="utf-8"))

    if not isinstance(data, list):
        raise SystemExit("Expected top-level JSON array of items")

    total = len(data)
    print(f"Found {total} items")

    if limit > 0:
        data = data[:limit]

    results = [None] * len(data)

    def worker(idx, item):
        if dry:
            # just annotate with None so structure is present
            if item.get("ImageURL") is None:
                item["ImageURL"] = None
            return idx, item
        return idx, fetch_image_for_item(item)

    with ThreadPoolExecutor(max_workers=concurrency) as ex:
        futures = {ex.submit(worker, i, data[i]): i for i in range(len(data))}
        for fut in as_completed(futures):
            idx, out = fut.result()
            results[idx] = out

    # merge: if we processed only a slice due to limit, keep the rest unchanged
    if limit > 0 and total > limit:
        results.extend(json.loads(path.read_text(encoding="utf-8"))[limit:])

    out_path = path.with_name(path.stem + "_with_images" + path.suffix)
    out_path.write_text(json.dumps(results, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"Wrote output to {out_path} — done.")


def main():
    parser = argparse.ArgumentParser(description="Add ImageURL fields by scraping product pages.")
    parser.add_argument("files", nargs="+", help="JSON file(s) to process")
    parser.add_argument("--concurrency", type=int, default=5, help="Number of parallel fetches")
    parser.add_argument("--limit", type=int, default=0, help="Limit number of items processed (for testing)")
    parser.add_argument("--dry", action="store_true", help="Do not fetch pages — just add null ImageURL fields")

    args = parser.parse_args()

    for f in args.files:
        p = Path(f)
        if not p.exists():
            print(f"File not found: {f}")
            continue
        process_file(p, concurrency=args.concurrency, limit=args.limit, dry=args.dry)


if __name__ == "__main__":
    main()
