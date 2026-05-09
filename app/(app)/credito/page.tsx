"use client";
import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/AppShell";

const fmt = (v:number) => Number(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const scoreColor = (s:number) => s>=800?"#22C55E":s>=700?"#3B82F6":s>=600?"#D4A84F":s>=500?"#F59E0B":"#EF4444";
const scoreLabel = (s:number) => s>=800?"Excelente":s>=700?"Bom":s>=600?"Regular":s>=500?"Médio":"Baixo";

export default function CreditoPage() {
  const { account, refresh, toast, balVis } = useApp();
  const [amount, setAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    let raw = e.target.value.replace(/\D/g,"");
    if (!raw) { setAmount(""); return; }
    const n = parseInt(raw,10)/100;
    setAmount(n.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}));
  }

  const numVal = parseFloat(amount.replace(/\./g,"").replace(",",".")) || 0;
  const score = account?.creditScore ?? 500;
  const circumference = 314;
  const pct = Math.min(1,Math.max(0,(score-300)/650));
  const offset = circumference - circumference*pct;

  const factors = [
    { ok: (account?.balance||0) > 1000, text: "Saldo positivo" },
    { ok: (account?.debt||0) < 1000, text: "Dívida controlada" },
    { ok: (account?.loansTotal||0) < 5000, text: "Poucos empréstimos" },
    { ok: (account?.estimatedIncome||0) > 2000, text: "Renda estimada" },
  ];

  async function handleLoan(e: React.FormEvent) {
    e.preventDefault();
    if (numVal < 100) { toast("Mínimo: R$ 100,00","error"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/account/loan",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount:numVal})});
      const d = await res.json();
      if (!res.ok) { toast(d.message||"Erro.","error"); return; }
      await refresh();
      setDone(true);
      toast("Empréstimo aprovado e creditado!","success");
      setAmount("");
    } finally { setLoading(false); }
  }

  return (
    <div className="page-wrap medium">
      <Link href="/dashboard" className="back-link">← Voltar</Link>
      <div className="g2">
        <div className="form-card">
          <p className="eyebrow">Score de crédito</p>
          <h3 style={{marginBottom:16}}>Sua pontuação</h3>
          <div className="score-section">
            <div className="score-ring-wrap">
              <svg viewBox="0 0 120 120"><circle className="sr-bg" cx="60" cy="60" r="50"/><circle className="sr-fill" cx="60" cy="60" r="50" strokeDasharray={circumference} strokeDashoffset={offset} stroke={scoreColor(score)}/></svg>
              <div className="sr-val" style={{color:scoreColor(score)}}>{score}</div>
            </div>
            <div className="score-info">
              <span className="sc-label">Pontuação</span>
              <div className="sc-cat" style={{color:scoreColor(score)}}>{scoreLabel(score)}</div>
              <p>Score calculado com base no seu perfil financeiro.</p>
            </div>
          </div>
          <div className="score-factors">
            {factors.map((f,i)=>(
              <div key={i} className="sf">
                <div className="sf-dot" style={{background:f.ok?"var(--green-bg)":"var(--red-bg)",color:f.ok?"var(--green)":"var(--red)"}}>{f.ok?"✓":"✗"}</div>
                <span style={{color:f.ok?"var(--tx)":"var(--tx-2)"}}>{f.text}</span>
              </div>
            ))}
          </div>
          <div className="info-box mt16">Conectar o Open Finance pode melhorar seu score em até 80 pontos.</div>
          <Link href="/open-finance" className="btn btn-secondary btn-w mt12">Conectar Open Finance</Link>
        </div>

        <div className="form-card">
          <p className="eyebrow">Empréstimo</p>
          <h3>Pré-aprovado</h3>
          <div className="big-num">{balVis?fmt(account?.preApproved||0):"••••••"}</div>
          <p className="muted" style={{fontSize:13,marginBottom:20}}>Total contratado: {fmt(account?.loansTotal||0)}</p>
          {done&&<div className="success-box mb16">✅ Crédito aprovado e creditado na sua conta!</div>}
          <form className="f-grid" onSubmit={handleLoan}>
            <label className="field">Valor desejado
              <div className="money-input-wrap">
                <span className="money-prefix">R$</span>
                <input className="fi" inputMode="numeric" placeholder="0,00" value={amount} onChange={handleAmountChange} required/>
              </div>
            </label>
            <div className="warn-box">O valor não pode exceder o pré-aprovado.</div>
            <button className="btn btn-primary btn-w" type="submit" disabled={loading}>{loading?"Analisando...":"Solicitar empréstimo"}</button>
          </form>
        </div>
      </div>
    </div>
  );
}
