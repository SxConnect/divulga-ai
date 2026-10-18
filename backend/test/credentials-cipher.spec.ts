import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { CredentialsCipherService } from '../src/common/services/credentials-cipher.service';

describe('CredentialsCipherService', () => {
  let service: CredentialsCipherService;
  const testTenantId = 'tenant-123-uuid';

  beforeAll(() => {
    // Gerar chave de teste de 32 bytes em hex
    process.env.MASTER_ENCRYPTION_KEY = '0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef';
  });

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CredentialsCipherService,
        { provide: ConfigService, useValue: { get: (key: string) => process.env[key] } },
      ],
    }).compile();

    service = module.get<CredentialsCipherService>(CredentialsCipherService);
  });

  it('deve criptografar e descriptografar corretamente', () => {
    const plaintext = 'page_access_token_abc123_xyz';

    const encrypted = service.encrypt(plaintext, testTenantId);

    // Deve estar criptografado (formato iv:tag:ciphertext)
    expect(encrypted).not.toBe(plaintext);
    expect(encrypted.split(':').length).toBe(3);

    const decrypted = service.decrypt(encrypted, testTenantId);
    expect(decrypted).toBe(plaintext);
  });

  it('deve detectar texto criptografado', () => {
    const encrypted = service.encrypt('test', testTenantId);
    expect(service.isEncrypted(encrypted)).toBe(true);
    expect(service.isEncrypted('plain-text-value')).toBe(false);
    expect(service.isEncrypted('only:two')).toBe(false);
  });

  it('deve falhar ao descriptografar com tenant_id diferente', () => {
    const encrypted = service.encrypt('secret', testTenantId);

    expect(() => {
      service.decrypt(encrypted, 'tenant-diferente');
    }).toThrow();
  });

  it('deve gerar IV aleatório (dois encrypts do mesmo texto produzem ciphertexts diferentes)', () => {
    const enc1 = service.encrypt('mesmo-texto', testTenantId);
    const enc2 = service.encrypt('mesmo-texto', testTenantId);

    expect(enc1).not.toBe(enc2);
    // Mas ambos descriptografam para o mesmo valor
    expect(service.decrypt(enc1, testTenantId)).toBe('mesmo-texto');
    expect(service.decrypt(enc2, testTenantId)).toBe('mesmo-texto');
  });
});
