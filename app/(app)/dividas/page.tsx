"use client";
import { useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/AppShell";

const fmt = (v:number) => Number(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

export default function DividasPage() {
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

  const debt = account?.debt ?? 0;
  const numVal = parseFloat(amount.replace(/\./g,"").replace(",",".")) || 0;

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (numVal < 1) { toast("Valor mínimo: R$ 1,00","error"); return; }
    setLoading(true);
    try {
      const res = await fetch("/api/account/pay-debt",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount:numVal})});
      const d = await res.json();
      if (!res.ok) { toast(d.message||"Erro.","error"); return; }
      await refresh();
      setDone(true);
      toast("Pagamento realizado! Score atualizado.","success");
    } finally { setLoading(false); }
  }

  return (
    <div className="page-wrap narrow">
      <Link href="/dashboard" className="back-link">← Voltar</Link>
      <div className="form-card">
        <p className="eyebrow">Conta</p>
        <h3>Pagar dívida</h3>
        <p className="sub">O pagamento usa seu saldo e melhora seu score de crédito automaticamente.</p>

        {done&&<div className="success-box mb16">✅ Pagamento registrado! Novo score: <strong>{account?.creditScore}</strong></div>}

        <div style={{display:"grid",gap:10,marginBottom:20}}>
          <div className="card" style={{padding:"16px",background:"var(--red-bg)",border:"1px solid var(--red-bd)"}}>
            <span style={{fontSize:10,fontWeight:700,letterSpacing:".08em",textTransform:"uppercase",color:"var(--red)",display:"block",marginBottom:4}}>Dívida pendente</span>
            <span style={{fontSize:28,fontWeight:800,letterSpacing:"-.05em",color:"var(--red)"}}>{balVis?fmt(debt):"••••••"}</span>
          </div>
          <div className="card" style={{padding:"14px 16px",background:"rgba(255,255,255,0.03)"}}>
            <span style={{fontSize:10,fontWeight:700,letterSpacing:".07em",textTransform:"uppercase",color:"var(--tx-3)",display:"block",marginBottom:3}}>Saldo disponível</span>
            <span style={{fontSize:18,fontWeight:700,color:"var(--green)"}}>{balVis?fmt(account?.balance||0):"••••••"}</span>
          </div>
        </div>

        {debt > 0 ? (
          <form className="f-grid" onSubmit={handlePay}>
            <label className="field">Valor a pagar
              <div className="money-input-wrap">
                <span className="money-prefix">R$</span>
                <input className="fi" inputMode="numeric" placeholder="0,00" value={amount} onChange={handleAmountChange} required/>
              </div>
            </label>
            <div className="info-box">💡 Pagar dívidas melhora seu score e aumenta o limite pré-aprovado.</div>
            <div className="g2">
              <button type="button" className="btn btn-secondary" onClick={()=>{ const d=fmt(debt).replace("R$ ","").trim(); const raw=d.replace(/\./g,"").replace(",","."); const n=parseFloat(raw); if(!isNaN(n)){const str=(n*100).toFixed(0); const m=parseInt(str,10)/100; setAmount(m.toLocaleString("pt-BR",{minimumFractionDigits:2}));} }}>Pagar tudo</button>
              <button className="btn btn-danger" type="submit" disabled={loading}>{loading?"Pagando...":"Pagar agora"}</button>
            </div>
          </form>
        ) : (
          <div className="success-box">✅ Nenhuma dívida pendente! Seu histórico está limpo.</div>
        )}
      </div>
    </div>
  );
}
