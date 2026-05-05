import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GAMES = [
  {
    id: 'cloud-jump',
    name: '포실핑의 구름 점프',
    description: '포실포실 구름을 밟고 하늘 끝까지!',
    thumbnail: '/asset/thumbnails/cloud-jump.png',
  },
  {
    id: 'balloon-ride',
    name: '방글핑의 풍선 여행',
    description: '풍선을 띄워 구름 사이를 통과해요!',
    thumbnail: '/asset/thumbnails/balloon-ride.png',
  },
  {
    id: 'water-dodge',
    name: '꽁꽁핑의 물줄기 피하기',
    description: '쏟아지는 물줄기를 좌우로 피해보세요!',
    thumbnail: '/asset/thumbnails/water-dodge.png',
  },
  {
    id: 'cake-catch',
    name: '달콤핑의 디저트 파티',
    description: '떨어지는 디저트를 받고 폭탄은 피해요!',
    thumbnail: '/asset/thumbnails/cake-catch.png',
  },
  {
    id: 'balloon-pop',
    name: '톡파핑의 풍선 펑펑',
    description: '다가오는 풍선을 별로 펑펑 터뜨려요!',
    thumbnail: '/asset/thumbnails/balloon-pop.png',
  },
  {
    id: 'star-ladder',
    name: '샤샤핑의 별빛 사다리',
    description: '사다리를 오르며 별을 모으고 운석을 피해요!',
    thumbnail: '/asset/thumbnails/star-ladder.png',
  },
  {
    id: 'fruit-river',
    name: '새콤핑의 과일 강물',
    description: '강물을 따라 흐르며 과일 캐치 + 바위 회피!',
    thumbnail: '/asset/thumbnails/fruit-river.png',
  },
];

async function main() {
  for (const g of GAMES) {
    await prisma.game.upsert({
      where: { id: g.id },
      update: {
        name: g.name,
        description: g.description,
        thumbnail: g.thumbnail,
        isActive: true,
      },
      create: {
        ...g,
        isActive: true,
      },
    });
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
