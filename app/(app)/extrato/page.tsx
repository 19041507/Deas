"use client";
import { useEffect, useState } from "react";
const money = (v:number) => Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const TYPES = [{v:"all",l:"Todas"},{v:"entrada",l:"Entradas"},{v:"saída",l:"Saídas"},{v:"pagamento",l:"Pagamentos"},{v:"crédito",l:"Crédito"}];
const PERIODS = [{v:7,l:"7 dias"},{v:30,l:"30 dias"},{v:90,l:"90 dias"},{v:0,l:"Todos"}];
export default function Extrato() {
  const [txs,setTxs]=useState<any[]>([]);
  const [loading,setLoading]=useState(true);
  const [type,setType]=useState("all");
  const [period,setPeriod]=useState(30);
  const [page,setPage]=useState(1);
  const [total,setTotal]=useState(0);
  const [pages,setPages]=useState(1);
  const [selected,setSelected]=useState<any>(null);

  async function load(t=type,per=period,pg=page) {
    setLoading(true);
    const r = await fetch(`/api/transactions?type=${t}&period=${per}&page=${pg}&limit=20`);
    const d = await r.json();
    setTxs(d.transactions||[]);setTotal(d.total||0);setPages(d.pages||1);
    setLoading(false);
  }
  useEffect(()=>{load();},[]);

  function changeType(t:string){setType(t);setPage(1);load(t,period,1);}
  function changePeriod(p:number){setPeriod(p);setPage(1);load(type,p,1);}
  function changePage(p:number){setPage(p);load(type,period,p);}

  const icons:any={entrada:"⬇️",saída:"⚡",pagamento:"📋",crédito:"💳"};
  const bgs:any={entrada:"rgba(52,211,153,0.12)",saída:"rgba(248,113,113,0.12)",pagamento:"rgba(248,113,113,0.12)",crédito:"rgba(96,165,250,0.12)"};

  return (
    <div className="page-wrap">
      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:12,marginBottom:20}}>
        <div><p className="eyebrow">Conta corrente</p><h2 style={{fontFamily:"Outfit",fontSize:24,fontWeight:800,letterSpacing:"-.04em"}}>Extrato completo</h2></div>
        <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
          {PERIODS.map(p=><button key={p.v} className={`ft${period===p.v?" on":""}`} onClick={()=>changePeriod(p.v)}>{p.l}</button>)}
        </div>
      </div>
      <div className="card">
        <div className="sec-hdr">
          <div className="filter-row">{TYPES.map(t=><button key={t.v} className={`ft${type===t.v?" on":""}`} onClick={()=>changeType(t.v)}>{t.l}</button>)}</div>
          <span style={{fontSize:13,color:"var(--tx-3)"}}>{total} resultado{total!==1?"s":""}</span>
        </div>
        <div className="tbl-wrap">
          <table>
            <thead><tr><th>Descrição</th><th>Data</th><th>Valor</th><th>Status</th></tr></thead>
            <tbody>
              {loading ? (
                [1,2,3,4,5].map(i=><tr key={i}><td colSpan={4}><div className="sk" style={{height:40,borderRadius:8,margin:"4px 0"}}/></td></tr>)
              ) : !txs.length ? (
                <tr><td colSpan={4}><div className="empty-state"><strong>Nenhuma movimentação</strong><p>Altere o filtro ou período para ver resultados.</p></div></td></tr>
              ) : txs.map(tx=>{
                const v=Number(tx.value);
                return (
                  <tr key={tx.id} style={{cursor:"pointer"}} onClick={()=>setSelected(tx)}>
                    <td><div className="tx-cell"><div className="tx-ico" style={{background:bgs[tx.type]||"rgba(242,184,75,0.10)"}}>{icons[tx.type]||"💰"}</div><div><span className="tx-name">{tx.creditor}</span><span className="tx-kind">{tx.type}</span></div></div></td>
                    <td style={{color:"var(--tx-2)",fontSize:13}}>{tx.date}</td>
                    <td className={v>0?"td-pos":"td-neg"}>{money(v)}</td>
                    <td><span className={`badge${tx.status==="concluído"?" badge-success":""}`}>{tx.status}</span></td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {pages>1&&(
          <div style={{display:"flex",justifyContent:"center",gap:8,marginTop:16}}>
            <button className="btn btn-ghost btn-sm" disabled={page<=1} onClick={()=>changePage(page-1)}>← Anterior</button>
            <span style={{padding:"9px 14px",fontSize:13,color:"var(--tx-2)"}}>Página {page} de {pages}</span>
            <button className="btn btn-ghost btn-sm" disabled={page>=pages} onClick={()=>changePage(page+1)}>Próxima →</button>
          </div>
        )}
      </div>

      {selected&&(
        <dialog open>
          <div className="dlg-head"><h3>Detalhe da transação</h3><p className="muted" style={{fontSize:13}}>ID: {selected.id}</p></div>
          <div className="dlg-body">
            <div className="receipt-ico">{icons[selected.type]||"💰"}</div>
            <div className="receipt-amount" style={{color:Number(selected.value)>0?"var(--green)":"var(--red)"}}>{money(Number(selected.value))}</div>
            <div>
              {[["Favorecido",selected.creditor],["Tipo",selected.type],["Data",selected.date],["Status",selected.status]].map(([k,v])=>(
                <div key={k} className="receipt-row"><span className="rk">{k}</span><span className="rv">{v}</span></div>
              ))}
            </div>
            <div className="receipt-id">ID · {selected.id}</div>
            <button className="btn btn-secondary btn-w mt12" onClick={()=>setSelected(null)}>Fechar</button>
          </div>
        </dialog>
      )}
    </div>
  );
}
