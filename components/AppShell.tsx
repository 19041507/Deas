"use client";
import { useState, useEffect, useCallback, createContext, useContext } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Home, FileText, Zap, ArrowDownToLine, CreditCard, Link2, User, LogOut, Shield, Eye, EyeOff, Bell } from "lucide-react";

const money = (v: number, vis: boolean) => vis ? Number(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}) : "••••••";

// ── Toast (safe, no innerHTML) ──
function safeToast(msg: string, type = "info") {
  const root = document.getElementById("toast-root");
  if (!root) return;
  const icons: Record<string,string> = { success:"✅", error:"❌", info:"ℹ️", warning:"⚠️" };
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  const ico = document.createElement("span"); ico.textContent = icons[type]||"ℹ️"; ico.style.fontSize="17px";
  const span = document.createElement("span"); span.className="toast-msg"; span.textContent = msg;
  const btn = document.createElement("button"); btn.className="toast-close"; btn.textContent="×";
  btn.onclick = () => { el.classList.add("out"); setTimeout(()=>el.remove(),220); };
  el.append(ico, span, btn);
  root.appendChild(el);
  setTimeout(() => { el.classList.add("out"); setTimeout(()=>el.remove(),220); }, 4200);
}

// ── Context ──
interface Account { balance:number; limit:number; debt:number; creditScore:number; preApproved:number; loansTotal:number; estimatedIncome:number; }
interface User2 { id:string; name:string; email:string; photoURL?:string; }
interface AppCtxT { user:User2|null; account:Account|null; refresh:()=>Promise<void>; toast:(m:string,t?:string)=>void; balVis:boolean; toggleBal:()=>void; }
export const AppCtx = createContext<AppCtxT>({ user:null, account:null, refresh:async()=>{}, toast:safeToast, balVis:true, toggleBal:()=>{} });
export const useApp = () => useContext(AppCtx);

const NAV = [
  { href:"/dashboard", label:"Início", icon:<Home size={15}/> },
  { href:"/extrato",   label:"Extrato", icon:<FileText size={15}/> },
  { href:"/pix",       label:"Pix", icon:<Zap size={15}/> },
  { href:"/deposito",  label:"Depositar", icon:<ArrowDownToLine size={15}/> },
  { href:"/dividas",   label:"Dívidas", icon:<CreditCard size={15}/> },
  { href:"/credito",   label:"Crédito", icon:<CreditCard size={15}/> },
  { href:"/open-finance", label:"Open Finance", icon:<Link2 size={15}/> },
  { href:"/perfil",    label:"Minha conta", icon:<User size={15}/> },
  { href:"/seguranca", label:"Segurança", icon:<Shield size={15}/> },
];

const MOBILE_NAV = [
  { href:"/dashboard", label:"Início", icon:<Home size={20}/> },
  { href:"/extrato",   label:"Extrato", icon:<FileText size={20}/> },
  { href:"/pix",       label:"Pix", icon:<Zap size={20}/> },
  { href:"/credito",   label:"Crédito", icon:<CreditCard size={20}/> },
  { href:"/perfil",    label:"Conta", icon:<User size={20}/> },
];

const LOGO = `<svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M48 7 78 17v30c0 19-12 34-30 42C30 81 18 66 18 47V17L48 7Zm0 8.6L26 23v23.8c0 13.8 8.1 25.4 22 32.6 13.9-7.2 22-18.8 22-32.6V23l-22-7.4Z" fill="#D4A84F"/><path d="M31 55h9v14h-9V55Zm14-10h9v24h-9V45Zm14-12h9v36h-9V33Z" fill="#E8C16A"/></svg>`;

export default function AppShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<User2|null>(null);
  const [account, setAccount] = useState<Account|null>(null);
  const [balVis, setBalVis] = useState(true);
  const [logoutDlg, setLogoutDlg] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch("/api/auth/me");
      if (res.status === 401) { router.push("/login"); return; }
      const d = await res.json();
      setUser(d.user);
      setAccount(d.account);
    } catch { safeToast("Erro ao carregar dados.", "error"); }
  }, [router]);

  useEffect(() => { refresh(); }, [refresh]);

  async function logout() {
    await fetch("/api/auth/logout", { method:"POST" });
    router.push("/login");
  }

  const eyebrow = { "/dashboard":"Painel", "/extrato":"Movimentações", "/pix":"Transferência", "/deposito":"Conta", "/dividas":"Conta", "/credito":"Crédito", "/open-finance":"Dados", "/perfil":"Minha conta", "/seguranca":"Configurações" } as Record<string,string>;
  const title   = { "/dashboard":"Início", "/extrato":"Extrato", "/pix":"Pix", "/deposito":"Depositar", "/dividas":"Dívidas", "/credito":"Crédito", "/open-finance":"Open Finance", "/perfil":"Minha conta", "/seguranca":"Segurança" } as Record<string,string>;
  const curr = Object.keys(title).find(k=>pathname.startsWith(k))||"/dashboard";
  const firstName = (user?.name||"").split(" ")[0] || "Usuário";
  const photoSrc = user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName)}&background=D4A84F&color=0B0F17&bold=true&size=64`;

  return (
    <AppCtx.Provider value={{ user, account, refresh, toast:safeToast, balVis, toggleBal:()=>setBalVis(p=>!p) }}>
      <div className="app-layout">
        {/* SIDEBAR */}
        <aside className="sidebar">
          <div className="sb-logo">
            <div className="logo-box sm" dangerouslySetInnerHTML={{__html:LOGO}}/>
            <div className="brand-name"><span>Deas</span><b>Finance</b></div>
          </div>

          <div className="sb-group"><span className="sb-group-label">Conta</span>
            {NAV.slice(0,4).map(n=><Link key={n.href} href={n.href} className={`nav-link ${pathname.startsWith(n.href)?"active":""}`}>{n.icon}{n.label}</Link>)}
          </div>
          <div className="sb-group"><span className="sb-group-label">Crédito</span>
            {NAV.slice(4,6).map(n=><Link key={n.href} href={n.href} className={`nav-link ${pathname.startsWith(n.href)?"active":""}`}>{n.icon}{n.label}</Link>)}
          </div>
          <div className="sb-group"><span className="sb-group-label">Dados</span>
            {NAV.slice(6).map(n=><Link key={n.href} href={n.href} className={`nav-link ${pathname.startsWith(n.href)?"active":""}`}>{n.icon}{n.label}</Link>)}
          </div>

          <div className="sb-spacer"/>

          <div className="sb-bal">
            <span className="sb-bal-label">Saldo disponível</span>
            <div className={`sb-bal-val ${!balVis?"blur":""}`}>{account ? money(account.balance, balVis) : "---"}</div>
          </div>

          <button className="sb-logout" onClick={()=>setLogoutDlg(true)}><LogOut size={15}/> Sair da conta</button>
        </aside>

        {/* CONTENT */}
        <div className="content-area">
          <header className="topbar">
            <div>
              <span className="tb-eyebrow">{eyebrow[curr]||"Deas Finance"}</span>
              <h2 className="tb-title">{curr==="/dashboard"?`Olá, ${firstName}`:title[curr]||"Painel"}</h2>
            </div>
            <div className="tb-right">
              <button className="btn-icon" onClick={()=>setBalVis(p=>!p)} title={balVis?"Ocultar valores":"Mostrar valores"} aria-label={balVis?"Ocultar valores":"Mostrar valores"}>
                {balVis ? <Eye size={15}/> : <EyeOff size={15}/>}
              </button>
              <Link href="/perfil" className="profile-chip">
                <img src={photoSrc} alt={firstName}/>
                <span>{firstName}</span>
              </Link>
            </div>
          </header>

          {children}
        </div>

        {/* MOBILE NAV */}
        <nav className="mobile-nav">
          {MOBILE_NAV.map(n=>(
            <Link key={n.href} href={n.href} className={`mn-item ${pathname.startsWith(n.href)?"active":""}`}>
              {n.icon}<span>{n.label}</span>
            </Link>
          ))}
        </nav>
      </div>

      {/* LOGOUT DIALOG */}
      {logoutDlg && (
        <dialog open>
          <div className="dlg-head"><h3>Sair da conta</h3><p className="muted" style={{fontSize:13}}>Você será desconectado com segurança.</p></div>
          <div className="dlg-body">
            <div className="dlg-actions">
              <button className="btn btn-secondary" onClick={()=>setLogoutDlg(false)}>Cancelar</button>
              <button className="btn btn-danger" onClick={logout}>Sair com segurança</button>
            </div>
          </div>
        </dialog>
      )}
    </AppCtx.Provider>
  );
}
