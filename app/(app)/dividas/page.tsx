"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppShell";
const money = (v:number) => Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
export default function Dividas() {
  const {account,refresh,toast} = useApp();
  const router = useRouter();
  const [amount,setAmount] = useState("");
  const [loading,setLoading] = useState(false);
  const [done,setDone] = useState<number|null>(null);
  const debt = account?.debt || 0;
  const val = parseFloat(amount.replace(",",".")) || 0;

  async function pay(e:any) {
    e.preventDefault();
    if(!val||val<=0) return toast("Informe um valor.","error");
    if(val>debt) return toast("Valor maior que a dívida atual.","error");
    if(val>(account?.balance||0)) return toast("Saldo insuficiente.","error");
    setLoading(true);
    try {
      const r = await fetch("/api/account/pay-debt",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount:val})});
      const d = await r.json();
      if(!r.ok) throw new Error(d.message);
      await refresh(); setDone(val);
    } catch(err:any){ toast(err.message,"error"); }
    finally { setLoading(false); }
  }

  if(done) return (
    <div className="page-wrap narrow">
      <div className="form-card" style={{textAlign:"center"}}>
        <div className="receipt-ico">📋</div>
        <div className="receipt-amount" style={{color:"var(--green)"}}>{money(done)}</div>
        <p className="receipt-desc">Pagamento realizado! Seu score foi recalculado.</p>
        <div>
          {[["Tipo","Pagamento de dívida"],["Dívida restante",money(account?.debt||0)],["Novo score",String(account?.creditScore||"—")],["Status","Concluído"]].map(([k,v])=>(
            <div key={k} className="receipt-row"><span className="rk">{k}</span><span className="rv">{v}</span></div>
          ))}
        </div>
        <div className="f-grid mt16">
          <button className="btn btn-secondary" onClick={()=>{setDone(null);setAmount("");}}>Pagar mais</button>
          <button className="btn btn-primary" onClick={()=>router.push("/dashboard")}>Ir ao início</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="page-wrap narrow">
      <a href="/dashboard" className="back-link">← Voltar</a>
      {debt <= 0 ? (
        <div className="form-card" style={{textAlign:"center"}}>
          <div style={{fontSize:56,marginBottom:8}}>🎉</div>
          <h3>Sem dívidas!</h3>
          <p className="muted" style={{marginTop:8,marginBottom:20}}>Você não possui nenhuma dívida pendente. Continue assim!</p>
          <button className="btn btn-primary btn-w" onClick={()=>router.push("/dashboard")}>Voltar ao início</button>
        </div>
      ) : (
        <div className="form-card">
          <p className="eyebrow">Dívida pendente</p>
          <h3>Pagar dívida</h3>
          <p className="sub">Pagamentos melhoram seu score e aumentam o pré-aprovado.</p>
          <div className="g2 mb16 mt16">
            <div className="card card-gold"><span className="card-label">Dívida total</span><span style={{fontFamily:"Outfit",fontSize:26,fontWeight:900,color:"var(--red)"}}>{money(debt)}</span></div>
            <div className="card"><span className="card-label">Saldo disponível</span><span style={{fontFamily:"Outfit",fontSize:26,fontWeight:900,color:"var(--green)"}}>{money(account?.balance||0)}</span></div>
          </div>
          <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
            <button className="btn btn-ghost btn-sm" onClick={()=>setAmount(String(debt))}>Pagar tudo</button>
            <button className="btn btn-ghost btn-sm" onClick={()=>setAmount(String(Math.floor(debt/2)))}>Metade</button>
          </div>
          <form onSubmit={pay} className="f-grid">
            <label className="field-label">Valor a pagar
              <input className="f-input" value={amount} onChange={e=>setAmount(e.target.value)} type="number" min="1" step="0.01" placeholder="Ex: 500.00"/>
            </label>
            <div className="info-box">📊 Pagar dívidas recalcula o score automaticamente e pode aumentar seu limite pré-aprovado.</div>
            <button className="btn btn-primary btn-w" type="submit" disabled={loading}>{loading?"Processando...":"📋 Confirmar pagamento"}</button>
          </form>
        </div>
      )}
    </div>
  );
}
