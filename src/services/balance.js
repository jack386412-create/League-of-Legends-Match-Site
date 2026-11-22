// 팀 밸런싱 알고리즘 (기획서 4.2)
const { POSITIONS, MATCH_SIZE, TEAM_SIZE } = require('../constants');
const { playerScore } = require('./score');

function permutations(arr) {
  if (arr.length <= 1) return [arr.slice()];
  const out = [];
  arr.forEach((x, i) => {
    const rest = arr.slice(0, i).concat(arr.slice(i + 1));
    for (const p of permutations(rest)) out.push([x, ...p]);
  });
  return out;
}
const POSITION_PERMS = permutations(POSITIONS); // 5! = 120가지

/**
 * (F-07) 한 팀 5명에게 포지션 배정.
 * 120가지 배치 중 주 포지션 일치 +2, 부 포지션 일치 +1 의 합이 가장 큰 배치를 고른다.
 */
function assignPositions(team) {
  let best = POSITION_PERMS[0];
  let bestFit = -1;
  for (const perm of POSITION_PERMS) {
    let fit = 0;
    for (let i = 0; i < team.length; i++) {
      if (team[i].mainPosition === perm[i]) fit += 2;
      else if (team[i].subPosition === perm[i]) fit += 1;
    }
    if (fit > bestFit) {
      bestFit = fit;
      best = perm;
    }
  }
  return team
    .map((p, i) => ({ ...p, position: best[i] }))
    .sort((a, b) => POSITIONS.indexOf(a.position) - POSITIONS.indexOf(b.position));
}

/**
 * (F-06) 10명을 5:5로 나누는 C(10,5)/2 = 126가지 조합을 완전 탐색해 점수 차이가 최소인 조합을 고른다.
 * (F-09) shuffle=true 이면 차이가 작은 하위 5개 중 하나를 랜덤으로 고른다.
 * @param {Array} players Player 레코드 10개
 * @param {{ shuffle?: boolean, random?: () => number }} options
 */
function balance(players, { shuffle = false, random = Math.random } = {}) {
  if (players.length !== MATCH_SIZE) throw new Error(`players must have ${MATCH_SIZE} items`);

  const scored = players.map((p) => ({ ...p, score: playerScore(p) }));
  const total = scored.reduce((s, p) => s + p.score, 0);

  // 0번 플레이어를 항상 블루에 고정 → 블루/레드만 뒤바뀐 대칭 조합이 제거되어 126개
  const combos = [];
  for (let mask = 0; mask < 1 << MATCH_SIZE; mask++) {
    if (!(mask & 1)) continue;
    let count = 0;
    let sum = 0;
    for (let i = 0; i < MATCH_SIZE; i++) {
      if (mask & (1 << i)) {
        count++;
        sum += scored[i].score;
      }
    }
    if (count === TEAM_SIZE) combos.push({ mask, diff: Math.abs(total - 2 * sum) });
  }
  combos.sort((a, b) => a.diff - b.diff);

  const pick = shuffle ? combos[Math.floor(random() * Math.min(5, combos.length))] : combos[0];
  let blue = scored.filter((_, i) => pick.mask & (1 << i));
  let red = scored.filter((_, i) => !(pick.mask & (1 << i)));
  if (shuffle && random() < 0.5) [blue, red] = [red, blue];

  blue = assignPositions(blue);
  red = assignPositions(red);
  const sum = (team) => team.reduce((s, p) => s + p.score, 0);

  return {
    blue: { players: blue, total: sum(blue) },
    red: { players: red, total: sum(red) },
    diff: Math.abs(sum(blue) - sum(red)),
  };
}

module.exports = { balance, assignPositions };
