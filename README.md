# Divulga.AI

Plataforma SaaS de Divulgação de Produtos com IA — Multi-Tenant.

## Stack

- **Backend**: NestJS + TypeScript + Prisma ORM
- **Banco**: PostgreSQL 16 + Redis (BullMQ)
- **Frontend**: Next.js + Tailwind CSS (em breve)
- **Infra**: Docker + Docker Compose

## Setup Local

### Pré-requisitos
- Node.js 20+
- Docker + Docker Compose
- npm ou yarn
- ffmpeg (para geração de vídeo)

### 1. Subir infra (PostgreSQL + Redis)

```bash
docker-compose up -d db redis
```

### 2. Instalar dependências do backend

```bash
cd backend
npm install
```

### 3. Configurar variáveis de ambiente

```bash
cp .env.example .env
# Edite o .env conforme necessário
```

### 4. Gerar chave de criptografia

```bash
# O .env.example já vem com uma chave de exemplo
# Para gerar uma nova chave:
openssl rand -hex 32
```

### 5. Rodar migrations e seed

```bash
npx prisma migrate dev --name init
npx prisma db seed
```

### 6. Habilitar RLS (após migrations)

```bash
psql -U divulga -d divulga_ai -f prisma/migrations/001_rls_policies.sql
```

### 7. Iniciar o backend

```bash
npm run start:dev
```

### 8. Iniciar o frontend (em outro terminal)

```bash
cd ../frontend
npm install
npm run dev
```

O frontend estará disponível em `http://localhost:3001`

## Credenciais Demo

- **Email**: admin@demo.com
- **Senha**: 123456
- **Tenant**: Loja Demo
- **Créditos iniciais**: 100

## Funcionalidades Implementadas

### ✅ Criptografia AES-256
- Credenciais de integrações criptografadas com AES-256-GCM
- Chave mestra via variável de ambiente `MASTER_ENCRYPTION_KEY`
- Formato: `iv:authTag:ciphertext` em base64

### ✅ Filas Assíncronas (BullMQ)
- Filas: `ai-image-generation`, `ai-video-generation`, `social-publish`
- Rate limiting por tenant (configurável por plano)
- Retries com backoff exponencial
- Dead-letter queue com audit logs

### ✅ Geração de Imagem com IA
- Provider: OpenAI DALL-E 3 (formato vertical 9:16)
- Interface abstraída para trocar de provedor
- Pipeline de composição com imagem original do produto

### ✅ Geração de Vídeo
- Provider: ffmpeg (slideshow de imagens + preço + CTA)
- Formato: MP4 vertical 1080x1920 (9:16)
- Duração configurável

### ✅ Facebook Graph API
- OAuth completo para conectar Página
- Token de longa duração (~60 dias)
- Publicação de fotos e vídeos na Página
- Modo assistido para canais sem integração oficial

## API - Endpoints Principais

### Auth
- `POST /api/v1/auth/register` — Cadastrar novo tenant + admin
- `POST /api/v1/auth/login` — Fazer login

### Catálogo
- `GET /api/v1/catalog` — Listar catálogos (próprios + parceiros)
- `GET /api/v1/catalog/products` — Listar produtos
- `POST /api/v1/catalog` — Criar catálogo próprio

### Produtos
- `GET /api/v1/products` — Listar produtos disponíveis
- `GET /api/v1/products/:id` — Buscar produto

### IA
- `POST /api/v1/ai/image/:productId` — Gerar imagem de anúncio
- `POST /api/v1/ai/video/:productId` — Gerar vídeo curto (9:16)
- `GET /api/v1/ai/status/:id` — Status da geração

### Campanhas
- `POST /api/v1/campaigns` — Criar campanha
- `GET /api/v1/campaigns` — Listar campanhas
- `GET /api/v1/campaigns/:id` — Buscar campanha

### Publicações
- `POST /api/v1/publications` — Publicar em canal
- `GET /api/v1/publications` — Listar publicações
- `GET /api/v1/publications/assisted/:campaignId` — Modo assistido

### Créditos
- `GET /api/v1/credits/balance` — Consultar saldo
- `GET /api/v1/credits/history` — Histórico
- `POST /api/v1/credits/recharge` — Recarregar (admin)

### Métricas
- `GET /api/v1/metrics/dashboard` — Dashboard consolidado
- `GET /api/v1/metrics/channels` — Métricas por canal

### Integrações
- `GET /api/v1/integrations` — Listar integrações
- `POST /api/v1/integrations/connect` — Conectar canal
- `DELETE /api/v1/integrations/:channel` — Desconectar

### Facebook
- `GET /api/v1/integrations/facebook/auth-url` — URL de autorização
- `POST /api/v1/integrations/facebook/callback` — Callback OAuth
- `GET /api/v1/integrations/facebook/status` — Status da integração
- `DELETE /api/v1/integrations/facebook/disconnect` — Desconectar

### Filas (Admin)
- `GET /api/v1/queue/status` — Status das filas
- `GET /api/v1/queue/job/:queueName/:jobId` — Status de um job

### Usuários
- `GET /api/v1/users` — Listar usuários do tenant
- `POST /api/v1/users` — Criar usuário (admin)

## Variáveis de Ambiente

| Variável | Descrição | Padrão |
|----------|-----------|--------|
| `DATABASE_URL` | URL do PostgreSQL | postgresql://... |
| `REDIS_HOST` | Host do Redis | localhost |
| `REDIS_PORT` | Porta do Redis | 6379 |
| `JWT_SECRET` | Segredo JWT | (obrigatório) |
| `MASTER_ENCRYPTION_KEY` | Chave AES-256 (64 hex chars) | (obrigatório) |
| `AI_PROVIDER` | Provedor de IA | openai |
| `OPENAI_API_KEY` | Chave API OpenAI | (opcional) |
| `FACEBOOK_APP_ID` | ID do app Facebook | (opcional) |
| `FACEBOOK_APP_SECRET` | Segredo do app Facebook | (opcional) |

## Limitações Conhecidas

- **Grupos Facebook**: A API oficial da Meta é restritiva para postagem em grupos de terceiros. O sistema oferece "modo assistido" como alternativa.
- **Instagram/TikTok**: Integrações ainda não implementadas (mock).
- **Geração de vídeo**: Usa ffmpeg para slideshow; geração por IA generativa completa será adicionada futuramente.

## Estrutura Multi-Tenant

- **Shared schema com `tenant_id`** em todas as tabelas
- **Row-Level Security (RLS)** no PostgreSQL
- **Middleware** que injeta `tenant_id` a partir do JWT
- **Isolamento** garantido em nível de banco e aplicação
- **Rate limiting** por tenant em todas as operações sensíveis

## Milestones

- [x] **M1**: Auth, multi-tenant base, usuários
- [x] **M2**: Catálogo de fornecedores parceiros e produtos
- [x] **M3**: Geração de conteúdo com IA
- [x] **M4**: Publicação multi-canal
- [x] **M5**: Dashboard, métricas e billing
- [x] **M6**: Frontend Next.js

## Frontend - Telas Implementadas

1. **Login/Cadastro** — Multi-tenant, criação de conta
2. **Dashboard** — Métricas consolidadas
3. **Catálogo** — Busca e seleção de produtos
4. **Geração IA** — Imagem e vídeo com status em tempo real
5. **Campanhas** — Criação com seleção de canais
6. **Publicações** — Lista com status e modo assistido
7. **Integrações** — Conexão Facebook OAuth
