// 경기 기록 (F-10 팀 확정, F-11 결과 입력, F-12 목록, F-14 삭제·롤백)
const prisma = require('../lib/prisma');
const HttpError = require('../lib/httpError');
const { POSITIONS, TEAMS, STATUS, TEAM_SIZE, MATCH_SIZE, WIN_DELTA, PAGE_SIZE } = require('../constants');
const { parseId } = require('./players');

const MAX_MEMO = 100;

const MATCH_INCLUDE = { players: { include: { player: true } } };

/** API 응답 형태로 변환 */
function toMatchDto(match) {
  const players = match.players
    .map((mp) => ({
      playerId: mp.playerId,
      summonerName: mp.player.summonerName,
      tagLine: mp.player.tagLine,
      tier: mp.player.tier,
      division: mp.player.division,
      team: mp.team,
      position: mp.position,
      scoreDelta: mp.scoreDelta,
      champion: mp.champion,
      kills: mp.kills,
      deaths: mp.deaths,
      assists: mp.assists,
    }))
    .sort((a, b) => POSITIONS.indexOf(a.position) - POSITIONS.indexOf(b.position));
  const { players: _omit, ...rest } = match;
  return { ...rest, players };
}

// GET /api/matches?page=
async function list(req, res) {
  const page = Math.max(1, Number.parseInt(req.query.page, 10) || 1);
  const [total, matches] = await Promise.all([
    prisma.match.count(),
    prisma.match.findMany({
      orderBy: [{ playedAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      include: MATCH_INCLUDE,
    }),
  ]);
  res.json({
    data: {
      items: matches.map(toMatchDto),
      page,
      totalPages: Math.max(1, Math.ceil(total / PAGE_SIZE)),
      total,
    },
  });
}

// GET /api/matches/:id
async function detail(req, res) {
  const id = parseId(req.params.id);
  const match = await prisma.match.findUnique({ where: { id }, include: MATCH_INCLUDE });
  if (!match) throw new HttpError(404, '경기를 찾을 수 없습니다.');
  res.json({ data: toMatchDto(match) });
}

// POST /api/matches  body: { players: [{ playerId, team, position }] x10, memo? }
async function create(req, res) {
  const { players, memo } = req.body || {};
  if (!Array.isArray(players) || players.length !== MATCH_SIZE) {
    throw new HttpError(400, `참가자는 정확히 ${MATCH_SIZE}명이어야 합니다.`);
  }
  const rows = players.map((p) => ({ playerId: Number(p && p.playerId), team: p && p.team, position: p && p.position }));
  if (rows.some((r) => !Number.isInteger(r.playerId) || r.playerId <= 0)) throw new HttpError(400, '올바르지 않은 플레이어 ID가 있습니다.');
  if (new Set(rows.map((r) => r.playerId)).size !== MATCH_SIZE) throw new HttpError(400, '중복된 플레이어가 있습니다.');
  for (const team of TEAMS) {
    const members = rows.filter((r) => r.team === team);
    if (members.length !== TEAM_SIZE) throw new HttpError(400, `각 팀은 ${TEAM_SIZE}명이어야 합니다.`);
    const positions = members.map((m) => m.position);
    if (positions.some((p) => !POSITIONS.includes(p)) || new Set(positions).size !== TEAM_SIZE) {
      throw new HttpError(400, '각 팀의 포지션이 올바르지 않습니다. (탑·정글·미드·원딜·서폿 1명씩)');
    }
  }
  if (memo !== undefined && memo !== null && (typeof memo !== 'string' || memo.length > MAX_MEMO)) {
    throw new HttpError(400, `메모는 ${MAX_MEMO}자 이하 문자열이어야 합니다.`);
  }

  const found = await prisma.player.findMany({ where: { id: { in: rows.map((r) => r.playerId) } } });
  if (found.length !== MATCH_SIZE) throw new HttpError(404, '존재하지 않는 플레이어가 포함되어 있습니다.');
  if (found.some((p) => !p.isActive)) throw new HttpError(400, '비활성 플레이어가 포함되어 있습니다.');

  const match = await prisma.match.create({
    data: {
      status: STATUS.IN_PROGRESS,
      memo: memo ? memo.trim() || null : null,
      players: { create: rows },
    },
    include: MATCH_INCLUDE,
  });
  res.status(201).json({ data: toMatchDto(match) });
}

// PATCH /api/matches/:id/result  body: { winnerTeam: 'BLUE' | 'RED' }
async function setResult(req, res) {
  const id = parseId(req.params.id);
  const { winnerTeam } = req.body || {};
  if (!TEAMS.includes(winnerTeam)) throw new HttpError(400, '승리팀은 BLUE 또는 RED 여야 합니다.');

  const match = await prisma.$transaction(async (tx) => {
    // 진행중인 경기만 완료로 변경 (동시에 두 번 눌러도 한 번만 반영)
    const { count } = await tx.match.updateMany({
      where: { id, status: STATUS.IN_PROGRESS },
      data: { status: STATUS.FINISHED, winnerTeam },
    });
    if (count === 0) {
      const exists = await tx.match.findUnique({ where: { id } });
      if (!exists) throw new HttpError(404, '경기를 찾을 수 없습니다.');
      throw new HttpError(409, '이미 결과가 입력된 경기입니다.');
    }

    const mps = await tx.matchPlayer.findMany({ where: { matchId: id } });
    for (const mp of mps) {
      const delta = mp.team === winnerTeam ? WIN_DELTA : -WIN_DELTA;
      await tx.matchPlayer.update({ where: { id: mp.id }, data: { scoreDelta: delta } });
      await tx.player.update({ where: { id: mp.playerId }, data: { scrimScore: { increment: delta } } });
    }
    return tx.match.findUnique({ where: { id }, include: MATCH_INCLUDE });
  });

  res.json({ data: toMatchDto(match) });
}

// DELETE /api/matches/:id — 경기 삭제 + scoreDelta 만큼 점수 롤백
async function remove(req, res) {
  const id = parseId(req.params.id);

  await prisma.$transaction(async (tx) => {
    const match = await tx.match.findUnique({ where: { id }, include: { players: true } });
    if (!match) throw new HttpError(404, '경기를 찾을 수 없습니다.');
    for (const mp of match.players) {
      if (mp.scoreDelta !== 0) {
        await tx.player.update({ where: { id: mp.playerId }, data: { scrimScore: { decrement: mp.scoreDelta } } });
      }
    }
    await tx.match.delete({ where: { id } }); // MatchPlayer는 onDelete: Cascade
  });

  res.json({ data: { deleted: true } });
}

module.exports = { list, detail, create, setResult, remove };
