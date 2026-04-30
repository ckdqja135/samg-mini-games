import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  await prisma.game.upsert({
    where: { id: 'cloud-jump' },
    update: {},
    create: {
      id: 'cloud-jump',
      name: '구름 점프',
      description: '구름을 밟고 하늘 끝까지!',
      thumbnail: '/asset/thumbnails/cloud-jump.png',
      isActive: true,
    },
  });

  await prisma.game.upsert({
    where: { id: 'balloon-ride' },
    update: {},
    create: {
      id: 'balloon-ride',
      name: '풍선 타기',
      description: '풍선을 잡고 하늘로 떠올라요!',
      thumbnail: '/asset/thumbnails/balloon-ride.png',
      isActive: false,
    },
  });
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
