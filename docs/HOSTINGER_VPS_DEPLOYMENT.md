# Hostinger VPS Deployment (PM2 + Nginx)

This setup serves Pillow AI at `https://pillowai.devnook.xyz` with:
- Next.js running on `127.0.0.1:3001` via PM2
- Nginx reverse proxy on ports `80/443`
- TLS certificate from Let's Encrypt

## 1. Install runtime packages

```bash
sudo apt update
sudo apt install -y nginx certbot python3-certbot-nginx
npm install -g pm2
```

## 2. Build and start the app

Run from project directory (`/root/pillow_ai`):

```bash
npm install
npm run build
pm2 start deploy/pm2/ecosystem.config.js
pm2 save
pm2 startup systemd -u root --hp /root
```

## 3. Configure environment variables

Create `.env.local` and set production values:

```env
NEXT_PUBLIC_SUPABASE_URL=...
NEXT_PUBLIC_SUPABASE_ANON_KEY=...
SUPABASE_SERVICE_ROLE_KEY=...
RETELL_API_KEY=...
NEXT_PUBLIC_APP_URL=https://pillowai.devnook.xyz
NEXT_PUBLIC_APP_NAME=Pillow AI
```

Then restart PM2:

```bash
pm2 restart pillow-ai --update-env
```

## 4. Install Nginx site config

```bash
sudo cp deploy/nginx/pillowai.devnook.xyz.conf /etc/nginx/sites-available/pillowai.devnook.xyz
sudo ln -sf /etc/nginx/sites-available/pillowai.devnook.xyz /etc/nginx/sites-enabled/pillowai.devnook.xyz
sudo nginx -t
sudo systemctl reload nginx
```

## 5. Issue TLS certificate

```bash
sudo certbot --nginx -d pillowai.devnook.xyz
```

Certbot updates SSL directives and auto-renew timer.

## 6. DNS check

In GoDaddy:
- Type: `A`
- Name/Host: `pill` or `pillowai` (must match the subdomain you actually use)
- Value: `72.61.8.192`
- TTL: default

If the desired URL is `pillowai.devnook.xyz`, the host should be `pillowai`.

## 7. Health checks

```bash
curl -I http://127.0.0.1:3001
curl -I https://pillowai.devnook.xyz
pm2 status
sudo systemctl status nginx
```
