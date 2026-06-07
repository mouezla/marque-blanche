"""
Serveur backend Marque Blanche
Analyse une URL produit concurrente et en extrait :
titre, prix, image, description.

Lancement :  python app.py
Puis ouvrez : http://127.0.0.1:5000
"""

from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
import requests
from bs4 import BeautifulSoup
import re
import os

app = Flask(__name__, static_folder=".")
CORS(app)

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/120.0 Safari/537.36"
    )
}


@app.after_request
def no_cache(response):
    """Empêche le navigateur de garder en cache HTML/JS/CSS."""
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    response.headers["Pragma"] = "no-cache"
    response.headers["Expires"] = "0"
    return response


def meta(soup, prop=None, name=None):
    """Récupère le contenu d'une balise meta (og: ou name)."""
    if prop:
        tag = soup.find("meta", property=prop)
        if tag and tag.get("content"):
            return tag["content"].strip()
    if name:
        tag = soup.find("meta", attrs={"name": name})
        if tag and tag.get("content"):
            return tag["content"].strip()
    return None


def find_price(soup, html):
    """Cherche un prix via plusieurs stratégies."""
    # 1) meta product:price:amount (Open Graph / Shopify)
    p = meta(soup, prop="product:price:amount") or meta(soup, prop="og:price:amount")
    if p:
        return p
    # 2) balises avec classe contenant "price"
    for el in soup.find_all(class_=re.compile("price", re.I)):
        txt = el.get_text(" ", strip=True)
        m = re.search(r"[\$€£]\s?\d[\d\s.,]*", txt)
        if m:
            return m.group(0).strip()
    # 3) regex globale sur le HTML
    m = re.search(r"[\$€£]\s?\d{1,4}([.,]\d{2})?", html)
    return m.group(0).strip() if m else None


@app.route("/api/analyze", methods=["POST"])
def analyze():
    data = request.get_json(silent=True) or {}
    url = (data.get("url") or "").strip()

    if not re.match(r"^https?://", url):
        return jsonify({"ok": False, "error": "URL invalide"}), 400

    try:
        resp = requests.get(url, headers=HEADERS, timeout=12)
        resp.raise_for_status()
    except Exception as e:
        return jsonify({"ok": False, "error": f"Impossible de charger la page : {e}"}), 502

    soup = BeautifulSoup(resp.text, "html.parser")

    title = (
        meta(soup, prop="og:title")
        or (soup.title.string.strip() if soup.title and soup.title.string else None)
        or "Produit sans titre"
    )
    description = (
        meta(soup, prop="og:description")
        or meta(soup, name="description")
        or ""
    )
    image = meta(soup, prop="og:image") or ""
    price = find_price(soup, resp.text) or "N/A"

    # --- Galerie d'images (structure visuelle de la page) ---
    images = []
    if image:
        images.append(image)
    for tag in soup.find_all("img"):
        src = tag.get("src") or tag.get("data-src") or ""
        if not src:
            continue
        if src.startswith("//"):
            src = "https:" + src
        elif src.startswith("/"):
            base = re.match(r"^https?://[^/]+", url)
            src = (base.group(0) if base else "") + src
        # On garde les images produit plausibles
        if not src.startswith("http"):
            continue
        if any(x in src.lower() for x in ["sprite", "icon", "logo", "pixel", "blank", ".svg"]):
            continue
        if src not in images:
            images.append(src)
        if len(images) >= 10:
            break

    # --- Titres de sections (ordre de la page) ---
    NOISE = (
        "cart", "panier", "estimated", "total", "country", "region", "currency",
        "menu", "search", "recherche", "login", "connexion", "account", "compte",
        "newsletter", "subscribe", "footer", "skip to", "aller au", "language",
        "checkout", "shipping calculated", "your cart",
    )
    headings = []
    for h in soup.find_all(["h2", "h3"]):
        txt = h.get_text(" ", strip=True)
        low = txt.lower()
        if not (3 <= len(txt) <= 80):
            continue
        if any(n in low for n in NOISE):
            continue
        if low in [x.lower() for x in headings]:
            continue
        headings.append(txt)
        if len(headings) >= 12:
            break

    return jsonify({
        "ok": True,
        "title": title,
        "price": price,
        "image": image,
        "images": images,
        "headings": headings,
        "description": description[:300],
        "source": re.sub(r"^https?://", "", url).split("/")[0],
    })


# Sert le frontend (index.html, style.css, script.js)
@app.route("/")
def index():
    return send_from_directory(".", "index.html")


@app.route("/<path:path>")
def static_files(path):
    return send_from_directory(".", path)


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    print("\n  Marque Blanche — serveur lancé")
    print(f"  Ouvrez : http://127.0.0.1:{port}\n")
    app.run(debug=True, host="0.0.0.0", port=port)
