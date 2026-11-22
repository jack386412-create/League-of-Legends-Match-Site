/* 관리자 로그인 / 로그아웃 (F-18) */
const loginView = document.getElementById('login-view');
const adminView = document.getElementById('admin-view');

function showView(isAdmin) {
  loginView.hidden = isAdmin;
  adminView.hidden = !isAdmin;
  if (!isAdmin) document.getElementById('password').focus();
}

document.getElementById('login-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const pw = document.getElementById('password');
  const btn = document.getElementById('login-btn');
  if (!pw.value) return;
  btn.disabled = true;
  try {
    await API.login(pw.value);
    setAdmin(true);
    toast('관리자로 로그인했습니다.', 'success');
    const next = qs('next');
    // 같은 사이트의 상대 경로만 허용 (오픈 리다이렉트 방지)
    if (next && /^[a-z0-9-]+\.html$/i.test(next)) {
      location.href = next;
      return;
    }
    showView(true);
  } catch (err) {
    toast(err.message, 'error');
    pw.select();
  } finally {
    btn.disabled = false;
    pw.value = '';
  }
});

document.getElementById('logout-btn').addEventListener('click', async () => {
  try {
    await API.logout();
  } catch { /* 이미 만료된 경우도 로그아웃 처리 */ }
  setAdmin(false);
  toast('로그아웃했습니다.');
  showView(false);
});

document.getElementById('backup-link').addEventListener('click', (e) => {
  e.preventDefault();
  location.href = API.backupUrl; // 쿠키 인증된 상태로 파일 다운로드
});

initPage('admin').then(showView);
