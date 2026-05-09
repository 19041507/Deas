"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Zap, ArrowDownToLine, FileText, CreditCard, Link2, TrendingUp } from "lucide-react";
import { useApp } from "@/components/AppShell";

const money = (v:number,vis:boolean) => vis ? Number(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"}) : "••••••";
const scoreColor = (s:number) => s>=800?"#22C55E":s>=700?"#3B82F6":s>=600?"#D4A84F":s>=500?"#F59E0B":"#EF4444";
const scoreLabel = (s:number) => s>=800?"Excelente":s>=700?"Bom":s>=600?"Regular":s>=500?"Médio":"Baixo";

interface Tx { id:string; creditor:string; type:string; value:number; status:string; date:string; createdAt:string; }

export default function Dashboard() {
  const { account, balVis, toast } = useApp();
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(()=>{
    fetch("/api/transactions?limit=5").then(r=>r.json()).then(d=>setTxs(d.transactions||[])).catch(()=>toast("Erro ao carregar extrato.","error")).finally(()=>setLoading(false));
  },[]);

  const score = account?.creditScore || 500;
  const circumference = 314;
  const pct = Math.min(1, Math.max(0, (score-300)/650));
  const offset = circumference - circumference*pct;
  const txIcon = (type:string) => type==="entrada"?"⬇️":type==="saída"||type==="pagamento"?"⬆️":"💳";
  const txBg = (type:string) => type==="entrada"?"var(--green-bg)":type==="saída"||type==="pagamento"?"var(--red-bg)":"var(--blue-bg)";

  return (
    <div className="page-wrap">
      {/* HERO */}
      <div className="hero mb20">
        <div className="hero-left">
          <div>
            <p className="eyebrow mb8">Conta digital</p>
            <h1>Gerencie seu dinheiro com clareza.</h1>
          </div>
          <div className="hero-btns">
            <Link href="/pix" className="btn btn-primary btn-sm"><Zap size={14}/>Pix</Link>
            <Link href="/deposito" className="btn btn-secondary btn-sm"><ArrowDownToLine size={14}/>Depositar</Link>
            <Link href="/extrato" className="btn btn-ghost btn-sm"><FileText size={14}/>Extrato</Link>
          </div>
        </div>
        <div className="hero-right">
          <span className="bal-label">Saldo disponível</span>
          <div className={`bal-amount ${!balVis?"blur":""}`}>{account ? money(account.balance, balVis) : "---"}</div>
          <div className="bal-sub">Limite: <b>{account ? money(account.limit, balVis) : "---"}</b></div>
        </div>
      </div>

      {/* QUICK ACTIONS */}
      <div className="quick-grid mb20">
        {[{href:"/pix",icon:<Zap size={18}/>,label:"Pix"},{href:"/deposito",icon:<ArrowDownToLine size={18}/>,label:"Depositar"},{href:"/extrato",icon:<FileText size={18}/>,label:"Extrato"},{href:"/credito",icon:<CreditCard size={18}/>,label:"Crédito"},{href:"/open-finance",icon:<Link2 size={18}/>,label:"Open Finance"}].map(a=>(
          <Link key={a.href} href={a.href} className="qa"><div className="qa-icon">{a.icon}</div><span>{a.label}</span></Link>
        ))}
      </div>

      {/* METRICS */}
      <div className="metrics mb20">
        <div className="metric m-red">
          <div className="metric-icon"><CreditCard size={16} color="var(--red)"/></div>
          <span className="metric-label">Dívida atual</span>
          <span className="metric-val">{account ? money(account.debt, balVis) : "---"}</span>
          <Link href="/dividas" className="metric-sub" style={{color:"var(--gold)"}}>Pagar dívida →</Link>
        </div>
        <div className="metric m-gold">
          <div className="metric-icon"><TrendingUp size={16} color="var(--gold)"/></div>
          <span className="metric-label">Pré-aprovado</span>
          <span className="metric-val">{account ? money(account.preApproved, balVis) : "---"}</span>
          <Link href="/credito" className="metric-sub" style={{color:"var(--gold)"}}>Solicitar →</Link>
        </div>
        <div className="metric m-blue">
          <div className="metric-icon"><Link2 size={16} color="var(--blue)"/></div>
          <span className="metric-label">Open Finance</span>
          <span className="metric-val" style={{fontSize:15}}>Conectar</span>
          <Link href="/open-finance" className="metric-sub" style={{color:"var(--gold)"}}>Gerenciar →</Link>
        </div>
      </div>

      {/* SCORE + TRANSACTIONS */}
      <div className="g2">
        <div className="card">
          <p className="eyebrow mb12">Score de crédito</p>
          <div className="score-section">
            <div className="score-ring-wrap">
              <svg viewBox="0 0 120 120"><circle className="sr-bg" cx="60" cy="60" r="50"/><circle className="sr-fill" cx="60" cy="60" r="50" strokeDasharray={circumference} strokeDashoffset={offset} stroke={scoreColor(score)}/></svg>
              <div className="sr-val" style={{color:scoreColor(score)}}>{score}</div>
            </div>
            <div className="score-info">
              <span className="sc-label">Pontuação</span>
              <div className="sc-cat" style={{color:scoreColor(score)}}>{scoreLabel(score)}</div>
              <p>Melhore conectando o Open Finance.</p>
              <Link href="/credito" style={{display:"inline-flex",alignItems:"center",gap:6,marginTop:10,fontSize:13,fontWeight:600,color:"var(--gold-l)"}}>Ver crédito →</Link>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="sec-hdr">
            <h3>Últimas movimentações</h3>
            <Link href="/extrato" className="btn btn-ghost btn-xs">Ver todas</Link>
          </div>
          {loading ? <div style={{display:"grid",gap:10}}>{[1,2,3].map(i=><div key={i} className="sk" style={{height:44}}/>)}</div> :
           !txs.length ? <div className="empty-state"><strong>Nenhuma movimentação</strong><p>Faça um depósito para começar.</p></div> :
           <div className="tx-list">
             {txs.map(tx=>(
               <div key={tx.id} className="tx-item">
                 <div className="tx-item-ico" style={{background:txBg(tx.type)}}><span style={{fontSize:14}}>{txIcon(tx.type)}</span></div>
                 <div className="tx-item-info">
                   <span className="tx-item-name">{tx.creditor}</span>
                   <span className="tx-item-meta">{tx.date} · {tx.type}</span>
                 </div>
                 <span className="tx-item-val" style={{color:Number(tx.value)>0?"var(--green)":"var(--red)"}}>{Number(tx.value)>0?"+":""}{Number(tx.value).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</span>
               </div>
             ))}
           </div>}
        </div>
      </div>
    </div>
  );
}
