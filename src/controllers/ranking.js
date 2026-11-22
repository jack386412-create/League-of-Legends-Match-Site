// 내전 랭킹 (F-15, F-16)
const prisma = require('../lib/prisma');
const HttpError = require('../lib/httpError');
const { MIN_RANK_GAMES } = require('../constants');
const { withScore } = require('../services/score');
const { computeStats } = require('../services/stats');

const SORTERS = {
  score: (a, b) => b.score - a.score || b.winRate - a.winRate,
  winrate: (a, b) => b.winRate - a.winRate || b.games - a.games || b.score - a.score,
  games: (a, b) => b.games - a.games || b.winRate - a.winRate || b.score - a.score,
};

// GET /api/ranking?sort=score|winrate|games
async function ranking(req, res) {
  const sort = req.query.sort || 'score';
  const sorter = SORTERS[sort];
  if (!sorter) throw new HttpError(400, 'sort는 score, winrate, games 중 하나여야 합니다.');

  const players = await prisma.player.findMany({ include: { matches: { include: { match: true } } } });
  const rows = players
    .map((p) => ({ ...withScore(p), ...computeStats(p.matches, { recentLimit: 0 }) }))
    .filter((r) => r.games >= MIN_RANK_GAMES)
    .sort(sorter);

  res.json({ data: rows.map((r, i) => ({ rank: i + 1, ...r })) });
}

module.exports = { ranking };
