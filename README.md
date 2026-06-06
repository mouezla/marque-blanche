# Marque Blanche

Application qui clone une page produit concurrente et génère une section Shopify (`.liquid`).

## Fonctionnalités
- 🔗 Analyse réelle d'une URL concurrente (titre, prix, image, description)
- 🖼️ Aperçu miniature de l'image uploadée
- ⬇️ Export d'un vrai fichier `.liquid` téléchargeable
- 🛡️ Mode hors-ligne automatique si le backend est absent

## Lancer en local

```bash
pip install -r requirements.txt
python app.py
```
Puis ouvrir : http://127.0.0.1:5000

## Déploiement en ligne (Render.com — gratuit)

1. Créer un compte sur https://render.com
2. Mettre ce dossier sur GitHub (voir ci-dessous)
3. Sur Render : **New +** → **Web Service** → connecter le dépôt GitHub
4. Render détecte `render.yaml` automatiquement. Sinon :
   - **Build Command** : `pip install -r requirements.txt`
   - **Start Command** : `gunicorn app:app`
   - **Plan** : Free
5. Cliquer **Create Web Service** → l'URL publique est générée.

### Mettre le projet sur GitHub
```bash
git init
git add .
git commit -m "Marque Blanche"
git branch -M main
git remote add origin https://github.com/<votre-compte>/marque-blanche.git
git push -u origin main
```

## Fichiers
| Fichier | Rôle |
|---|---|
| `index.html` | Page web |
| `style.css` | Design |
| `script.js` | Interactions + appel backend |
| `app.py` | Serveur Flask (scraping) |
| `requirements.txt` | Dépendances Python |
| `render.yaml` / `Procfile` | Configuration de déploiement |
