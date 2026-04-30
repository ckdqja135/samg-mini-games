import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const GAMES = [
  {
    id: 'cloud-jump',
    name: '구름 점프',
    description: '구름을 밟고 하늘 끝까지!',
    thumbnail: '/asset/thumbnails/cloud-jump.png',
  },
  {
    id: 'balloon-ride',
    name: '풍선 타기',
    description: '풍선을 띄워 구름 사이를 통과해요!',
    thumbnail: '/asset/thumbnails/balloon-ride.png',
  },
  {
    id: 'water-dodge',
    name: '풍뿌리기 피하기',
    description: '쏟아지는 물줄기를 점프로 피해보세요!',
    thumbnail: '/asset/thumbnails/water-dodge.png',
  },
  {
    id: 'cake-catch',
    name: '케이크 캐치',
    description: '떨어지는 디저트를 받고 폭탄은 피해요!',
    thumbnail: '/asset/thumbnails/cake-catch.png',
  },
  {
    id: 'balloon-pop',
    name: '하늘 풍선 펑',
    description: '다가오는 풍선을 별로 펑펑 터뜨려요!',
    thumbnail: '/asset/thumbnails/balloon-pop.png',
  },
  {
    id: 'star-ladder',
    name: '별빛 사다리',
    description: '사다리를 오르며 별을 모으고 운석을 피해요!',
    thumbnail: '/asset/thumbnails/star-ladder.png',
  },
  {
    id: 'fruit-river',
    name: '과일 흐름타기',
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
