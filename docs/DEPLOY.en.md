# Deploying Nimbus on an Ubuntu VPS

🇧🇷 [Leia em português](DEPLOY.md)

This guide installs Nimbus **natively** (no Docker) on Ubuntu 24.04:

```
Internet ──HTTPS──▶ Nginx ──┬── /            → /opt/nimbus/front/dist (static Vue build)
                            └── /api/*       → 127.0.0.1:3005 (NestJS, managed by PM2)
                                                   │
                                                   ▼
                                              PostgreSQL 16 (localhost)
cron (daily) ──▶ node dist/scripts/reset-demo.js   (restores the demo organization)
```

Domain: **`nimbus.matheustogni.com.br`** · API port (PM2): **`3005`**.

---

## 1. System packages

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl nginx postgresql

# Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v22.x

# PM2 (process manager)
sudo npm install -g pm2
```

## 2. Database

```bash
sudo -u postgres psql <<'SQL'
CREATE USER nimbus WITH PASSWORD 'change-this-password';
CREATE DATABASE nimbus OWNER nimbus;
SQL
```

PostgreSQL only listens on localhost by default. Keep it that way.

## 3. Code

```bash
sudo mkdir -p /opt/nimbus && sudo chown "$USER":"$USER" /opt/nimbus
git clone https://github.com/MatheusTogni/Nimbus.git /opt/nimbus
```

## 4. API configuration

```bash
cd /opt/nimbus/back
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # copy the output
nano .env
```

Set at least:

| Variable | Production value |
| --- | --- |
| `NODE_ENV` | `production` (also makes the refresh cookie `Secure`, so **HTTPS is required**) |
| `PORT` | `3005` (Nginx proxies to it) |
| `CORS_ORIGIN` | empty: front and API share the same domain |
| `DATABASE_URL` | `postgresql://nimbus:change-this-password@localhost:5432/nimbus?schema=public` |
| `JWT_ACCESS_SECRET` | the random string generated above |
| `DEMO_EMAIL` / `DEMO_PASSWORD` | credentials shown on the login page |
| `ADMIN_*` | optional: your own real admin account, created by the seed |

## 5. Build the API and seed the database

```bash
cd /opt/nimbus/back
npm ci
npx prisma migrate deploy
npm run build
npm run db:seed        # creates the demo organization (+ your admin if ADMIN_* is set)
```

## 6. Run the API with PM2

```bash
pm2 start /opt/nimbus/deploy/ecosystem.config.cjs
pm2 save
pm2 startup            # run the command it prints, so the API starts on boot
curl http://127.0.0.1:3005/api/health
```

## 7. Build the web app

```bash
cd /opt/nimbus/front
npm ci
npm run build-only     # outputs /opt/nimbus/front/dist
```

## 8. Nginx

```bash
sudo cp /opt/nimbus/deploy/nginx.conf.example /etc/nginx/sites-available/nimbus
sudo ln -s /etc/nginx/sites-available/nimbus /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

Nginx (`www-data`) must be able to read `/opt/nimbus/front/dist`. The default `755` permissions are enough.

## 9. HTTPS with Let's Encrypt

Point an `A` record for `nimbus.matheustogni.com.br` to the VPS IP first, then:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d nimbus.matheustogni.com.br --redirect
```

Certbot renews automatically (`systemctl list-timers | grep certbot`).

## 10. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

Port 3005 is never exposed: the API listens on `127.0.0.1` only.

## 11. Daily demo reset (cron)

```bash
sudo mkdir -p /var/log/nimbus && sudo chown "$USER":"$USER" /var/log/nimbus
timedatectl | grep "Time zone"     # usually Etc/UTC on a VPS
crontab -e
```

Add the line from [`deploy/crontab.example`](../deploy/crontab.example). With the server in UTC, 03:00 in Brasília is 06:00 UTC:

```
0 6 * * * cd /opt/nimbus/back && /usr/bin/node dist/scripts/reset-demo.js >> /var/log/nimbus/reset-demo.log 2>&1
```

Test it once by hand:

```bash
cd /opt/nimbus/back && node dist/scripts/reset-demo.js
```

The reset deletes and recreates **only** the organization flagged `isDemo`. Real organizations are never touched.

## 12. Updating

```bash
bash /opt/nimbus/deploy/deploy.sh
```

The script pulls, installs, migrates, builds both apps and reloads PM2 with no downtime for the static files.

## Troubleshooting

| Symptom | Check |
| --- | --- |
| 502 Bad Gateway | `pm2 logs nimbus-api`, `curl 127.0.0.1:3005/api/health` |
| Logged out on every reload | the site must be served over **HTTPS** (the refresh cookie is `Secure` in production) |
| Demo button disabled | run `npm run db:seed` (the demo organization does not exist) |
| Reset not running | `grep CRON /var/log/syslog`, `cat /var/log/nimbus/reset-demo.log` |

### Optional: daily database backup

```bash
# crontab -e
30 5 * * * pg_dump -U nimbus -h localhost nimbus | gzip > /var/backups/nimbus-$(date +\%F).sql.gz
```

(Store the password in `~/.pgpass` with `chmod 600`.)
