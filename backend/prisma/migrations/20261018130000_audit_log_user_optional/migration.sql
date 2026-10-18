-- AlterTable
-- Ações disparadas pelo sistema (workers das filas) não têm usuário associado.
-- Mantém-se a coluna anulável para preservar o audit trail histórico.
ALTER TABLE "audit_logs" ALTER COLUMN "user_id" DROP NOT NULL;

-- AlterForeignKey
ALTER TABLE "audit_logs" DROP CONSTRAINT "audit_logs_user_id_fkey";
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
