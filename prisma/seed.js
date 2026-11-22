// 테스트용 초기 데이터: 플레이어 14명 + 경기 9개(완료 8, 진행중 1)
// 실행: npm run db:seed   ※ 기존 데이터를 모두 지우고 다시 넣는다 (로컬 전용)
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { balance } = require('../src/services/balance');
const { STATUS, WIN_DELTA } = require('../src/constants');

const prisma = new PrismaClient();

const PLAYERS = [
  ['페이커아님', 'KR1', 'DIAMOND', 2, 'MID', 'TOP'],
  ['정글차이', 'KR1', 'EMERALD', 1, 'JUNGLE', 'TOP'],
  ['원딜은왕이다', 'KR2', 'PLATINUM', 3, 'ADC', 'MID'],
  ['서폿장인', 'KR1', 'GOLD', 1, 'SUPPORT', 'JUNGLE'],
  ['탑솔로킬', 'KR1', 'PLATINUM', 1, 'TOP', 'JUNGLE'],
  ['미드갱가요', 'KR3', 'GOLD', 3, 'MID', 'SUPPORT'],
  ['브론즈탈출', 'KR1', 'BRONZE', 1, 'ADC', 'SUPPORT'],
  ['실버의품격', 'KR1', 'SILVER', 2, 'TOP', 'MID'],
  ['와드박는사람', 'KR1', 'SILVER', 4, 'SUPPORT', 'ADC'],
  ['갱킹마스터', 'KR1', 'GOLD', 2, 'JUNGLE', 'MID'],
  ['챌린저지망생', 'KR1', 'MASTER', 1, 'MID', 'ADC'],
  ['아이언하트', 'KR1', 'IRON', 2, 'SUPPORT', 'TOP'],
  ['라인전최강', 'KR4', 'EMERALD', 4, 'TOP', 'ADC'],
  ['한타의신', 'KR1', 'GOLD', 4, 'ADC', 'JUNGLE'],
];

// 실행할 때마다 같은 결과가 나오도록 고정 시드 난수 (mulberry32)
function rng(seed) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

async function main() {
  const rand = rng(20261122);
  const DAY = 86400000;
  const now = Date.now();

  await prisma.matchPlayer.deleteMany();
  await prisma.match.deleteMany();
  await prisma.player.deleteMany();

  for (const [summonerName, tagLine, tier, division, mainPosition, subPosition] of PLAYERS) {
    await prisma.player.create({
      data: { summonerName, tagLine, tier, division: tier === 'MASTER' ? 1 : division, mainPosition, subPosition },
    });
  }

  for (let m = 0; m < 9; m++) {
    const all = await prisma.player.findMany({ orderBy: { id: 'asc' } }); // 최신 점수 반영
    const pool = all.slice().sort(() => rand() - 0.5).slice(0, 10);
    const result = balance(pool);
    const finished = m < 8;
    const winnerTeam = finished ? (rand() < 0.5 ? 'BLUE' : 'RED') : null;

    const rows = [
      ...result.blue.players.map((p) => ({ playerId: p.id, team: 'BLUE', position: p.position })),
      ...result.red.players.map((p) => ({ playerId: p.id, team: 'RED', position: p.position })),
    ].map((r) => ({ ...r, scoreDelta: finished ? (r.team === winnerTeam ? WIN_DELTA : -WIN_DELTA) : 0 }));

    await prisma.$transaction([
      prisma.match.create({
        data: {
          playedAt: new Date(now - (9 - m) * 2 * DAY + 20 * 3600000),
          status: finished ? STATUS.FINISHED : STATUS.IN_PROGRESS,
          winnerTeam,
          players: { create: rows },
        },
      }),
      ...rows
        .filter((r) => r.scoreDelta !== 0)
        .map((r) => prisma.player.update({ where: { id: r.playerId }, data: { scrimScore: { increment: r.scoreDelta } } })),
    ]);
  }

  const [players, matches] = await Promise.all([prisma.player.count(), prisma.match.count()]);
  console.log(`시드 완료: 플레이어 ${players}명, 경기 ${matches}개`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
