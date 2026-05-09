"use client";
import { useState, useRef } from "react";
import { useApp } from "@/components/AppShell";
const money = (v:number) => Number(v||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"});
const AVATAR = (name:string) => `https://ui-avatars.com/api/?background=F2B84B&color=111827&bold=true&size=128&name=${encodeURIComponent(name)}`;

export default function Perfil() {
  const {user,account,refresh,toast} = useApp();
  const [photoUrl,setPhotoUrl] = useState("");
  const [preview,setPreview] = useState("");
  const [loading,setLoading] = useState(false);
  const [showPhoto,setShowPhoto] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const photo = user?.photoURL || AVATAR(user?.name||"U");

  function handleFile(e:React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = () => { setPreview(reader.result as string); setPhotoUrl(reader.result as string); };
    reader.readAsDataURL(file);
  }

  async function savePhoto(e:any) {
    e.preventDefault();
    const url = photoUrl || preview;
    if(!url) return toast("Escolha uma foto ou cole um link.","error");
    setLoading(true);
    try {
      const r = await fetch("/api/profile/photo",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({photoUrl:url})});
      const d = await r.json(); if(!r.ok) throw new Error(d.message);
      await refresh(); setShowPhoto(false); setPreview(""); setPhotoUrl("");
      toast("Foto atualizada!","success");
    } catch(err:any){ toast(err.message,"error"); }
    finally { setLoading(false); }
  }

  const stats = [
    {label:"Saldo disponível",val:money(account?.balance||0),color:"var(--green)"},
    {label:"Limite de crédito",val:money(account?.limit||0),color:"var(--gold-l)"},
    {label:"Dívida atual",val:money(account?.debt||0),color:(account?.debt||0)>0?"var(--red)":"var(--green)"},
    {label:"Score de crédito",val:String(account?.creditScore||500),color:"var(--gold-l)"},
    {label:"Pré-aprovado",val:money(account?.preApproved||0),color:"var(--green)"},
    {label:"Renda estimada/mês",val:money(account?.estimatedIncome||0),color:"var(--tx)"},
  ];

  return (
    <div className="page-wrap medium">
      <div className="profile-hdr">
        <img className="profile-avatar" src={preview||photo} alt="Foto do perfil"/>
        <div>
          <p className="eyebrow">Cliente Deas Finance</p>
          <h3>{user?.name||"Carregando..."}</h3>
          <span className="profile-email">{user?.email}</span>
          <div className="profile-actions">
            <button className="btn btn-primary" onClick={()=>setShowPhoto(true)}>📷 Alterar foto</button>
            <button className="btn btn-secondary" onClick={()=>{setPreview(""); setPhotoUrl(""); savePhoto({preventDefault:()=>{}})}}>🔄 Avatar automático</button>
          </div>
        </div>
      </div>

      <div className="g2 mb16">
        <div className="card">
          <p className="eyebrow mb12">Resumo financeiro</p>
          <div style={{display:"grid",gap:10}}>
            {stats.map(s=>(
              <div key={s.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:"1px solid var(--bd)"}}>
                <span style={{fontSize:13.5,color:"var(--tx-2)",fontWeight:500}}>{s.label}</span>
                <span style={{fontFamily:"Outfit",fontSize:16,fontWeight:800,letterSpacing:"-.03em",color:s.color}}>{s.val}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{display:"grid",gap:14,alignContent:"start"}}>
          <div className="card">
            <p className="eyebrow mb10">Segurança</p>
            <p className="muted" style={{fontSize:13.5}}>Conta protegida com senha criptografada (bcrypt), token JWT via cookie HttpOnly e isolamento total de dados por usuário no PostgreSQL.</p>
            <div className="mt12" style={{display:"flex",gap:8,flexWrap:"wrap"}}>
              <span className="badge badge-success">JWT seguro</span>
              <span className="badge badge-success">Cookie HttpOnly</span>
              <span className="badge badge-success">Bcrypt</span>
            </div>
          </div>
          <div className="card">
            <p className="eyebrow mb10">Privacidade</p>
            <p className="muted" style={{fontSize:13.5}}>Nenhum dado é compartilhado com terceiros sem autorização explícita. Open Finance usa consentimento revogável a qualquer momento.</p>
          </div>
          <div className="card">
            <p className="eyebrow mb10">Ambiente</p>
            <div className="warn-box" style={{marginTop:0}}>🧪 <b>Simulação bancária</b> — dados e operações são para fins de demonstração. Não envolve dinheiro real.</div>
          </div>
        </div>
      </div>

      {showPhoto&&(
        <dialog open>
          <div className="dlg-head"><h3>Alterar foto de perfil</h3><p className="muted" style={{fontSize:13}}>Escolha um arquivo ou cole um link.</p></div>
          <form className="dlg-body" onSubmit={savePhoto}>
            <div style={{display:"flex",alignItems:"center",gap:14,flexWrap:"wrap"}}>
              <img src={preview||photo} alt="Prévia" style={{width:80,height:80,borderRadius:"50%",objectFit:"cover",border:"3px solid rgba(242,184,75,0.35)"}}/>
              <div><span className="badge badge-success">Prévia em tempo real</span><p style={{fontSize:12,color:"var(--tx-3)",marginTop:6}}>Prévia ao vivo da foto escolhida.</p></div>
            </div>
            <div style={{border:"1.5px dashed rgba(242,184,75,0.35)",borderRadius:16,padding:18,textAlign:"center",background:"rgba(242,184,75,0.05)"}}>
              <p style={{fontWeight:700,marginBottom:6}}>Solte uma foto aqui</p>
              <button type="button" className="btn btn-secondary btn-sm" onClick={()=>fileRef.current?.click()}>Escolher arquivo</button>
              <input ref={fileRef} type="file" accept="image/*" style={{display:"none"}} onChange={handleFile}/>
            </div>
            <label className="field-label">Ou cole um link
              <input className="f-input" type="url" value={photoUrl} onChange={e=>{setPhotoUrl(e.target.value);setPreview(e.target.value);}} placeholder="https://exemplo.com/foto.jpg"/>
            </label>
            <div className="dlg-actions">
              <button type="button" className="btn btn-secondary" onClick={()=>{setShowPhoto(false);setPreview("");setPhotoUrl("");}}>Cancelar</button>
              <button type="submit" className="btn btn-primary" disabled={loading}>{loading?"Salvando...":"💾 Salvar foto"}</button>
            </div>
          </form>
        </dialog>
      )}
    </div>
  );
}
