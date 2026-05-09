"use client";
import { useState, useRef } from "react";
import { useRouter } from "next/navigation";

const LOGO = `<svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M48 7 78 17v30c0 19-12 34-30 42-18-8-30-23-30-42V17L48 7Zm0 8.6L26 23v23.8c0 13.8 8.1 25.4 22 32.6 13.9-7.2 22-18.8 22-32.6V23l-22-7.4Z" fill="#f2b84b"/>
  <path d="M31 55h9v14h-9V55Zm14-10h9v24h-9V45Zm14-12h9v36h-9V33Z" fill="#ffd977"/>
  <path d="M17 66c17 18 48 8 61-22" fill="none" stroke="#f2b84b" stroke-width="7" stroke-linecap="round"/>
  <circle cx="80" cy="36" r="5.5" fill="#ffd977"/>
</svg>`;

function useToast() {
  return (msg: string, type = "info") => {
    const root = document.getElementById("toast-root");
    if (!root) return;
    const el = document.createElement("div");
    el.className = `toast ${type}`;
    el.innerHTML = `<span class="toast-msg">${msg}</span><button class="toast-close" onclick="this.parentElement.remove()">✕</button>`;
    root.appendChild(el);
    setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 240); }, 4000);
  };
}

async function apiFetch(path: string, body: object) {
  const res = await fetch(path, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.message || "Erro inesperado.");
  return data;
}

export default function AuthPage({ tab }: { tab: "login" | "register" }) {
  const [activeTab, setActiveTab] = useState(tab);
  const [loading, setLoading] = useState(false);
  const [errs, setErrs] = useState<Record<string,string>>({}); 
  const [showPw, setShowPw] = useState(false);
  const toast = useToast();
  const router = useRouter();

  async function handleLogin(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");
    const terms = fd.get("terms");
    const newErrs: Record<string,string> = {};
    if (!email) newErrs.email = "Informe seu e-mail.";
    if (!password) newErrs.password = "Informe sua senha.";
    if (!terms) newErrs.terms = "Aceite os termos para continuar.";
    if (Object.keys(newErrs).length) { setErrs(newErrs); return; }
    setLoading(true);
    try {
      await apiFetch("/api/auth/login", { email, password });
      toast("Login realizado com sucesso!", "success");
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) { toast(err.message, "error"); setLoading(false); }
  }

  async function handleRegister(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") || "").trim();
    const email = String(fd.get("email") || "").trim();
    const password = String(fd.get("password") || "");
    const newErrs: Record<string,string> = {};
    if (!name) newErrs.name = "Informe seu nome.";
    if (!email || !/^[^@]+@[^@]+\.[^@]+$/.test(email)) newErrs.email = "E-mail inválido.";
    if (password.length < 6) newErrs.password = "Mínimo 6 caracteres.";
    if (Object.keys(newErrs).length) { setErrs(newErrs); return; }
    setLoading(true);
    try {
      await apiFetch("/api/auth/register", { name, email, password });
      toast("Conta criada! Bem-vindo ao Deas Finance.", "success");
      router.push("/dashboard");
      router.refresh();
    } catch (err: any) { toast(err.message, "error"); setLoading(false); }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-shell">
        <section className="brand-side">
          <div className="brand-logo">
            <div className="logo-box" dangerouslySetInnerHTML={{__html: LOGO}} />
            <div className="brand-name"><span>Deas</span><b>Finance</b></div>
          </div>
          <div className="brand-headline">
            <h2>Controle financeiro com segurança e clareza.</h2>
            <p>Gerencie saldo, limite, movimentações e Open Finance numa experiência digital profissional.</p>
          </div>
          <div className="brand-grid">
            <div className="b-card"><span className="b-label">Segurança</span><strong>Conta protegida</strong><p>JWT seguro, senha criptografada, cookie HttpOnly.</p></div>
            <div className="b-card"><span className="b-label">Crédito</span><strong>Análise inteligente</strong><p>Score calculado com saldo, dívida e Open Finance.</p></div>
            <div className="b-card"><span className="b-label">Pix</span><strong>Fluxo completo</strong><p>Revisão, confirmação e comprovante em cada envio.</p></div>
            <div className="b-card"><span className="b-label">Open Finance</span><strong>Dados conectados</strong><p>Vincule o DeasBank com consentimento explícito.</p></div>
          </div>
          <div className="brand-note">🔐 Simulação bancária com Prisma + PostgreSQL + Next.js. Dados protegidos e isolados por usuário.</div>
        </section>
        <section className="form-side">
          <div className="auth-tabs-row">
            <button className={`at ${activeTab==="login"?"on":""}`} onClick={()=>{setActiveTab("login");setErrs({})}}>Entrar</button>
            <button className={`at ${activeTab==="register"?"on":""}`} onClick={()=>{setActiveTab("register");setErrs({})}}>Criar conta</button>
          </div>
          {activeTab === "login" ? (
            <form className="auth-form" onSubmit={handleLogin}>
              <h2>Acesse sua conta</h2>
              <p className="sub">Entre para visualizar seu painel financeiro.</p>
              <label className="field-label">E-mail
                <input name="email" type="email" className={`f-input ${errs.email?"err":""}`} placeholder="voce@email.com" onChange={()=>setErrs(p=>{const n={...p};delete n.email;return n})} />
                {errs.email && <span className="field-err">{errs.email}</span>}
              </label>
              <label className="field-label">Senha
                <div className="pw-wrap">
                  <input name="password" type={showPw?"text":"password"} className={`f-input ${errs.password?"err":""}`} placeholder="Sua senha" onChange={()=>setErrs(p=>{const n={...p};delete n.password;return n})} />
                  <button type="button" className="pw-eye" onClick={()=>setShowPw(p=>!p)}>{showPw?"🙈":"👁"}</button>
                </div>
                {errs.password && <span className="field-err">{errs.password}</span>}
              </label>
              <label className="check-row"><input type="checkbox" name="terms" /><span>Li e aceito os termos de privacidade</span></label>
              {errs.terms && <span className="field-err">{errs.terms}</span>}
              <button className="btn btn-primary btn-w" type="submit" disabled={loading}>{loading?"Entrando...":"Entrar na conta"}</button>
              <p style={{fontSize:13,color:"var(--tx-3)",textAlign:"center"}}>Não tem conta? <button type="button" style={{color:"var(--gold-l)",background:"none",border:"none",cursor:"pointer",fontSize:13,fontWeight:600}} onClick={()=>setActiveTab("register")}>Criar agora</button></p>
            </form>
          ) : (
            <form className="auth-form" onSubmit={handleRegister}>
              <h2>Abra sua conta</h2>
              <p className="sub">Crie sua conta Deas Finance gratuitamente.</p>
              <label className="field-label">Nome completo
                <input name="name" className={`f-input ${errs.name?"err":""}`} placeholder="Seu nome completo" onChange={()=>setErrs(p=>{const n={...p};delete n.name;return n})} />
                {errs.name && <span className="field-err">{errs.name}</span>}
              </label>
              <label className="field-label">E-mail
                <input name="email" type="email" className={`f-input ${errs.email?"err":""}`} placeholder="voce@email.com" onChange={()=>setErrs(p=>{const n={...p};delete n.email;return n})} />
                {errs.email && <span className="field-err">{errs.email}</span>}
              </label>
              <label className="field-label">Senha
                <div className="pw-wrap">
                  <input name="password" type={showPw?"text":"password"} className={`f-input ${errs.password?"err":""}`} placeholder="Mínimo 6 caracteres" onChange={()=>setErrs(p=>{const n={...p};delete n.password;return n})} />
                  <button type="button" className="pw-eye" onClick={()=>setShowPw(p=>!p)}>{showPw?"🙈":"👁"}</button>
                </div>
                {errs.password && <span className="field-err">{errs.password}</span>}
              </label>
              <button className="btn btn-primary btn-w" type="submit" disabled={loading}>{loading?"Criando conta...":"Criar conta"}</button>
              <p style={{fontSize:13,color:"var(--tx-3)",textAlign:"center"}}>Já tem conta? <button type="button" style={{color:"var(--gold-l)",background:"none",border:"none",cursor:"pointer",fontSize:13,fontWeight:600}} onClick={()=>setActiveTab("login")}>Entrar</button></p>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
