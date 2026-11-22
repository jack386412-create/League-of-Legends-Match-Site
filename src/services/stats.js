// 전적 통계: 승/패는 컬럼에 저장하지 않고 MatchPlayer + Match.winnerTeam 으로 계산한다 (기획서 5.2)
const { POSITIONS, STATUS } = require('../constants');

const winRate = (w, l) => (w + l === 0 ? 0 : Math.round((w / (w + l)) * 1000) / 10);

/**
 * @param {Array} rows MatchPlayer 레코드 (include: { match: true })
 * @param {{ recentLimit?: number }} options recentLimit=0 이면 recent/byPosition 생략
 */
function computeStats(rows, { recentLimit = 10 } = {}) {
  const finished = rows.filter((r) => r.match && r.match.status === STATUS.FINISHED);

  let wins = 0;
  let losses = 0;
  const byPos = Object.fromEntries(POSITIONS.map((p) => [p, { position: p, wins: 0, losses: 0 }]));

  for (const r of finished) {
    const won = r.team === r.match.winnerTeam;
    if (won) wins++;
    else losses++;
    if (byPos[r.position]) byPos[r.position][won ? 'wins' : 'losses']++;
  }

  const stats = { wins, losses, games: wins + losses, winRate: winRate(wins, losses) };
  if (!recentLimit) return stats;

  stats.byPosition = Object.values(byPos).map((x) => ({
    ...x,
    games: x.wins + x.losses,
    winRate: winRate(x.wins, x.losses),
  }));
  stats.recent = finished
    .slice()
    .sort((a, b) => b.match.playedAt - a.match.playedAt)
    .slice(0, recentLimit)
    .map((r) => ({
      matchId: r.matchId,
      playedAt: r.match.playedAt,
      team: r.team,
      position: r.position,
      result: r.team === r.match.winnerTeam ? 'WIN' : 'LOSS',
      scoreDelta: r.scoreDelta,
    }));
  return stats;
}

module.exports = { computeStats, winRate };
