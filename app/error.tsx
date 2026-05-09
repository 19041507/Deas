"use client";
export default function Error({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <div style={{minHeight:"100vh",display:"grid",placeItems:"center",background:"#060D1A",color:"#EEF4FF",fontFamily:"DM Sans,sans-serif",padding:24}}>
      <div style={{textAlign:"center",maxWidth:400}}>
        <div style={{fontSize:56,marginBottom:16}}>⚠️</div>
        <h2 style={{fontFamily:"Outfit,sans-serif",fontSize:24,fontWeight:800,marginBottom:8}}>Algo deu errado</h2>
        <p style={{color:"#8BA3C4",marginBottom:24}}>{error.message || "Erro inesperado. Tente novamente."}</p>
        <button onClick={reset} style={{padding:"12px 24px",borderRadius:12,background:"linear-gradient(135deg,#F2B84B,#FFD977)",color:"#111827",fontWeight:700,border:"none",cursor:"pointer",fontSize:15}}>
          Tentar novamente
        </button>
      </div>
    </div>
  );
}
