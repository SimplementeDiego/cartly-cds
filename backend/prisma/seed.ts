import { PrismaClient, Role } from '@prisma/client';
import * as argon2 from 'argon2';
import { catalogCategories, catalogProducts } from './catalog-data';
import { seedProductImages } from './seed-product-images';

const prisma = new PrismaClient();

async function main() {
  const adminPasswordHash = await argon2.hash('Admin123!', { type: argon2.argon2id });
  const customerPasswordHash = await argon2.hash('Customer123!', {
    type: argon2.argon2id,
  });

  await prisma.user.upsert({
    where: { email: 'admin@cartly.local' },
    update: { role: Role.ADMIN },
    create: {
      email: 'admin@cartly.local',
      displayName: 'Administración Cartly',
      passwordHash: adminPasswordHash,
      role: Role.ADMIN,
    },
  });

  await prisma.user.upsert({
    where: { email: 'customer@cartly.local' },
    update: {},
    create: {
      email: 'customer@cartly.local',
      displayName: 'Cliente Cartly',
      passwordHash: customerPasswordHash,
      role: Role.CUSTOMER,
    },
  });

  for (const category of catalogCategories) {
    await prisma.category.upsert({
      where: { id: category.id },
      update: {},
      create: category,
    });
  }

  for (const product of catalogProducts) {
    await prisma.product.upsert({
      where: { id: product.id },
      update: {},
      create: product,
    });
  }

  await seedProductImages(prisma);

}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
