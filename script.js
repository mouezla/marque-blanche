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
      result.className = 'form-result success show';

      if (data && data.ok) {
        // Réponse réelle du backend
        result.innerHTML =
          '✅ <strong>Page analysée !</strong><br>' +
          'Source : ' + (data.source || domain) + '<br>' +
          '🏷️ Titre : ' + escapeHtml(data.title) + '<br>' +
          '💲 Prix : ' + escapeHtml(data.price) + '<br>' +
          (data.image ? '<img src="' + data.image + '" class="result-thumb" alt="produit">' : '') +
          (selectedFile ? '📎 Image locale : ' + escapeHtml(selectedFile.name) + '<br>' : '') +
          '<button type="button" class="download-btn" id="downloadBtn">⬇️ Télécharger le fichier .liquid</button>';
        lastData = data;
      } else {
        // Backend absent / erreur → repli sur simulation locale
        const reason = data && data.error ? data.error : 'serveur non démarré';
        result.innerHTML =
          '✅ <strong>Aperçu généré (mode hors-ligne)</strong><br>' +
          '<small style="opacity:.7">Analyse réelle indisponible : ' + escapeHtml(reason) + '</small><br>' +
          'Source : ' + domain + '<br>' +
          (selectedFile ? '📎 Image : ' + escapeHtml(selectedFile.name) + '<br>' : '') +
          '<button type="button" class="download-btn" id="downloadBtn">⬇️ Télécharger le fichier .liquid</button>';
        lastData = null;
      }

      generateBtn.disabled = false;
      generateBtn.textContent = 'Générer à nouveau';

      document.getElementById('downloadBtn').addEventListener('click', () => {
        downloadLiquid(domain, url, selectedFile, lastData);
      });
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
    const target = document.querySelector(this.getAttribute('href'));
    if (target) {
      e.preventDefault();
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
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
