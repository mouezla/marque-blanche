// ===========================
// MODALE (popup formulaire)
// ===========================
function openCloneModal() {
  const modal = document.getElementById('cloneModal');
  if (!modal) return;
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
  const urlField = document.getElementById('urlInput');
  if (urlField) setTimeout(() => urlField.focus(), 200);
}

function closeCloneModal() {
  const modal = document.getElementById('cloneModal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

document.addEventListener('DOMContentLoaded', () => {
  // Bouton "Coller le lien" dans l'étape 01
  document.querySelectorAll('.js-open-modal').forEach(btn =>
    btn.addEventListener('click', openCloneModal)
  );
  // Fermeture : croix
  const closeBtn = document.getElementById('modalClose');
  if (closeBtn) closeBtn.addEventListener('click', closeCloneModal);
  // Fermeture : clic sur le fond
  const overlay = document.getElementById('cloneModal');
  if (overlay) overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeCloneModal();
  });
  // Fermeture : touche Échap
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeCloneModal();
  });
});

// ===========================
// FAQ ACCORDION
// ===========================
function toggleFaq(btn) {
  const answer = btn.nextElementSibling;
  const icon = btn.querySelector('.faq-icon');
  const isOpen = answer.classList.contains('open');

  // Fermer tous les autres
  document.querySelectorAll('.faq-a').forEach(a => a.classList.remove('open'));
  document.querySelectorAll('.faq-icon').forEach(i => i.textContent = '+');

  if (!isOpen) {
    answer.classList.add('open');
    icon.textContent = '×';
  }
}

// ===========================
// FORMULAIRE DE CLONAGE (Étape 1)
// ===========================
(function () {
  const form = document.getElementById('cloneForm');
  if (!form) return;

  const urlInput = document.getElementById('urlInput');
  const urlError = document.getElementById('urlError');
  const fileInput = document.getElementById('fileInput');
  const dropzone = document.getElementById('dropzone');
  const dropText = document.getElementById('dropText');
  const generateBtn = document.getElementById('generateBtn');
  const result = document.getElementById('formResult');
  const thumb = document.getElementById('thumb');

  let selectedFile = null;

  // --- Validation d'URL ---
  function isValidUrl(value) {
    try {
      const u = new URL(value);
      return u.protocol === 'http:' || u.protocol === 'https:';
    } catch {
      return false;
    }
  }

  // --- Gestion du fichier ---
  function handleFile(file) {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      dropText.textContent = '⚠️ Veuillez choisir une image valide';
      dropzone.classList.remove('has-file');
      thumb.classList.remove('show');
      thumb.removeAttribute('src');
      selectedFile = null;
      return;
    }
    selectedFile = file;
    dropText.textContent = '✓ ' + file.name;
    dropzone.classList.add('has-file');

    // Aperçu miniature de l'image
    const reader = new FileReader();
    reader.onload = (e) => {
      thumb.src = e.target.result;
      thumb.classList.add('show');
    };
    reader.readAsDataURL(file);
  }

  fileInput.addEventListener('change', (e) => handleFile(e.target.files[0]));

  // --- Drag & drop ---
  ['dragenter', 'dragover'].forEach(evt =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    })
  );
  ['dragleave', 'drop'].forEach(evt =>
    dropzone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
    })
  );
  dropzone.addEventListener('drop', (e) => {
    const file = e.dataTransfer.files[0];
    fileInput.files = e.dataTransfer.files;
    handleFile(file);
  });

  // Effacer l'erreur en tapant
  urlInput.addEventListener('input', () => {
    urlInput.classList.remove('invalid');
    urlError.textContent = '';
  });

  // --- Soumission ---
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const url = urlInput.value.trim();

    // Validation
    if (!isValidUrl(url)) {
      urlInput.classList.add('invalid');
      urlError.textContent = 'Entrez une URL valide (http:// ou https://)';
      return;
    }

    // Génération via le backend
    generateBtn.disabled = true;
    generateBtn.textContent = 'Génération...';
    result.className = 'form-result loading show';
    result.innerHTML = '<span class="spinner"></span> Analyse de la page concurrente...';

    let domain = '';
    try { domain = new URL(url).hostname; } catch {}

    analyzeUrl(url).then((data) => {
      // En cas d'echec backend, on fabrique des donnees minimales
      if (!data || !data.ok) {
        data = {
          ok: false,
          title: 'Produit cloné',
          price: 'N/A',
          image: '',
          description: '',
          source: domain
        };
      }
      lastData = data;
      result.className = 'form-result show';
      result.innerHTML = '';
      generateBtn.disabled = false;
      generateBtn.textContent = 'Générer';

      // Ferme la popup et affiche la page clonée
      if (typeof closeCloneModal === 'function') closeCloneModal();
      showClonePreview(data, url, domain, selectedFile);
    });
  });

  // Appel au backend ; renvoie null si injoignable
  function analyzeUrl(url) {
    return fetch('/api/analyze', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ url })
    })
      .then((r) => r.json())
      .catch(() => null);
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  let lastData = null;

  // --- Génère et télécharge un vrai fichier .liquid ---
  function downloadLiquid(domain, sourceUrl, file, data) {
    // Nom de produit dérivé de l'URL (dernier segment)
    let slug = 'produit';
    try {
      const parts = new URL(sourceUrl).pathname.split('/').filter(Boolean);
      if (parts.length) slug = parts[parts.length - 1];
    } catch {}
    const safeName = slug.replace(/[^a-z0-9-]/gi, '-').toLowerCase();
    const today = new Date().toISOString().slice(0, 10);

    const liquid =
`{% comment %}
  ============================================================
  Section générée par Marque Blanche
  Source clonée : ${sourceUrl}
  Domaine       : ${domain}
  Généré le     : ${today}
  ${file ? 'Image fournie : ' + file.name : 'Image fournie : aucune'}${data ? `
  --- Données extraites de la page concurrente ---
  Titre   : ${data.title}
  Prix    : ${data.price}
  Image   : ${data.image || 'aucune'}` : ''}
  ============================================================
{% endcomment %}

{% section "wid-product-page" %}

<div class="wid-hero">
  <div class="wid-hero__media">
    {% if product.featured_image %}
      <img
        src="{{ product.featured_image | image_url: width: 800 }}"
        alt="{{ product.title | escape }}"
        loading="lazy"
        width="800">
    {% endif %}
  </div>

  <div class="wid-hero__info">
    <p class="wid-hero__vendor">{{ product.vendor }}</p>
    <h1 class="wid-hero__title">{{ product.title }}</h1>

    <div class="wid-hero__rating">★★★★★ <span>{{ product.metafields.reviews.rating }}</span></div>

    <div class="wid-hero__price">
      <strong>{{ product.price | money }}</strong>
      {% if product.compare_at_price > product.price %}
        <s>{{ product.compare_at_price | money }}</s>
      {% endif %}
    </div>

    <div class="wid-hero__desc">{{ product.description }}</div>

    {% form 'product', product %}
      <input type="hidden" name="id" value="{{ product.selected_or_first_available_variant.id }}">
      <button type="submit" class="wid-hero__cart" {% unless product.available %}disabled{% endunless %}>
        {% if product.available %}Ajouter au panier{% else %}Épuisé{% endif %}
      </button>
    {% endform %}
  </div>
</div>

{% schema %}
{
  "name": "Marque Blanche — Produit",
  "settings": [
    { "type": "checkbox", "id": "show_rating", "label": "Afficher la note", "default": true },
    { "type": "checkbox", "id": "show_compare_price", "label": "Afficher le prix barré", "default": true }
  ],
  "presets": [{ "name": "Marque Blanche — Produit" }]
}
{% endschema %}

{% endsection %}
`;

    const blob = new Blob([liquid], { type: 'text/plain;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'wid-' + safeName + '.liquid';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }
})();

// ===========================
// TABS DÉMO (Leur page / Votre page)
// ===========================
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', function () {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    this.classList.add('active');

    const demoImg = document.querySelector('.demo-img');
    const demoCard = document.querySelector('.demo-card');

    if (this.textContent.trim() === 'Votre page') {
      demoImg.style.background = '#E8E4FF';
      demoCard.style.boxShadow = '0 8px 40px rgba(108,99,255,.15)';
    } else {
      demoImg.style.background = '#FDE8D8';
      demoCard.style.boxShadow = '0 8px 40px rgba(0,0,0,.10)';
    }
  });
});

// ===========================
// SMOOTH SCROLL
// ===========================
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    const href = this.getAttribute('href');
    // Les liens vers le formulaire ouvrent la popup
    if (href === '#cloneForm') {
      e.preventDefault();
      openCloneModal();
      return;
    }
    const target = document.querySelector(href);
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  });
});

// ===========================
// ANIMATION AU SCROLL
// ===========================
const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.style.opacity = '1';
      entry.target.style.transform = 'translateY(0)';
    }
  });
}, { threshold: 0.1 });

document.querySelectorAll('.step-card, .plan, .audience-card, .feature').forEach(el => {
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';
  el.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
  observer.observe(el);
});

// ===========================
// APERÇU DE LA PAGE CLONÉE
// ===========================
function escapeHtmlGlobal(s) {
  return String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function slugFromUrl(url) {
  try {
    const parts = new URL(url).pathname.split('/').filter(Boolean);
    return (parts[parts.length - 1] || 'produit').replace(/[^a-z0-9-]/gi, '-').toLowerCase();
  } catch { return 'produit'; }
}

// Construit une page produit HTML complète à partir des données extraites
function buildPreviewHtml(data, url) {
  const title = escapeHtmlGlobal(data.title || 'Produit cloné');
  const price = escapeHtmlGlobal(data.price || '—');
  const img = data.image || '';

  const imgBlock = img
    ? `<img src="${img}" alt="${title}" style="width:100%;border-radius:14px;object-fit:cover;">`
    : `<div class="ph-img"></div>`;

  // Accordéon FAQ : 10 questions à compléter
  const faqTopics = [
    'how to use the product', 'how long until results', 'is it safe',
    'what ingredients are inside', 'shipping and delivery times', 'return policy',
    'who it is for', 'side effects', 'vet recommendations', 'combining with other supplements'
  ];
  const faqRows = faqTopics.map((t, i) =>
    `<div class="sk-faq"><span>[ Question ${i + 1} — ~7-12 words about ${t} ]</span><b>+</b></div>`
  ).join('');

  const payRow = Array.from({ length: 6 }).map(() => '<span class="sk-pay">PAY</span>').join('');

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #1a1a2e; background:#fff; }
  .wrap { max-width: 980px; margin: 0 auto; padding: 36px 24px; }
  .sk-hero { display: grid; grid-template-columns: 1fr 1fr; gap: 36px; align-items: center; }
  .ph-img { width:100%; aspect-ratio:1; border-radius:14px; background: linear-gradient(135deg,#E8E4FF,#FDE8D8); }
  .sk-vendor { text-transform: uppercase; letter-spacing: 1px; font-size: 12px; color: #9aa; font-weight: 700; }
  h1 { font-size: 30px; margin: 8px 0 10px; }
  .sk-rating { color:#f5a623; margin-bottom:10px; } .sk-rating span{color:#999;font-size:13px;}
  .sk-price { font-size: 26px; font-weight: 800; margin-bottom: 16px; }
  .sk-line { height: 12px; background:#eee; border-radius:6px; margin:8px 0; }
  .sk-line.w80{width:80%;} .sk-line.w60{width:60%;}
  .sk-section { padding: 40px 0; }
  .sk-h2 { font-size: 22px; text-align:center; margin-bottom: 22px; }
  .sk-faq { display:flex; justify-content:space-between; align-items:center; gap:14px;
            border:1px solid #eee; border-radius:10px; padding:16px 18px; margin-bottom:12px; color:#333; font-size:14px; }
  .sk-faq b { color:#f5a623; font-size:20px; }
  .sk-cta { display:block; width:100%; background:#f5a623; border:none; color:#1a1a2e;
            font-weight:800; font-size:18px; padding:22px; border-radius:10px; cursor:pointer; margin:30px 0; }
  footer { background:#111; color:#9a9aa5; padding:48px 24px; }
  .foot { max-width:980px; margin:0 auto; display:grid; grid-template-columns:2fr 1fr 1fr; gap:30px; font-size:13px; }
  footer b { color:#fff; letter-spacing:1px; display:block; margin-bottom:12px; }
  .foot a, .foot p { color:#9a9aa5; display:block; text-decoration:none; margin:5px 0; }
  .sk-sub { display:flex; margin-top:10px; }
  .sk-sub input { flex:1; padding:10px; border:none; border-radius:6px 0 0 6px; }
  .sk-sub button { background:#f5a623; border:none; padding:0 16px; border-radius:0 6px 6px 0; color:#111; font-weight:700; cursor:pointer; }
  .foot-bottom { max-width:980px; margin:30px auto 0; display:flex; justify-content:space-between; align-items:center; font-size:12px; }
  .sk-pay { background:#2a2a2a; color:#888; font-size:10px; padding:6px 8px; border-radius:4px; margin-left:6px; }
  @media(max-width:760px){ .sk-hero,.foot{grid-template-columns:1fr;} }
</style></head>
<body>
  <div class="wrap sk-hero">
    <div>${imgBlock}</div>
    <div>
      <p class="sk-vendor">[ BRAND NAME ]</p>
      <h1>${title}</h1>
      <div class="sk-rating">★★★★★ <span>[ ~X avis ]</span></div>
      <div class="sk-price">${price}</div>
      <div class="sk-line"></div><div class="sk-line w80"></div><div class="sk-line w60"></div>
      <button class="sk-cta" style="margin-top:20px;">[ CTA — ADD TO CART ]</button>
    </div>
  </div>

  <div class="wrap sk-section">
    <h2 class="sk-h2">[ Section — Bénéfices produit ]</h2>
    <div class="sk-faq"><span>[ Bénéfice 1 — ~6-10 words ]</span><b>✓</b></div>
    <div class="sk-faq"><span>[ Bénéfice 2 — ~6-10 words ]</span><b>✓</b></div>
    <div class="sk-faq"><span>[ Bénéfice 3 — ~6-10 words ]</span><b>✓</b></div>
  </div>

  <div class="wrap sk-section">
    <h2 class="sk-h2">[ FAQ ]</h2>
    ${faqRows}
  </div>

  <div class="wrap">
    <button class="sk-cta">[ CTA — ADD TO CART ]</button>
  </div>

  <footer>
    <div class="foot">
      <div>
        <b>[ BRAND NAME ]</b>
        <p>[ Brand tagline — 1 sentence ~12-20 words about the mission. ]</p>
        <p>[ Street address — ~3-5 words ]</p>
        <p>[ City, State ZIP — ~3-5 words ]</p>
        <p>[ Country — ~1-2 words ]</p>
      </div>
      <div>
        <b>[ QUICK LINKS ]</b>
        <a>[ Link — Shop ]</a><a>[ Link — About Us ]</a>
        <a>[ Link — Contact ]</a><a>[ Link — Shipping ]</a><a>[ Link — Returns ]</a>
      </div>
      <div>
        <b>[ SUBSCRIBE TO OUR EMAILS ]</b>
        <p>[ Subscribe description — ~10-15 words about deals and offers. ]</p>
        <div class="sk-sub"><input placeholder="[ Email placeholder ]"><button>→</button></div>
      </div>
    </div>
    <div class="foot-bottom">
      <span>[ © Copyright — 6-10 words ]</span>
      <span>${payRow}</span>
    </div>
  </footer>
</body></html>`;
}

// (ancienne version stylée conservée pour référence)
function buildPreviewHtmlStyled(data, url) {
  const title = escapeHtmlGlobal(data.title || 'Produit cloné');
  const price = escapeHtmlGlobal(data.price || '—');
  const desc = escapeHtmlGlobal(data.description || 'Description.');
  const img = data.image || '';
  const source = escapeHtmlGlobal(data.source || '');

  const imgBlock = img
    ? `<img src="${img}" alt="${title}" class="p-img">`
    : `<div class="p-img placeholder"></div>`;

  return `<!DOCTYPE html>
<html lang="fr"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: -apple-system, Segoe UI, Roboto, sans-serif; color: #1a1a2e; line-height: 1.6; }
  .wrap { max-width: 1100px; margin: 0 auto; padding: 40px 24px; }
  .hero { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; align-items: center; }
  .p-img { width: 100%; border-radius: 16px; object-fit: cover; background: #f3f0ff; }
  .p-img.placeholder { aspect-ratio: 1; background: linear-gradient(135deg,#E8E4FF,#FDE8D8); }
  .vendor { text-transform: uppercase; letter-spacing: 1px; font-size: 13px; color: #6C63FF; font-weight: 700; }
  h1 { font-size: 34px; margin: 8px 0 12px; }
  .rating { color: #f5a623; font-weight: 600; margin-bottom: 14px; }
  .rating span { color: #888; font-weight: 400; }
  .price { font-size: 30px; font-weight: 800; margin-bottom: 16px; }
  .price s { color: #aaa; font-size: 20px; font-weight: 400; margin-left: 8px; }
  .desc { color: #444; margin-bottom: 24px; }
  .cart { width: 100%; background: #111; color: #fff; border: none; padding: 18px; border-radius: 10px;
          font-size: 16px; font-weight: 700; cursor: pointer; }
  .cart:hover { background: #000; }
  .stats { display: flex; gap: 30px; margin-top: 22px; }
  .stats div { text-align: center; }
  .stats strong { display: block; font-size: 18px; }
  .stats small { color: #888; font-size: 12px; }
  .section { padding: 50px 0; border-top: 1px solid #eee; }
  .section h2 { font-size: 26px; margin-bottom: 20px; text-align: center; }
  .feats { display: grid; grid-template-columns: repeat(3,1fr); gap: 20px; }
  .feat { background: #faf9ff; border-radius: 12px; padding: 22px; }
  .feat b { display: block; margin-bottom: 6px; }
  .cta-band { background: #f5a623; text-align: center; padding: 26px; border-radius: 12px;
              font-weight: 800; font-size: 20px; margin: 40px 0; }
  footer { background: #111; color: #bbb; padding: 40px 24px; font-size: 14px; }
  footer .wrap { display: grid; grid-template-columns: 2fr 1fr 1fr; gap: 30px; padding: 0; max-width: 1100px; }
  footer b { color: #fff; }
  .src-note { text-align: center; color: #aaa; font-size: 12px; padding: 14px; }
  @media(max-width: 760px){ .hero, .feats, footer .wrap { grid-template-columns: 1fr; } }
</style></head>
<body>
  <div class="wrap">
    <div class="hero">
      <div>${imgBlock}</div>
      <div>
        <p class="vendor">${source || 'Votre marque'}</p>
        <h1>${title}</h1>
        <div class="rating">★★★★★ <span>4.9 · 2 184 avis</span></div>
        <div class="price">${price} <s>${price && price !== '—' ? '' : ''}</s></div>
        <p class="desc">${desc}</p>
        <button class="cart">Ajouter au panier</button>
        <div class="stats">
          <div><strong>2,1 M+</strong><small>Unités vendues</small></div>
          <div><strong>4,9 ★</strong><small>Note moyenne</small></div>
          <div><strong>30 jours</strong><small>Remboursement</small></div>
        </div>
      </div>
    </div>
  </div>

  <div class="wrap section">
    <h2>Pourquoi vous allez l'adorer</h2>
    <div class="feats">
      <div class="feat"><b>✓ Qualité premium</b>Conçu pour durer, testé et approuvé.</div>
      <div class="feat"><b>✓ Résultats rapides</b>Des effets visibles en quelques semaines.</div>
      <div class="feat"><b>✓ Livraison gratuite</b>Pour toute commande, satisfait ou remboursé.</div>
    </div>
  </div>

  <div class="wrap">
    <div class="cta-band">Ajouter au panier — ${price}</div>
  </div>

  <footer>
    <div class="wrap">
      <div><b>${source || 'Votre marque'}</b><br>Une nouvelle référence dans sa catégorie, à votre image.</div>
      <div><b>Liens</b><br>Boutique<br>À propos<br>Contact</div>
      <div><b>Newsletter</b><br>Offres exclusives dans votre boîte mail.</div>
    </div>
  </footer>
  <p class="src-note">Page clonée depuis ${escapeHtmlGlobal(url)} · générée par Marque Blanche</p>
</body></html>`;
}

function buildLiquidGlobal(data, url) {
  const today = new Date().toISOString().slice(0, 10);
  return `{% comment %}
  Section générée par Marque Blanche
  Source : ${url}
  Titre  : ${data.title}
  Prix   : ${data.price}
  Image  : ${data.image || 'aucune'}
  Date   : ${today}
{% endcomment %}
{% section "wid-product-page" %}
<div class="wid-hero">
  <div class="wid-hero__media">{% if product.featured_image %}<img src="{{ product.featured_image | image_url: width: 800 }}" alt="{{ product.title | escape }}">{% endif %}</div>
  <div class="wid-hero__info">
    <p>{{ product.vendor }}</p>
    <h1>{{ product.title }}</h1>
    <div class="wid-hero__price"><strong>{{ product.price | money }}</strong></div>
    <div>{{ product.description }}</div>
    {% form 'product', product %}
      <input type="hidden" name="id" value="{{ product.selected_or_first_available_variant.id }}">
      <button type="submit">Ajouter au panier</button>
    {% endform %}
  </div>
</div>
{% schema %}
{ "name": "Marque Blanche — Produit", "presets": [{ "name": "Marque Blanche — Produit" }] }
{% endschema %}
{% endsection %}`;
}

function downloadTextFile(filename, text) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

// Affiche l'aperçu de la page clonée
function showClonePreview(data, url, domain, file) {
  const section = document.getElementById('cloneResult');
  if (!section) return;
  const slug = slugFromUrl(url);
  const html = buildPreviewHtml(data, url);

  document.getElementById('resultSlug').textContent = slug;
  document.getElementById('resultUrl').textContent = (data.source || domain || 'aperçu') + '/products/' + slug;

  const frame = document.getElementById('previewFrame');
  frame.srcdoc = html;

  section.classList.remove('hidden');
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // Boutons d'action
  document.getElementById('dlHtml').onclick = () =>
    downloadTextFile('page-' + slug + '.html', html);
  document.getElementById('dlLiquid').onclick = () =>
    downloadTextFile('wid-' + slug + '.liquid', buildLiquidGlobal(data, url));
  document.getElementById('openTab').onclick = () => {
    const w = window.open();
    w.document.write(html);
    w.document.close();
  };
  document.getElementById('resultAgain').onclick = () => {
    section.classList.add('hidden');
    if (typeof openCloneModal === 'function') openCloneModal();
  };
}
