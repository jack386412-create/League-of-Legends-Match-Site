// 티어·포지션·팀 허용 값 (SQLite는 enum이 없으므로 서버에서 검증한다)
// 프론트의 public/js/common.js 와 값을 맞춰 둘 것

const TIER_BASE = {
  IRON: 400,
  BRONZE: 800,
  SILVER: 1200,
  GOLD: 1600,
  PLATINUM: 2000,
  EMERALD: 2400,
  DIAMOND: 2800,
  MASTER: 3200, // 마스터 이상
};
const TIERS = Object.keys(TIER_BASE);
const DIVISIONS = [1, 2, 3, 4];

const POSITIONS = ['TOP', 'JUNGLE', 'MID', 'ADC', 'SUPPORT'];
const TEAMS = ['BLUE', 'RED'];
const STATUS = { IN_PROGRESS: 'IN_PROGRESS', FINISHED: 'FINISHED' };

const TEAM_SIZE = 5;
const MATCH_SIZE = TEAM_SIZE * 2;
const WIN_DELTA = 25; // 승리 +25 / 패배 -25
const MIN_RANK_GAMES = 3; // 랭킹 표시 최소 경기 수
const PAGE_SIZE = 10; // 경기 목록 페이지 크기

module.exports = {
  TIER_BASE, TIERS, DIVISIONS, POSITIONS, TEAMS, STATUS,
  TEAM_SIZE, MATCH_SIZE, WIN_DELTA, MIN_RANK_GAMES, PAGE_SIZE,
};
