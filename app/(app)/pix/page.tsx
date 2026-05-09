"use client";
import { useState } from "react";
import Link from "next/link";
import { Zap, CheckCircle, Copy } from "lucide-react";
import { useApp } from "@/components/AppShell";

const fmt = (v:number) => Number(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const genId = () => "PIX"+Date.now().toString(36).toUpperCase();

export default function PixPage() {
  const { account, refresh, toast } = useApp();
  const [step, setStep] = useState(0); // 0=form 1=review 2=pin 3=done
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [desc, setDesc] = useState("");
  const [pin, setPin] = useState(["","","","","",""]);
  const [loading, setLoading] = useState(false);
  const [txId, setTxId] = useState("");

  const numVal = parseFloat(amount.replace(/\./g,"").replace(",",".")) || 0;

  function handleAmountChange(e: React.ChangeEvent<HTMLInputElement>) {
    let raw = e.target.value.replace(/\D/g,"");
    if (!raw) { setAmount(""); return; }
    const n = parseInt(raw,10)/100;
    setAmount(n.toLocaleString("pt-BR",{minimumFractionDigits:2,maximumFractionDigits:2}));
  }

  function validateForm() {
    if (!name.trim()) { toast("Informe o favorecido.","error"); return false; }
    if (numVal < 0.01) { toast("Valor inválido.","error"); return false; }
    if (numVal > 50000) { toast("Limite por Pix: R$ 50.000,00","error"); return false; }
    if (account && numVal > account.balance) { toast("Saldo insuficiente.","error"); return false; }
    return true;
  }

  function handlePinChange(i:number, v:string) {
    if (!/^\d?$/.test(v)) return;
    const next = [...pin]; next[i] = v; setPin(next);
    if (v && i < 5) {
      const el = document.getElementById(`pin-${i+1}`);
      el?.focus();
    }
  }

  async function confirmPix() {
    setLoading(true);
    try {
      const res = await fetch("/api/account/pix",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount:numVal,creditor:name.trim(),description:desc})});
      const d = await res.json();
      if (!res.ok) { toast(d.message||"Erro ao enviar Pix.","error"); setStep(1); return; }
      setTxId(d.txId || genId());
      await refresh();
      setStep(3);
    } finally { setLoading(false); }
  }

  const steps = ["Dados","Revisão","Confirmar","Comprovante"];
  const bal = account?.balance ?? 0;

  return (
    <div className="page-wrap narrow">
      <Link href="/dashboard" className="back-link">← Voltar</Link>

      {/* Step indicator */}
      <div className="steps mb20">
        {steps.map((s,i)=>(
          <div key={s} style={{display:"flex",alignItems:"center",flex:i<steps.length-1?1:"none",gap:6}}>
            <div className={`step ${step===i?"active":""} ${step>i?"done":""}`} style={{display:"flex",alignItems:"center",gap:6}}>
              <div className="step-num">{step>i?"✓":i+1}</div>
              <span className={`step-lbl ${step===i?"active-lbl":""}`}>{s}</span>
            </div>
            {i<steps.length-1&&<div className={`step-line ${step>i?"done":""}`}/>}
          </div>
        ))}
      </div>

      {/* STEP 0: Dados */}
      {step===0&&(
        <div className="form-card">
          <p className="eyebrow">Pix</p>
          <h3>Enviar dinheiro</h3>
          <p className="sub">Transferência instantânea e gratuita.</p>
          <div className="f-grid">
            <label className="field">Favorecido<input className="fi" placeholder="Nome ou chave Pix" value={name} onChange={e=>setName(e.target.value)}/></label>
            <label className="field">Valor
              <div className="money-input-wrap">
                <span className="money-prefix">R$</span>
                <input className="fi" inputMode="numeric" placeholder="0,00" value={amount} onChange={handleAmountChange}/>
              </div>
            </label>
            <label className="field">Descrição (opcional)<input className="fi" placeholder="Ex: aluguel" value={desc} onChange={e=>setDesc(e.target.value)}/></label>
            <div className="info-box">Saldo disponível: <strong>{fmt(bal)}</strong></div>
            <button className="btn btn-primary btn-w" onClick={()=>{if(validateForm())setStep(1);}}>Continuar →</button>
          </div>
        </div>
      )}

      {/* STEP 1: Revisão */}
      {step===1&&(
        <div className="form-card">
          <p className="eyebrow">Confirme os dados</p>
          <h3>Revisão do Pix</h3>
          <p className="sub">Verifique antes de confirmar.</p>
          <div className="pix-review mt16">
            <div className="pr-amount">{fmt(numVal)}</div>
            <div className="pr-row"><span className="pk">Para</span><span className="pv">{name}</span></div>
            {desc&&<div className="pr-row"><span className="pk">Descrição</span><span className="pv">{desc}</span></div>}
            <div className="pr-row"><span className="pk">Saldo após</span><span className="pv">{fmt(bal-numVal)}</span></div>
            <div className="pr-row"><span className="pk">Data</span><span className="pv">{new Date().toLocaleString("pt-BR")}</span></div>
          </div>
          <div className="g2 mt16">
            <button className="btn btn-secondary" onClick={()=>setStep(0)}>← Corrigir</button>
            <button className="btn btn-primary" onClick={()=>setStep(2)}>Confirmar →</button>
          </div>
        </div>
      )}

      {/* STEP 2: PIN */}
      {step===2&&(
        <div className="form-card">
          <p className="eyebrow">Autenticação</p>
          <h3>Digite seu PIN</h3>
          <p className="sub">Insira os 6 dígitos do seu PIN para autorizar o Pix de <strong>{fmt(numVal)}</strong>.</p>
          <div className="pin-wrap mt16">
            {pin.map((d,i)=>(
              <input key={i} id={`pin-${i}`} className="pin-digit" type="password" inputMode="numeric" maxLength={1} value={d}
                onChange={e=>handlePinChange(i,e.target.value)}
                onKeyDown={e=>{if(e.key==="Backspace"&&!d&&i>0){document.getElementById(`pin-${i-1}`)?.focus();}}}/>
            ))}
          </div>
          <div className="warn-box mt16">Em ambiente de demonstração qualquer PIN é aceito.</div>
          <div className="g2 mt16">
            <button className="btn btn-secondary" onClick={()=>setStep(1)}>← Voltar</button>
            <button className="btn btn-primary" disabled={loading} onClick={confirmPix}>{loading?"Enviando...":"Autorizar Pix"}</button>
          </div>
        </div>
      )}

      {/* STEP 3: Comprovante */}
      {step===3&&(
        <div className="form-card" style={{textAlign:"center"}}>
          <div style={{fontSize:56,marginBottom:8}}>✅</div>
          <h3 style={{fontSize:22}}>Pix enviado!</h3>
          <p className="sub">Transferência realizada com sucesso.</p>
          <div className="pix-review" style={{textAlign:"left",marginTop:16}}>
            <div className="pr-amount" style={{color:"var(--green)"}}>{fmt(numVal)}</div>
            <div className="pr-row"><span className="pk">Para</span><span className="pv">{name}</span></div>
            <div className="pr-row"><span className="pk">Data</span><span className="pv">{new Date().toLocaleString("pt-BR")}</span></div>
            <div className="pr-row"><span className="pk">Status</span><span className="pv" style={{color:"var(--green)"}}>Concluído</span></div>
          </div>
          <p style={{fontSize:11,color:"var(--tx-3)",marginTop:10,fontFamily:"monospace"}}>ID: {txId}</p>
          <div className="g2 mt16">
            <button className="btn btn-secondary" onClick={()=>navigator.clipboard?.writeText(txId).then(()=>toast("ID copiado!","success"))}><Copy size={14}/>Copiar ID</button>
            <Link href="/dashboard" className="btn btn-primary">Voltar ao início</Link>
          </div>
        </div>
      )}
    </div>
  );
}
