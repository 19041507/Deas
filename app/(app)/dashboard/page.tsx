"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { useApp } from "@/components/AppShell";

const money = (v: number) => Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const scoreColor = (s:number) => s>=800?"#34D399":s>=700?"#60A5FA":s>=600?"#F2B84B":s>=500?"#FBBF24":"#F87171";
const scoreCat = (s:number) => s>=800?"Excelente":s>=700?"Bom":s>=600?"Regular":s>=500?"Médio":"Baixo";

function ScoreRing({ score }: { score: number }) {
  const c = 314, pct = Math.min(1, Math.max(0,(score-300)/650));
  return (
    <div className="score-ring-wrap">
      <svg viewBox="0 0 120 120">
        <circle className="sr-bg" cx="60" cy="60" r="50"/>
        <circle className="sr-fill" cx="60" cy="60" r="50" strokeDasharray={c} strokeDashoffset={c-(c*pct)} stroke={scoreColor(score)}/>
      </svg>
      <div className="sr-val" style={{color:scoreColor(score)}}>{score}</div>
    </div>
  );
}

function MiniChart({ txs }: { txs: any[] }) {
  const days: any[] = [];
  for(let i=6;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);days.push({label:d.toLocaleDateString("pt-BR",{weekday:"short"}).replace(".",""),dateStr:d.toLocaleDateString("pt-BR"),in:0,out:0});}
  txs.forEach(tx=>{const day=days.find(d=>d.dateStr===tx.date);if(!day)return;const v=Number(tx.value);if(v>0)day.in+=v;else day.out+=Math.abs(v);});
  const max=Math.max(...days.map(d=>Math.max(d.in,d.out)),100);
  return (<>
    <div className="mini-chart">{days.map((d,i)=>(<div key={i} style={{display:"flex",alignItems:"flex-end",gap:2,flex:1}}>
      <div className="cb in" style={{height:Math.max(4,Math.round((d.in/max)*64)),flex:1}} title={`Entrada: ${money(d.in)}`}/>
      <div className="cb out" style={{height:Math.max(4,Math.round((d.out/max)*64)),flex:1}} title={`Saída: ${money(d.out)}`}/>
    </div>))}</div>
    <div className="chart-labels">{days.map((d,i)=><span key={i}>{d.label}</span>)}</div>
  </>);
}

export default function Dashboard() {
  const { account, user } = useApp();
  const [txs, setTxs] = useState<any[]>([]);
  const [bal, setBal] = useState(true);

  useEffect(()=>{
    fetch("/api/transactions?limit=10").then(r=>r.json()).then(d=>setTxs(d.transactions||[]));
  },[account]);

  const score = account?.creditScore||500;
  const hasDebt = (account?.debt||0)>0;

  return (
    <div className="page-wrap">
      {/* HERO */}
      <div className="hero mb20">
        <div className="hero-left">
          <div>
            <p className="eyebrow">Conta digital</p>
            <h1>Seu banco organizado.</h1>
            <p className="muted" style={{marginTop:8,fontSize:14}}>Gerencie saldo, Pix, crédito e Open Finance em um só lugar.</p>
          </div>
          <div className="hero-btns">
            <Link href="/pix" className="btn btn-primary">⚡ Fazer Pix</Link>
            <Link href="/deposito" className="btn btn-secondary">⬇️ Depositar</Link>
            <Link href="/extrato" className="btn btn-secondary">📄 Extrato</Link>
          </div>
        </div>
        <div className="hero-right">
          <button className="bal-toggle" onClick={()=>setBal(p=>!p)} title="Ocultar saldo">{bal?"👁":"🙈"}</button>
          <span className="bal-label">Saldo disponível</span>
          <div className={`bal-amount${!bal?" blur":""}`}>{money(account?.balance||0)}</div>
          <p className="bal-sub">Limite: <b>{money(account?.limit||0)}</b></p>
        </div>
      </div>

      {/* ALERTS */}
      {hasDebt && <div className="warn-box mb16">⚠️ Você possui uma dívida de <b>{money(account!.debt)}</b>. <Link href="/dividas" style={{color:"var(--gold)",fontWeight:700}}>Pagar agora →</Link></div>}

      {/* QUICK ACTIONS */}
      <div className="quick-grid mb20">
        {[
          {href:"/deposito",icon:"⬇️",label:"Depositar"},
          {href:"/pix",icon:"⚡",label:"Pix"},
          {href:"/extrato",icon:"📄",label:"Extrato"},
          {href:"/dividas",icon:"📋",label:"Dívidas"},
          {href:"/credito",icon:"💳",label:"Crédito"},
          {href:"/open-finance",icon:"🔗",label:"Open Finance"},
        ].map(a=>(
          <Link key={a.href} href={a.href} className="qa">
            <div className="qa-icon">{a.icon}</div>
            <span>{a.label}</span>
          </Link>
        ))}
      </div>

      {/* METRICS */}
      <div className="metrics mb20">
        <div className="metric m-gold"><div className="metric-icon">📊</div><span className="metric-label">Score</span><span className="metric-val" style={{color:scoreColor(score)}}>{score}</span><span className="metric-sub">{scoreCat(score)}</span></div>
        <div className="metric m-red" style={{cursor:"pointer"}} onClick={()=>window.location.href="/dividas"}><div className="metric-icon">📉</div><span className="metric-label">Dívida</span><span className="metric-val">{money(account?.debt||0)}</span><span className="metric-sub">Clique para pagar</span></div>
        <div className="metric m-green"><div className="metric-icon">✅</div><span className="metric-label">Pré-aprovado</span><span className="metric-val">{money(account?.preApproved||0)}</span><span className="metric-sub">Empréstimo disponível</span></div>
        <div className="metric m-blue" style={{cursor:"pointer"}} onClick={()=>window.location.href="/open-finance"}><div className="metric-icon">🔗</div><span className="metric-label">Open Finance</span><span className="metric-val" style={{fontSize:14}}>{account?"Verificar":"-"}</span><span className="metric-sub">Conecte o DeasBank</span></div>
      </div>

      {/* CHART + SCORE */}
      <div className="g2 mb20">
        <div className="card">
          <p className="eyebrow mb8">Movimentação</p>
          <div className="chart-legend"><div className="cl-item"><div className="cl-dot" style={{background:"#34D399"}}/>Entradas</div><div className="cl-item"><div className="cl-dot" style={{background:"#F87171"}}/>Saídas</div></div>
          <MiniChart txs={txs}/>
        </div>
        <div className="card">
          <p className="eyebrow mb12">Score de crédito</p>
          <div className="score-section">
            <ScoreRing score={score}/>
            <div className="score-info">
              <span className="sc-label">Classificação</span>
              <div className="sc-cat" style={{color:scoreColor(score)}}>{scoreCat(score)}</div>
              <p style={{fontSize:13}}>Score calculado com base em saldo, dívida, limite e Open Finance.</p>
            </div>
          </div>
          <div className="score-factors">
            <div className="sf"><div className="sf-dot" style={{background:"var(--green-bg)",color:"var(--green)"}}>+</div><span>Saldo positivo</span></div>
            {(account?.debt||0)>0&&<div className="sf"><div className="sf-dot" style={{background:"var(--red-bg)",color:"var(--red)"}}>-</div><span>Dívida pendente</span></div>}
            {(account?.loansTotal||0)>0&&<div className="sf"><div className="sf-dot" style={{background:"var(--red-bg)",color:"var(--red)"}}>-</div><span>Empréstimos ativos</span></div>}
          </div>
        </div>
      </div>

      {/* RECENT TX */}
      <div className="card">
        <div className="sec-hdr">
          <div><p className="eyebrow">Histórico</p><h3>Movimentações recentes</h3></div>
          <Link href="/extrato" className="btn btn-secondary btn-sm">Ver extrato completo →</Link>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Descrição</th><th>Data</th><th>Valor</th><th>Status</th></tr></thead>
            <tbody>
              {!txs.length ? (
                <tr><td colSpan={4}><div className="empty-state"><strong>Nenhuma movimentação</strong><p>Faça seu primeiro depósito para começar.</p></div></td></tr>
              ) : txs.map(tx=>{
                const v=Number(tx.value);
                const icons:any={entrada:"⬇️",saída:"⚡",pagamento:"📋",crédito:"💳"};
                const bgs:any={entrada:"rgba(52,211,153,0.12)",saída:"rgba(248,113,113,0.12)",pagamento:"rgba(248,113,113,0.12)",crédito:"rgba(96,165,250,0.12)"};
                return (<tr key={tx.id}>
                  <td><div className="tx-cell"><div className="tx-ico" style={{background:bgs[tx.type]||"rgba(242,184,75,0.10)"}}>{icons[tx.type]||"💰"}</div><div><span className="tx-name">{tx.creditor}</span><span className="tx-kind">{tx.type}</span></div></div></td>
                  <td style={{color:"var(--tx-2)",fontSize:13}}>{tx.date||"—"}</td>
                  <td className={v>0?"td-pos":"td-neg"}>{money(v)}</td>
                  <td><span className={`badge${tx.status==="concluído"?" badge-success":""}`}>{tx.status}</span></td>
                </tr>);
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
