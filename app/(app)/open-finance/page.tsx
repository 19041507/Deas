"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Shield, Link2, RefreshCw, X } from "lucide-react";
import { useApp } from "@/components/AppShell";

const fmt=(v:number)=>Number(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

interface Consent { id:string; institutionName:string; status:string; externalBalance:number; externalDebt:number; externalLimit:number; externalScore:number; requestedSalary:number; estimatedIncome:number; validUntil?:string; createdAt:string; }

export default function OpenFinancePage() {
  const { refresh:refreshAccount, toast } = useApp();
  const [consents, setConsents] = useState<Consent[]>([]);
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"main"|"connect"|"salary">("main");
  const [inst, setInst] = useState("DeasBank");
  const [consent1, setConsent1] = useState(false);
  const [salAmount, setSalAmount] = useState("");
  const [consent2, setConsent2] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function load() {
    try { const r = await fetch("/api/open-finance"); const d = await r.json(); setConsents(Array.isArray(d)?d:[]); }
    finally { setLoading(false); }
  }
  useEffect(()=>{ load(); },[]);

  async function connect(e: React.FormEvent) {
    e.preventDefault();
    if (!consent1) { toast("Autorização obrigatória.","warning"); return; }
    setSubmitting(true);
    try {
      const r = await fetch("/api/open-finance/connect",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({institutionName:inst})});
      const d = await r.json();
      if (!r.ok) { toast(d.message||"Erro.","error"); return; }
      await load(); await refreshAccount();
      toast("DeasBank conectado!","success"); setView("main");
    } finally { setSubmitting(false); }
  }

  function handleSalChange(e: React.ChangeEvent<HTMLInputElement>) {
    let raw = e.target.value.replace(/\D/g,"");
    if (!raw) { setSalAmount(""); return; }
    const n = parseInt(raw,10)/100;
    setSalAmount(n.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}));
  }

  async function salary(e: React.FormEvent) {
    e.preventDefault();
    if (!consent2) { toast("Autorização obrigatória.","warning"); return; }
    const val = parseFloat(salAmount.replace(/\./g,"").replace(",",".")) || 0;
    if (val < 1) { toast("Valor inválido.","error"); return; }
    setSubmitting(true);
    try {
      const r = await fetch("/api/open-finance/salary",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount:val})});
      const d = await r.json();
      if (!r.ok) { toast(d.message||"Erro.","error"); return; }
      await load(); await refreshAccount();
      toast("Salário transferido com sucesso!","success"); setView("main");
    } finally { setSubmitting(false); }
  }

  async function disconnect(id: string) {
    if (!confirm("Revogar conexão com o DeasBank?")) return;
    const r = await fetch("/api/open-finance/disconnect",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
    if (r.ok) { await load(); await refreshAccount(); toast("Conexão revogada.","info"); }
  }

  const active = consents.filter(c=>c.status==="ativo");

  if (view==="connect") return (
    <div className="page-wrap narrow">
      <button className="back-link" onClick={()=>setView("main")}>← Voltar</button>
      <div className="form-card">
        <p className="eyebrow">Open Finance</p>
        <h3>Conectar instituição</h3>
        <p className="sub">Vincule sua conta do DeasBank com consentimento explícito.</p>
        <form className="f-grid mt12" onSubmit={connect}>
          <label className="field">Instituição
            <select className="fi" value={inst} onChange={e=>setInst(e.target.value)}>
              <option value="DeasBank">DeasBank</option>
            </select>
          </label>
          <div className="consent-box">
            <strong>Você está autorizando:</strong>
            <ul className="clist"><li>Solicitar conexão com o DeasBank.</li><li>Confirmar que a conta pertence ao mesmo usuário.</li><li>Compartilhar dados básicos para análise de crédito.</li></ul>
            <label className="check-row mt8"><input type="checkbox" checked={consent1} onChange={e=>setConsent1(e.target.checked)} required/><span>Autorizo a conexão com o DeasBank</span></label>
          </div>
          <button className="btn btn-primary btn-w" type="submit" disabled={submitting||!consent1}>{submitting?"Conectando...":"Confirmar conexão"}</button>
        </form>
      </div>
    </div>
  );

  if (view==="salary") return (
    <div className="page-wrap narrow">
      <button className="back-link" onClick={()=>setView("main")}>← Voltar</button>
      <div className="form-card">
        <p className="eyebrow">Portabilidade salarial</p>
        <h3>Trazer salário do DeasBank</h3>
        <p className="sub">Transfira sua renda para o Deas Finance e melhore seu score.</p>
        <form className="f-grid mt12" onSubmit={salary}>
          <label className="field">Valor a transferir
            <div className="money-input-wrap"><span className="money-prefix">R$</span>
              <input className="fi" inputMode="numeric" placeholder="0,00" value={salAmount} onChange={handleSalChange} required/>
            </div>
          </label>
          <div className="consent-box">
            <strong>Você está autorizando:</strong>
            <ul className="clist"><li>Transferência de renda do DeasBank.</li><li>Compartilhamento de saldo, histórico e score externo.</li></ul>
            <label className="check-row mt8"><input type="checkbox" checked={consent2} onChange={e=>setConsent2(e.target.checked)} required/><span>Estou ciente e autorizo</span></label>
          </div>
          <button className="btn btn-primary btn-w" type="submit" disabled={submitting||!consent2}>{submitting?"Transferindo...":"Confirmar portabilidade"}</button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="page-wrap medium">
      <Link href="/dashboard" className="back-link">← Voltar</Link>
      <div className="demo-bar mb16">🔬 Ambiente de demonstração — conexão Open Finance simulada</div>

      <div className="of-hero">
        <div><p className="eyebrow mb8">Open Finance</p><h3>Conecte o DeasBank</h3><p>Compartilhe dados financeiros com segurança e melhore seu score de crédito com análise ampliada.</p></div>
        <div className="of-btns">
          {!active.length&&<button className="btn btn-primary" onClick={()=>setView("connect")}><Link2 size={15}/>Conectar</button>}
          {active.length>0&&<button className="btn btn-secondary" onClick={()=>setView("salary")}>💰 Portabilidade</button>}
          <button className="btn btn-ghost" onClick={load}><RefreshCw size={14}/>Sincronizar</button>
        </div>
      </div>

      <div className="of-steps mb16">
        {[{l:"Conexão",d:"Vincular DeasBank"},{l:"Portabilidade",d:"Trazer salário"},{l:"Score",d:"Análise ampliada"}].map((s,i)=>{
          const isDone = i===0?active.length>0:i===1?active.some(c=>c.requestedSalary>0):active.some(c=>c.requestedSalary>0);
          return <div key={i} className={`of-step ${isDone?"done":i===0&&!active.length?"active":""}`}><div className="osn">{isDone?"✓":i+1}</div><div><span className="osl" style={{display:"block",fontWeight:700,marginBottom:2}}>{s.l}</span><span style={{fontSize:11,color:"var(--tx-3)"}}>{s.d}</span></div></div>;
        })}
      </div>

      {loading ? <div className="sk" style={{height:120,borderRadius:16}}/> : active.length===0 ? (
        <div className="card" style={{textAlign:"center",padding:"40px 20px"}}>
          <div style={{fontSize:40,marginBottom:12}}>🔗</div>
          <strong style={{fontSize:15,display:"block",marginBottom:8}}>Nenhuma instituição conectada</strong>
          <p style={{fontSize:13,color:"var(--tx-2)",marginBottom:16}}>Conecte o DeasBank para receber uma análise de crédito mais completa.</p>
          <button className="btn btn-primary" onClick={()=>setView("connect")}>Conectar agora</button>
        </div>
      ) : active.map(c=>(
        <div key={c.id} className="card mb12">
          <div className="sec-hdr mb16">
            <div><p className="eyebrow mb8">Banco conectado</p><h3>{c.institutionName}</h3></div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <span className="badge badge-success">Ativo</span>
              <button className="btn btn-danger-soft btn-sm" onClick={()=>disconnect(c.id)}><X size={13}/>Revogar</button>
            </div>
          </div>
          {c.validUntil&&<p style={{fontSize:12,color:"var(--tx-3)",marginBottom:14}}>Consentimento válido até: {new Date(c.validUntil).toLocaleDateString("pt-BR")} · Última sincronização: agora</p>}
          <div className="of-data">
            {[["Saldo externo",fmt(c.externalBalance)],["Dívidas",fmt(c.externalDebt)],["Limite",fmt(c.externalLimit)],["Score",c.externalScore||"—"],["Salário trazido",fmt(c.requestedSalary)],["Renda estimada",fmt(c.estimatedIncome)]].map(([k,v])=>(
              <div key={k as string} className="of-data-item"><small>{k as string}</small><strong>{v as string}</strong></div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
