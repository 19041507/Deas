"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppShell";
const money = (v:number) => Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const PRESETS = [500,1000,2500,5000];
export default function Deposito() {
  const {account,refresh,toast} = useApp();
  const router = useRouter();
  const [amount,setAmount] = useState("");
  const [loading,setLoading] = useState(false);
  const [done,setDone] = useState<number|null>(null);
  const val = parseFloat(amount.replace(",",".")) || 0;

  async function submit(e:any) {
    e.preventDefault();
    if(!val||val<=0) return toast("Informe um valor válido.","error");
    if(val>1000000) return toast("Valor máximo: R$ 1.000.000,00","error");
    setLoading(true);
    try {
      const r = await fetch("/api/account/deposit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount:val})});
      const d = await r.json();
      if(!r.ok) throw new Error(d.message);
      await refresh(); setDone(val);
    } catch(err:any){ toast(err.message,"error"); }
    finally { setLoading(false); }
  }

  if(done) return (
    <div className="page-wrap narrow">
      <div className="form-card" style={{textAlign:"center"}}>
        <div className="receipt-ico">⬇️</div>
        <div className="receipt-amount" style={{color:"var(--green)"}}>{money(done)}</div>
        <p className="receipt-desc">Depósito realizado com sucesso!</p>
        <div>
          {[["Tipo","Depósito simulado"],["Data",new Date().toLocaleDateString("pt-BR")],["Novo saldo",money(account?.balance||0)],["Status","Concluído"]].map(([k,v])=>(
            <div key={k} className="receipt-row"><span className="rk">{k}</span><span className="rv">{v}</span></div>
          ))}
        </div>
        <div className="f-grid mt16">
          <button className="btn btn-secondary" onClick={()=>{setDone(null);setAmount("");}}>Novo depósito</button>
          <button className="btn btn-primary" onClick={()=>router.push("/dashboard")}>Ir ao início</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="page-wrap narrow">
      <a href="/dashboard" className="back-link">← Voltar</a>
      <div className="form-card">
        <p className="eyebrow">Simulação</p>
        <h3>Adicionar saldo</h3>
        <p className="sub">Simule uma entrada de dinheiro na sua conta Deas Finance.</p>
        <div className="warn-box mb16">ℹ️ Este é um ambiente de demonstração. Depósitos são simulados para fins de teste.</div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap",marginBottom:16}}>
          {PRESETS.map(p=><button key={p} className={`btn btn-ghost btn-sm${val===p?" on":""}`} style={val===p?{borderColor:"var(--gold)",color:"var(--gold)"}:{}} onClick={()=>setAmount(String(p))}>{money(p)}</button>)}
        </div>
        <form onSubmit={submit} className="f-grid">
          <label className="field-label">Valor personalizado
            <input className="f-input" value={amount} onChange={e=>setAmount(e.target.value)} type="number" min="1" step="0.01" placeholder="Ex: 1500.00"/>
          </label>
          <div className="info-box">💡 O valor será creditado imediatamente e aparecerá no seu extrato.</div>
          <button className="btn btn-primary btn-w" type="submit" disabled={loading}>{loading?"Processando...":"⬇️ Confirmar depósito"}</button>
        </form>
      </div>
    </div>
  );
}
