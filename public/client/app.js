// ===== DEAS FINANCE PRO — CLIENT APP =====
const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];
const TOKEN_KEY = 'deasfinance_token';
const PHOTO_FALLBACK = 'https://ui-avatars.com/api/?background=F2B84B&color=111827&bold=true&size=128&name=';

let currentUser = null;
let currentAccount = null;
let currentConnections = [];
let allTransactions = [];
let balanceVisible = true;
let activeFilter = 'all';

// ===== UTILS =====
const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const today = () => new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

function toast(msg, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️', warning: '⚠️' };
  const container = $('#toast-container');
  if (!container) return;
  const el = document.createElement('div');
  el.className = `toast-item toast-${type}`;
  el.innerHTML = `<span class="toast-icon">${icons[type] || icons.info}</span><span class="toast-msg">${msg}</span>`;
  container.appendChild(el);
  setTimeout(() => {
    el.classList.add('removing');
    setTimeout(() => el.remove(), 250);
  }, 3600);
}

async function api(path, options = {}) {
  const token = localStorage.getItem(TOKEN_KEY);
  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {})
    }
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || data.error || 'Erro na API.');
  return data;
}

// ===== APP TOGGLE =====
function showApp(show) {
  $('#authPage')?.classList.toggle('hidden', show);
  $('#appPage')?.classList.toggle('hidden', !show);
}

// ===== SCORE HELPERS =====
function scoreColor(score) {
  if (score >= 800) return '#34D399';
  if (score >= 700) return '#60A5FA';
  if (score >= 600) return '#F2B84B';
  if (score >= 500) return '#FBBF24';
  return '#F87171';
}

function scoreCategory(score) {
  if (score >= 800) return 'Excelente';
  if (score >= 700) return 'Bom';
  if (score >= 600) return 'Regular';
  if (score >= 500) return 'Médio';
  return 'Baixo';
}

function updateScoreRing(id, score) {
  const fill = $(`#${id}`);
  if (!fill) return;
  const circumference = 314;
  const pct = Math.min(1, Math.max(0, (score - 300) / 650));
  fill.style.strokeDashoffset = circumference - (circumference * pct);
  fill.style.stroke = scoreColor(score);
}

// ===== RENDER =====
function renderAccount(account) {
  currentAccount = account;
  const balance = account.balance ?? account.availableBalance ?? 0;
  const score = account.creditScore || 500;

  // Balance
  const balEl = $('#balanceValue');
  if (balEl) {
    balEl.textContent = money(balance);
    balEl.classList.toggle('blurred', !balanceVisible);
  }

  // Sidebar balance
  const sbEl = $('#sidebarBalance');
  if (sbEl) {
    sbEl.textContent = money(balance);
    sbEl.classList.toggle('blurred', !balanceVisible);
  }

  // Pix balance info
  if ($('#pixBalanceDisplay')) $('#pixBalanceDisplay').textContent = money(balance);

  $('#limitValue') && ($('#limitValue').textContent = money(account.limit));
  $('#debtValue') && ($('#debtValue').textContent = money(account.debt));
  $('#debtValuePage') && ($('#debtValuePage').textContent = `Dívida atual: ${money(account.debt)}`);
  $('#preApprovedValue') && ($('#preApprovedValue').textContent = money(account.preApproved));
  $('#preApprovedMetric') && ($('#preApprovedMetric').textContent = money(account.preApproved));
  $('#loansTotal') && ($('#loansTotal').textContent = money(account.loansTotal));

  // Score
  const scoreEls = ['#creditScore', '#creditScore2'];
  scoreEls.forEach(sel => { if ($(sel)) $(sel).textContent = score; });
  $('#scoreMetric') && ($('#scoreMetric').textContent = score);

  const cat = scoreCategory(score);
  const col = scoreColor(score);
  ['#scoreCategoryText', '#scoreCategoryCredit', '#scoreCategory'].forEach(sel => {
    const el = $(sel);
    if (el) { el.textContent = cat; el.style.color = col; }
  });
  $('#scoreMetric') && ($('#scoreMetric').style.color = col);

  updateScoreRing('scoreRingFill', score);
  updateScoreRing('scoreRingFill2', score);

  $('#creditReason') && ($('#creditReason').textContent = account.openFinancePartnerSnapshot
    ? 'Score recalculado com dados Open Finance.'
    : 'Conecte um banco parceiro para melhorar a análise.');

  renderOpenFinanceSummary();
}

function renderProfile(user) {
  currentUser = user;
  const name = user?.name || user?.displayName || 'Usuário';
  const email = user?.email || '';
  const photo = user?.photoURL || (PHOTO_FALLBACK + encodeURIComponent(name));

  $('#welcomeName') && ($('#welcomeName').textContent = `Olá, ${name.split(' ')[0]} 👋`);
  $('#userDisplayName') && ($('#userDisplayName').textContent = name.split(' ')[0]);
  $('#profileName') && ($('#profileName').textContent = name);
  $('#profileEmail') && ($('#profileEmail').textContent = email);
  ['#profilePhoto', '#profilePhotoLarge', '#photoPreview'].forEach(sel => {
    const el = $(sel);
    if (el) el.src = photo;
  });
}

function txIcon(type) {
  if (type === 'entrada') return { icon: '⬇️', bg: 'rgba(52,211,153,0.12)' };
  if (type === 'saída') return { icon: '⚡', bg: 'rgba(248,113,113,0.12)' };
  if (type === 'crédito') return { icon: '💳', bg: 'rgba(96,165,250,0.12)' };
  return { icon: '💰', bg: 'rgba(242,184,75,0.10)' };
}

function renderTransactions(transactions) {
  allTransactions = transactions || [];
  applyTransactionFilter();
  buildSpendingChart(allTransactions);
}

function applyTransactionFilter() {
  const body = $('#transactionsBody');
  if (!body) return;

  let list = allTransactions;
  if (activeFilter === 'entrada') list = allTransactions.filter(t => Number(t.value) > 0);
  else if (activeFilter === 'saída') list = allTransactions.filter(t => Number(t.value) < 0);

  if (!list.length) {
    body.innerHTML = '<tr><td colspan="4" class="tx-empty">Nenhuma movimentação encontrada.</td></tr>';
    return;
  }

  body.innerHTML = list.slice(0, 20).map(tx => {
    const val = Number(tx.value);
    const { icon, bg } = txIcon(tx.type);
    const cls = val > 0 ? 'pos' : val < 0 ? 'neg' : '';
    const statusCls = tx.status === 'pago' ? 'badge-success' : tx.status === 'pendente' ? 'badge-pending' : '';
    return `<tr>
      <td>
        <div class="tx-row-main">
          <div class="tx-icon" style="background:${bg}">${icon}</div>
          <div>
            <span class="tx-creditor">${tx.creditor}</span>
            <span class="tx-type-label">${tx.type || 'movimentação'}</span>
          </div>
        </div>
      </td>
      <td style="color:var(--text-secondary);font-size:13px">${tx.date || '—'}</td>
      <td class="${cls}">${money(val)}</td>
      <td><span class="badge ${statusCls}">${tx.status}</span></td>
    </tr>`;
  }).join('');
}

function buildSpendingChart(transactions) {
  const chartWrap = $('#spendingChart');
  const labelsWrap = $('#chartLabels');
  if (!chartWrap) return;

  // Group last 7 days
  const days = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push({
      label: d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', ''),
      dateStr: d.toLocaleDateString('pt-BR'),
      in: 0, out: 0
    });
  }

  transactions.forEach(tx => {
    const day = days.find(d => d.dateStr === tx.date);
    if (!day) return;
    const val = Number(tx.value);
    if (val > 0) day.in += val;
    else day.out += Math.abs(val);
  });

  const maxVal = Math.max(...days.map(d => Math.max(d.in, d.out)), 100);

  chartWrap.innerHTML = days.map(d => {
    const inH = Math.max(4, Math.round((d.in / maxVal) * 66));
    const outH = Math.max(4, Math.round((d.out / maxVal) * 66));
    return `
      <div style="display:flex;align-items:flex-end;gap:2px;flex:1">
        <div class="chart-bar entrada" style="height:${inH}px;flex:1" title="Entrada: ${money(d.in)}"></div>
        <div class="chart-bar saida" style="height:${outH}px;flex:1" title="Saída: ${money(d.out)}"></div>
      </div>`;
  }).join('');

  if (labelsWrap) {
    labelsWrap.innerHTML = days.map(d => `<span>${d.label}</span>`).join('');
  }
}

function renderConnections(connections) {
  currentConnections = connections || [];
  const box = $('#connectionsList');
  if (!box) return;

  if (!currentConnections.length) {
    box.innerHTML = `<div class="of-empty"><strong>Nenhuma instituição conectada</strong><p style="font-size:13px;margin-top:4px">Conecte o DeasBank para começar.</p></div>`;
  } else {
    box.innerHTML = currentConnections.map(c => `
      <div class="connection-item">
        <div>
          <strong>${c.institutionName || c.targetBank || 'DeasBank'}</strong>
          <p class="muted" style="font-size:12.5px">Saldo externo: ${money(c.externalBalance || c.partnerSnapshot?.externalBalance)} · Score: ${c.externalScore || c.partnerSnapshot?.creditScore || '—'}</p>
        </div>
        <span class="badge badge-success">Conectado</span>
      </div>`).join('');
  }
  renderOpenFinanceSummary();
}

function renderOpenFinanceSummary() {
  const connected = currentConnections.length > 0;
  $('#connectionTitleFinance') && ($('#connectionTitleFinance').textContent = connected ? 'DeasBank conectado' : 'Nenhuma conexão ativa');

  const badge = $('#ofConnectionBadge');
  if (badge) {
    badge.textContent = connected ? 'Conectado' : 'Sem conexão';
    badge.className = `badge ${connected ? 'badge-success' : ''}`;
  }

  $('#dataTransferCard')?.classList.toggle('hidden', !connected);
  $('#disconnectOpenFinanceBtn')?.classList.toggle('hidden', !connected);

  // OF Status metric
  $('#ofStatusMetric') && ($('#ofStatusMetric').textContent = connected ? 'Ativo' : 'Inativo');
  $('#ofStatusMetric') && ($('#ofStatusMetric').style.color = connected ? 'var(--green)' : 'var(--text-secondary)');
  $('#ofStatusSub') && ($('#ofStatusSub').textContent = connected ? 'DeasBank conectado' : 'Conecte o DeasBank');

  // Steps
  const hasSalary = Boolean(currentAccount?.openFinancePartnerSnapshot?.salaryPortability);
  setStep('ofStep1', connected ? 'done' : 'inactive');
  setStep('ofStep2', connected ? (hasSalary ? 'done' : 'active') : 'inactive');
  setStep('ofStep3', hasSalary ? 'done' : connected ? 'active' : 'inactive');

  const p = currentAccount?.openFinancePartnerSnapshot || currentConnections[0]?.partnerSnapshot || {};
  $('#ofImportedSalaryFinance') && ($('#ofImportedSalaryFinance').textContent = money(p.requestedSalary || 0));
  $('#ofExternalBalanceFinance') && ($('#ofExternalBalanceFinance').textContent = money(p.externalBalance || 0));
  $('#ofExternalDebtFinance') && ($('#ofExternalDebtFinance').textContent = money(p.externalDebt || 0));
  $('#ofExternalLimitFinance') && ($('#ofExternalLimitFinance').textContent = money(p.externalLimit || 0));
  $('#ofExternalLoansFinance') && ($('#ofExternalLoansFinance').textContent = money(p.externalLoans || 0));
  $('#ofExternalInvestmentsFinance') && ($('#ofExternalInvestmentsFinance').textContent = money(p.externalInvestments || 0));
  $('#ofExternalScoreFinance') && ($('#ofExternalScoreFinance').textContent = p.creditScore || p.externalScore || '—');
  $('#ofExternalIncomeFinance') && ($('#ofExternalIncomeFinance').textContent = money(p.estimatedIncome || 0));
  $('#ofRelationshipSummaryFinance') && ($('#ofRelationshipSummaryFinance').textContent = connected
    ? 'Dados recebidos via API Open Finance simulada do Deas Finance.'
    : 'Conecte o DeasBank para visualizar dados externos.');
}

function setStep(id, state) {
  const el = $(`#${id}`);
  if (!el) return;
  el.classList.remove('active', 'done');
  if (state === 'active') el.classList.add('active');
  if (state === 'done') el.classList.add('done');
  const num = el.querySelector('.of-step-num');
  if (num && state === 'done') num.textContent = '✓';
}

// ===== RECEIPT MODAL =====
function showReceipt({ icon, amount, desc, title, rows = [] }) {
  $('#receiptIcon') && ($('#receiptIcon').textContent = icon || '✅');
  $('#receiptTitle') && ($('#receiptTitle').textContent = title || 'Transação realizada');
  $('#receiptAmount') && ($('#receiptAmount').textContent = money(amount));
  $('#receiptDesc') && ($('#receiptDesc').textContent = desc || '');
  const rowsEl = $('#receiptRows');
  if (rowsEl) {
    rowsEl.innerHTML = rows.map(r => `
      <div class="receipt-row">
        <span class="rk">${r.key}</span>
        <span class="rv">${r.val}</span>
      </div>`).join('');
  }
  $('#receiptDialog')?.showModal();
}

// ===== DATA REFRESH =====
async function refresh() {
  const me = await api('/api/auth/me');
  renderProfile(me.user);
  renderAccount(me.account);
  const [txs, conns] = await Promise.all([
    api('/api/transactions'),
    api('/api/open-finance')
  ]);
  renderTransactions(txs);
  renderConnections(conns);
}

// ===== NAVIGATION =====
function switchView(viewId) {
  const target = document.getElementById(viewId);
  if (!target) return;
  $$('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.view === viewId));
  $$('.view').forEach(v => v.classList.remove('active'));
  target.classList.add('active');
  const eyebrow = target.dataset.eyebrow || 'Deas Finance';
  const title = target.dataset.title || 'Painel';
  if ($('#pageEyebrow')) $('#pageEyebrow').textContent = eyebrow;
  if ($('#welcomeName') && currentUser) {
    const name = (currentUser?.name || currentUser?.displayName || 'Usuário').split(' ')[0];
    $('#welcomeName').textContent = viewId === 'dashboard' ? `Olá, ${name} 👋` : title;
  }
  $('.content')?.scrollTo({ top: 0, behavior: 'smooth' });
  if (window.innerWidth < 820) window.scrollTo({ top: 0, behavior: 'smooth' });
}

function closeDialogs() {
  $$('dialog[open]').forEach(d => d.close());
}

// ===== WIRING =====
function wireTabs() {
  $$('[data-auth-tab]').forEach(btn => btn.addEventListener('click', () => {
    $$('[data-auth-tab]').forEach(b => b.classList.remove('active'));
    $$('.form').forEach(f => f.classList.remove('active'));
    btn.classList.add('active');
    $(`#${btn.dataset.authTab}Form`)?.classList.add('active');
  }));

  $$('[data-view]').forEach(btn => btn.addEventListener('click', () => switchView(btn.dataset.view)));
  $$('[data-open-modal]').forEach(btn => btn.addEventListener('click', () => $(`#${btn.dataset.openModal}`)?.showModal()));
  $$('[data-close-modal]').forEach(btn => btn.addEventListener('click', closeDialogs));

  // Filter tabs
  $$('.filter-tab').forEach(btn => btn.addEventListener('click', () => {
    $$('.filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeFilter = btn.dataset.filter || 'all';
    applyTransactionFilter();
  }));

  // Balance toggle
  $('#balanceToggle')?.addEventListener('click', () => {
    balanceVisible = !balanceVisible;
    const balEl = $('#balanceValue');
    const sbEl = $('#sidebarBalance');
    if (balEl) balEl.classList.toggle('blurred', !balanceVisible);
    if (sbEl) sbEl.classList.toggle('blurred', !balanceVisible);
    $('#balanceToggle').textContent = balanceVisible ? '👁' : '🙈';
  });

  // Topbar date
  if ($('#topbarDate')) $('#topbarDate').textContent = today();

  // Metric cards nav
  const metricDebtCard = document.querySelector('.metric-card.mc-red');
  if (metricDebtCard) metricDebtCard.addEventListener('click', () => switchView('debtPage'));
  const metricOfCard = document.querySelector('.metric-card.mc-blue');
  if (metricOfCard) metricOfCard.addEventListener('click', () => switchView('openFinance'));

  // Keyboard support
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeDialogs();
  });

  // Profile pill tab index click
  $('.profile-pill')?.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') switchView('profile');
  });
}

function wireForms() {
  // Terms
  $('#openTerms')?.addEventListener('click', (e) => { e.preventDefault(); $('#termsDialog')?.showModal(); });
  $('#acceptTermsBtn')?.addEventListener('click', () => {
    if ($('#acceptTerms')) $('#acceptTerms').checked = true;
    $('#termsDialog')?.close();
  });

  // Login
  $('#loginForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!$('#acceptTerms')?.checked) return toast('Aceite os termos de privacidade para continuar.', 'warning');
    const btn = e.target.querySelector('.primary-btn');
    btn.textContent = 'Entrando...';
    btn.disabled = true;
    try {
      const data = await api('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: $('#loginEmail').value, password: $('#loginPassword').value })
      });
      localStorage.setItem(TOKEN_KEY, data.token);
      showApp(true);
      await refresh();
      toast('Bem-vindo ao Deas Finance!', 'success');
    } catch (err) {
      toast(err.message, 'error');
      btn.textContent = 'Entrar no banco';
      btn.disabled = false;
    }
  });

  // Register
  $('#registerForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('.primary-btn');
    btn.textContent = 'Criando conta...';
    btn.disabled = true;
    try {
      const data = await api('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ name: $('#registerName').value, email: $('#registerEmail').value, password: $('#registerPassword').value })
      });
      localStorage.setItem(TOKEN_KEY, data.token);
      showApp(true);
      await refresh();
      toast('Conta criada com sucesso! Bem-vindo ao Deas Finance.', 'success');
    } catch (err) {
      toast(err.message, 'error');
      btn.textContent = 'Criar conta';
      btn.disabled = false;
    }
  });

  // Logout
  $('#logoutBtn')?.addEventListener('click', () => $('#confirmLogout')?.showModal());
  $('#confirmLogoutBtn')?.addEventListener('click', () => {
    localStorage.removeItem(TOKEN_KEY);
    currentUser = null; currentAccount = null;
    closeDialogs();
    showApp(false);
    toast('Até logo!', 'info');
  });

  // Deposit
  $('#depositForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = Number($('#depositAmount').value);
    const btn = e.target.querySelector('.primary-btn');
    btn.disabled = true; btn.textContent = 'Processando...';
    try {
      await api('/api/account/deposit', { method: 'POST', body: JSON.stringify({ amount }) });
      await refresh();
      switchView('dashboard');
      showReceipt({ icon: '⬇️', amount, desc: 'Depósito realizado com sucesso', title: 'Comprovante de depósito', rows: [
        { key: 'Tipo', val: 'Depósito' },
        { key: 'Data', val: new Date().toLocaleDateString('pt-BR') },
        { key: 'Status', val: 'Concluído' }
      ]});
    } catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = '⬇️ Confirmar depósito'; }
  });

  // Pix
  $('#pixForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = Number($('#pixAmount').value);
    const creditor = $('#pixName').value;
    const btn = e.target.querySelector('.primary-btn');
    btn.disabled = true; btn.textContent = 'Enviando...';
    try {
      await api('/api/account/pix', { method: 'POST', body: JSON.stringify({ amount, creditor }) });
      await refresh();
      switchView('dashboard');
      showReceipt({ icon: '⚡', amount: -amount, desc: `Pix enviado para ${creditor}`, title: 'Comprovante de Pix', rows: [
        { key: 'Favorecido', val: creditor },
        { key: 'Tipo', val: 'Pix' },
        { key: 'Data', val: new Date().toLocaleDateString('pt-BR') },
        { key: 'Status', val: 'Concluído' }
      ]});
    } catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = '⚡ Enviar Pix'; }
  });

  // Pay Debt
  $('#payDebtForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = Number($('#payDebtAmount').value);
    const btn = e.target.querySelector('.primary-btn');
    btn.disabled = true; btn.textContent = 'Processando...';
    try {
      await api('/api/account/pay-debt', { method: 'POST', body: JSON.stringify({ amount }) });
      await refresh();
      switchView('dashboard');
      showReceipt({ icon: '📋', amount: -amount, desc: 'Pagamento de dívida realizado', title: 'Comprovante de pagamento', rows: [
        { key: 'Tipo', val: 'Pagamento de dívida' },
        { key: 'Data', val: new Date().toLocaleDateString('pt-BR') },
        { key: 'Score', val: currentAccount?.creditScore || '—' }
      ]});
    } catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = '📋 Pagar dívida'; }
  });

  // Loan
  $('#loanForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = Number($('#loanAmount').value);
    const btn = e.target.querySelector('.primary-btn');
    btn.disabled = true; btn.textContent = 'Analisando...';
    try {
      await api('/api/account/loan', { method: 'POST', body: JSON.stringify({ amount }) });
      await refresh();
      showReceipt({ icon: '💳', amount, desc: 'Empréstimo aprovado e creditado', title: 'Comprovante de empréstimo', rows: [
        { key: 'Tipo', val: 'Empréstimo Deas' },
        { key: 'Data', val: new Date().toLocaleDateString('pt-BR') },
        { key: 'Status', val: 'Aprovado' }
      ]});
    } catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = '💳 Solicitar empréstimo'; }
  });

  // Open Finance Connect
  $('#openFinanceForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const btn = e.target.querySelector('.primary-btn');
    btn.disabled = true; btn.textContent = 'Conectando...';
    try {
      await api('/api/open-finance/connect', { method: 'POST', body: JSON.stringify({ institutionName: 'DeasBank' }) });
      await refresh();
      switchView('openFinance');
      toast('DeasBank conectado com sucesso!', 'success');
    } catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = '🔗 Enviar conexão'; }
  });

  // Salary
  $('#openFinanceDataForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const amount = Number($('#ofSalaryAmount').value);
    const btn = e.target.querySelector('.primary-btn');
    btn.disabled = true; btn.textContent = 'Processando...';
    try {
      await api('/api/open-finance/salary', { method: 'POST', body: JSON.stringify({ amount }) });
      await refresh();
      switchView('openFinance');
      showReceipt({ icon: '💰', amount, desc: 'Salário trazido do DeasBank', title: 'Comprovante de portabilidade', rows: [
        { key: 'Origem', val: 'DeasBank' },
        { key: 'Destino', val: 'Deas Finance' },
        { key: 'Data', val: new Date().toLocaleDateString('pt-BR') }
      ]});
    } catch (err) { toast(err.message, 'error'); }
    finally { btn.disabled = false; btn.textContent = '💰 Trazer salário'; }
  });

  // Sync / Disconnect
  $('#syncOpenFinanceBtn')?.addEventListener('click', async () => {
    try { await refresh(); toast('Dados sincronizados!', 'success'); }
    catch (err) { toast(err.message, 'error'); }
  });
  $('#disconnectOpenFinanceBtn')?.addEventListener('click', async () => {
    try {
      await api('/api/open-finance/disconnect', { method: 'POST', body: '{}' });
      await refresh();
      toast('Open Finance desconectado.', 'info');
    } catch (err) { toast(err.message, 'error'); }
  });

  // Salary range sync
  $('#ofSalaryRange')?.addEventListener('input', () => { if ($('#ofSalaryAmount')) $('#ofSalaryAmount').value = $('#ofSalaryRange').value; });
  $('#ofSalaryAmount')?.addEventListener('input', () => { if ($('#ofSalaryRange')) $('#ofSalaryRange').value = $('#ofSalaryAmount').value; });

  // Photo
  $('#choosePhotoBtn')?.addEventListener('click', () => $('#photoFileInput')?.click());
  $('#photoFileInput')?.addEventListener('change', (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { if ($('#photoPreview')) $('#photoPreview').src = reader.result; };
    reader.readAsDataURL(file);
  });
  $('#photoUrlInput')?.addEventListener('input', () => {
    const url = $('#photoUrlInput').value;
    if (url && $('#photoPreview')) $('#photoPreview').src = url;
  });
  $('#useCurrentPhotoBtn')?.addEventListener('click', () => {
    if ($('#photoPreview') && $('#profilePhoto')) $('#photoPreview').src = $('#profilePhoto').src;
  });
  $('#clearPhotoChoiceBtn')?.addEventListener('click', () => {
    if ($('#photoUrlInput')) $('#photoUrlInput').value = '';
    if ($('#photoPreview')) $('#photoPreview').src = PHOTO_FALLBACK + encodeURIComponent(currentUser?.name || 'User');
  });
  $('#resetPhotoBtn')?.addEventListener('click', () => $('#photoDialog')?.showModal());
  $('#photoForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const photoUrl = $('#photoUrlInput').value || $('#photoPreview')?.src;
    try {
      const data = await api('/api/profile/photo', { method: 'POST', body: JSON.stringify({ photoUrl }) });
      renderProfile(data.user);
      closeDialogs();
      toast('Foto atualizada!', 'success');
    } catch (err) { toast(err.message, 'error'); }
  });

  // Drag & drop for photo
  const dropZone = $('#photoDropZone');
  if (dropZone) {
    dropZone.addEventListener('dragover', (e) => { e.preventDefault(); dropZone.classList.add('dragover'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
    dropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropZone.classList.remove('dragover');
      const file = e.dataTransfer.files[0];
      if (!file?.type.startsWith('image/')) return;
      const reader = new FileReader();
      reader.onload = () => { if ($('#photoPreview')) $('#photoPreview').src = reader.result; };
      reader.readAsDataURL(file);
    });
  }
}

// ===== BOOT =====
async function boot() {
  wireTabs();
  wireForms();

  // Set date
  if ($('#topbarDate')) $('#topbarDate').textContent = today();

  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return showApp(false);

  showApp(true);
  try {
    await refresh();
  } catch {
    localStorage.removeItem(TOKEN_KEY);
    showApp(false);
  }
}

boot();
