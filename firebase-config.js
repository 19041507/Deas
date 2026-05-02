import {
  watchAuth, registerUser, loginUser, logoutUser, getCurrentProfile, getAccount,
  getTransactions, getConnections, deposit, makePix, requestLoan, payDebt,
  connectExternalBank, usingDemoMode
} from './api.js';

let currentUser = null;
let currentProfile = null;

const $ = (selector) => document.querySelector(selector);
const money = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const toast = (msg) => { const el = $('#toast'); el.textContent = msg; el.classList.add('show'); setTimeout(() => el.classList.remove('show'), 3200); };

function showApp(show) {
  $('#authPage').classList.toggle('hidden', show);
  $('#appPage').classList.toggle('hidden', !show);
}

function renderAccount(account) {
  $('#balanceValue').textContent = money(account.balance);
  $('#debtValue').textContent = money(account.debt);
  $('#limitValue').textContent = money(account.limit);
  $('#preApprovedValue').textContent = money(account.preApproved);
  $('#loansTotal').textContent = money(account.loansTotal);
  $('#creditScore').textContent = account.creditScore || 500;
  $('#scoreRing').style.setProperty('--score', `${Math.min(100, (account.creditScore || 500) / 10)}%`);
}

function renderProfile(profile) {
  const name = profile.name || profile.displayName || 'Daniel Augusto';
  const email = profile.email || 'daniel@deasfinance.com';
  const photo = profile.photoURL || $('#profilePhoto').src;
  $('#welcomeName').textContent = `Olá, ${name.split(' ')[0]}`;
  $('#userEmail').textContent = email;
  $('#profileName').textContent = name;
  $('#profileEmail').textContent = email;
  $('#profilePhoto').src = photo;
  $('#profilePhotoLarge').src = photo;
}

function renderTransactions(transactions) {
  $('#transactionsBody').innerHTML = transactions.map(tx => `
    <tr>
      <td><strong>${tx.creditor}</strong><br><small>${tx.type || 'movimentação'}</small></td>
      <td>${tx.date || '-'}</td>
      <td class="${Number(tx.value) < 0 ? 'danger' : ''}">${money(tx.value)}</td>
      <td><span class="status ${tx.status === 'pago' ? 'pago' : 'pendente'}">${tx.status}</span></td>
      <td><button class="secondary-btn">Detalhes</button></td>
    </tr>
  `).join('') || '<tr><td colspan="5">Nenhuma movimentação encontrada.</td></tr>';
}

function renderConnections(connections) {
  $('#connectionsList').innerHTML = connections.map(c => `
    <div class="connection-item">
      <div>
        <strong>${c.institutionName}</strong>
        <p class="muted">Saldo externo: ${money(c.externalBalance)} · Score externo: ${c.externalScore || 0}</p>
      </div>
      <span class="status pago">Conectado</span>
    </div>
  `).join('') || '<p class="muted">Nenhuma instituição conectada ainda.</p>';
}

async function refresh() {
  if (!currentUser) return;
  currentProfile = await getCurrentProfile(currentUser);
  const userId = currentUser.uid;
  const [account, transactions, connections] = await Promise.all([
    getAccount(userId), getTransactions(userId), getConnections(userId)
  ]);
  renderProfile(currentProfile);
  renderAccount(account);
  renderTransactions(transactions);
  renderConnections(connections);
}

watchAuth(async (user) => {
  currentUser = user;
  showApp(!!user);
  if (user) {
    await refresh();
    if (usingDemoMode()) toast('Modo demonstração ativo. Configure o Firebase para salvar online.');
  }
});

document.querySelectorAll('[data-auth-tab]').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('[data-auth-tab]').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.form').forEach(f => f.classList.remove('active'));
  btn.classList.add('active');
  $(`#${btn.dataset.authTab}Form`).classList.add('active');
}));

document.querySelectorAll('[data-view]').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('[data-view]').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  btn.classList.add('active');
  $(`#${btn.dataset.view}`).classList.add('active');
}));

$('#openTerms').addEventListener('click', (e) => { e.preventDefault(); $('#termsDialog').showModal(); });
$('#acceptTermsBtn').addEventListener('click', () => { $('#acceptTerms').checked = true; $('#termsDialog').close(); });

$('#loginForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  if (!$('#acceptTerms').checked) return toast('Aceite os termos para continuar.');
  try {
    currentUser = await loginUser($('#loginEmail').value, $('#loginPassword').value);
    showApp(true); await refresh(); toast('Login realizado com sucesso.');
  } catch (error) { toast(error.message); }
});

$('#registerForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  try {
    currentUser = await registerUser($('#registerName').value, $('#registerEmail').value, $('#registerPassword').value);
    showApp(true); await refresh(); toast('Conta criada com sucesso.');
  } catch (error) { toast(error.message); }
});

$('#logoutBtn').addEventListener('click', () => $('#confirmLogout').showModal());
$('#cancelLogout').addEventListener('click', () => $('#confirmLogout').close());
$('#confirmLogoutBtn').addEventListener('click', async () => { await logoutUser(); currentUser = null; $('#confirmLogout').close(); showApp(false); });

$('#depositBtn').addEventListener('click', async () => {
  const amount = prompt('Valor do depósito:', '500');
  if (!amount) return;
  await deposit(currentUser.uid, amount); await refresh(); toast('Depósito realizado.');
});
$('#pixBtn').addEventListener('click', async () => {
  const creditor = prompt('Para quem será o Pix?', 'Favorecido Pix');
  const amount = prompt('Valor do Pix:', '100');
  if (!amount) return;
  await makePix(currentUser.uid, amount, creditor); await refresh(); toast('Pix enviado.');
});
$('#loanBtn').addEventListener('click', async () => {
  const amount = prompt('Valor do empréstimo:', '1000');
  if (!amount) return;
  await requestLoan(currentUser.uid, amount); await refresh(); toast('Empréstimo contratado.');
});
$('#payDebtBtn').addEventListener('click', async () => {
  const amount = prompt('Valor para pagar da dívida:', '500');
  if (!amount) return;
  await payDebt(currentUser.uid, amount); await refresh(); toast('Pagamento realizado.');
});

$('#openFinanceForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  await connectExternalBank(currentUser.uid, $('#institutionName').value, $('#partnerApiUrl').value, $('#consentToken').value);
  await refresh();
  toast('Instituição conectada ao Deas Finance.');
});
