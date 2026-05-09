"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/components/AppShell";
const money = (v:number) => Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
type Step = 1|2|3|4;
export default function Pix() {
  const {account,refresh,toast} = useApp();
  const router = useRouter();
  const [step,setStep] = useState<Step>(1);
  const [name,setName] = useState("");
  const [amount,setAmount] = useState("");
  const [desc,setDesc] = useState("");
  const [loading,setLoading] = useState(false);
  const [txId,setTxId] = useState("");
  const [errs,setErrs] = useState<any>({});
  const val = parseFloat(amount.replace(",",".")) || 0;

  function validate() {
    const e:any={};
    if(!name.trim()) e.name="Informe o favorecido.";
    if(!val||val<=0) e.amount="Informe um valor válido.";
    if(val>50000) e.amount="Limite por Pix: R$ 50.000,00";
    if(val>(account?.balance||0)) e.amount="Saldo insuficiente.";
    setErrs(e); return !Object.keys(e).length;
  }

  async function send() {
    setLoading(true);
    try {
      const r = await fetch("/api/account/pix",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount:val,creditor:name,description:desc})});
      const d = await r.json();
      if(!r.ok) throw new Error(d.message);
      setTxId(d.txId||"");
      await refresh();
      setStep(4);
    } catch(err:any){ toast(err.message,"error"); }
    finally { setLoading(false); }
  }

  const steps = [{n:1,l:"Dados"},{n:2,l:"Revisão"},{n:3,l:"Confirmar"},{n:4,l:"Comprovante"}];
  return (
    <div className="page-wrap narrow">
      <a href="/dashboard" className="back-link">← Voltar</a>
      <div className="steps">
        {steps.map((s,i)=>(
          <>
            <div key={s.n} className={`step${step>s.n?" done":step===s.n?" active":""}`}>
              <div className="step-num">{step>s.n?"✓":s.n}</div>
              <div className="step-label">{s.l}</div>
            </div>
            {i<steps.length-1&&<div className={`step-line${step>s.n?" done":""}`}/>}
          </>
        ))}
      </div>

      {step===1&&(
        <div className="form-card">
          <p className="eyebrow">Transferência Pix</p>
          <h3>Para quem você vai enviar?</h3>
          <p className="sub">Saldo disponível: <b style={{color:"var(--green)"}}>{money(account?.balance||0)}</b></p>
          <div className="f-grid mt16">
            <label className="field-label">Favorecido
              <input className={`f-input${errs.name?" err":""}`} value={name} onChange={e=>{setName(e.target.value);setErrs((p:any)=>{const n={...p};delete n.name;return n;})}} placeholder="Nome do destinatário"/>
              {errs.name&&<span className="field-err">{errs.name}</span>}
            </label>
            <label className="field-label">Valor (R$)
              <input className={`f-input${errs.amount?" err":""}`} value={amount} onChange={e=>{setAmount(e.target.value);setErrs((p:any)=>{const n={...p};delete n.amount;return n;})}} placeholder="0,00" type="number" min="0.01" step="0.01"/>
              {errs.amount&&<span className="field-err">{errs.amount}</span>}
            </label>
            <label className="field-label">Descrição (opcional)
              <input className="f-input" value={desc} onChange={e=>setDesc(e.target.value)} placeholder="Ex: almoço, divisão de conta..."/>
            </label>
            <button className="btn btn-primary btn-w" onClick={()=>{if(validate())setStep(2)}}>Revisar Pix →</button>
          </div>
        </div>
      )}

      {step===2&&(
        <div className="form-card">
          <p className="eyebrow">Revisão</p>
          <h3>Confira os dados antes de enviar</h3>
          <div className="pix-review mt16">
            <div className="pr-amount">{money(val)}</div>
            {[["Para",name],["Descrição",desc||"—"],["Saldo após",money((account?.balance||0)-val)]].map(([k,v])=>(
              <div key={k} className="pr-row"><span className="pk">{k}</span><span className="pv">{v}</span></div>
            ))}
          </div>
          <div className="f-grid mt16">
            <button className="btn btn-secondary" onClick={()=>setStep(1)}>← Editar</button>
            <button className="btn btn-primary" onClick={()=>setStep(3)}>Confirmar →</button>
          </div>
        </div>
      )}

      {step===3&&(
        <div className="form-card">
          <p className="eyebrow">Confirmação</p>
          <h3>Autorizar transferência</h3>
          <div className="pix-review mt16" style={{textAlign:"center"}}>
            <p style={{fontSize:14,color:"var(--tx-2)",marginBottom:8}}>Você está enviando</p>
            <div className="pr-amount">{money(val)}</div>
            <p style={{fontSize:14,color:"var(--tx-2)"}}>para <b style={{color:"var(--tx)"}}>{name}</b></p>
          </div>
          <div className="warn-box mt16">⚠️ Esta ação irá debitar o valor do seu saldo disponível. Não é possível cancelar após a confirmação.</div>
          <div className="f-grid mt16">
            <button className="btn btn-secondary" onClick={()=>setStep(2)}>← Voltar</button>
            <button className="btn btn-primary" onClick={send} disabled={loading}>{loading?"Enviando...":"✅ Confirmar e enviar"}</button>
          </div>
        </div>
      )}

      {step===4&&(
        <div className="form-card" style={{textAlign:"center"}}>
          <div className="receipt-ico">✅</div>
          <div className="receipt-amount" style={{color:"var(--green)"}}>{money(val)}</div>
          <p className="receipt-desc">Pix enviado com sucesso!</p>
          <div>
            {[["Favorecido",name],["Data",new Date().toLocaleDateString("pt-BR")],["Horário",new Date().toLocaleTimeString("pt-BR")],["Status","Concluído"]].map(([k,v])=>(
              <div key={k} className="receipt-row"><span className="rk">{k}</span><span className="rv">{v}</span></div>
            ))}
          </div>
          {txId&&<div className="receipt-id">ID da transação · {txId}</div>}
          <div className="f-grid mt16">
            <button className="btn btn-secondary" onClick={()=>{setStep(1);setName("");setAmount("");setDesc("");}}>Novo Pix</button>
            <button className="btn btn-primary" onClick={()=>router.push("/dashboard")}>Ir ao início</button>
          </div>
        </div>
      )}
    </div>
  );
}
