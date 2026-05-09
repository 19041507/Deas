"use client";
import { useState } from "react";
import { useApp } from "@/components/AppShell";
const money = (v:number) => Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const scoreColor = (s:number) => s>=800?"#34D399":s>=700?"#60A5FA":s>=600?"#F2B84B":s>=500?"#FBBF24":"#F87171";
const scoreCat = (s:number) => s>=800?"Excelente":s>=700?"Bom":s>=600?"Regular":s>=500?"Médio":"Baixo";
const scoreDesc = (s:number) => s>=800?"Score excelente. Melhores taxas e maior limite disponível.":s>=700?"Score bom. Acesso a produtos de crédito com boas condições.":s>=600?"Score regular. Crédito disponível com condições padrão.":s>=500?"Score médio. Quitando dívidas e conectando Open Finance você melhora.":"Score baixo. Reduza dívidas e conecte o DeasBank para melhorar.";

function ScoreRing({ score }: { score: number }) {
  const c=314, pct=Math.min(1,Math.max(0,(score-300)/650));
  return (
    <div className="score-ring-wrap" style={{width:130,height:130}}>
      <svg viewBox="0 0 120 120"><circle className="sr-bg" cx="60" cy="60" r="50"/><circle className="sr-fill" cx="60" cy="60" r="50" strokeDasharray={c} strokeDashoffset={c-(c*pct)} stroke={scoreColor(score)}/></svg>
      <div className="sr-val" style={{color:scoreColor(score),fontSize:30}}>{score}</div>
    </div>
  );
}

export default function Credito() {
  const {account,refresh,toast} = useApp();
  const [amount,setAmount] = useState("");
  const [loading,setLoading] = useState(false);
  const [done,setDone] = useState<number|null>(null);
  const score = account?.creditScore||500;
  const pre = account?.preApproved||0;
  const val = parseFloat(amount.replace(",",".")) || 0;

  async function requestLoan(e:any) {
    e.preventDefault();
    if(!val||val<100) return toast("Valor mínimo: R$ 100,00","error");
    if(val>pre) return toast(`Valor excede o pré-aprovado de ${money(pre)}.`,"error");
    setLoading(true);
    try {
      const r = await fetch("/api/account/loan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount:val})});
      const d = await r.json();
      if(!r.ok) throw new Error(d.message);
      await refresh(); setDone(val);
    } catch(err:any){ toast(err.message,"error"); }
    finally { setLoading(false); }
  }

  if(done) return (
    <div className="page-wrap medium">
      <div className="form-card" style={{textAlign:"center"}}>
        <div className="receipt-ico">💳</div>
        <div className="receipt-amount" style={{color:"var(--green)"}}>{money(done)}</div>
        <p className="receipt-desc">Empréstimo aprovado e creditado!</p>
        <div>
          {[["Tipo","Empréstimo Deas Finance"],["Data",new Date().toLocaleDateString("pt-BR")],["Status","Aprovado"],["Novo saldo",money(account?.balance||0)]].map(([k,v])=>(
            <div key={k} className="receipt-row"><span className="rk">{k}</span><span className="rv">{v}</span></div>
          ))}
        </div>
        <div className="f-grid mt16">
          <button className="btn btn-secondary" onClick={()=>setDone(null)}>Simular outro</button>
          <button className="btn btn-primary" onClick={()=>window.location.href="/dashboard"}>Ir ao início</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="page-wrap medium">
      <a href="/dashboard" className="back-link">← Voltar</a>
      <div className="g2 mb16">
        {/* SCORE */}
        <div className="card">
          <p className="eyebrow mb12">Score de crédito</p>
          <div className="score-section">
            <ScoreRing score={score}/>
            <div className="score-info">
              <span className="sc-label">Classificação atual</span>
              <div className="sc-cat" style={{color:scoreColor(score)}}>{scoreCat(score)}</div>
              <p style={{fontSize:13}}>{scoreDesc(score)}</p>
            </div>
          </div>
          <div className="score-factors mt16">
            <p style={{fontSize:12,fontWeight:700,color:"var(--tx-3)",letterSpacing:".08em",textTransform:"uppercase",marginBottom:8}}>Fatores do score</p>
            {(account?.balance||0)>500&&<div className="sf"><div className="sf-dot" style={{background:"var(--green-bg)",color:"var(--green)"}}>+</div><span style={{fontSize:13}}>Saldo positivo em conta</span></div>}
            {(account?.debt||0)>0&&<div className="sf"><div className="sf-dot" style={{background:"var(--red-bg)",color:"var(--red)"}}>-</div><span style={{fontSize:13}}>Dívida pendente de {money(account!.debt)}</span></div>}
            {(account?.loansTotal||0)>0&&<div className="sf"><div className="sf-dot" style={{background:"var(--red-bg)",color:"var(--red)"}}>-</div><span style={{fontSize:13}}>Empréstimos: {money(account!.loansTotal)}</span></div>}
            {(account?.estimatedIncome||0)>0&&<div className="sf"><div className="sf-dot" style={{background:"var(--green-bg)",color:"var(--green)"}}>+</div><span style={{fontSize:13}}>Renda estimada considerada</span></div>}
            <div className="sf"><div className="sf-dot" style={{background:"var(--blue-bg)",color:"var(--blue)"}}>ℹ</div><span style={{fontSize:13}}>Conecte o DeasBank para análise completa</span></div>
          </div>
        </div>

        {/* LOAN */}
        <div className="form-card">
          <p className="eyebrow">Empréstimo Deas</p>
          <h3 className="mt8">Crédito pré-aprovado</h3>
          <span className="big-num">{money(pre)}</span>
          <p className="muted" style={{fontSize:13.5,marginBottom:20}}>Valor calculado com base em score ({score}), saldo, dívida e renda estimada de {money(account?.estimatedIncome||0)}/mês.</p>
          {pre <= 0 ? (
            <div className="warn-box">Seu pré-aprovado está zerado. Reduza dívidas, aumente o saldo ou conecte o DeasBank via Open Finance para liberar crédito.</div>
          ) : (
            <form onSubmit={requestLoan} className="f-grid">
              <label className="field-label">Valor desejado
                <input className="f-input" value={amount} onChange={e=>setAmount(e.target.value)} type="number" min="100" max={pre} step="50" placeholder={`Máximo: ${money(pre)}`}/>
              </label>
              <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
                {[1000,2500,5000].filter(v=>v<=pre).map(p=><button key={p} type="button" className="btn btn-ghost btn-sm" onClick={()=>setAmount(String(p))}>{money(p)}</button>)}
                <button type="button" className="btn btn-ghost btn-sm" onClick={()=>setAmount(String(Math.floor(pre)))}>Máximo</button>
              </div>
              {val>0&&<div className="info-box">💡 Nova dívida total após o empréstimo: <b>{money((account?.debt||0)+val)}</b></div>}
              <button className="btn btn-primary btn-w" type="submit" disabled={loading||!val||val>pre}>{loading?"Analisando...":"💳 Solicitar empréstimo"}</button>
            </form>
          )}
          <a href="/open-finance" className="btn btn-secondary btn-w mt12" style={{display:"block",textAlign:"center",marginTop:12}}>🔗 Conectar DeasBank e melhorar score</a>
        </div>
      </div>

      {/* HISTORY */}
      <div className="card">
        <p className="eyebrow mb8">Histórico</p>
        <h3 style={{marginBottom:6}}>Total de empréstimos contratados</h3>
        <span className="big-num">{money(account?.loansTotal||0)}</span>
        <p className="muted" style={{fontSize:13.5}}>Empréstimos aumentam a dívida e impactam negativamente o score. Quite as dívidas geradas para recuperar o limite.</p>
      </div>
    </div>
  );
}
