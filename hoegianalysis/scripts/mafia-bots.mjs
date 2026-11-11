// 로컬 테스트용 마피아 가상 참가자. 사용법:
//   node scripts/mafia-bots.mjs create [내이름] [봇수]   → 방을 만들고 봇을 입장시킨 뒤 코드와 방장 토큰을 출력, 계속 실행
//   node scripts/mafia-bots.mjs <방코드> [봇수]           → 이미 있는 대기실에 봇을 입장시키고 계속 실행
// 봇은 밤 행동과 낮 투표를 무작위로(조금 사람처럼 늦게) 합니다.
const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const NAMES = ['철수', '영희', '민수', '지민', '서연', '도윤', '하은', '준호', '유나', '시우'];

const post = async (path, body, token) => {
  const res = await fetch(BASE + path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(token ? { 'x-mafia-token': token } : {}) },
    body: JSON.stringify(body ?? {}),
  });
  return { ok: res.ok, data: await res.json().catch(() => ({})) };
};
const state = async (code, token) => {
  const res = await fetch(`${BASE}/api/mafia/games/${code}?since=0`, { headers: { 'x-mafia-token': token } });
  return res.ok ? (await res.json()).view : null;
};
const pickOne = (list) => list[Math.floor(Math.random() * list.length)];

async function main() {
  const [a, b, c] = process.argv.slice(2);
  let code = a;
  let count = Number(b) || 8;
  if (a === 'create') {
    const hostName = b && !/^\d+$/.test(b) ? b : '나';
    count = Number(c) || 8;
    const res = await post('/api/mafia/games', { mode: 'host_plays', hostName, settings: { nightSecs: 40, talkSecs: 120, voteSecs: 40 } });
    if (!res.ok) throw new Error(res.data.error);
    code = res.data.code;
    console.log(`HOST_CODE=${code}`);
    console.log(`HOST_TOKEN=${res.data.token}`);
  }
  if (!/^\d{4}$/.test(code ?? '')) throw new Error('방 코드(4자리) 또는 create 를 넣어 주세요');

  const bots = [];
  for (const name of NAMES.slice(0, count)) {
    const res = await post(`/api/mafia/games/${code}/join`, { name });
    if (res.ok) bots.push({ name, token: res.data.token });
    else console.log(`${name} 입장 실패: ${res.data.error}`);
  }
  console.log(`봇 ${bots.length}명 입장 완료. 방장이 게임을 시작하면 자동으로 플레이합니다.`);

  const deadline = Date.now() + 1000 * 60 * 120;
  let announced = false;
  while (Date.now() < deadline) {
    let over = false;
    for (const bot of bots) {
      const v = await state(code, bot.token);
      if (!v) continue;
      if (v.phase === 'ended') over = true;
      if (v.phase === 'lobby' || v.phase === 'ended' || !v.you?.alive) continue;
      if (!announced && v.phase !== 'lobby') {
        announced = true;
        console.log('게임 시작! 봇이 움직입니다.');
      }
      if (v.myTargetId) continue; // 이미 골랐다 (바꾸지 않는다)
      if (Math.random() > 0.35) continue; // 사람처럼 조금씩 늦게

      const alive = v.players.filter((p) => p.alive);
      const role = v.you.role;
      let kind = null;
      let pool = [];
      if (v.phase === 'night') {
        if (role === 'mafia') [kind, pool] = ['mafia', alive.filter((p) => p.role !== 'mafia')];
        else if (role === 'police') [kind, pool] = ['police', alive.filter((p) => !p.isYou)];
        else if (role === 'doctor') [kind, pool] = ['doctor', alive];
      } else if (v.phase === 'day_vote') {
        kind = 'vote';
        pool = alive.filter((p) => !p.isYou && !(role === 'mafia' && p.role === 'mafia'));
        // 이미 표가 몰린 사람이 있으면 따라가기도 한다
        const counts = {};
        for (const t of Object.values(v.votes ?? {})) counts[t] = (counts[t] ?? 0) + 1;
        const leader = pool.find((p) => counts[p.id] === Math.max(0, ...Object.values(counts)) && counts[p.id]);
        if (leader && Math.random() < 0.5) pool = [leader];
      }
      if (kind && pool.length) await post(`/api/mafia/games/${code}/action`, { kind, targetId: pickOne(pool).id }, bot.token);
    }
    if (over) {
      console.log('게임이 끝났어요. 봇을 종료합니다.');
      return;
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
}
main().catch((e) => {
  console.error(e.message);
  process.exit(1);
});
