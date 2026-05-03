import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  updateProfile,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  getDocs,
  serverTimestamp,
  increment,
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { CURRENT_BANK, BANKS, firebaseConfigs } from "./firebaseConfig.js";

const BANK = BANKS[CURRENT_BANK];
const PARTNER = BANKS[BANK.partnerId];
const appLocal = initializeApp(firebaseConfigs[CURRENT_BANK], `app-${CURRENT_BANK}`);
const appPartner = initializeApp(firebaseConfigs[BANK.partnerId], `app-${BANK.partnerId}`);
const localAuth = getAuth(appLocal);
const partnerAuth = getAuth(appPartner);
const localDb = getFirestore(appLocal);
const partnerDb = getFirestore(appPartner);

const $ = (id) => document.getElementById(id);
const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
const emailKey = (email) => String(email || "").trim().toLowerCase().replace(/[^a-z0-9]/g, "_");
const initials = (nameOrEmail) => String(nameOrEmail || "U").split(/[\s@.]+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join("") || "U";

let mode = "login";
let localUser = null;
let partnerUser = null;
let localAccount = null;
let partnerAccount = null;
let activeRequest = null;
let activeConnection = null;

const defaultAccount = (user, fullName = "") => ({
  uid: user.uid,
  email: user.email,
  fullName: fullName || user.displayName || user.email?.split("@")[0] || "Cliente",
  bankId: CURRENT_BANK,
  bankName: BANK.name,
  availableBalance: CURRENT_BANK === "deasbank" ? 2450 : 1670,
  creditScore: CURRENT_BANK === "deasbank" ? 720 : 860,
  salary: CURRENT_BANK === "deasbank" ? 3800 : 4200,
  debts: CURRENT_BANK === "deasbank" ? 650 : 120,
  creditScoreFinal: CURRENT_BANK === "deasbank" ? 720 : 860,
  openFinanceScoreImpact: 0,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

function showToast(message, isError = false) {
  const toast = $("toast");
  toast.textContent = message;
  toast.style.borderLeft = isError ? "6px solid var(--danger)" : "6px solid var(--success)";
  toast.hidden = false;
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => { toast.hidden = true; }, 4500);
}

function friendlyError(error) {
  const code = error?.code || "";
  if (code.includes("auth/invalid-credential") || code.includes("auth/wrong-password")) return "E-mail ou senha incorretos.";
  if (code.includes("auth/email-already-in-use")) return "Este e-mail já existe. Tente entrar em vez de cadastrar.";
  if (code.includes("auth/weak-password")) return "A senha precisa ter pelo menos 6 caracteres.";
  if (code.includes("permission-denied")) return "Permissão negada no Firestore. Publique o firestore.rules deste ZIP nos dois Firebase.";
  return error?.message || "Ocorreu um erro inesperado.";
}

function setLoading(button, loading, text = "Aguarde...") {
  if (!button) return;
  if (loading) {
    button.dataset.oldText = button.textContent;
    button.textContent = text;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.oldText || button.textContent;
    button.disabled = false;
  }
}

function setupBrand() {
  document.title = `Open Finance ${BANK.name}`;
  $("authTitle").textContent = BANK.name;
  $("bankNameAside").textContent = BANK.name;
  $("pageTitle").textContent = `Open Finance ${BANK.name}`;
  $("pageSubtitle").textContent = `Conecte ${PARTNER.name}, compartilhe dados com consentimento e veja o impacto real no score.`;
  $("connectionTitle").textContent = `Conexão com ${PARTNER.name}`;
  $("requestConnectionBtn").textContent = `Pedir conexão ao ${PARTNER.name}`;
  $("partnerBankBadge").textContent = PARTNER.name;
}

function switchMode(nextMode) {
  mode = nextMode;
  $("loginTab").classList.toggle("active", mode === "login");
  $("registerTab").classList.toggle("active", mode === "register");
  $("nameField").hidden = mode !== "register";
  $("authButton").textContent = mode === "login" ? "Entrar" : "Cadastrar";
}

async function ensurePartnerUser(email, password, fullName) {
  try {
    const credential = await createUserWithEmailAndPassword(partnerAuth, email, password);
    if (fullName) await updateProfile(credential.user, { displayName: fullName });
    return credential.user;
  } catch (error) {
    if (error.code === "auth/email-already-in-use") {
      return (await signInWithEmailAndPassword(partnerAuth, email, password)).user;
    }
    throw error;
  }
}

async function ensureAccount(db, user, bankId, fullName = "") {
  const accountRef = doc(db, "users", user.uid);
  const snap = await getDoc(accountRef);
  if (!snap.exists()) {
    const account = {
      ...defaultAccount(user, fullName),
      bankId,
      bankName: BANKS[bankId].name,
      availableBalance: bankId === "deasbank" ? 2450 : 1670,
      creditScore: bankId === "deasbank" ? 720 : 860,
      salary: bankId === "deasbank" ? 3800 : 4200,
      debts: bankId === "deasbank" ? 650 : 120,
      creditScoreFinal: bankId === "deasbank" ? 720 : 860,
    };
    await setDoc(accountRef, account, { merge: true });
    return account;
  }
  return { ...snap.data(), uid: user.uid };
}

async function addHistory(db, user, type, title, description, extra = {}) {
  const id = `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  await setDoc(doc(db, "openFinanceHistory", id), {
    id,
    userEmail: user.email,
    userKey: emailKey(user.email),
    bankId: extra.bankId || CURRENT_BANK,
    partnerBankId: extra.partnerBankId || BANK.partnerId,
    type,
    title,
    description,
    hiddenFor: [],
    createdAt: serverTimestamp(),
  });
}

async function addHistoryBoth(type, title, description) {
  await Promise.allSettled([
    addHistory(localDb, localUser, type, title, description, { bankId: CURRENT_BANK, partnerBankId: BANK.partnerId }),
    partnerUser ? addHistory(partnerDb, partnerUser, type, title, description, { bankId: BANK.partnerId, partnerBankId: CURRENT_BANK }) : Promise.resolve(),
  ]);
}

async function handleAuth(event) {
  event.preventDefault();
  const button = $("authButton");
  setLoading(button, true, mode === "login" ? "Entrando..." : "Cadastrando...");
  const email = $("email").value.trim().toLowerCase();
  const password = $("password").value;
  const fullName = $("fullName").value.trim() || email.split("@")[0];

  try {
    let localCredential;
    if (mode === "register") {
      localCredential = await createUserWithEmailAndPassword(localAuth, email, password);
      await updateProfile(localCredential.user, { displayName: fullName });
      partnerUser = await ensurePartnerUser(email, password, fullName);
      showToast("Conta criada nos dois bancos para o Open Finance funcionar.");
    } else {
      localCredential = await signInWithEmailAndPassword(localAuth, email, password);
      try {
        partnerUser = (await signInWithEmailAndPassword(partnerAuth, email, password)).user;
      } catch (partnerError) {
        showToast(`Entrou no ${BANK.name}, mas não consegui entrar no ${PARTNER.name}. Cadastre a mesma conta nos dois bancos.`, true);
      }
    }
    localUser = localCredential.user;
    await bootDashboard();
  } catch (error) {
    showToast(friendlyError(error), true);
  } finally {
    setLoading(button, false);
  }
}

async function bootDashboard() {
  if (!localUser) return;
  if (!partnerUser && partnerAuth.currentUser) partnerUser = partnerAuth.currentUser;

  localAccount = await ensureAccount(localDb, localUser, CURRENT_BANK, localUser.displayName || "");
  if (partnerUser) partnerAccount = await ensureAccount(partnerDb, partnerUser, BANK.partnerId, localUser.displayName || "");

  $("authScreen").hidden = true;
  $("dashboard").hidden = false;
  await refreshAll();
}

async function loadAccounts() {
  const localSnap = await getDoc(doc(localDb, "users", localUser.uid));
  localAccount = localSnap.exists() ? { ...localSnap.data(), uid: localUser.uid } : await ensureAccount(localDb, localUser, CURRENT_BANK);
  if (partnerUser) {
    const partnerSnap = await getDoc(doc(partnerDb, "users", partnerUser.uid));
    partnerAccount = partnerSnap.exists() ? { ...partnerSnap.data(), uid: partnerUser.uid } : await ensureAccount(partnerDb, partnerUser, BANK.partnerId);
  }
}

function renderAccount() {
  const displayName = localAccount?.fullName || localUser?.displayName || "Cliente";
  $("userName").textContent = displayName;
  $("userEmail").textContent = localUser.email;
  $("userInitials").textContent = initials(displayName || localUser.email);
  $("availableBalance").textContent = BRL.format(Number(localAccount?.availableBalance || 0));
  $("baseScore").textContent = Math.round(localAccount?.creditScore || 0);
  $("finalScore").textContent = Math.round(localAccount?.creditScoreFinal || localAccount?.creditScore || 0);
  const impact = Number(localAccount?.openFinanceScoreImpact || 0);
  $("scoreImpactText").textContent = impact === 0 ? "Sem impacto ainda" : `${impact > 0 ? "+" : ""}${impact} pontos aplicados`;
  $("balanceInput").value = Number(localAccount?.availableBalance || 0);
  $("scoreInput").value = Number(localAccount?.creditScore || 0);
  $("salaryInput").value = Number(localAccount?.salary || 0);
  $("debtInput").value = Number(localAccount?.debts || 0);
  $("partnerScore").textContent = partnerAccount ? Math.round(partnerAccount.creditScoreFinal || partnerAccount.creditScore || 0) : "--";
  $("scoreImpact").textContent = impact === 0 ? "--" : `${impact > 0 ? "+" : ""}${impact}`;
}

async function loadConnectionState() {
  activeRequest = null;
  activeConnection = null;

  const connectionSnap = await getDoc(doc(localDb, "users", localUser.uid, "openFinanceConnections", BANK.partnerId));
  if (connectionSnap.exists()) activeConnection = connectionSnap.data();

  const q1 = query(
    collection(localDb, "openFinanceRequests"),
    where("userKey", "==", emailKey(localUser.email)),
    where("banks", "array-contains", CURRENT_BANK)
  );
  const requestDocs = await getDocs(q1);
  requestDocs.forEach((requestDoc) => {
    const item = { id: requestDoc.id, ...requestDoc.data() };
    if (["pending", "approved"].includes(item.status)) activeRequest = item;
  });
}

function renderConnection() {
  const status = $("connectionStatus");
  const requestBtn = $("requestConnectionBtn");
  const acceptBtn = $("acceptConnectionBtn");
  const syncBtn = $("syncButton");
  const disconnectBtn = $("disconnectButton");

  status.className = "status-pill";
  requestBtn.hidden = false;
  acceptBtn.hidden = true;
  syncBtn.disabled = false;
  disconnectBtn.disabled = false;

  if (activeConnection?.status === "active") {
    status.textContent = "Conectado";
    status.classList.add("active");
    $("connectionMessage").textContent = `${BANK.name} conectado ao ${PARTNER.name}`;
    $("connectionDetails").textContent = "Dados sincronizados, vínculo confirmado e score impactado pelo Open Finance.";
    requestBtn.hidden = true;
    $("samePerson").textContent = "Sim, vínculo mútuo";
    return;
  }

  if (activeRequest?.status === "pending") {
    status.textContent = "Aguardando aceite";
    status.classList.add("pending");
    $("connectionMessage").textContent = activeRequest.targetBank === CURRENT_BANK ? "Pedido recebido do banco parceiro" : "Pedido enviado ao banco parceiro";
    $("connectionDetails").textContent = activeRequest.targetBank === CURRENT_BANK
      ? `Aceite para conectar ${BANK.name} com ${PARTNER.name}.`
      : `Abra o ${PARTNER.name} com a mesma conta e aceite a conexão.`;
    requestBtn.hidden = activeRequest.requesterBank === CURRENT_BANK;
    acceptBtn.hidden = activeRequest.targetBank !== CURRENT_BANK;
    $("samePerson").textContent = activeRequest.sameOwner ? "Pendente de confirmação" : "Não confirmado";
    return;
  }

  status.textContent = "Não conectado";
  $("connectionMessage").textContent = "Nenhuma conexão ativa";
  $("connectionDetails").textContent = `Solicite conexão ao ${PARTNER.name}. Depois abra o outro banco e aceite.`;
  $("samePerson").textContent = "Não confirmado";
}

async function requestConnection() {
  const btn = $("requestConnectionBtn");
  setLoading(btn, true, "Enviando...");
  try {
    const requestId = `of_${emailKey(localUser.email)}_${CURRENT_BANK}_${BANK.partnerId}`;
    const payload = {
      id: requestId,
      userKey: emailKey(localUser.email),
      userEmail: localUser.email,
      requesterBank: CURRENT_BANK,
      targetBank: BANK.partnerId,
      banks: [CURRENT_BANK, BANK.partnerId],
      status: "pending",
      sameOwner: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    };
    await Promise.all([
      setDoc(doc(localDb, "openFinanceRequests", requestId), payload, { merge: true }),
      setDoc(doc(partnerDb, "openFinanceRequests", requestId), payload, { merge: true }),
    ]);
    await addHistoryBoth("request", "Pedido de conexão criado", `${BANK.name} pediu conexão ao ${PARTNER.name}.`);
    showToast("Pedido criado. Abra o banco parceiro e aceite a conexão.");
    await refreshAll();
  } catch (error) {
    showToast(friendlyError(error), true);
  } finally {
    setLoading(btn, false);
  }
}

async function acceptConnection() {
  if (!activeRequest) return showToast("Nenhum pedido pendente encontrado.", true);
  const btn = $("acceptConnectionBtn");
  setLoading(btn, true, "Aceitando...");
  try {
    const approved = { ...activeRequest, status: "approved", acceptedBy: CURRENT_BANK, acceptedAt: serverTimestamp(), updatedAt: serverTimestamp() };
    await Promise.all([
      setDoc(doc(localDb, "openFinanceRequests", activeRequest.id), approved, { merge: true }),
      setDoc(doc(partnerDb, "openFinanceRequests", activeRequest.id), approved, { merge: true }),
      setDoc(doc(localDb, "users", localUser.uid, "openFinanceConnections", BANK.partnerId), {
        partnerBank: BANK.partnerId,
        partnerName: PARTNER.name,
        status: "active",
        sameOwner: true,
        linkedEmail: localUser.email,
        requestId: activeRequest.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true }),
      partnerUser ? setDoc(doc(partnerDb, "users", partnerUser.uid, "openFinanceConnections", CURRENT_BANK), {
        partnerBank: CURRENT_BANK,
        partnerName: BANK.name,
        status: "active",
        sameOwner: true,
        linkedEmail: localUser.email,
        requestId: activeRequest.id,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      }, { merge: true }) : Promise.resolve(),
    ]);
    await addHistoryBoth("approved", "Conexão aprovada", `${CURRENT_BANK === activeRequest.targetBank ? BANK.name : PARTNER.name} aceitou o vínculo Open Finance.`);
    await syncOpenFinance();
    showToast("Conexão aceita e sincronizada nos dois bancos.");
  } catch (error) {
    showToast(friendlyError(error), true);
  } finally {
    setLoading(btn, false);
    await refreshAll();
  }
}

function calculateScoreImpact(local, partner) {
  if (!partner) return { impact: 0, finalScore: clamp(local.creditScore, 0, 1000) };
  const localScore = Number(local.creditScore || 0);
  const partnerScore = Number(partner.creditScoreFinal || partner.creditScore || 0);
  const scoreDifferenceImpact = Math.round((partnerScore - localScore) * 0.22);
  const salaryBonus = Math.min(35, Math.round(Number(partner.salary || 0) / 900));
  const debtPenalty = Math.min(80, Math.round(Number(partner.debts || 0) / 120));
  const impact = clamp(scoreDifferenceImpact + salaryBonus - debtPenalty, -140, 140);
  const finalScore = clamp(localScore + impact, 0, 1000);
  return { impact, finalScore };
}

async function syncOpenFinance() {
  const btn = $("syncButton");
  setLoading(btn, true, "Sincronizando...");
  try {
    await loadAccounts();
    await loadConnectionState();
    if (!activeConnection?.status && !activeRequest) {
      return showToast("Crie ou aceite a conexão antes de sincronizar.", true);
    }
    const { impact, finalScore } = calculateScoreImpact(localAccount, partnerAccount);
    await updateDoc(doc(localDb, "users", localUser.uid), {
      partnerBank: BANK.partnerId,
      partnerScore: Number(partnerAccount?.creditScoreFinal || partnerAccount?.creditScore || 0),
      partnerSalary: Number(partnerAccount?.salary || 0),
      partnerDebts: Number(partnerAccount?.debts || 0),
      openFinanceScoreImpact: impact,
      creditScoreFinal: finalScore,
      sameOwner: true,
      openFinanceUpdatedAt: serverTimestamp(),
    });
    if (partnerUser && partnerAccount) {
      const partnerImpact = calculateScoreImpact(partnerAccount, localAccount);
      await updateDoc(doc(partnerDb, "users", partnerUser.uid), {
        partnerBank: CURRENT_BANK,
        partnerScore: Number(localAccount?.creditScoreFinal || localAccount?.creditScore || 0),
        partnerSalary: Number(localAccount?.salary || 0),
        partnerDebts: Number(localAccount?.debts || 0),
        openFinanceScoreImpact: partnerImpact.impact,
        creditScoreFinal: partnerImpact.finalScore,
        sameOwner: true,
        openFinanceUpdatedAt: serverTimestamp(),
      });
    }
    await addHistoryBoth("sync", "Dados sincronizados", `Score recalculado com impacto Open Finance entre ${BANK.name} e ${PARTNER.name}.`);
    showToast("Dados sincronizados. O score foi recalculado de verdade.");
  } catch (error) {
    showToast(friendlyError(error), true);
  } finally {
    setLoading(btn, false);
    await refreshAll();
  }
}

async function saveAccountData() {
  const btn = $("saveAccountButton");
  setLoading(btn, true, "Salvando...");
  try {
    const score = clamp($("scoreInput").value, 0, 1000);
    const data = {
      availableBalance: Number($("balanceInput").value || 0),
      creditScore: score,
      salary: Number($("salaryInput").value || 0),
      debts: Number($("debtInput").value || 0),
      creditScoreFinal: score,
      openFinanceScoreImpact: 0,
      updatedAt: serverTimestamp(),
    };
    await updateDoc(doc(localDb, "users", localUser.uid), data);
    await addHistory(localDb, localUser, "account", "Dados da conta atualizados", "Saldo, salário, dívidas e score base foram atualizados.");
    showToast("Dados salvos. Clique em sincronizar para recalcular com Open Finance.");
    await refreshAll();
  } catch (error) {
    showToast(friendlyError(error), true);
  } finally {
    setLoading(btn, false);
  }
}

async function clearHistory() {
  const btn = $("clearHistoryButton");
  setLoading(btn, true, "Limpando...");
  try {
    const qh = query(collection(localDb, "openFinanceHistory"), where("userKey", "==", emailKey(localUser.email)));
    const docs = await getDocs(qh);
    await Promise.all(docs.docs.map((d) => deleteDoc(doc(localDb, "openFinanceHistory", d.id))));
    showToast("Histórico limpo neste banco.");
    await renderHistory();
  } catch (error) {
    showToast(friendlyError(error), true);
  } finally {
    setLoading(btn, false);
  }
}

async function disconnect() {
  const btn = $("disconnectButton");
  setLoading(btn, true, "Desconectando...");
  try {
    await Promise.allSettled([
      deleteDoc(doc(localDb, "users", localUser.uid, "openFinanceConnections", BANK.partnerId)),
      partnerUser ? deleteDoc(doc(partnerDb, "users", partnerUser.uid, "openFinanceConnections", CURRENT_BANK)) : Promise.resolve(),
      updateDoc(doc(localDb, "users", localUser.uid), {
        openFinanceScoreImpact: 0,
        creditScoreFinal: Number(localAccount?.creditScore || 0),
        sameOwner: false,
        partnerBank: null,
        partnerScore: null,
        openFinanceUpdatedAt: serverTimestamp(),
      }),
      partnerUser && partnerAccount ? updateDoc(doc(partnerDb, "users", partnerUser.uid), {
        openFinanceScoreImpact: 0,
        creditScoreFinal: Number(partnerAccount?.creditScore || 0),
        sameOwner: false,
        partnerBank: null,
        partnerScore: null,
        openFinanceUpdatedAt: serverTimestamp(),
      }) : Promise.resolve(),
    ]);
    await addHistoryBoth("disconnect", "Conexão encerrada", `A conexão entre ${BANK.name} e ${PARTNER.name} foi encerrada.`);
    showToast("Contas desconectadas.");
    await refreshAll();
  } catch (error) {
    showToast(friendlyError(error), true);
  } finally {
    setLoading(btn, false);
  }
}

async function renderHistory() {
  const list = $("historyList");
  list.innerHTML = "";
  const qh = query(collection(localDb, "openFinanceHistory"), where("userKey", "==", emailKey(localUser.email)));
  const docs = await getDocs(qh);
  const items = docs.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => String(b.id).localeCompare(String(a.id))).slice(0, 20);
  $("historyCount").textContent = `${items.length} registro${items.length === 1 ? "" : "s"}`;
  if (!items.length) {
    list.innerHTML = `<div class="history-empty">Nenhum histórico ainda.</div>`;
    return;
  }
  for (const item of items) {
    const created = item.createdAt?.toDate ? item.createdAt.toDate().toLocaleString("pt-BR") : "agora";
    const div = document.createElement("div");
    div.className = "history-item";
    div.innerHTML = `<div><strong>${item.title || "Evento"}</strong><p>${item.description || ""}</p></div><small>${created}</small>`;
    list.appendChild(div);
  }
}

async function refreshAll() {
  await loadAccounts();
  await loadConnectionState();
  renderAccount();
  renderConnection();
  await renderHistory();
}

async function logout() {
  await Promise.allSettled([signOut(localAuth), signOut(partnerAuth)]);
  localUser = null;
  partnerUser = null;
  localAccount = null;
  partnerAccount = null;
  activeRequest = null;
  activeConnection = null;
  $("dashboard").hidden = true;
  $("authScreen").hidden = false;
  showToast("Você saiu da conta.");
}

setupBrand();
$("loginTab").addEventListener("click", () => switchMode("login"));
$("registerTab").addEventListener("click", () => switchMode("register"));
$("authForm").addEventListener("submit", handleAuth);
$("logoutButton").addEventListener("click", logout);
$("requestConnectionBtn").addEventListener("click", requestConnection);
$("acceptConnectionBtn").addEventListener("click", acceptConnection);
$("syncButton").addEventListener("click", syncOpenFinance);
$("saveAccountButton").addEventListener("click", saveAccountData);
$("clearHistoryButton").addEventListener("click", clearHistory);
$("disconnectButton").addEventListener("click", disconnect);

onAuthStateChanged(localAuth, async (user) => {
  if (!user) return;
  localUser = user;
  if (partnerAuth.currentUser) partnerUser = partnerAuth.currentUser;
  try {
    await bootDashboard();
  } catch (error) {
    showToast(friendlyError(error), true);
  }
});
