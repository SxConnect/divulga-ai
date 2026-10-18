import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

// Imagens de exemplo reais e estáveis (o seed antigo usava example.com, que
// quebrava o <img> do catálogo e derrubava a geração de vídeo no ffmpeg).
const img = (seed: string, size = '1080/1920') =>
  `https://picsum.photos/seed/${seed}/${size}`;

async function main() {
  console.log('🌱 Seeding database...');

  // Idempotência: rodar o seed mais de uma vez não duplica dados
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@demo.com' },
  });

  if (existingAdmin) {
    console.log('ℹ️  Seed já aplicado anteriormente (admin@demo.com existe). Nada a fazer.');
    return;
  }

  // Criar catálogo global de parceiros
  const partnerCatalog = await prisma.supplierCatalog.create({
    data: {
      name: 'Fornecedor Parceiro - Eletrônicos',
      type: 'partner_global',
    },
  });

  // Criar produtos de exemplo no catálogo parceiro
  const products = [
    {
      supplierCatalogId: partnerCatalog.id,
      name: 'Fone de Ouvido Bluetooth Pro',
      price: 89.90,
      originalImages: [img('fone1'), img('fone2')],
      category: 'Eletrônicos',
      metadata: { brand: 'TechSound', rating: 4.5 },
    },
    {
      supplierCatalogId: partnerCatalog.id,
      name: 'Capa Silicone Premium iPhone 15',
      price: 39.90,
      originalImages: [img('capa1')],
      category: 'Acessórios',
      metadata: { compatible: 'iPhone 15', material: 'Silicone' },
    },
    {
      supplierCatalogId: partnerCatalog.id,
      name: 'Carregador Turbo 65W USB-C',
      price: 129.90,
      originalImages: [img('carregador1'), img('carregador2')],
      category: 'Eletrônicos',
      metadata: { power: '65W', ports: 2 },
    },
    {
      supplierCatalogId: partnerCatalog.id,
      name: 'Mouse Ergonômico Wireless',
      price: 79.90,
      originalImages: [img('mouse1')],
      category: 'Periféricos',
      metadata: { dpi: 1600, wireless: true },
    },
    {
      supplierCatalogId: partnerCatalog.id,
      name: 'WebHD 1080p com Microfone',
      price: 199.90,
      originalImages: [img('webcam1')],
      category: 'Periféricos',
      metadata: { resolution: '1080p', microphone: true },
    },
  ];

  for (const product of products) {
    await prisma.product.create({ data: product });
  }

  // Criar tenant demo
  const tenant = await prisma.tenant.create({
    data: {
      name: 'Loja Demo',
      plan: 'starter',
      planLimits: {
        maxGenerations: 50,
        maxPublications: 100,
        maxUsers: 3,
      },
    },
  });

  // Criar usuário admin demo
  const passwordHash = await bcrypt.hash('123456', 10);
  await prisma.user.create({
    data: {
      tenantId: tenant.id,
      name: 'Admin Demo',
      email: 'admin@demo.com',
      passwordHash,
      role: 'admin',
    },
  });

  // Dar créditos iniciais
  await prisma.creditLedger.create({
    data: {
      tenantId: tenant.id,
      type: 'recharge',
      quantity: 100,
      reference: 'Créditos iniciais do plano Starter',
    },
  });

  console.log('✅ Seed completed!');
  console.log('   Tenant: Loja Demo');
  console.log('   Email: admin@demo.com');
  console.log('   Senha: 123456');
  console.log('   Créditos: 100');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
