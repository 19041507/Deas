"use client";
import { useEffect, useState } from "react";
import { useApp } from "@/components/AppShell";
const money = (v:number) => Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

function ConnectFlow({ onDone }: { onDone:()=>void }) {
  const {toast} = useApp();
  const [step,setStep] = useState(1);
  const [consent,setConsent] = useState(false);
  const [loading,setLoading] = useState(false);
  async function connect() {
    if(!consent) return toast("Autorize a conexão para continuar.","error");
    setLoading(true);
    try {
      const r = await fetch("/api/open-finance/connect",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({institutionName:"DeasBank"})});
      const d = await r.json();
      if(!r.ok) throw new Error(d.message);
      toast("DeasBank conectado com sucesso!","success");
      onDone();
    } catch(err:any){ toast(err.message,"error"); setLoading(false); }
  }
  return (
    <div className="form-card">
      {step===1&&<>
        <p className="eyebrow">Consentimento Open Finance</p>
        <h3 className="mt8">Conectar DeasBank</h3>
        <p className="sub">Esta etapa vincula contas do mesmo usuário em instituições parceiras.</p>
        <div className="consent-box mt16">
          <strong>Você está autorizando que o Deas Finance:</strong>
          <ul className="clist">
            <li>Confirme que a conta DeasBank pertence ao mesmo titular</li>
            <li>Solicite dados financeiros com consentimento explícito</li>
            <li>Use os dados para melhorar análise de crédito e score</li>
            <li>Acesse os dados por até 12 meses (revogável a qualquer momento)</li>
          </ul>
          <p style={{fontSize:12.5,color:"var(--tx-3)",marginTop:8}}>Dados compartilhados: saldo, limite, dívidas, score, renda estimada e empréstimos.</p>
        </div>
        <div className="info-box mt12">🔐 Você pode revogar este consentimento a qualquer momento na página Open Finance.</div>
        <label className="check-row mt16"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span style={{fontSize:14}}>Estou ciente e autorizo a conexão com o DeasBank</span></label>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:16}}>
          <button className="btn btn-secondary" onClick={onDone}>Cancelar</button>
          <button className="btn btn-primary" onClick={()=>setStep(2)} disabled={!consent}>Próximo →</button>
        </div>
      </>}
      {step===2&&<>
        <p className="eyebrow">Revisão final</p>
        <h3 className="mt8">Confirmar conexão</h3>
        <div className="pix-review mt16">
          {[["Instituição","DeasBank"],["Validade","12 meses"],["Finalidade","Análise de crédito e Open Finance"],["Dados","Saldo, limite, score, dívidas, renda"]].map(([k,v])=>(
            <div key={k} className="pr-row"><span className="pk">{k}</span><span className="pv" style={{fontSize:12.5,textAlign:"right"}}>{v}</span></div>
          ))}
        </div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:16}}>
          <button className="btn btn-secondary" onClick={()=>setStep(1)}>← Voltar</button>
          <button className="btn btn-primary" onClick={connect} disabled={loading}>{loading?"Conectando...":"✅ Confirmar e conectar"}</button>
        </div>
      </>}
    </div>
  );
}

function SalaryFlow({ onDone }: { onDone:()=>void }) {
  const {refresh,toast} = useApp();
  const [amount,setAmount] = useState(3200);
  const [consent,setConsent] = useState(false);
  const [loading,setLoading] = useState(false);
  async function transfer() {
    if(!consent) return toast("Autorize a operação.","error");
    setLoading(true);
    try {
      const r = await fetch("/api/open-finance/salary",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amount})});
      const d = await r.json();
      if(!r.ok) throw new Error(d.message);
      toast(`${Number(amount).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})} creditados na sua conta!`,"success");
      await refresh(); onDone();
    } catch(err:any){ toast(err.message,"error"); setLoading(false); }
  }
  return (
    <div className="form-card">
      <p className="eyebrow">Portabilidade salarial</p>
      <h3 className="mt8">Trazer salário do DeasBank</h3>
      <p className="sub">Transfira renda para o Deas Finance e melhore seu score com renda confirmada.</p>
      <label className="field-label mt16">Valor a trazer
        <input className="f-input" type="number" value={amount} onChange={e=>setAmount(Number(e.target.value))} min={100} step={100}/>
      </label>
      <input type="range" min={100} max={15000} step={100} value={amount} onChange={e=>setAmount(Number(e.target.value))} style={{width:"100%",accentColor:"var(--gold)",marginTop:8}}/>
      <div className="consent-box mt12">
        <strong>Dados solicitados ao DeasBank:</strong>
        <ul className="clist"><li>Renda mensal para portabilidade</li><li>Saldo e movimentação</li><li>Dívidas, limite e score externos</li></ul>
        <label className="check-row mt12"><input type="checkbox" checked={consent} onChange={e=>setConsent(e.target.checked)}/><span style={{fontSize:14}}>Estou ciente e autorizo esta operação</span></label>
      </div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:16}}>
        <button className="btn btn-secondary" onClick={onDone}>Cancelar</button>
        <button className="btn btn-primary" onClick={transfer} disabled={loading||!consent}>{loading?"Processando...":"💰 Trazer salário"}</button>
      </div>
    </div>
  );
}

export default function OpenFinance() {
  const {refresh,toast} = useApp();
  const [consents,setConsents] = useState<any[]>([]);
  const [loading,setLoading] = useState(true);
  const [view,setView] = useState<"main"|"connect"|"salary">("main");

  async function load() {
    setLoading(true);
    const r = await fetch("/api/open-finance"); const d = await r.json();
    setConsents(Array.isArray(d)?d:[]); setLoading(false);
  }
  useEffect(()=>{load();},[]);

  async function disconnect(id:string) {
    try {
      const r = await fetch("/api/open-finance/disconnect",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});
      if(!r.ok) throw new Error((await r.json()).message);
      toast("Consentimento revogado com sucesso.","info");
      await refresh(); load();
    } catch(err:any){ toast(err.message,"error"); }
  }

  const connected = consents.length>0;
  const c = consents[0];

  if(view==="connect") return <div className="page-wrap narrow"><button className="back-link" onClick={()=>setView("main")}>← Voltar</button><ConnectFlow onDone={()=>{setView("main");load();refresh();}}/></div>;
  if(view==="salary") return <div className="page-wrap narrow"><button className="back-link" onClick={()=>setView("main")}>← Voltar</button><SalaryFlow onDone={()=>{setView("main");load();}}/></div>;

  const steps = [{l:"Conexão",desc:"Vincular DeasBank"},{l:"Portabilidade",desc:"Trazer salário"},{l:"Score",desc:"Análise aprimorada"}];
  const stepStatus = (i:number) => { if(!connected) return ""; if(i===0) return "done"; if(i===1) return c?.requestedSalary>0?"done":"active"; return c?.requestedSalary>0?"done":"active"; };

  return (
    <div className="page-wrap medium">
      <div className="of-hero">
        <div><p className="eyebrow">Dados conectados</p><h3>Open Finance</h3><p>Compartilhe dados com segurança e melhore seu score. Consentimento explícito em cada etapa.</p></div>
        <div className="of-btns">
          {!connected&&<button className="btn btn-primary" onClick={()=>setView("connect")}>🔗 Conectar DeasBank</button>}
          {connected&&<button className="btn btn-primary" onClick={()=>setView("salary")}>💰 Portabilidade salarial</button>}
          {connected&&<button className="btn btn-secondary" onClick={()=>{load();refresh();}}>🔄 Sincronizar</button>}
        </div>
      </div>

      <div className="of-steps mb16">
        {steps.map((s,i)=>(
          <div key={i} className={`of-step${stepStatus(i)==="done"?" done":stepStatus(i)==="active"?" active":""}`}>
            <div className="osn">{stepStatus(i)==="done"?"✓":i+1}</div>
            <div><div style={{fontSize:13,fontWeight:700}}>{s.l}</div><div className="osl">{s.desc}</div></div>
          </div>
        ))}
      </div>

      <div className="of-grid2">
        <div className="card">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12,flexWrap:"wrap",gap:8}}>
            <div><p className="eyebrow">Conexão atual</p><h3 style={{fontSize:17,marginTop:4}}>{connected?"DeasBank conectado":"Nenhuma conexão"}</h3></div>
            <span className={`badge${connected?" badge-success":""}`}>{connected?"Ativo":"Sem conexão"}</span>
          </div>
          {!connected ? (
            <div className="empty-state" style={{border:"1px dashed var(--bd-s)",borderRadius:16,padding:"24px 16px"}}>
              <strong>Nenhuma instituição conectada</strong>
              <p>Conecte o DeasBank para compartilhar dados com consentimento e melhorar seu score.</p>
              <button className="btn btn-primary btn-sm mt12" onClick={()=>setView("connect")}>🔗 Conectar agora</button>
            </div>
          ) : (
            <div className="connection-card">
              <div>
                <strong>DeasBank</strong>
                <p className="muted" style={{fontSize:13}}>Ativo · Válido até {c.validUntil?new Date(c.validUntil).toLocaleDateString("pt-BR"):"12 meses"}</p>
                <p className="muted" style={{fontSize:12,marginTop:3}}>Conectado em {new Date(c.createdAt).toLocaleDateString("pt-BR")}</p>
              </div>
              <button className="btn btn-danger-soft btn-sm" onClick={()=>disconnect(c.id)}>Revogar</button>
            </div>
          )}
        </div>
        {connected&&(
          <div className="card">
            <p className="eyebrow mb8">Portabilidade</p>
            <h3 style={{fontSize:17,marginBottom:8}}>Salário DeasBank</h3>
            <span className="big-num" style={{fontSize:28,margin:"6px 0 8px"}}>{money(c.requestedSalary||0)}</span>
            <p className="muted" style={{fontSize:13}}>Valor trazido do DeasBank para o Deas Finance.</p>
            <button className="btn btn-primary btn-sm mt12" onClick={()=>setView("salary")}>💰 Atualizar portabilidade</button>
          </div>
        )}
      </div>

      {connected&&(
        <div className="card mt16">
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14,flexWrap:"wrap",gap:8}}>
            <div><p className="eyebrow">Dados recebidos</p><h3 style={{fontSize:17,marginTop:4}}>Visão unificada DeasBank</h3></div>
            <span className="badge badge-success">Com consentimento</span>
          </div>
          <div className="of-data">
            {[["Salário trazido",money(c.requestedSalary||0)],["Saldo externo",money(c.externalBalance||0)],["Dívida externa",money(c.externalDebt||0)],["Limite externo",money(c.externalLimit||0)],["Empréstimos",money(c.externalLoans||0)],["Investimentos",money(c.externalInvestments||0)],["Score externo",String(c.externalScore||"—")],["Renda estimada",money(c.estimatedIncome||0)]].map(([k,v])=>(
              <div key={k} className="of-data-item"><small>{k}</small><strong>{v}</strong></div>
            ))}
          </div>
          <p className="muted mt12" style={{fontSize:13}}>Dados recebidos via API Open Finance simulada. Última sincronização: {new Date(c.updatedAt).toLocaleString("pt-BR")}.</p>
        </div>
      )}
    </div>
  );
}
