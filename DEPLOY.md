# Deploy em Produção — Divulga.AI

Este guia cobre o deploy completo em:
- **Frontend**: Vercel (Next.js 14)
- **Backend**: Railway (Docker + NestJS + Bull + ffmpeg)
- **PostgreSQL**: Neon (serverless, branch-based)
- **Redis**: Railway Redis Add-on
- **Storage**: Cloudflare R2 (compatível S3, sem taxa de egress)

---

## 1. Pré-requisitos

- Conta no [GitHub](https://github.com)
- Conta no [Vercel](https://vercel.com) (conectada ao GitHub)
- Conta no [Railway](https://railway.app) (conectada ao GitHub)
- Conta no [Neon](https://neon.tech) (ou use o Postgres do Railway)
- Conta no [Cloudflare](https://cloudflare.com) para R2 (ou use Supabase Storage / AWS S3)

---

## 2. Preparar o repositório

```bash
# No seu terminal local
cd divulgai-ai
git init
git add .
git commit -m "chore: initial commit"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/divulga-ai.git
git push -u origin main
```

---

## 3. Neon — PostgreSQL

1. Acesse [console.neon.tech](https://console.neon.tech) → *Create Project*
2. Anote as **duas** connection strings:
   - **Pooled** (para a app): `postgresql://...pooler...` → `DATABASE_URL`
   - **Direta** (para migrations): `postgresql://...` (sem pooler) → `DIRECT_URL`
3. Habilite `sslmode=require` em ambas (padrão do Neon)

> ⚠️ O `DIRECT_URL` é **obrigatório** para `prisma migrate deploy` funcionar no boot do container.

---

## 4. Cloudflare R2 — Storage de mídia

1. No painel Cloudflare → **R2** → *Create bucket* → nome: `divulga-ai`
2. *Manage R2 API tokens* → *Create API token* → permissão **Object Read & Write**
3. Anote:
   - `STORAGE_ENDPOINT` = `https://<account-id>.r2.cloudflarestorage.com`
   - `STORAGE_BUCKET` = `divulga-ai`
   - `STORAGE_ACCESS_KEY` = token access key
   - `STORAGE_SECRET_KEY` = token secret key
4. (Opcional) *Custom Domain* no bucket → `cdn.seudominio.com` → `STORAGE_PUBLIC_URL`

---

## 5. Railway — Backend + Redis

### 5.1 Criar projeto

1. [railway.app](https://railway.app) → *New Project* → *Deploy from GitHub repo*
2. Selecione o repositório `divulga-ai`
3. O Railway detecta o `railway.toml` e usa o `backend/Dockerfile`

### 5.2 Adicionar Redis

1. No projeto → *New Service* → *Database* → *Redis*
2. O Railway cria as variáveis automaticamente:
   - `REDIS_HOST`, `REDIS_PORT`, `REDIS_PASSWORD`, `REDIS_TLS=true`

### 5.3 Variáveis de ambiente (Railway Variables)

No painel do serviço **backend** → *Variables* → *Raw Editor*, cole o conteúdo de `.env.production.example` **preenchido com seus valores reais**:

```bash
DATABASE_URL=postgresql://...
DIRECT_URL=postgresql://...
REDIS_HOST=redis.railway.internal
REDIS_PORT=6379
REDIS_PASSWORD=xxx
REDIS_TLS=true
JWT_SECRET=xxx (64 hex chars)
MASTER_ENCRYPTION_KEY=xxx (64 hex chars)
PUBLIC_BASE_URL=https://divulga-backend.railway.app
FRONTEND_URL=https://divulga-ai.vercel.app
CORS_ORIGIN=https://divulga-ai.vercel.app
FACEBOOK_APP_ID=xxx
FACEBOOK_APP_SECRET=xxx
FACEBOOK_REDIRECT_URI=https://divulga-backend.railway.app/api/v1/integrations/facebook/callback
OPENAI_API_KEY=sk-xxx
STORAGE_ENDPOINT=https://<account>.r2.cloudflarestorage.com
STORAGE_BUCKET=divulga-ai
STORAGE_ACCESS_KEY=xxx
STORAGE_SECRET_KEY=xxx
STORAGE_PUBLIC_URL=https://cdn.seudominio.com
AI_PROVIDER=openai
```

> ⚠️ **NUNCA** use os valores de exemplo (`dev-secret`, `0123456789abcdef...`) em produção. O backend **recusa iniciar** se detectar segredos inseguros.

### 5.4 Deploy

- Railway faz build automático no push para `main`
- Acompanhe logs: `railway logs -f`
- Healthcheck em `/docs` (Swagger) → deve retornar 200

---

## 6. Vercel — Frontend

### 6.1 Importar projeto

1. [vercel.com/new](https://vercel.com/new) → *Import Git Repository*
2. Selecione `divulga-ai`
3. **Root Directory**: `frontend` (crítico!)
4. Framework: Next.js (detectado automaticamente)

### 6.2 Variáveis de ambiente (Vercel Project Settings → Environment Variables)

| Nome | Valor | Ambiente |
|------|-------|----------|
| `NEXT_PUBLIC_API_URL` | `https://divulga-backend.railway.app` | Production, Preview, Development |

> O `vercel.json` já contém rewrites para `/api/*` e `/files/*` apontando para o backend.

### 6.3 Deploy

- Vercel faz build automático no push para `main`
- Domínio gerado: `https://divulga-ai.vercel.app` (ou seu domínio customizado)

---

## 7. Facebook OAuth — Configuração final

No [Facebook Developers](https://developers.facebook.com/apps):

1. Selecione seu App → *Facebook Login* → *Settings*
2. **Valid OAuth Redirect URIs**: adicione
   ```
   https://divulga-backend.railway.app/api/v1/integrations/facebook/callback
   ```
3. *App Review* → solicite permissões:
   - `pages_manage_posts`
   - `pages_read_engagement`
   - `pages_show_list`

---

## 8. Verificação pós-deploy

```bash
# 1. Healthcheck backend
curl https://divulga-backend.railway.app/docs

# 2. Login no frontend
# Acesse https://divulga-ai.vercel.app → login admin@demo.com / 123456

# 3. Teste geração de vídeo
# Dashboard → Geração IA → selecione produto → "Gerar vídeo"
# Deve aparecer MP4 1080x1920 servido via /files/videos/...

# 4. Teste publicação Facebook
# Integrações → Conectar Facebook → autoriza página
# Campanhas → criar campanha → botão "Publicar" no Facebook

# 5. Verificar storage
# No painel R2 → bucket divulga-ai → devem aparecer pastas images/ e videos/
```

---

## 9. Comandos úteis

```bash
# Logs do backend no Railway
railway logs -f

# Rodar migration manual (se necessário)
railway run npx prisma migrate deploy

# Seed manual
railway run npm run prisma:seed

# Shell no container
railway shell

# Variáveis de ambiente
railway variables
railway variables set KEY=VALUE
```

---

## 10. Troubleshooting

| Sintoma | Causa provável | Solução |
|---------|----------------|---------|
| Backend não sobe (exit code 1) | `JWT_SECRET` ou `MASTER_ENCRYPTION_KEY` inseguros | Gere novos com `openssl rand -hex 32` |
| Migration falha no boot | `DIRECT_URL` aponta para pooler | Use endpoint **direto** do Neon (sem `-pooler`) |
| Vídeo não aparece / 404 em `/files/*` | `STORAGE_*` não configurado ou bucket errado | Verifique R2; logs do worker mostram upload |
| CORS error no frontend | `CORS_ORIGIN` não inclui domínio Vercel | Adicione `https://seu-frontend.vercel.app` |
| Facebook OAuth 404 | `FACEBOOK_REDIRECT_URI` divergente | Deve ser **exatamente** a URL do backend + `/api/v1/integrations/facebook/callback` |
| Rate limit não funciona | Redis sem TLS / senha errada | `REDIS_TLS=true` e `REDIS_PASSWORD` do Railway Redis |
| `prisma migrate deploy` demora muito | Neon *cold start* (primeira conexão) | Normal na primeira vez; subsequent deploys são rápidos |

---

## 11. Estrutura de arquivos de deploy

```
divulga-ai/
├── railway.toml              # Config Railway (backend)
├── vercel.json               # Config Vercel (frontend)
├── .env.production.example   # Template de variáveis
├── backend/
│   ├── Dockerfile            # Imagem com ffmpeg + migrations no boot
│   ├── .dockerignore
│   └── .env.example          # Template local
├── frontend/
│   ├── next.config.js        # Rewrites via NEXT_PUBLIC_API_URL
│   └── .env.local            # Local (NEXT_PUBLIC_API_URL=http://localhost:4000)
└── docker-compose.yml        # Dev local (Postgres + Redis)
```

---

## 12. Atualizações futuras

- **Push para `main`** → Railway e Vercel fazem deploy automático
- **Migrations**: incluídas no `Dockerfile` (`prisma migrate deploy` no `CMD`)
- **Segredos**: gire periodicamente (`railway variables set JWT_SECRET=...`)

---

**Pronto!** 🚀 Seu Divulga.AI está em produção com arquitetura serverless-friendly, storage durável e isolamento multi-tenant real.