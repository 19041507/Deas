"use client";
import { useState, useRef } from "react";
import { Eye, EyeOff, Shield, Zap, TrendingUp, Lock } from "lucide-react";
import { useRouter } from "next/navigation";

const LOGO = `<svg viewBox="0 0 96 96" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M48 7 78 17v30c0 19-12 34-30 42C30 81 18 66 18 47V17L48 7Zm0 8.6L26 23v23.8c0 13.8 8.1 25.4 22 32.6 13.9-7.2 22-18.8 22-32.6V23l-22-7.4Z" fill="#D4A84F"/><path d="M31 55h9v14h-9V55Zm14-10h9v24h-9V45Zm14-12h9v36h-9V33Z" fill="#E8C16A"/><path d="M17 66c17 18 48 8 61-22" fill="none" stroke="#D4A84F" stroke-width="7" stroke-linecap="round"/><circle cx="80" cy="36" r="5" fill="#E8C16A"/></svg>`;

function toast(msg: string, type = "info") {
  const root = document.getElementById("toast-root");
  if (!root) return;
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  const icons: Record<string,string> = { success:"✅", error:"❌", info:"ℹ️", warning:"⚠️" };
  const ico = document.createElement("span");
  ico.textContent = icons[type] || "ℹ️";
  ico.style.fontSize = "17px";
  const span = document.createElement("span");
  span.className = "toast-msg";
  span.textContent = msg;
  const btn = document.createElement("button");
  btn.className = "toast-close";
  btn.textContent = "×";
  btn.onclick = () => { el.classList.add("out"); setTimeout(() => el.remove(), 220); };
  el.append(ico, span, btn);
  root.appendChild(el);
  setTimeout(() => { el.classList.add("out"); setTimeout(() => el.remove(), 220); }, 4200);
}

interface Props { tab?: "login"|"register" }

export default function AuthPage({ tab = "login" }: Props) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<"login"|"register">(tab);
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  /* login fields */
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPw, setLoginPw] = useState("");

  /* register fields */
  const [rEmail, setREmail] = useState("");
  const [rPw, setRPw] = useState("");
  const [rPwConf, setRPwConf] = useState("");
  const [rName, setRName] = useState("");
  const [rCpf, setRCpf] = useState("");
  const [rPhone, setRPhone] = useState("");
  const [rBirth, setRBirth] = useState("");
  const [rTerms, setRTerms] = useState(false);
  const [fieldErr, setFieldErr] = useState<Record<string,string>>({});

  const fe = (k: string, v: string) => setFieldErr(p => ({...p, [k]: v}));
  const cfe = (k: string) => setFieldErr(p => { const n={...p}; delete n[k]; return n; });

  const maskCpf = (v: string) => v.replace(/\D/g,"").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d)/,"$1.$2").replace(/(\d{3})(\d{1,2})$/,"$1-$2").slice(0,14);
  const maskPhone = (v: string) => v.replace(/\D/g,"").replace(/(\d{2})(\d)/,"($1) $2").replace(/(\d{5})(\d)/,"$1-$2").slice(0,15);

  const pwStrength = (pw: string) => {
    let s = 0;
    if (pw.length >= 8) s++;
    if (/[A-Z]/.test(pw)) s++;
    if (/[0-9]/.test(pw)) s++;
    if (/[^a-zA-Z0-9]/.test(pw)) s++;
    return s;
  };
  const strength = pwStrength(rPw);
  const strengthLabel = ["","Fraca","Regular","Boa","Forte"][strength];
  const strengthColor = ["","#EF4444","#F59E0B","#3B82F6","#22C55E"][strength];

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!loginEmail || !loginPw) { toast("Preencha e-mail e senha.", "error"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/login", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ email:loginEmail, password:loginPw }) });
      const data = await res.json();
      if (!res.ok) { toast(data.message||"Erro ao entrar.", "error"); return; }
      router.push("/dashboard");
    } finally { setLoading(false); }
  }

  function validateStep1() {
    let ok = true;
    if (!/^[^@]+@[^@]+\.[^@]+$/.test(rEmail)) { fe("rEmail","E-mail inválido."); ok=false; }
    if (rPw.length < 8) { fe("rPw","Mínimo 8 caracteres."); ok=false; }
    if (rPw !== rPwConf) { fe("rPwConf","As senhas não coincidem."); ok=false; }
    return ok;
  }
  function validateStep2() {
    let ok = true;
    if (rName.trim().length < 3) { fe("rName","Nome completo obrigatório."); ok=false; }
    return ok;
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    if (!rTerms) { toast("Aceite os termos para continuar.", "warning"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", { method:"POST", headers:{"Content-Type":"application/json"}, body:JSON.stringify({ name:rName, email:rEmail, password:rPw, cpf:rCpf, phone:rPhone, birthdate:rBirth }) });
      const data = await res.json();
      if (!res.ok) { toast(data.message||"Erro ao criar conta.", "error"); return; }
      router.push("/dashboard");
    } finally { setLoading(false); }
  }

  return (
    <div className="auth-wrap">
      <div className="auth-shell">
        {/* BRAND */}
        <section className="brand-side">
          <div className="brand-logo-row">
            <div className="logo-box" dangerouslySetInnerHTML={{__html:LOGO}} />
            <div className="brand-name"><span>Deas</span><b>Finance</b></div>
          </div>
          <div className="brand-headline">
            <h2>Controle financeiro com clareza e segurança.</h2>
            <p>Gerencie saldo, Pix, crédito e Open Finance em uma experiência limpa e profissional.</p>
          </div>
          <div className="brand-badges">
            {[{icon:<Shield size={14}/>,tag:"Segurança",title:"Conta protegida",desc:"Cookie HttpOnly, bcrypt e JWT seguro."},{icon:<Zap size={14}/>,tag:"Pix",title:"Instantâneo",desc:"Transferências com comprovante completo."},{icon:<TrendingUp size={14}/>,tag:"Crédito",title:"Score em tempo real",desc:"Calculado com seus dados e Open Finance."},{icon:<Lock size={14}/>,tag:"Privacidade",title:"Open Finance",desc:"Consentimento explícito em cada etapa."}].map((b,i) => (
              <div key={i} className="bb">
                <span className="bb-tag">{b.tag}</span>
                <strong>{b.title}</strong>
                <p>{b.desc}</p>
              </div>
            ))}
          </div>
          <div className="brand-note">🔐 Ambiente de demonstração — dados simulados para fins de protótipo bancário.</div>
        </section>

        {/* FORM */}
        <section className="form-side">
          <div className="auth-tabs">
            <button className={`at ${activeTab==="login"?"on":""}`} onClick={()=>{setActiveTab("login");setStep(1);}}>Entrar</button>
            <button className={`at ${activeTab==="register"?"on":""}`} onClick={()=>{setActiveTab("register");setStep(1);}}>Criar conta</button>
          </div>

          {/* ── LOGIN ── */}
          {activeTab==="login" && (
            <form className="auth-form" onSubmit={handleLogin}>
              <div><h2>Bem-vindo de volta</h2><p className="sub">Acesse sua conta Deas Finance.</p></div>
              <label className="field">
                E-mail
                <input className={`fi ${fieldErr.lEmail?"err":""}`} type="email" placeholder="voce@email.com" value={loginEmail} onChange={e=>{setLoginEmail(e.target.value);cfe("lEmail");}} required autoComplete="email" />
              </label>
              <label className="field">
                Senha
                <div className="pw-wrap">
                  <input className="fi" type={showPw?"text":"password"} placeholder="Sua senha" value={loginPw} onChange={e=>setLoginPw(e.target.value)} required autoComplete="current-password" />
                  <button type="button" className="pw-eye" onClick={()=>setShowPw(p=>!p)} aria-label={showPw?"Ocultar senha":"Mostrar senha"}>
                    {showPw?<EyeOff size={16}/>:<Eye size={16}/>}
                  </button>
                </div>
              </label>
              <button className="btn btn-primary btn-w" type="submit" disabled={loading}>
                {loading?"Entrando...":"Entrar na conta"}
              </button>
              <p style={{textAlign:"center",fontSize:13,color:"var(--tx-2)"}}>Não tem conta? <button type="button" style={{color:"var(--gold-l)",fontWeight:600,background:"none",border:"none",cursor:"pointer"}} onClick={()=>setActiveTab("register")}>Criar conta grátis</button></p>
            </form>
          )}

          {/* ── REGISTER ── */}
          {activeTab==="register" && (
            <form className="auth-form" onSubmit={handleRegister}>
              <div><h2>Abrir conta</h2><p className="sub">Leva menos de 2 minutos.</p></div>

              {/* Step indicator */}
              <div className="reg-steps">
                {[{n:1,l:"Acesso"},{n:2,l:"Dados"},{n:3,l:"Termos"}].map((s,i) => (
                  <>
                    {i>0 && <div className={`rs-line ${step>s.n-1?"done":""}`}/>}
                    <div key={s.n} className={`rs ${step===s.n?"cur":""} ${step>s.n?"done":""}`}>
                      <div className="rs-num">{step>s.n?"✓":s.n}</div>
                      <span className="rs-label">{s.l}</span>
                    </div>
                  </>
                ))}
              </div>

              {/* Step 1 */}
              <div className={`reg-panel ${step===1?"show":""}`}>
                <label className="field">E-mail
                  <input className={`fi ${fieldErr.rEmail?"err":""}`} type="email" placeholder="voce@email.com" value={rEmail} onChange={e=>{setREmail(e.target.value);cfe("rEmail");}} autoComplete="email" />
                  {fieldErr.rEmail && <span className="fi-err">{fieldErr.rEmail}</span>}
                </label>
                <label className="field">Senha
                  <div className="pw-wrap">
                    <input className={`fi ${fieldErr.rPw?"err":""}`} type={showPw?"text":"password"} placeholder="Mínimo 8 caracteres" value={rPw} onChange={e=>{setRPw(e.target.value);cfe("rPw");}} autoComplete="new-password"/>
                    <button type="button" className="pw-eye" onClick={()=>setShowPw(p=>!p)} aria-label="Alternar visibilidade"><Eye size={15}/></button>
                  </div>
                  {rPw && <div style={{display:"flex",gap:4,marginTop:6}}>{[1,2,3,4].map(i=><div key={i} style={{flex:1,height:3,borderRadius:2,background:i<=strength?strengthColor:"var(--bd)",transition:"var(--ease)"}}/>)}<span style={{fontSize:11,color:strengthColor,fontWeight:600,flexShrink:0}}>{strengthLabel}</span></div>}
                  {fieldErr.rPw && <span className="fi-err">{fieldErr.rPw}</span>}
                </label>
                <label className="field">Confirmar senha
                  <input className={`fi ${fieldErr.rPwConf?"err":""}`} type="password" placeholder="Repita a senha" value={rPwConf} onChange={e=>{setRPwConf(e.target.value);cfe("rPwConf");}} autoComplete="new-password"/>
                  {fieldErr.rPwConf && <span className="fi-err">{fieldErr.rPwConf}</span>}
                </label>
                <button type="button" className="btn btn-primary btn-w" onClick={()=>{ if(validateStep1()) setStep(2); }}>Continuar</button>
              </div>

              {/* Step 2 */}
              <div className={`reg-panel ${step===2?"show":""}`}>
                <label className="field">Nome completo
                  <input className={`fi ${fieldErr.rName?"err":""}`} placeholder="Seu nome completo" value={rName} onChange={e=>{setRName(e.target.value);cfe("rName");}} autoComplete="name"/>
                  {fieldErr.rName && <span className="fi-err">{fieldErr.rName}</span>}
                </label>
                <div className="f-row2">
                  <label className="field">CPF
                    <input className="fi" placeholder="000.000.000-00" value={rCpf} onChange={e=>setRCpf(maskCpf(e.target.value))} maxLength={14} inputMode="numeric"/>
                  </label>
                  <label className="field">Data de nascimento
                    <input className="fi" type="date" value={rBirth} onChange={e=>setRBirth(e.target.value)}/>
                  </label>
                </div>
                <label className="field">Celular
                  <input className="fi" placeholder="(00) 00000-0000" value={rPhone} onChange={e=>setRPhone(maskPhone(e.target.value))} inputMode="tel" maxLength={15}/>
                </label>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <button type="button" className="btn btn-ghost" onClick={()=>setStep(1)}>← Voltar</button>
                  <button type="button" className="btn btn-primary" onClick={()=>{ if(validateStep2()) setStep(3); }}>Continuar</button>
                </div>
              </div>

              {/* Step 3 */}
              <div className={`reg-panel ${step===3?"show":""}`}>
                <div className="consent-box">
                  <strong>Ao criar sua conta você autoriza:</strong>
                  <ul className="clist">
                    <li>Armazenamento seguro dos seus dados para operação da conta.</li>
                    <li>Uso do histórico financeiro para análise de crédito.</li>
                    <li>Integrações Open Finance somente com seu consentimento explícito.</li>
                  </ul>
                </div>
                <label className="check-row">
                  <input type="checkbox" checked={rTerms} onChange={e=>setRTerms(e.target.checked)} required/>
                  <span>Li e aceito os <strong style={{color:"var(--gold-l)"}}>Termos de Uso</strong> e a <strong style={{color:"var(--gold-l)"}}>Política de Privacidade</strong></span>
                </label>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10}}>
                  <button type="button" className="btn btn-ghost" onClick={()=>setStep(2)}>← Voltar</button>
                  <button type="submit" className="btn btn-primary" disabled={loading||!rTerms}>{loading?"Criando conta...":"Criar conta"}</button>
                </div>
              </div>
            </form>
          )}
        </section>
      </div>
    </div>
  );
}
