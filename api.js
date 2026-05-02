import { firebaseConfig, isFirebaseConfigured } from './firebase-config.js';
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js';
import {
  getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword,
  signOut, onAuthStateChanged, updateProfile
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js';
import {
  getFirestore, doc, setDoc, getDoc, updateDoc, collection,
  addDoc, query, where, orderBy, getDocs, serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js';

const PHOTO_URL = 'https://plus.unsplash.com/premium_photo-1692241091501-984a8a0c35ef?fm=jpg&q=60&w=3000&ixlib=rb-4.1.0&ixid=M3wxMjA3fDB8MHxwaG90by1yZWxhdGVkfDE2fHx8ZW58MHx8fHx8';
let auth = null;
let db = null;

if (isFirebaseConfigured) {
  const app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
}

const fallbackKey = 'deas-finance-demo';
const initialDemo = {
  user: { uid: 'demo-daniel', name: 'Daniel Augusto', email: 'daniel@deasfinance.com', photoURL: PHOTO_URL },
  account: { balance: 12500, debt: 2500, limit: 8600, creditScore: 742, preApproved: 4000, loansTotal: 1000 },
  transactions: [
    { creditor: 'Depósito Pix', date: '2026-05-02', value: 8500, status: 'pago', type: 'entrada' },
    { creditor: 'Mercado Central', date: '2026-05-01', value: -160, status: 'pago', type: 'saída' },
    { creditor: 'Empréstimo pessoal', date: '2026-04-28', value: 1000, status: 'pendente', type: 'crédito' }
  ],
  connections: []
};

function loadDemo() {
  const saved = localStorage.getItem(fallbackKey);
  return saved ? JSON.parse(saved) : structuredClone(initialDemo);
}
function saveDemo(data) { localStorage.setItem(fallbackKey, JSON.stringify(data)); }
function money(value) { return Number(value || 0); }
function today() { return new Date().toISOString().slice(0, 10); }

export function usingDemoMode() { return !isFirebaseConfigured; }

export function watchAuth(callback) {
  if (!auth) return callback(loadDemo().user);
  return onAuthStateChanged(auth, callback);
}

export async function registerUser(name, email, password) {
  if (!auth) {
    const data = loadDemo();
    data.user = { uid: crypto.randomUUID(), name, email, photoURL: PHOTO_URL };
    saveDemo(data);
    return data.user;
  }
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName: name, photoURL: PHOTO_URL });
  const account = { balance: 0, debt: 0, limit: 1200, creditScore: 500, preApproved: 0, loansTotal: 0 };
  await setDoc(doc(db, 'users', cred.user.uid), { name, email, photoURL: PHOTO_URL, createdAt: serverTimestamp() });
  await setDoc(doc(db, 'accounts', cred.user.uid), account);
  return cred.user;
}

export async function loginUser(email, password) {
  if (!auth) {
    const data = loadDemo();
    data.user.email = email || data.user.email;
    saveDemo(data);
    return data.user;
  }
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
}

export async function logoutUser() {
  if (!auth) return true;
  await signOut(auth);
  return true;
}

export async function getCurrentProfile(user) {
  if (!db) return loadDemo().user;
  const snap = await getDoc(doc(db, 'users', user.uid));
  return snap.exists() ? { uid: user.uid, ...snap.data() } : {
    uid: user.uid, name: user.displayName || 'Cliente Deas', email: user.email, photoURL: user.photoURL || PHOTO_URL
  };
}

export async function getAccount(userId) {
  if (!db) return loadDemo().account;
  const snap = await getDoc(doc(db, 'accounts', userId));
  return snap.exists() ? snap.data() : { balance: 0, debt: 0, limit: 0, creditScore: 500, preApproved: 0, loansTotal: 0 };
}

export async function getTransactions(userId) {
  if (!db) return loadDemo().transactions;
  const q = query(collection(db, 'transactions'), where('userId', '==', userId), orderBy('createdAt', 'desc'));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getConnections(userId) {
  if (!db) return loadDemo().connections;
  const q = query(collection(db, 'openFinanceConnections'), where('userId', '==', userId));
  const snap = await getDocs(q);
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function addTransaction(userId, tx) {
  if (!db) {
    const data = loadDemo();
    data.transactions.unshift({ ...tx, date: today() });
    saveDemo(data);
    return;
  }
  await addDoc(collection(db, 'transactions'), { userId, ...tx, createdAt: serverTimestamp(), date: today() });
}

export async function deposit(userId, amount) {
  amount = money(amount);
  if (!db) {
    const data = loadDemo();
    data.account.balance += amount;
    data.transactions.unshift({ creditor: 'Depósito Deas', date: today(), value: amount, status: 'pago', type: 'entrada' });
    saveDemo(data);
    return data.account;
  }
  const account = await getAccount(userId);
  const updated = { ...account, balance: money(account.balance) + amount };
  await updateDoc(doc(db, 'accounts', userId), updated);
  await addTransaction(userId, { creditor: 'Depósito Deas', value: amount, status: 'pago', type: 'entrada' });
  return updated;
}

export async function makePix(userId, amount, creditor = 'Pix enviado') {
  amount = money(amount);
  if (!db) {
    const data = loadDemo();
    data.account.balance -= amount;
    data.transactions.unshift({ creditor, date: today(), value: -amount, status: 'pago', type: 'saída' });
    saveDemo(data);
    return data.account;
  }
  const account = await getAccount(userId);
  const updated = { ...account, balance: money(account.balance) - amount };
  await updateDoc(doc(db, 'accounts', userId), updated);
  await addTransaction(userId, { creditor, value: -amount, status: 'pago', type: 'saída' });
  return updated;
}

export async function requestLoan(userId, amount) {
  amount = money(amount);
  if (!db) {
    const data = loadDemo();
    data.account.balance += amount;
    data.account.debt += amount;
    data.account.loansTotal += amount;
    data.transactions.unshift({ creditor: 'Empréstimo Deas', date: today(), value: amount, status: 'pendente', type: 'crédito' });
    saveDemo(data);
    return data.account;
  }
  const account = await getAccount(userId);
  const updated = { ...account, balance: money(account.balance) + amount, debt: money(account.debt) + amount, loansTotal: money(account.loansTotal) + amount };
  await updateDoc(doc(db, 'accounts', userId), updated);
  await addTransaction(userId, { creditor: 'Empréstimo Deas', value: amount, status: 'pendente', type: 'crédito' });
  return updated;
}

export async function payDebt(userId, amount) {
  amount = money(amount);
  if (!db) {
    const data = loadDemo();
    const paid = Math.min(amount, data.account.debt, data.account.balance);
    data.account.balance -= paid;
    data.account.debt -= paid;
    data.transactions.unshift({ creditor: 'Pagamento de dívida', date: today(), value: -paid, status: 'pago', type: 'saída' });
    saveDemo(data);
    return data.account;
  }
  const account = await getAccount(userId);
  const paid = Math.min(amount, money(account.debt), money(account.balance));
  const updated = { ...account, balance: money(account.balance) - paid, debt: money(account.debt) - paid };
  await updateDoc(doc(db, 'accounts', userId), updated);
  await addTransaction(userId, { creditor: 'Pagamento de dívida', value: -paid, status: 'pago', type: 'saída' });
  return updated;
}

export async function connectExternalBank(userId, institutionName, apiUrl, consentToken) {
  let externalData = { balance: 0, creditScore: 0 };
  try {
    const response = await fetch(`${apiUrl.replace(/\/$/, '')}/sync`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${consentToken}` },
      body: JSON.stringify({ requester: 'Deas Finance', userId })
    });
    if (response.ok) externalData = await response.json();
  } catch (error) {
    console.warn('Falha ao sincronizar banco parceiro. Salvando conexão local.', error);
  }

  const connection = {
    institutionName,
    apiUrl,
    consentTokenMasked: `${consentToken.slice(0, 4)}••••`,
    externalBalance: money(externalData.balance),
    externalScore: money(externalData.creditScore),
    connectedAt: today()
  };

  if (!db) {
    const data = loadDemo();
    data.connections.unshift(connection);
    saveDemo(data);
    return connection;
  }
  await addDoc(collection(db, 'openFinanceConnections'), { userId, ...connection, createdAt: serverTimestamp() });
  return connection;
}
