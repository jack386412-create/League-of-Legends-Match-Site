// 팀 자동 밸런싱 (F-06, F-07, F-09) — DB에 저장하지 않고 결과만 반환
const prisma = require('../lib/prisma');
const HttpError = require('../lib/httpError');
const { MATCH_SIZE } = require('../constants');
const { balance } = require('../services/balance');
const { withScore } = require('../services/score');

// POST /api/teams/balance  body: { playerIds: [10개], shuffle?: boolean }
async function balanceTeams(req, res) {
  const { playerIds, shuffle } = req.body || {};
  if (!Array.isArray(playerIds) || playerIds.length !== MATCH_SIZE) {
    throw new HttpError(400, `참가자는 정확히 ${MATCH_SIZE}명이어야 합니다.`);
  }
  const ids = playerIds.map(Number);
  if (ids.some((id) => !Number.isInteger(id) || id <= 0)) throw new HttpError(400, '올바르지 않은 플레이어 ID가 있습니다.');
  if (new Set(ids).size !== MATCH_SIZE) throw new HttpError(400, '중복된 플레이어가 있습니다.');

  const players = await prisma.player.findMany({ where: { id: { in: ids } } });
  if (players.length !== MATCH_SIZE) throw new HttpError(404, '존재하지 않는 플레이어가 포함되어 있습니다.');
  if (players.some((p) => !p.isActive)) throw new HttpError(400, '비활성 플레이어가 포함되어 있습니다.');

  // 요청 순서 유지 (shuffle=false 일 때 결과가 매번 같도록)
  const ordered = ids.map((id) => players.find((p) => p.id === id));
  const result = balance(ordered.map(withScore), { shuffle: shuffle === true });
  res.json({ data: result });
}

module.exports = { balanceTeams };
