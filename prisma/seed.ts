import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Stores
  const store1 = await prisma.store.upsert({
    where: { externalId: 'store-pizzaria-bella' },
    update: {},
    create: {
      externalId: 'store-pizzaria-bella',
      name: 'Pizzaria Bella Napoli',
      zipCode: '01310-100',
      address: 'Av. Paulista, 1000 - Bela Vista, São Paulo',
      lat: -23.5613,
      lng: -46.6560,
    },
  });

  const store2 = await prisma.store.upsert({
    where: { externalId: 'store-burger-house' },
    update: {},
    create: {
      externalId: 'store-burger-house',
      name: 'Burger House',
      zipCode: '01310-200',
      address: 'Rua Augusta, 500 - Consolação, São Paulo',
      lat: -23.5530,
      lng: -46.6580,
    },
  });

  // Clients
  const client1 = await prisma.client.upsert({
    where: { externalId: 'client-joao' },
    update: {},
    create: {
      externalId: 'client-joao',
      name: 'João Silva',
      phone: '11999990001',
      zipCode: '01310-300',
      address: 'Rua Haddock Lobo, 200 - Cerqueira César, São Paulo',
      lat: -23.5580,
      lng: -46.6620,
    },
  });

  const client2 = await prisma.client.upsert({
    where: { externalId: 'client-maria' },
    update: {},
    create: {
      externalId: 'client-maria',
      name: 'Maria Oliveira',
      phone: '11999990002',
      zipCode: '01320-100',
      address: 'Alameda Santos, 1500 - Jardim Paulista, São Paulo',
      lat: -23.5620,
      lng: -46.6540,
    },
  });

  // Couriers
  const courier1 = await prisma.courier.upsert({
    where: { externalId: 'courier-pedro' },
    update: {},
    create: {
      externalId: 'courier-pedro',
      name: 'Pedro Entregador',
      phone: '11988880001',
      vehicleType: 'MOTORCYCLE',
      isActive: true,
      isAvailable: true,
      currentLat: -23.5590,
      currentLng: -46.6570,
    },
  });

  const courier2 = await prisma.courier.upsert({
    where: { externalId: 'courier-ana' },
    update: {},
    create: {
      externalId: 'courier-ana',
      name: 'Ana Ciclista',
      phone: '11988880002',
      vehicleType: 'BICYCLE',
      isActive: true,
      isAvailable: true,
      currentLat: -23.5570,
      currentLng: -46.6600,
    },
  });

  console.log('✅ Seed complete:');
  console.log(`   Stores: ${store1.name}, ${store2.name}`);
  console.log(`   Clients: ${client1.name}, ${client2.name}`);
  console.log(`   Couriers: ${courier1.name}, ${courier2.name}`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
