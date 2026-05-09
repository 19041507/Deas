import Link from "next/link";
export default function NotFound() {
  return (
    <div style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#060D1A",color:"#EEF4FF",fontFamily:"DM Sans,sans-serif",padding:24}}>
      <div style={{textAlign:"center",maxWidth:400}}>
        <div style={{fontSize:56,marginBottom:16}}>🔍</div>
        <h2 style={{fontFamily:"Outfit,sans-serif",fontSize:24,fontWeight:800,marginBottom:8}}>Página não encontrada</h2>
        <p style={{color:"#8BA3C4",marginBottom:24}}>O endereço acessado não existe.</p>
        <Link href="/dashboard" style={{padding:"12px 24px",borderRadius:12,background:"linear-gradient(135deg,#F2B84B,#FFD977)",color:"#111827",fontWeight:700,fontSize:15,textDecoration:"none",display:"inline-block"}}>
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
