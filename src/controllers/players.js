// 플레이어 관리 (F-01 ~ F-04)
const prisma = require('../lib/prisma');
const HttpError = require('../lib/httpError');
const { TIERS, DIVISIONS, POSITIONS } = require('../constants');
const { withScore } = require('../services/score');
const { computeStats } = require('../services/stats');

const MAX_NAME = 30;
const MAX_TAG = 10;

function parseId(raw) {
  const id = Number(raw);
  if (!Number.isInteger(id) || id <= 0) throw new HttpError(400, '올바르지 않은 ID입니다.');
  return id;
}

/**
 * 입력 검증 (N-02). partial=true 이면 넘어온 필드만 검사한다(PATCH).
 * @returns 검증된 데이터
 */
function validatePlayer(body, { partial = false, current = null } = {}) {
  if (!body || typeof body !== 'object') throw new HttpError(400, '요청 본문이 필요합니다.');
  const has = (k) => body[k] !== undefined;
  const out = {};

  if (!partial || has('summonerName')) {
    const v = typeof body.summonerName === 'string' ? body.summonerName.trim() : '';
    if (!v) throw new HttpError(400, '소환사명을 입력하세요.');
    if (v.length > MAX_NAME) throw new HttpError(400, `소환사명은 ${MAX_NAME}자 이하여야 합니다.`);
    out.summonerName = v;
  }
  if (!partial || has('tagLine')) {
    const v = typeof body.tagLine === 'string' ? body.tagLine.trim().replace(/^#/, '') : '';
    if (!v) throw new HttpError(400, '태그를 입력하세요.');
    if (v.length > MAX_TAG) throw new HttpError(400, `태그는 ${MAX_TAG}자 이하여야 합니다.`);
    out.tagLine = v;
  }
  if (!partial || has('tier')) {
    if (!TIERS.includes(body.tier)) throw new HttpError(400, '올바르지 않은 티어입니다.');
    out.tier = body.tier;
  }
  if (!partial || has('division')) {
    const d = body.division === undefined ? 4 : Number(body.division);
    if (!DIVISIONS.includes(d)) throw new HttpError(400, '디비전은 1~4 사이여야 합니다.');
    out.division = d;
  }
  if (!partial || has('mainPosition')) {
    if (!POSITIONS.includes(body.mainPosition)) throw new HttpError(400, '올바르지 않은 주 포지션입니다.');
    out.mainPosition = body.mainPosition;
  }
  if (has('subPosition')) {
    const v = body.subPosition || null;
    if (v !== null && !POSITIONS.includes(v)) throw new HttpError(400, '올바르지 않은 부 포지션입니다.');
    out.subPosition = v;
  }
  if (has('isActive')) {
    if (typeof body.isActive !== 'boolean') throw new HttpError(400, 'isActive는 true/false 여야 합니다.');
    out.isActive = body.isActive;
  }

  // 최종 상태 기준 규칙
  const merged = { ...(current || {}), ...out };
  if (merged.tier === 'MASTER') out.division = 1; // 마스터+는 디비전 1 고정
  if (merged.subPosition && merged.subPosition === merged.mainPosition) {
    throw new HttpError(400, '부 포지션은 주 포지션과 달라야 합니다.');
  }
  return out;
}

async function assertUnique(summonerName, tagLine, excludeId = null) {
  const dup = await prisma.player.findUnique({ where: { summonerName_tagLine: { summonerName, tagLine } } });
  if (dup && dup.id !== excludeId) throw new HttpError(409, '이미 등록된 소환사명#태그입니다.');
}

// GET /api/players?search=&tier=&position=
async function list(req, res) {
  const { search, tier, position } = req.query;
  const and = [];

  if (typeof search === 'string' && search.trim()) {
    const s = search.trim();
    if (s.includes('#')) {
      const [name, tag] = s.split('#');
      if (name) and.push({ summonerName: { contains: name } });
      if (tag) and.push({ tagLine: { startsWith: tag } });
    } else {
      and.push({ OR: [{ summonerName: { contains: s } }, { tagLine: { contains: s } }] });
    }
  }
  if (tier) {
    if (!TIERS.includes(tier)) throw new HttpError(400, '올바르지 않은 티어입니다.');
    and.push({ tier });
  }
  if (position) {
    if (!POSITIONS.includes(position)) throw new HttpError(400, '올바르지 않은 포지션입니다.');
    and.push({ OR: [{ mainPosition: position }, { subPosition: position }] });
  }

  const players = await prisma.player.findMany({ where: { AND: and }, orderBy: { id: 'asc' } });
  const data = players.map(withScore).sort((a, b) => b.score - a.score);
  res.json({ data });
}

// GET /api/players/:id
async function detail(req, res) {
  const id = parseId(req.params.id);
  const player = await prisma.player.findUnique({
    where: { id },
    include: { matches: { include: { match: true } } },
  });
  if (!player) throw new HttpError(404, '플레이어를 찾을 수 없습니다.');
  res.json({ data: { ...withScore(player), stats: computeStats(player.matches) } });
}

// POST /api/players
async function create(req, res) {
  const data = validatePlayer(req.body);
  await assertUnique(data.summonerName, data.tagLine);
  const player = await prisma.player.create({ data });
  res.status(201).json({ data: withScore(player) });
}

// PATCH /api/players/:id
async function update(req, res) {
  const id = parseId(req.params.id);
  const current = await prisma.player.findUnique({ where: { id } });
  if (!current) throw new HttpError(404, '플레이어를 찾을 수 없습니다.');

  const data = validatePlayer(req.body, { partial: true, current });
  if (data.summonerName !== undefined || data.tagLine !== undefined) {
    await assertUnique(data.summonerName ?? current.summonerName, data.tagLine ?? current.tagLine, id);
  }
  const player = await prisma.player.update({ where: { id }, data });
  res.json({ data: withScore(player) });
}

// DELETE /api/players/:id — 경기 기록이 있으면 삭제 대신 비활성화 (F-03)
async function remove(req, res) {
  const id = parseId(req.params.id);
  const player = await prisma.player.findUnique({ where: { id } });
  if (!player) throw new HttpError(404, '플레이어를 찾을 수 없습니다.');

  const matchCount = await prisma.matchPlayer.count({ where: { playerId: id } });
  if (matchCount > 0) {
    const updated = await prisma.player.update({ where: { id }, data: { isActive: false } });
    return res.json({ data: { deactivated: true, player: withScore(updated) } });
  }
  await prisma.player.delete({ where: { id } });
  res.json({ data: { deleted: true } });
}

module.exports = { list, detail, create, update, remove, parseId };
