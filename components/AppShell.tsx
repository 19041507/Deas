"use client";
import { useEffect, useState, createContext, useContext, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

const LOGO = `<svg viewBox="0 0 96 96" fill="none"><path d="M48 7 78 17v30c0 19-12 34-30 42-18-8-30-23-30-42V17L48 7Zm0 8.6L26 23v23.8c0 13.8 8.1 25.4 22 32.6 13.9-7.2 22-18.8 22-32.6V23l-22-7.4Z" fill="#f2b84b"/><path d="M31 55h9v14h-9V55Zm14-10h9v24h-9V45Zm14-12h9v36h-9V33Z" fill="#ffd977"/></svg>`;

type User = { id:string; name:string; email:string; photoURL?:string };
type Account = { balance:number; limit:number; debt:number; creditScore:number; preApproved:number; loansTotal:number; estimatedIncome:number };
type AppData = { user:User|null; account:Account|null; refresh:()=>void; toast:(m:string,t?:string)=>void };

export const AppCtx = createContext<AppData>({user:null,account:null,refresh:()=>{},toast:()=>{}});
export const useApp = () => useContext(AppCtx);

const money = (v:number) => Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const AVATAR = (name:string) => `https://ui-avatars.com/api/?background=F2B84B&color=111827&bold=true&size=128&name=${encodeURIComponent(name)}`;

const LINKS = [
  {href:"/dashboard",icon:"🏠",label:"Início",group:"Conta"},
  {href:"/extrato",icon:"📄",label:"Extrato",group:"Conta"},
  {href:"/pix",icon:"⚡",label:"Pix",group:"Conta"},
  {href:"/deposito",icon:"⬇️",label:"Depósito",group:"Conta"},
  {href:"/dividas",icon:"📋",label:"Dívidas",group:"Crédito"},
  {href:"/credito",icon:"💳",label:"Crédito",group:"Crédito"},
  {href:"/open-finance",icon:"🔗",label:"Open Finance",group:"Dados"},
  {href:"/perfil",icon:"👤",label:"Perfil",group:"Dados"},
];
const MOBILE_LINKS = [
  {href:"/dashboard",icon:"🏠",label:"Início"},
  {href:"/extrato",icon:"📄",label:"Extrato"},
  {href:"/pix",icon:"⚡",label:"Pix"},
  {href:"/credito",icon:"💳",label:"Crédito"},
  {href:"/perfil",icon:"👤",label:"Perfil"},
];

function toast(msg: string, type = "info") {
  const root = document.getElementById("toast-root");
  if (!root) return;
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-msg">${msg}</span><button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;
  root.appendChild(el);
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 240); }, 4200);
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [user, setUser] = useState<User|null>(null);
  const [account, setAccount] = useState<Account|null>(null);
  const [balVis, setBalVis] = useState(true);
  const [logoutOpen, setLogoutOpen] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const r = await fetch("/api/auth/me");
      if (r.status === 401) { router.push("/login"); return; }
      const data = await r.json();
      setUser(data.user);
      setAccount(data.account);
    } catch {}
  }, [router]);

  useEffect(() => { refresh(); }, [refresh]);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const groups = ["Conta","Crédito","Dados"];
  const photo = user?.photoURL || AVATAR(user?.name || "U");

  return (
    <AppCtx.Provider value={{user, account, refresh, toast}}>
      <div className="app-layout">
        <aside className="sidebar">
          <div className="sb-logo">
            <div className="logo-box sm" dangerouslySetInnerHTML={{__html:LOGO}} />
            <div className="brand-name"><span>Deas</span><b>Finance</b></div>
          </div>
          {groups.map(g => (
            <div key={g} className="sb-group">
              <div className="sb-group-label">{g}</div>
              {LINKS.filter(l=>l.group===g).map(l => (
                <Link key={l.href} href={l.href} className={`nav-link ${pathname===l.href?"active":""}`}>
                  <span className="nav-icon">{l.icon}</span>{l.label}
                </Link>
              ))}
            </div>
          ))}
          <div className="sb-spacer" />
          <div className="sb-balance">
            <span className="sb-balance-label">Saldo disponível</span>
            <div className={`sb-balance-val ${!balVis?"blur":""}`}>{money(account?.balance||0)}</div>
          </div>
          <button className="sb-logout" onClick={()=>setLogoutOpen(true)}>🚪 Sair da conta</button>
        </aside>

        <div className="content-area">
          <header className="topbar">
            <div className="tb-left">
              <p className="eyebrow">Deas Finance · Simulação bancária</p>
              <h2>{user?.name?.split(" ")[0] ? `Olá, ${user.name.split(" ")[0]} 👋` : "Carregando..."}</h2>
            </div>
            <div className="tb-right">
              <button className="btn-icon" title="{balVis?'Ocultar saldo':'Mostrar saldo'}" onClick={()=>setBalVis(p=>!p)}>{balVis?"👁":"🙈"}</button>
              <Link href="/perfil" className="profile-chip">
                <img src={photo} alt="Foto do perfil" />
                <span>{user?.name?.split(" ")[0]||"Usuário"}</span>
              </Link>
            </div>
          </header>
          {children}
        </div>

        <nav className="mobile-nav">
          {MOBILE_LINKS.map(l => (
            <Link key={l.href} href={l.href} className={`mn-item ${pathname===l.href?"active":""}`}>
              <span className="mn-icon">{l.icon}</span>{l.label}
            </Link>
          ))}
        </nav>
      </div>

      {logoutOpen && (
        <dialog open>
          <div className="dlg-head"><h3>Sair da conta?</h3><p className="muted">Você será desconectado deste dispositivo.</p></div>
          <div className="dlg-body">
            <div className="dlg-actions">
              <button className="btn btn-secondary" onClick={()=>setLogoutOpen(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={logout}>🚪 Sair com segurança</button>
            </div>
          </div>
        </dialog>
      )}
    </AppCtx.Provider>
  );
}
