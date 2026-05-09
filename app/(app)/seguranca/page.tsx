"use client";
import Link from "next/link";
import { Lock, Eye, Smartphone, AlertTriangle, Shield, Clock } from "lucide-react";

const items = [
  { icon:<Lock size={18}/>, color:"var(--blue-bg)", iconColor:"var(--blue)", title:"Senha da conta", desc:"Altere sua senha de acesso", action:"Em breve" },
  { icon:<Smartphone size={18}/>, color:"var(--green-bg)", iconColor:"var(--green)", title:"Verificação em duas etapas", desc:"Adicione uma camada extra de segurança", action:"Em breve" },
  { icon:<Eye size={18}/>, color:"rgba(212,168,79,0.10)", iconColor:"var(--gold)", title:"Sessões ativas", desc:"Visualize e encerre sessões abertas", action:"Em breve" },
  { icon:<Clock size={18}/>, color:"rgba(255,255,255,0.05)", iconColor:"var(--tx-2)", title:"Histórico de acessos", desc:"Veja os últimos logins na conta", action:"Em breve" },
  { icon:<AlertTriangle size={18}/>, color:"var(--red-bg)", iconColor:"var(--red)", title:"Limites Pix", desc:"Configure limites diários e noturnos", action:"Em breve" },
  { icon:<Shield size={18}/>, color:"var(--green-bg)", iconColor:"var(--green)", title:"Encerrar todas as sessões", desc:"Desconectar de todos os dispositivos", action:"Em breve" },
];

export default function SegurancaPage() {
  return (
    <div className="page-wrap narrow">
      <Link href="/perfil" className="back-link">← Voltar</Link>
      <div style={{marginBottom:20}}>
        <p className="eyebrow mb8">Configurações</p>
        <h2 style={{fontSize:22,fontWeight:800,marginBottom:6}}>Segurança e privacidade</h2>
        <p className="muted" style={{fontSize:14}}>Gerencie o acesso e proteja sua conta Deas Finance.</p>
      </div>

      <div className="card mb12">
        <div style={{display:"flex",alignItems:"center",gap:10,padding:"12px 14px",background:"var(--green-bg)",border:"1px solid var(--green-bd)",borderRadius:12,marginBottom:16}}>
          <Shield size={16} color="var(--green)"/>
          <span style={{fontSize:13,color:"var(--green)",fontWeight:600}}>Conta protegida — JWT seguro, cookie HttpOnly, bcrypt.</span>
        </div>
        <div style={{display:"grid",gap:10}}>
          {items.map((item,i)=>(
            <div key={i} className="sec-item">
              <div className="sec-item-left">
                <div className="sec-item-ico" style={{background:item.color,color:item.iconColor}}>{item.icon}</div>
                <div><span className="sec-item-title">{item.title}</span><span className="sec-item-desc">{item.desc}</span></div>
              </div>
              <span style={{fontSize:12,fontWeight:600,color:"var(--tx-3)",padding:"5px 10px",background:"rgba(255,255,255,0.04)",border:"1px solid var(--bd)",borderRadius:8}}>{item.action}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="warn-box">
        ⚠️ As funcionalidades de segurança avançadas estão planejadas para uma próxima versão do Deas Finance.
      </div>
    </div>
  );
}
