"use client";
import { useState, useRef } from "react";
import Link from "next/link";
import { Camera, Shield, Bell } from "lucide-react";
import { useApp } from "@/components/AppShell";

export default function PerfilPage() {
  const { user, account, refresh, toast, balVis } = useApp();
  const [photoUrl, setPhotoUrl] = useState("");
  const [showPhotoDialog, setShowPhotoDialog] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const fmt=(v:number)=>Number(v).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});

  async function savePhoto(url: string) {
    setSaving(true);
    try {
      const r = await fetch("/api/profile/photo",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({photoUrl:url})});
      if (!r.ok) { toast("Erro ao salvar foto.","error"); return; }
      await refresh();
      setShowPhotoDialog(false);
      toast("Foto atualizada!","success");
    } finally { setSaving(false); }
  }

  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => { const result = reader.result as string; setPhotoUrl(result); savePhoto(result); };
    reader.readAsDataURL(file);
  }

  const firstName = (user?.name||"").split(" ")[0];
  const photoSrc = user?.photoURL || `https://ui-avatars.com/api/?name=${encodeURIComponent(firstName||"U")}&background=D4A84F&color=0B0F17&bold=true&size=128`;

  return (
    <div className="page-wrap narrow">
      <Link href="/dashboard" className="back-link">← Voltar</Link>

      <div className="profile-hdr">
        <div style={{position:"relative"}}>
          <img className="profile-avatar" src={photoSrc} alt={user?.name||"Usuário"}/>
          <button onClick={()=>setShowPhotoDialog(true)} style={{position:"absolute",bottom:0,right:0,width:28,height:28,borderRadius:"50%",background:"var(--gold)",border:"2px solid var(--bg)",display:"grid",placeItems:"center",cursor:"pointer"}}>
            <Camera size={13} color="var(--tx-inv)"/>
          </button>
        </div>
        <div className="profile-info">
          <p className="eyebrow mb8">Minha conta</p>
          <h3>{user?.name||"Usuário"}</h3>
          <span className="profile-email">{user?.email}</span>
          <div className="profile-actions">
            <button className="btn btn-secondary btn-sm" onClick={()=>setShowPhotoDialog(true)}><Camera size={14}/>Alterar foto</button>
            <Link href="/seguranca" className="btn btn-ghost btn-sm"><Shield size={14}/>Segurança</Link>
          </div>
        </div>
      </div>

      <div className="card mb12">
        <span className="profile-section-title">Resumo financeiro</span>
        {[["Saldo disponível", balVis?fmt(account?.balance||0):"••••••"],["Limite de crédito", balVis?fmt(account?.limit||0):"••••••"],["Dívida atual", balVis?fmt(account?.debt||0):"••••••"],["Pré-aprovado", balVis?fmt(account?.preApproved||0):"••••••"],["Score de crédito", String(account?.creditScore||500)]].map(([k,v])=>(
          <div key={k} className="profile-field"><span className="pf-label">{k}</span><span className="pf-val">{v}</span></div>
        ))}
      </div>

      <div className="card mb12">
        <span className="profile-section-title">Dados da conta</span>
        {[["Nome completo", user?.name||"—"],["E-mail", user?.email||"—"],["CPF", "•••.•••.•••-••"],["Plano", "Deas Finance Free"]].map(([k,v])=>(
          <div key={k} className="profile-field"><span className="pf-label">{k}</span><span className="pf-val">{v}</span></div>
        ))}
      </div>

      <div className="card">
        <span className="profile-section-title">Acesso rápido</span>
        <div style={{display:"grid",gap:8}}>
          {[{href:"/seguranca",icon:<Shield size={15}/>,label:"Segurança e privacidade"},{href:"/open-finance",icon:<Bell size={15}/>,label:"Gerenciar Open Finance"}].map(l=>(
            <Link key={l.href} href={l.href} style={{display:"flex",alignItems:"center",gap:10,padding:"11px 0",borderBottom:"1px solid var(--bd)",fontSize:14,fontWeight:500,color:"var(--tx-2)",textDecoration:"none",transition:"var(--ease)"}}>
              {l.icon}{l.label}<span style={{marginLeft:"auto",color:"var(--tx-3)"}}>→</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Photo Dialog */}
      {showPhotoDialog&&(
        <dialog open>
          <div className="dlg-head"><h3>Alterar foto</h3></div>
          <div className="dlg-body">
            <div style={{textAlign:"center"}}><img src={photoSrc} style={{width:72,height:72,borderRadius:"50%",objectFit:"cover",border:"3px solid rgba(212,168,79,0.3)",margin:"0 auto 12px"}}/></div>
            <label className="field">URL da foto<input className="fi" type="url" placeholder="https://..." value={photoUrl} onChange={e=>setPhotoUrl(e.target.value)}/></label>
            <p style={{fontSize:12,color:"var(--tx-3)",textAlign:"center"}}>— ou —</p>
            <button className="btn btn-secondary btn-w" onClick={()=>fileRef.current?.click()}>Escolher arquivo</button>
            <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>
            <div className="dlg-actions">
              <button className="btn btn-secondary" onClick={()=>setShowPhotoDialog(false)}>Cancelar</button>
              <button className="btn btn-primary" disabled={saving||!photoUrl} onClick={()=>savePhoto(photoUrl)}>{saving?"Salvando...":"Salvar"}</button>
            </div>
          </div>
        </dialog>
      )}
    </div>
  );
}
