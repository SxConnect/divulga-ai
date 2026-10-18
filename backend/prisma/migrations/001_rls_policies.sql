-- ============================================================
-- Row-Level Security (RLS) — DEFESA EM PROFUNDIDADE OPCIONAL
-- ============================================================
--
-- LEIA ANTES DE EXECUTAR
--
-- 1. Hoje o isolamento multi-tenant JÁ É garantido na camada de aplicação:
--    todos os services filtram por `tenant_id` extraído do JWT.
--
-- 2. Este script é OPCIONAL e só produz efeito com uma role dedicada
--    (não-owner), porque o PostgreSQL NÃO aplica RLS ao dono das tabelas.
--    A aplicação precisa, além disso, executar
--        SET LOCAL app.current_tenant_id = '<tenant-uuid>';
--    dentro da mesma transação de cada query (via Prisma `$transaction`).
--
-- 3. ATENÇÃO: se você executar este script e a aplicação continuar conectando
--    com uma role não-owner SEM executar o SET acima, TODAS as consultas
--    retornarão vazio. Por isso o script não é aplicado automaticamente pelas
--    migrations.
--
-- Pré-requisitos para ativar de verdade:
--   CREATE ROLE divulga_app LOGIN PASSWORD '<senha-forte>';
--   GRANT CONNECT ON DATABASE divulga_ai TO divulga_app;
--   GRANT USAGE ON SCHEMA public TO divulga_app;
--   GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO divulga_app;
--   DATABASE_URL=postgresql://divulga_app:<senha>@localhost:5435/divulga_ai
--
-- Uso: psql "$DATABASE_URL" -f prisma/migrations/001_rls_policies.sql
-- ============================================================

-- Função para obter o tenant_id da sessão atual
CREATE OR REPLACE FUNCTION current_tenant_id()
RETURNS TEXT AS $$
  SELECT current_setting('app.current_tenant_id', true);
$$ LANGUAGE sql STABLE;

-- Habilitar RLS em todas as tabelas de domínio
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_catalogs ENABLE ROW LEVEL SECURITY;
ALTER TABLE integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE publications ENABLE ROW LEVEL SECURITY;
ALTER TABLE credit_ledger ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;

-- Políticas: cada tenant só vê seus próprios dados
-- (DROP IF EXISTS + CREATE = script idempotente, pode ser reexecutado)
DROP POLICY IF EXISTS tenant_isolation_users ON users;
CREATE POLICY tenant_isolation_users ON users
  USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_products ON products;
CREATE POLICY tenant_isolation_products ON products
  USING (tenant_id = current_tenant_id() OR tenant_id IS NULL);

DROP POLICY IF EXISTS tenant_isolation_supplier_catalogs ON supplier_catalogs;
CREATE POLICY tenant_isolation_supplier_catalogs ON supplier_catalogs
  USING (tenant_id = current_tenant_id() OR tenant_id IS NULL OR type = 'partner_global');

DROP POLICY IF EXISTS tenant_isolation_integrations ON integrations;
CREATE POLICY tenant_isolation_integrations ON integrations
  USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_ai_generations ON ai_generations;
CREATE POLICY tenant_isolation_ai_generations ON ai_generations
  USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_campaigns ON campaigns;
CREATE POLICY tenant_isolation_campaigns ON campaigns
  USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_publications ON publications;
CREATE POLICY tenant_isolation_publications ON publications
  USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_credit_ledger ON credit_ledger;
CREATE POLICY tenant_isolation_credit_ledger ON credit_ledger
  USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_audit_logs ON audit_logs;
CREATE POLICY tenant_isolation_audit_logs ON audit_logs
  USING (tenant_id = current_tenant_id());

DROP POLICY IF EXISTS tenant_isolation_tenants ON tenants;
CREATE POLICY tenant_isolation_tenants ON tenants
  USING (id = current_tenant_id());

-- ============================================================
-- Como usar: antes de cada query, setar o tenant_id na sessão
-- SET LOCAL app.current_tenant_id = '<tenant-uuid>';
-- ============================================================
