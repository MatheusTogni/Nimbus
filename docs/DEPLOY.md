# Deploy do Nimbus em uma VPS Ubuntu

🇺🇸 [Read in English](DEPLOY.en.md)

Este guia instala o Nimbus de forma **nativa** (sem Docker) no Ubuntu 24.04:

```
Internet ──HTTPS──▶ Nginx ──┬── /            → /opt/nimbus/front/dist (build estático do Vue)
                            └── /api/*       → 127.0.0.1:3005 (NestJS, gerenciado pelo PM2)
                                                   │
                                                   ▼
                                              PostgreSQL 16 (localhost)
cron (diário) ──▶ node dist/scripts/reset-demo.js   (restaura a organização demo)
```

Domínio: **`nimbus.matheustogni.com.br`** · Porta da API (PM2): **`3005`**.

---

## 1. Pacotes do sistema

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl nginx postgresql

# Node.js 22 LTS
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node -v   # v22.x

# PM2 (gerenciador de processos)
sudo npm install -g pm2
```

## 2. Banco de dados

```bash
sudo -u postgres psql <<'SQL'
CREATE USER nimbus WITH PASSWORD 'troque-esta-senha';
CREATE DATABASE nimbus OWNER nimbus;
SQL
```

Por padrão o PostgreSQL só aceita conexões de localhost. Mantenha assim.

## 3. Código

```bash
sudo mkdir -p /opt/nimbus && sudo chown "$USER":"$USER" /opt/nimbus
git clone https://github.com/MatheusTogni/Nimbus.git /opt/nimbus
```

## 4. Configuração da API

```bash
cd /opt/nimbus/back
cp .env.example .env
node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"   # copie o resultado
nano .env
```

Defina pelo menos:

| Variável | Valor em produção |
| --- | --- |
| `NODE_ENV` | `production` (isso também deixa o cookie de refresh `Secure`, então **HTTPS é obrigatório**) |
| `PORT` | `3005` (o Nginx faz proxy para ela) |
| `CORS_ORIGIN` | vazio: front e API ficam no mesmo domínio |
| `DATABASE_URL` | `postgresql://nimbus:troque-esta-senha@localhost:5432/nimbus?schema=public` |
| `JWT_ACCESS_SECRET` | o texto aleatório gerado acima |
| `DEMO_EMAIL` / `DEMO_PASSWORD` | credenciais exibidas na tela de login |
| `ADMIN_*` | opcional: sua conta de administrador real, criada pelo seed |

## 5. Build da API e seed do banco

```bash
cd /opt/nimbus/back
npm ci
npx prisma migrate deploy
npm run build
npm run db:seed        # cria a organização demo (+ seu admin, se ADMIN_* estiver definido)
```

## 6. Rodar a API com o PM2

```bash
pm2 start /opt/nimbus/deploy/ecosystem.config.cjs
pm2 save
pm2 startup            # rode o comando que ele imprimir, para a API subir junto com o servidor
curl http://127.0.0.1:3005/api/health
```

## 7. Build do front

```bash
cd /opt/nimbus/front
npm ci
npm run build-only     # gera /opt/nimbus/front/dist
```

## 8. Nginx

```bash
sudo cp /opt/nimbus/deploy/nginx.conf.example /etc/nginx/sites-available/nimbus
sudo ln -s /etc/nginx/sites-available/nimbus /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

O Nginx (`www-data`) precisa conseguir ler `/opt/nimbus/front/dist`. As permissões padrão `755` bastam.

## 9. HTTPS com Let's Encrypt

Primeiro aponte um registro `A` de `nimbus.matheustogni.com.br` para o IP da VPS. Depois:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d nimbus.matheustogni.com.br --redirect
```

O certbot renova o certificado sozinho (`systemctl list-timers | grep certbot`).

## 10. Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
```

A porta 3005 nunca fica exposta: a API só escuta em `127.0.0.1`.

## 11. Reset diário do demo (cron)

```bash
sudo mkdir -p /var/log/nimbus && sudo chown "$USER":"$USER" /var/log/nimbus
timedatectl | grep "Time zone"     # em VPS normalmente é Etc/UTC
crontab -e
```

Adicione a linha de [`deploy/crontab.example`](../deploy/crontab.example). Com o servidor em UTC, 03:00 de Brasília são 06:00 UTC:

```
0 6 * * * cd /opt/nimbus/back && /usr/bin/node dist/scripts/reset-demo.js >> /var/log/nimbus/reset-demo.log 2>&1
```

Teste uma vez manualmente:

```bash
cd /opt/nimbus/back && node dist/scripts/reset-demo.js
```

O reset apaga e recria **apenas** a organização marcada com `isDemo`. Organizações reais nunca são tocadas.

## 12. Atualizações

```bash
bash /opt/nimbus/deploy/deploy.sh
```

O script faz o pull, instala dependências, aplica as migrations, gera o build das duas aplicações e recarrega o PM2. Os arquivos estáticos continuam no ar durante a atualização.

## Solução de problemas

| Sintoma | O que verificar |
| --- | --- |
| 502 Bad Gateway | `pm2 logs nimbus-api`, `curl 127.0.0.1:3005/api/health` |
| Login cai a cada recarregamento | o site precisa estar em **HTTPS** (em produção o cookie de refresh é `Secure`) |
| Botão do demo desativado | rode `npm run db:seed` (a organização demo não existe) |
| Reset não roda | `grep CRON /var/log/syslog`, `cat /var/log/nimbus/reset-demo.log` |

### Opcional: backup diário do banco

```bash
# crontab -e
30 5 * * * pg_dump -U nimbus -h localhost nimbus | gzip > /var/backups/nimbus-$(date +\%F).sql.gz
```

(Guarde a senha em `~/.pgpass` com `chmod 600`.)
