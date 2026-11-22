// 플레이어 점수 (기획서 4.1)
// 최종 점수 = 티어 기본 점수 + 디비전 보정(IV=0, III=100, II=200, I=300) + 내전 보정 점수
const { TIER_BASE } = require('../constants');

function divisionBonus(tier, division) {
  if (tier === 'MASTER') return 0;
  return (4 - division) * 100;
}

function playerScore(p) {
  return (TIER_BASE[p.tier] || 0) + divisionBonus(p.tier, p.division) + (p.scrimScore || 0);
}

/** API 응답용: Player 레코드에 score 필드를 붙인다 */
function withScore(p) {
  const { matches, ...rest } = p;
  return { ...rest, score: playerScore(p) };
}

module.exports = { playerScore, withScore, divisionBonus };
