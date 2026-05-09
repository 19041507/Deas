"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { Search } from "lucide-react";

interface Tx { id:string; creditor:string; type:string; value:number; status:string; date:string; }

const fmt=(v:number)=>Number(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const txBg=(t:string)=>t==="entrada"?"var(--green-bg)":t==="saída"||t==="pagamento"?"var(--red-bg)":"var(--blue-bg)";
const txIcon=(t:string)=>t==="entrada"?"⬇️":t==="saída"||t==="pagamento"?"⬆️":"💳";

export default function ExtratoPage() {
  const [txs, setTxs] = useState<Tx[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("all");
  const [period, setPeriod] = useState("30");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [selected, setSelected] = useState<Tx|null>(null);

  async function load() {
    setLoading(true);
    try {
      const params = new URLSearchParams({limit:"15",page:String(page),period});
      if (filter!=="all") params.set("type", filter);
      const r = await fetch(`/api/transactions?${params}`);
      const d = await r.json();
      setTxs(d.transactions||[]); setTotal(d.total||0);
    } finally { setLoading(false); }
  }

  useEffect(()=>{ load(); },[filter,period,page]);

  const filtered = search ? txs.filter(t=>t.creditor.toLowerCase().includes(search.toLowerCase())) : txs;
  const pages = Math.ceil(total/15);

  return (
    <div className="page-wrap medium">
      <Link href="/dashboard" className="back-link">← Voltar</Link>

      <div className="card">
        <div className="sec-hdr mb16">
          <div><p className="eyebrow mb8">Histórico</p><h3>Extrato completo</h3></div>
        </div>

        {/* Filters */}
        <div style={{display:"flex",gap:10,flexWrap:"wrap",marginBottom:16}}>
          <div className="filter-row">
            {[["all","Todos"],["entrada","Entradas"],["saída","Saídas"],["pagamento","Pagamentos"],["crédito","Crédito"]].map(([v,l])=>(
              <button key={v} className={`ft ${filter===v?"on":""}`} onClick={()=>{setFilter(v);setPage(1);}}>{l}</button>
            ))}
          </div>
          <div className="filter-row">
            {[["7","7 dias"],["30","30 dias"],["90","90 dias"],["0","Tudo"]].map(([v,l])=>(
              <button key={v} className={`ft ${period===v?"on":""}`} onClick={()=>{setPeriod(v);setPage(1);}}>{l}</button>
            ))}
          </div>
          <div style={{position:"relative",flex:1,minWidth:160}}>
            <Search size={14} style={{position:"absolute",left:12,top:"50%",transform:"translateY(-50%)",color:"var(--tx-3)"}}/>
            <input className="fi" style={{paddingLeft:36}} placeholder="Buscar..." value={search} onChange={e=>setSearch(e.target.value)}/>
          </div>
        </div>

        {/* Table */}
        {loading ? <div style={{display:"grid",gap:8}}>{[1,2,3,4,5].map(i=><div key={i} className="sk" style={{height:48}}/>)}</div> :
         !filtered.length ? (
           <div className="empty-state" style={{padding:"48px 20px"}}>
             <div style={{fontSize:40,marginBottom:12}}>📄</div>
             <strong>Nenhuma movimentação</strong>
             <p>Tente outro filtro ou período.</p>
           </div>
         ) : (
           <div className="tx-list">
             {filtered.map(tx=>(
               <div key={tx.id} className="tx-item" onClick={()=>setSelected(tx)}>
                 <div className="tx-item-ico" style={{background:txBg(tx.type)}}><span style={{fontSize:15}}>{txIcon(tx.type)}</span></div>
                 <div className="tx-item-info">
                   <span className="tx-item-name">{tx.creditor}</span>
                   <span className="tx-item-meta">{tx.date} · {tx.type}</span>
                 </div>
                 <div style={{textAlign:"right"}}>
                   <div className="tx-item-val" style={{color:Number(tx.value)>0?"var(--green)":"var(--red)"}}>{Number(tx.value)>0?"+":""}{fmt(Number(tx.value))}</div>
                   <span className={`badge ${tx.status==="concluído"?"badge-success":""}`} style={{fontSize:10}}>{tx.status}</span>
                 </div>
               </div>
             ))}
           </div>
         )}

        {/* Pagination */}
        {pages > 1 && (
          <div style={{display:"flex",justifyContent:"center",gap:8,marginTop:16}}>
            <button className="btn btn-ghost btn-sm" disabled={page===1} onClick={()=>setPage(p=>p-1)}>← Anterior</button>
            <span style={{padding:"9px 14px",fontSize:13,color:"var(--tx-2)"}}>Página {page} de {pages}</span>
            <button className="btn btn-ghost btn-sm" disabled={page===pages} onClick={()=>setPage(p=>p+1)}>Próxima →</button>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {selected&&(
        <dialog open>
          <div className="dlg-head">
            <h3>Detalhe</h3>
            <p className="muted" style={{fontSize:13}}>Comprovante da movimentação</p>
          </div>
          <div className="dlg-body">
            <div style={{textAlign:"center",fontSize:48}}>{txIcon(selected.type)}</div>
            <div style={{textAlign:"center",fontSize:32,fontWeight:800,letterSpacing:"-.05em",color:Number(selected.value)>0?"var(--green)":"var(--red)"}}>
              {Number(selected.value)>0?"+":""}{fmt(Number(selected.value))}
            </div>
            {[["Descrição",selected.creditor],["Tipo",selected.type],["Data",selected.date],["Status",selected.status]].map(([k,v])=>(
              <div key={k} className="receipt-row"><span className="rk">{k}</span><span className="rv">{v}</span></div>
            ))}
            <p style={{fontSize:10,color:"var(--tx-3)",textAlign:"center",fontFamily:"monospace"}}>ID: {selected.id}</p>
            <button className="btn btn-secondary btn-w" onClick={()=>setSelected(null)}>Fechar</button>
          </div>
        </dialog>
      )}
    </div>
  );
}
