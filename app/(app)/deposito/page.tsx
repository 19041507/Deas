"use client";
import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/AppShell";

const fmt = (v:number) => Number(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

export default function DepositoPage() {
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

  async function handleDeposit(e: React.FormEvent) {
    e.preventDefault();
    if (numVal < 1) { toast("Valor mínimo: R$ 1,00","error"); return; }
    if (numVal > 1000000) { toast("Valor máximo: R$ 1.000.000,00","error"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/account/deposit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount:numVal})});
      const d = await res.json();
      if (!res.ok) { toast(d.message||"Erro.","error"); return; }
      await refresh();
      setDone(true);
      setAmount("");
    } finally { setLoading(false); }
  }

  return (
    <div className="page-wrap narrow">
      <Link href="/dashboard" className="back-link">← Voltar</Link>
      <div className="form-card">
        <p className="eyebrow">Conta</p>
        <h3>Simular depósito</h3>
        <p className="sub">Adicione saldo simulado à sua conta Deas Finance para testar as funcionalidades.</p>
        {done&&<div className="success-box mb16">✅ Depósito realizado! Saldo atual: <strong>{fmt(account?.balance||0)}</strong></div>}
        <div className="warn-box mb16">⚠️ Ambiente de demonstração — valores simulados para fins de teste.</div>
        <form className="f-grid" onSubmit={handleDeposit}>
          <label className="field">Valor do depósito
            <div className="money-input-wrap">
              <span className="money-prefix">R$</span>
              <input className="fi" inputMode="numeric" placeholder="0,00" value={amount} onChange={handleAmountChange} required/>
            </div>
          </label>
          <div className="card" style={{padding:"14px 16px",background:"rgba(255,255,255,0.03)"}}>
            <span style={{fontSize:11,fontWeight:700,letterSpacing:".07em",textTransform:"uppercase",color:"var(--tx-3)",display:"block",marginBottom:4}}>Saldo atual</span>
            <span style={{fontSize:22,fontWeight:800,letterSpacing:"-.04em",color:"var(--gold-l)"}}>{balVis?fmt(account?.balance||0):"••••••"}</span>
          </div>
          <button className="btn btn-primary btn-w" type="submit" disabled={loading}>{loading?"Processando...":"⬇️ Confirmar depósito"}</button>
        </form>
      </div>
    </div>
  );
}
