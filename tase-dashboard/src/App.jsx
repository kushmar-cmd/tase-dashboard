import { useState, useEffect, useCallback, useMemo, useRef } from "react";

const STOCKS = [
  {s:'POLI.TA', he:'בנק הפועלים',  en:'Bank Hapoalim',   sec:'banking'},
  {s:'LUMI.TA', he:'בנק לאומי',     en:'Bank Leumi',       sec:'banking'},
  {s:'MZTF.TA', he:'מזרחי טפחות',  en:'Mizrahi Tefahot',  sec:'banking'},
  {s:'DSCT.TA', he:'בנק דיסקונט',  en:'Discount Bank',    sec:'banking'},
  {s:'FIBI.TA', he:'הבינלאומי',     en:'First Intl. Bank', sec:'banking'},
  {s:'BYNK.TA', he:'בנק ירושלים',  en:'Bank Jerusalem',   sec:'banking'},
  {s:'PHOE.TA', he:'הפניקס',        en:'Phoenix Holdings', sec:'insurance'},
  {s:'MIGDL.TA',he:'מגדל ביטוח',   en:'Migdal Insurance', sec:'insurance'},
  {s:'CLIS.TA', he:'כלל ביטוח',    en:'Clal Insurance',   sec:'insurance'},
  {s:'HREL.TA', he:'הראל ביטוח',   en:'Harel Insurance',  sec:'insurance'},
  {s:'NICE.TA', he:'נייס',          en:'NICE Systems',     sec:'tech'},
  {s:'SPNS.TA', he:'ספיינס',        en:'Sapiens Intl.',    sec:'tech'},
  {s:'NVMI.TA', he:'נובה',          en:'Nova Measuring',   sec:'tech'},
  {s:'GILT.TA', he:'גילת',          en:'Gilat Satellite',  sec:'tech'},
  {s:'ESLT.TA', he:'אלביט מערכות', en:'Elbit Systems',    sec:'tech'},
  {s:'MTMY.TA', he:'מלם-תים',       en:'Malam Team',       sec:'tech'},
  {s:'TEVA.TA', he:'טבע',           en:'Teva Pharma',      sec:'pharma'},
  {s:'KMDA.TA', he:'קמדה',          en:'Kamada',           sec:'pharma'},
  {s:'ICL.TA',  he:'כיל',           en:'ICL Group',        sec:'chemicals'},
  {s:'ARAD.TA', he:'ארד',           en:'Arad Measurements',sec:'industrial'},
  {s:'BEZQ.TA', he:'בזק',           en:'Bezeq',            sec:'telecom'},
  {s:'PTNR.TA', he:'פרטנר',         en:'Partner Comm.',    sec:'telecom'},
  {s:'CELU.TA', he:'סלקום',         en:'Cellcom Israel',   sec:'telecom'},
  {s:'AZRG.TA', he:'עזריאלי',       en:'Azrieli Group',    sec:'realestate'},
  {s:'AMOT.TA', he:'עמות',          en:'Amot Investments', sec:'realestate'},
  {s:'MSBI.TA', he:'מליסרון',       en:'Melisron',         sec:'realestate'},
  {s:'BIGA.TA', he:'ביג',           en:'Big Shopping',     sec:'realestate'},
  {s:'ILDC.TA', he:'אידיסי',        en:'ILDC',             sec:'realestate'},
  {s:'ALHE.TA', he:'אלוני-חץ',      en:'Alony Hetz',       sec:'realestate'},
  {s:'GZIT.TA', he:'גזית גלוב',    en:'Gazit Globe',      sec:'realestate'},
  {s:'DLEKG.TA',he:'דלק קבוצה',    en:'Delek Group',      sec:'energy'},
  {s:'NVPT.TA', he:'נפטא',          en:'Naphtha Israel',   sec:'energy'},
  {s:'DELT.TA', he:'דלתא גליל',    en:'Delta Galil',      sec:'consumer'},
  {s:'GOLF.TA', he:'גולף',          en:'Golf & Co',        sec:'consumer'},
  {s:'FTAL.TA', he:'פתאל',          en:'Fattal Hotels',    sec:'tourism'},
  {s:'ELAL.TA', he:'אל על',         en:'El Al Airlines',   sec:'tourism'},
  {s:'OSEM.TA', he:'אסם',           en:'Osem',             sec:'food'},
];

const SECTORS = {
  banking:    {he:'בנקאות',    color:'#3b82f6'},
  insurance:  {he:'ביטוח',     color:'#8b5cf6'},
  tech:       {he:'טכנולוגיה', color:'#00d4ff'},
  pharma:     {he:'פארמה',     color:'#10b981'},
  chemicals:  {he:'כימיה',     color:'#f59e0b'},
  industrial: {he:'תעשייה',   color:'#94a3b8'},
  telecom:    {he:'תקשורת',    color:'#ec4899'},
  realestate: {he:'נדל"ן',    color:'#f97316'},
  energy:     {he:'אנרגיה',    color:'#eab308'},
  consumer:   {he:'צרכנות',    color:'#14b8a6'},
  tourism:    {he:'תיירות',    color:'#a78bfa'},
  food:       {he:'מזון',      color:'#fb923c'},
};

const C = {
  bg:'#050c16', card:'#0c1926', border:'rgba(0,200,255,0.10)',
  accent:'#00d4ff', gain:'#00ff8c', loss:'#ff3366',
  text:'#8fb8d8', white:'#e8f4ff', dim:'#2a4560',
};

function getIsraelTime() {
  return new Date(new Date().toLocaleString('en-US',{timeZone:'Asia/Jerusalem'}));
}
function isMarketOpen() {
  const t=getIsraelTime(), day=t.getDay(), m=t.getHours()*60+t.getMinutes();
  if(day===0||day===6) return false;
  if(day>=1&&day<=4) return m>=599&&m<=1034;
  if(day===5) return m>=599&&m<=830;
  return false;
}
const fmt=(n,d=2)=>(n==null||isNaN(n))?'—':n.toLocaleString('he-IL',{minimumFractionDigits:d,maximumFractionDigits:d});
const fmtVol=v=>!v?'—':v>=1e9?(v/1e9).toFixed(1)+'B':v>=1e6?(v/1e6).toFixed(1)+'M':v>=1e3?(v/1e3).toFixed(0)+'K':''+v;
const fmtMCap=m=>!m?'—':m>=1e12?'₪'+(m/1e12).toFixed(2)+'T':m>=1e9?'₪'+(m/1e9).toFixed(1)+'B':m>=1e6?'₪'+(m/1e6).toFixed(0)+'M':'₪'+m;

// ─── DATA FETCH via Netlify Function (server-side, no CORS) ──────────────────
async function fetchBatch(symbols) {
  const url = `/api/quotes?symbols=${symbols.join(',')}`;
  const r = await fetch(url);
  if(!r.ok) throw new Error(`HTTP ${r.status}`);
  const data = await r.json();
  return data?.quoteResponse?.result || [];
}

async function loadAllData() {
  const all = [...STOCKS.map(s=>s.s), '^TA125.TA', '^TA35.TA', 'USDILS=X'];
  const BATCH = 20;
  const batches = [];
  for(let i=0;i<all.length;i+=BATCH) batches.push(all.slice(i,i+BATCH));
  const results = await Promise.all(batches.map(fetchBatch));
  return results.flat();
}

export default function TASEDashboard() {
  const [qdata,  setQdata]  = useState({});
  const [idata,  setIdata]  = useState({});
  const [loading,setLoad]   = useState(true);
  const [error,  setError]  = useState(null);
  const [lastUp, setLast]   = useState(null);
  const [tick,   setTick]   = useState(0);
  const [cd,     setCd]     = useState(60);
  const [search, setSearch] = useState('');
  const [sector, setSect]   = useState('all');
  const [sortK,  setSortK]  = useState('changePct');
  const [sortAsc,setAsc]    = useState(false);
  const cdRef = useRef(null);
  const busy  = useRef(false);

  useEffect(()=>{
    const lnk=document.createElement('link');
    lnk.href='https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Heebo:wght@300;400;700;900&display=swap';
    lnk.rel='stylesheet'; document.head.appendChild(lnk);
    const sty=document.createElement('style'); sty.id='ts';
    sty.textContent=`
      *{box-sizing:border-box;margin:0;padding:0}
      ::-webkit-scrollbar{width:4px} ::-webkit-scrollbar-track{background:#060e18} ::-webkit-scrollbar-thumb{background:#1a3050;border-radius:2px}
      @keyframes blink{0%,100%{opacity:1}50%{opacity:.1}}
      @keyframes fadeUp{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
      @keyframes ticker{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
      @keyframes glow{0%,100%{text-shadow:0 0 10px currentColor}50%{text-shadow:0 0 28px currentColor,0 0 52px currentColor}}
      @keyframes spin{to{transform:rotate(360deg)}}
      .blink{animation:blink 1.4s infinite} .glow{animation:glow 3s ease-in-out infinite}
      .card{transition:transform .18s,border-color .18s,box-shadow .18s}
      .card:hover{transform:translateY(-3px);border-color:rgba(0,212,255,.45)!important;box-shadow:0 8px 28px rgba(0,212,255,.08)}
      .btn{transition:all .15s;cursor:pointer}
      .ticker-track{display:flex;animation:ticker 80s linear infinite;will-change:transform}
      .ticker-track:hover{animation-play-state:paused}
      .spin{animation:spin .8s linear infinite;display:inline-block}
      .fade-up{animation:fadeUp .28s ease both}
      input::placeholder{color:#2a4560} input:focus{border-color:rgba(0,212,255,.5)!important;outline:none}
    `;
    document.head.appendChild(sty);
    return()=>{ lnk.remove(); document.getElementById('ts')?.remove(); };
  },[]);

  useEffect(()=>{const t=setInterval(()=>setTick(x=>x+1),1000);return()=>clearInterval(t);},[]);

  const load = useCallback(async()=>{
    if(busy.current) return;
    busy.current=true; setLoad(true); setError(null);
    try {
      const flat = await loadAllData();
      const idxSyms=['^TA125.TA','^TA35.TA','USDILS=X'];
      const qd={}, id={};
      for(const r of flat){
        if(!r.symbol||r.regularMarketPrice==null) continue;
        const d={
          price:    r.regularMarketPrice,
          change:   r.regularMarketChange,
          changePct:r.regularMarketChangePercent,
          volume:   r.regularMarketVolume,
          prevClose:r.regularMarketPreviousClose,
          marketCap:r.marketCap,
        };
        if(idxSyms.includes(r.symbol)) id[r.symbol]=d; else qd[r.symbol]=d;
      }
      if(Object.keys(qd).length===0) throw new Error('לא התקבלו נתונים');
      setQdata(qd); setIdata(id); setLast(new Date());
    } catch(e){ setError(e.message); }
    setLoad(false); busy.current=false;
    setCd(60);
    if(cdRef.current) clearInterval(cdRef.current);
    cdRef.current=setInterval(()=>setCd(c=>{if(c<=1){clearInterval(cdRef.current);return 0;}return c-1;}),1000);
  },[]);

  useEffect(()=>{ load(); const t=setInterval(load,60000); return()=>{ clearInterval(t); if(cdRef.current) clearInterval(cdRef.current); }; },[load]);

  const isrTime=useMemo(()=>getIsraelTime(),[tick]);
  const open=useMemo(()=>isMarketOpen(),[tick]);
  const hasData=Object.keys(qdata).length>0;

  const enriched=useMemo(()=>STOCKS
    .map(s=>({...s,...(qdata[s.s]||{}),has:!!qdata[s.s]}))
    .filter(s=>{
      if(sector!=='all'&&s.sec!==sector) return false;
      if(search){const q=search.toLowerCase();return s.he.includes(search)||s.en.toLowerCase().includes(q)||s.s.toLowerCase().includes(q);}
      return true;
    })
    .sort((a,b)=>{const av=a[sortK]??-Infinity,bv=b[sortK]??-Infinity;return sortAsc?av-bv:bv-av;})
  ,[qdata,sector,search,sortK,sortAsc]);

  const withData=useMemo(()=>STOCKS.map(s=>({...s,...qdata[s.s]})).filter(s=>s.changePct!=null),[qdata]);
  const gainers=useMemo(()=>[...withData].sort((a,b)=>b.changePct-a.changePct).slice(0,5),[withData]);
  const losers=useMemo(()=>[...withData].sort((a,b)=>a.changePct-b.changePct).slice(0,5),[withData]);

  const ta125=idata['^TA125.TA'], ta35=idata['^TA35.TA'], usdils=idata['USDILS=X'];
  const timeStr=isrTime.toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit',second:'2-digit'});
  const dateStr=isrTime.toLocaleDateString('he-IL',{weekday:'long',year:'numeric',month:'long',day:'numeric'});

  return (
    <div style={{minHeight:'100vh',background:C.bg,color:C.text,fontFamily:"'Heebo',sans-serif",direction:'rtl',
      backgroundImage:`radial-gradient(ellipse 80% 40% at 50% -10%,rgba(0,100,200,.12),transparent),linear-gradient(rgba(0,180,255,.018) 1px,transparent 1px),linear-gradient(90deg,rgba(0,180,255,.018) 1px,transparent 1px)`,
      backgroundSize:'100%,48px 48px,48px 48px'}}>

      {/* TICKER */}
      {withData.length>0&&(
        <div style={{height:34,overflow:'hidden',background:'rgba(0,0,0,.55)',borderBottom:`1px solid ${C.border}`,display:'flex',alignItems:'center',userSelect:'none'}}>
          <div className="ticker-track">
            {[...withData,...withData].map((s,i)=>(
              <span key={i} style={{display:'inline-flex',alignItems:'center',gap:7,padding:'0 20px',whiteSpace:'nowrap',fontSize:11}}>
                <span style={{color:C.dim,fontFamily:"'Space Mono',monospace",fontSize:10}}>{s.s.replace('.TA','')}</span>
                <span style={{color:C.white,fontWeight:600}}>{s.he}</span>
                <span style={{fontFamily:"'Space Mono',monospace",color:C.white}}>₪{fmt(s.price)}</span>
                <span style={{fontFamily:"'Space Mono',monospace",color:s.changePct>=0?C.gain:C.loss,fontWeight:700}}>
                  {s.changePct>=0?'▲':'▼'}{Math.abs(s.changePct||0).toFixed(2)}%
                </span>
                <span style={{color:C.border,opacity:.4}}>│</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* HEADER */}
      <header style={{padding:'14px 24px',borderBottom:`1px solid ${C.border}`,background:'rgba(5,12,22,.92)',backdropFilter:'blur(20px)',position:'sticky',top:0,zIndex:100,display:'flex',justifyContent:'space-between',alignItems:'center',gap:12,flexWrap:'wrap'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:44,height:44,background:`linear-gradient(135deg,${C.accent},#0044bb)`,borderRadius:11,display:'flex',alignItems:'center',justifyContent:'center',fontSize:20,fontWeight:900,color:'#000',fontFamily:"'Space Mono',monospace",boxShadow:`0 0 20px ${C.accent}44`}}>ת׳</div>
          <div>
            <div style={{fontSize:20,fontWeight:900,color:C.white}}>בורסת תל אביב</div>
            <div style={{fontSize:10,color:C.dim,fontFamily:"'Space Mono',monospace",letterSpacing:'.07em'}}>TASE · TA-125 · YAHOO FINANCE</div>
          </div>
        </div>

        <div style={{textAlign:'center',flex:1,minWidth:180}}>
          <div className="glow" style={{fontFamily:"'Space Mono',monospace",fontSize:26,fontWeight:700,color:C.white,letterSpacing:3,lineHeight:1}}>{timeStr}</div>
          <div style={{fontSize:11,color:C.dim,marginTop:4}}>{dateStr}</div>
        </div>

        <div style={{display:'flex',alignItems:'center',gap:10,flexWrap:'wrap',justifyContent:'flex-end'}}>
          <div style={{padding:'8px 14px',borderRadius:22,background:open?'rgba(0,255,140,.06)':'rgba(255,51,102,.06)',border:`1px solid ${open?C.gain+'44':C.loss+'44'}`,display:'flex',alignItems:'center',gap:8}}>
            <span className="blink" style={{width:8,height:8,borderRadius:'50%',background:open?C.gain:C.loss,display:'block',boxShadow:`0 0 7px ${open?C.gain:C.loss}`}}/>
            <span style={{fontWeight:700,color:open?C.gain:C.loss,fontSize:13}}>{open?'שוק פתוח':'שוק סגור'}</span>
          </div>
          {hasData&&(
            <div style={{position:'relative',width:40,height:40,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <svg style={{position:'absolute',inset:0,transform:'rotate(-90deg)'}} viewBox="0 0 40 40">
                <circle cx="20" cy="20" r="17" fill="none" stroke={C.border} strokeWidth="2.5"/>
                <circle cx="20" cy="20" r="17" fill="none" stroke={C.accent} strokeWidth="2.5" strokeDasharray={`${(cd/60)*107} 107`} strokeLinecap="round"/>
              </svg>
              <span style={{fontFamily:"'Space Mono',monospace",fontSize:9,color:C.accent,fontWeight:700}}>{cd}s</span>
            </div>
          )}
          {lastUp&&<div style={{fontSize:10,color:C.dim,textAlign:'center',fontFamily:"'Space Mono',monospace"}}><div>עודכן</div><div style={{color:C.text}}>{lastUp.toLocaleTimeString('he-IL',{hour:'2-digit',minute:'2-digit'})}</div></div>}
          <button className="btn" onClick={load} disabled={loading} style={{background:`${C.accent}15`,border:`1px solid ${C.accent}40`,color:C.accent,padding:'9px 16px',borderRadius:9,fontSize:13,fontWeight:700,fontFamily:"'Heebo',sans-serif",opacity:loading?.5:1}}>
            {loading?<span className="spin">⟳</span>:'⟳ רענן'}
          </button>
        </div>
      </header>

      {/* CLOSED NOTE */}
      {!open&&hasData&&(
        <div style={{padding:'8px 24px',background:'rgba(255,51,102,.06)',borderBottom:`1px solid rgba(255,51,102,.15)`,textAlign:'center',fontSize:12,color:'#ff9aa8'}}>
          🔔 השוק סגור — מחירי סגירה אחרונים · ב׳-ה׳ 10:00-17:14 | ו׳ 10:00-13:50
        </div>
      )}

      {/* ERROR */}
      {error&&!loading&&(
        <div style={{padding:'12px 24px',background:'rgba(255,51,102,.08)',borderBottom:`1px solid rgba(255,51,102,.2)`,display:'flex',alignItems:'center',justifyContent:'center',gap:10,fontSize:13,color:C.loss}}>
          ⚠️ {error}
          <button className="btn" onClick={load} style={{background:C.loss,color:'#000',padding:'4px 14px',borderRadius:6,fontSize:12,fontWeight:700}}>נסה שוב</button>
        </div>
      )}

      {/* LOADING */}
      {loading&&!hasData&&(
        <div style={{display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',minHeight:'60vh',gap:20}}>
          <div style={{width:60,height:60,border:`3px solid ${C.border}`,borderTop:`3px solid ${C.accent}`,borderRadius:'50%',animation:'spin .9s linear infinite'}}/>
          <div style={{textAlign:'center'}}>
            <div style={{fontSize:20,fontWeight:700,color:C.white,marginBottom:8}}>טוען נתוני שוק</div>
            <div style={{fontSize:13,color:C.accent}}>Yahoo Finance · נתונים אמיתיים</div>
          </div>
        </div>
      )}

      {hasData&&(
        <main style={{padding:'20px 24px',maxWidth:1700,margin:'0 auto'}}>

          {/* INDEX CARDS */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:16,marginBottom:20}}>
            {[
              {d:ta125,he:'מדד ת"א 125',en:'TA-125 Index',  sym:'^TA125.TA',badge:'INDEX'},
              {d:ta35, he:'מדד ת"א 35', en:'TA-35 Index',   sym:'^TA35.TA', badge:'INDEX'},
              {d:usdils,he:'דולר / שקל',en:'USD / ILS Rate',sym:'USDILS=X', badge:'FOREX'},
            ].map(({d,he,en,sym,badge})=>{
              const up=(d?.changePct||0)>=0;
              return (
                <div key={sym} className="card fade-up" style={{background:C.card,borderRadius:14,padding:'20px 24px',border:`1px solid ${d?up?C.gain+'33':C.loss+'33':C.border}`,position:'relative',overflow:'hidden'}}>
                  <div style={{position:'absolute',top:0,left:0,right:0,height:3,background:d?(up?C.gain:C.loss):C.accent,borderRadius:'14px 14px 0 0'}}/>
                  <div style={{display:'flex',justifyContent:'space-between',marginBottom:14}}>
                    <div><div style={{fontSize:19,fontWeight:900,color:C.white}}>{he}</div><div style={{fontSize:11,color:C.dim,marginTop:2}}>{en}</div></div>
                    <span style={{padding:'3px 8px',borderRadius:5,background:'rgba(255,255,255,.04)',color:C.dim,fontSize:10,fontFamily:"'Space Mono',monospace",border:`1px solid ${C.border}`,height:'fit-content'}}>{badge}</span>
                  </div>
                  {d?<>
                    <div style={{fontFamily:"'Space Mono',monospace",fontSize:32,fontWeight:700,color:C.white,marginBottom:7,lineHeight:1}}>
                      {sym==='USDILS=X'?`₪${fmt(d.price,4)}`:fmt(d.price)}
                    </div>
                    <div style={{fontFamily:"'Space Mono',monospace",fontSize:14,color:up?C.gain:C.loss,display:'flex',gap:10}}>
                      <span style={{fontWeight:700}}>{up?'▲':'▼'} {Math.abs(d.change||0).toFixed(2)}</span>
                      <span style={{opacity:.65}}>({up?'+':''}{(d.changePct||0).toFixed(2)}%)</span>
                    </div>
                  </>:<div style={{fontFamily:"'Space Mono',monospace",fontSize:28,color:C.dim}}>— — —</div>}
                </div>
              );
            })}
          </div>

          {/* BREADTH */}
          {withData.length>0&&(()=>{
            const up=withData.filter(s=>s.changePct>0).length, dn=withData.filter(s=>s.changePct<0).length, tot=withData.length||1;
            return (
              <div style={{background:C.card,borderRadius:12,padding:'12px 20px',marginBottom:20,border:`1px solid ${C.border}`}}>
                <div style={{display:'flex',justifyContent:'space-between',marginBottom:8,fontSize:12}}>
                  <span style={{fontWeight:700,color:C.white}}>רוחב שוק · Market Breadth</span>
                  <div style={{display:'flex',gap:16,fontFamily:"'Space Mono',monospace",fontSize:11}}>
                    <span style={{color:C.gain}}>▲ {up}</span><span style={{color:C.text}}>— {tot-up-dn}</span><span style={{color:C.loss}}>▼ {dn}</span>
                  </div>
                </div>
                <div style={{height:7,borderRadius:7,overflow:'hidden',background:'rgba(255,255,255,.04)',display:'flex'}}>
                  <div style={{width:`${(up/tot*100).toFixed(1)}%`,background:C.gain,transition:'width .5s'}}/>
                  <div style={{width:`${((tot-up-dn)/tot*100).toFixed(1)}%`,background:C.dim}}/>
                  <div style={{width:`${(dn/tot*100).toFixed(1)}%`,background:C.loss}}/>
                </div>
              </div>
            );
          })()}

          {/* MOVERS */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:20}}>
            {[
              {title:'מובילי עלייה',sub:'TOP GAINERS',icon:'📈',items:gainers,color:C.gain,isUp:true},
              {title:'מובילי ירידה',sub:'TOP LOSERS', icon:'📉',items:losers, color:C.loss,isUp:false},
            ].map(({title,sub,icon,items,color,isUp})=>(
              <div key={sub} style={{background:C.card,border:`1px solid ${C.border}`,borderRadius:13,overflow:'hidden'}}>
                <div style={{padding:'12px 20px',borderBottom:`1px solid ${C.border}`,background:`${color}07`,display:'flex',alignItems:'center',gap:9}}>
                  <span style={{fontSize:18}}>{icon}</span>
                  <div><div style={{fontWeight:700,color,fontSize:14}}>{title}</div><div style={{fontSize:10,color:C.dim,fontFamily:"'Space Mono',monospace"}}>{sub}</div></div>
                </div>
                {items.map((s,i)=>(
                  <div key={s.s} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'10px 20px',borderBottom:i<4?`1px solid ${C.border}`:'none',position:'relative',overflow:'hidden'}}>
                    <div style={{position:'absolute',right:0,top:0,bottom:0,width:`${Math.min(Math.abs(s.changePct||0)*8,35)}%`,background:`${color}07`,pointerEvents:'none'}}/>
                    <div><div style={{fontWeight:700,color:C.white,fontSize:13}}>{s.he}</div><div style={{fontSize:10,color:C.dim,fontFamily:"'Space Mono',monospace"}}>{s.s}</div></div>
                    <div style={{textAlign:'left'}}>
                      <div style={{color,fontWeight:700,fontFamily:"'Space Mono',monospace",fontSize:13}}>{isUp?'▲ +':'▼ '}{Math.abs(s.changePct||0).toFixed(2)}%</div>
                      <div style={{color:C.text,fontSize:11,fontFamily:"'Space Mono',monospace"}}>₪{fmt(s.price)}</div>
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* FILTERS */}
          <div style={{display:'flex',gap:8,marginBottom:12,alignItems:'center',flexWrap:'wrap'}}>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="🔍  חיפוש שם / סמל..." style={{flex:'0 0 200px',padding:'8px 13px',background:'rgba(255,255,255,.04)',border:`1px solid ${C.border}`,borderRadius:8,color:C.white,fontSize:13,fontFamily:"'Heebo',sans-serif",direction:'rtl',transition:'border-color .2s'}}/>
            <button className="btn" onClick={()=>setSect('all')} style={{padding:'7px 14px',borderRadius:20,background:sector==='all'?C.accent:'transparent',border:`1px solid ${sector==='all'?C.accent:C.border}`,color:sector==='all'?'#000':C.text,fontSize:12,fontWeight:700}}>הכל</button>
            {Object.entries(SECTORS).filter(([k])=>STOCKS.some(s=>s.sec===k)).map(([k,v])=>(
              <button className="btn" key={k} onClick={()=>setSect(sector===k?'all':k)} style={{padding:'6px 12px',borderRadius:20,background:sector===k?`${v.color}20`:'transparent',border:`1px solid ${sector===k?v.color:C.border}`,color:sector===k?v.color:C.dim,fontSize:11}}>{v.he}</button>
            ))}
            <div style={{flex:1}}/>
            <div style={{display:'flex',gap:6}}>
              {[{k:'changePct',l:'שינוי %'},{k:'price',l:'מחיר'},{k:'volume',l:'מחזור'},{k:'marketCap',l:'שווי שוק'}].map(({k,l})=>(
                <button className="btn" key={k} onClick={()=>{if(sortK===k)setAsc(!sortAsc);else{setSortK(k);setAsc(false);}}} style={{padding:'6px 11px',borderRadius:7,background:sortK===k?`${C.accent}15`:'transparent',border:`1px solid ${sortK===k?C.accent:C.border}`,color:sortK===k?C.accent:C.dim,fontSize:11}}>
                  {l}{sortK===k?(' '+(sortAsc?'↑':'↓')):''}
                </button>
              ))}
            </div>
          </div>

          <div style={{marginBottom:12,color:C.dim,fontSize:11,display:'flex',gap:12}}>
            <span>מציג <strong style={{color:C.text}}>{enriched.length}</strong> מניות</span>
            <span>·</span><span style={{color:C.gain}}>▲ {withData.filter(s=>s.changePct>0).length}</span>
            <span>·</span><span style={{color:C.loss}}>▼ {withData.filter(s=>s.changePct<0).length}</span>
          </div>

          {/* GRID */}
          <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(215px,1fr))',gap:11}}>
            {enriched.map((s,idx)=>{
              const up=(s.changePct||0)>=0;
              const sc=SECTORS[s.sec]||{color:C.accent,he:'אחר'};
              return (
                <div key={s.s} className="card fade-up" style={{background:C.card,borderRadius:10,padding:'14px 15px',border:`1px solid ${s.has?(up?C.gain+'22':C.loss+'22'):C.border}`,position:'relative',overflow:'hidden',animationDelay:`${Math.min(idx*.01,.25)}s`}}>
                  <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:s.has?(up?C.gain:C.loss):sc.color,opacity:s.has?1:.35}}/>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:9}}>
                    <span style={{fontSize:10,padding:'2px 7px',borderRadius:20,background:`${sc.color}16`,color:sc.color,border:`1px solid ${sc.color}28`}}>{sc.he}</span>
                    <span style={{fontSize:10,color:C.dim,fontFamily:"'Space Mono',monospace"}}>{s.s.replace('.TA','')}</span>
                  </div>
                  <div style={{fontWeight:700,fontSize:13,color:C.white,marginBottom:2,lineHeight:1.3}}>{s.he}</div>
                  <div style={{fontSize:10,color:C.dim,marginBottom:11}}>{s.en}</div>
                  {s.has?(<>
                    <div style={{fontFamily:"'Space Mono',monospace",fontSize:20,fontWeight:700,color:C.white,marginBottom:4}}>₪{fmt(s.price)}</div>
                    <div style={{fontFamily:"'Space Mono',monospace",fontSize:12,fontWeight:700,color:up?C.gain:C.loss,marginBottom:11}}>
                      {up?'▲ +':'▼ '}{(s.changePct||0).toFixed(2)}%
                      <span style={{fontSize:11,fontWeight:400,marginRight:5,opacity:.6}}>({up?'+':''}{fmt(s.change)})</span>
                    </div>
                    <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:7,paddingTop:9,borderTop:`1px solid ${C.border}`}}>
                      <div><div style={{fontSize:9,color:C.dim,marginBottom:2}}>מחזור</div><div style={{fontSize:11,color:C.text,fontFamily:"'Space Mono',monospace"}}>{fmtVol(s.volume)}</div></div>
                      <div><div style={{fontSize:9,color:C.dim,marginBottom:2}}>שווי שוק</div><div style={{fontSize:11,color:C.text,fontFamily:"'Space Mono',monospace"}}>{fmtMCap(s.marketCap)}</div></div>
                    </div>
                    <div style={{marginTop:9,height:2,borderRadius:2,background:C.border,overflow:'hidden'}}>
                      <div style={{height:'100%',width:`${Math.min(Math.abs(s.changePct||0)*12,100)}%`,background:up?C.gain:C.loss,transition:'width .4s'}}/>
                    </div>
                  </>):(
                    <div style={{height:66,display:'flex',alignItems:'center',justifyContent:'center',color:C.dim,fontSize:11}}>— —</div>
                  )}
                </div>
              );
            })}
          </div>

          {/* SECTOR */}
          <div style={{marginTop:30}}>
            <div style={{fontSize:14,fontWeight:700,color:C.white,marginBottom:14}}>פילוח לפי סקטור</div>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(155px,1fr))',gap:9}}>
              {Object.entries(SECTORS).filter(([k])=>STOCKS.some(s=>s.sec===k)).map(([k,v])=>{
                const ss=STOCKS.filter(s=>s.sec===k).map(s=>({...s,...qdata[s.s]})).filter(s=>s.changePct!=null);
                const avg=ss.length?ss.reduce((a,s)=>a+(s.changePct||0),0)/ss.length:null;
                return (
                  <div key={k} className="card btn" style={{background:C.card,border:`1px solid ${sector===k?v.color:v.color+'22'}`,borderRadius:9,padding:'11px 13px'}} onClick={()=>setSect(sector===k?'all':k)}>
                    <div style={{display:'flex',justifyContent:'space-between',marginBottom:6}}>
                      <span style={{fontSize:11,fontWeight:700,color:v.color}}>{v.he}</span>
                      <span style={{fontSize:10,color:C.dim}}>{STOCKS.filter(s=>s.sec===k).length}</span>
                    </div>
                    {avg!=null?<>
                      <div style={{fontFamily:"'Space Mono',monospace",fontSize:16,fontWeight:700,color:avg>=0?C.gain:C.loss}}>{avg>=0?'+':''}{avg.toFixed(2)}%</div>
                      <div style={{marginTop:6,height:2,borderRadius:2,background:C.border,overflow:'hidden'}}>
                        <div style={{height:'100%',width:`${Math.min(Math.abs(avg)*18,100)}%`,background:avg>=0?C.gain:C.loss}}/>
                      </div>
                    </>:<div style={{color:C.dim,fontSize:13}}>—</div>}
                  </div>
                );
              })}
            </div>
          </div>

          <footer style={{marginTop:36,paddingTop:18,borderTop:`1px solid ${C.border}`,textAlign:'center',color:C.dim,fontSize:11,lineHeight:2}}>
            <div>נתונים מ-Yahoo Finance דרך Netlify Function · הנתונים לצורך מידע בלבד</div>
            <div>© {new Date().getFullYear()} · אין זה ייעוץ השקעות</div>
          </footer>
        </main>
      )}
    </div>
  );
}
