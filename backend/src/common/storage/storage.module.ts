import { Module, Global } from '@nestjs/common';
import { LocalStorageService } from './local-storage.service';
import { S3StorageService } from './s3-storage.service';

/**
 * Seleciona o adapter de storage conforme variáveis de ambiente:
 * - Se STORAGE_ENDPOINT + STORAGE_BUCKET + STORAGE_ACCESS_KEY + STORAGE_SECRET_KEY
 *   estiverem definidos → usa S3StorageService (produção: R2, S3, Supabase, etc.)
 * - Caso contrário → usa LocalStorageService (desenvolvimento: disco local em ./uploads)
 *
 * Ambos implementam o mesmo contrato (getPublicUrl, saveFromUrl, saveBuffer).
 */
@Global()
@Module({
  providers: [
    LocalStorageService,
    {
      provide: 'STORAGE_SERVICE',
      useFactory: () => {
        const hasS3Config =
          process.env.STORAGE_ENDPOINT &&
          process.env.STORAGE_BUCKET &&
          process.env.STORAGE_ACCESS_KEY &&
          process.env.STORAGE_SECRET_KEY;

        if (hasS3Config) {
          return new S3StorageService();
        }
        return new LocalStorageService();
      },
    },
  ],
  exports: ['STORAGE_SERVICE'],
})
export class StorageModule {}