import { useState, useEffect, useMemo } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ComposedChart, Area, Line, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from "recharts";

const STOCK_META = {
  'POLI.TA': {he:'בנק הפועלים',  en:'Bank Hapoalim',   sec:'banking'},
  'LUMI.TA': {he:'בנק לאומי',     en:'Bank Leumi',       sec:'banking'},
  'MZTF.TA': {he:'מזרחי טפחות',  en:'Mizrahi Tefahot',  sec:'banking'},
  'DSCT.TA': {he:'בנק דיסקונט',  en:'Discount Bank',    sec:'banking'},
  'FIBI.TA': {he:'הבינלאומי',     en:'First Intl. Bank', sec:'banking'},
  'BYNK.TA': {he:'בנק ירושלים',  en:'Bank Jerusalem',   sec:'banking'},
  'PHOE.TA': {he:'הפניקס',        en:'Phoenix Holdings', sec:'insurance'},
  'MIGDL.TA':{he:'מגדל ביטוח',   en:'Migdal Insurance', sec:'insurance'},
  'CLIS.TA': {he:'כלל ביטוח',    en:'Clal Insurance',   sec:'insurance'},
  'HREL.TA': {he:'הראל ביטוח',   en:'Harel Insurance',  sec:'insurance'},
  'NICE.TA': {he:'נייס',          en:'NICE Systems',     sec:'tech'},
  'SPNS.TA': {he:'ספיינס',        en:'Sapiens Intl.',    sec:'tech'},
  'NVMI.TA': {he:'נובה',          en:'Nova Measuring',   sec:'tech'},
  'GILT.TA': {he:'גילת',          en:'Gilat Satellite',  sec:'tech'},
  'ESLT.TA': {he:'אלביט מערכות', en:'Elbit Systems',    sec:'tech'},
  'MTMY.TA': {he:'מלם-תים',       en:'Malam Team',       sec:'tech'},
  'TEVA.TA': {he:'טבע',           en:'Teva Pharma',      sec:'pharma'},
  'KMDA.TA': {he:'קמדה',          en:'Kamada',           sec:'pharma'},
  'ICL.TA':  {he:'כיל',           en:'ICL Group',        sec:'chemicals'},
  'ARAD.TA': {he:'ארד',           en:'Arad Measurements',sec:'industrial'},
  'BEZQ.TA': {he:'בזק',           en:'Bezeq',            sec:'telecom'},
  'PTNR.TA': {he:'פרטנר',         en:'Partner Comm.',    sec:'telecom'},
  'CELU.TA': {he:'סלקום',         en:'Cellcom Israel',   sec:'telecom'},
  'AZRG.TA': {he:'עזריאלי',       en:'Azrieli Group',    sec:'realestate'},
  'AMOT.TA': {he:'עמות',          en:'Amot Investments', sec:'realestate'},
  'MSBI.TA': {he:'מליסרון',       en:'Melisron',         sec:'realestate'},
  'BIGA.TA': {he:'ביג',           en:'Big Shopping',     sec:'realestate'},
  'ILDC.TA': {he:'אידיסי',        en:'ILDC',             sec:'realestate'},
  'ALHE.TA': {he:'אלוני-חץ',      en:'Alony Hetz',       sec:'realestate'},
  'GZIT.TA': {he:'גזית גלוב',    en:'Gazit Globe',      sec:'realestate'},
  'DLEKG.TA':{he:'דלק קבוצה',    en:'Delek Group',      sec:'energy'},
  'NVPT.TA': {he:'נפטא',          en:'Naphtha Israel',   sec:'energy'},
  'DELT.TA': {he:'דלתא גליל',    en:'Delta Galil',      sec:'consumer'},
  'GOLF.TA': {he:'גולף',          en:'Golf & Co',        sec:'consumer'},
  'FTAL.TA': {he:'פתאל',          en:'Fattal Hotels',    sec:'tourism'},
  'ELAL.TA': {he:'אל על',         en:'El Al Airlines',   sec:'tourism'},
  'OSEM.TA': {he:'אסם',           en:'Osem',             sec:'food'},
};

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
  bg:'#050c16', card:'#0c1926', card2:'#0f2035',
  border:'rgba(0,200,255,0.10)', accent:'#00d4ff',
  gain:'#00ff8c', loss:'#ff3366', text:'#8fb8d8',
  white:'#e8f4ff', dim:'#2a4560',
};

const fmt = (n,d=2) => (n==null||isNaN(n)) ? '—' : n.toLocaleString('he-IL',{minimumFractionDigits:d,maximumFractionDigits:d});
const fmtVol = v => !v?'—':v>=1e9?(v/1e9).toFixed(1)+'B':v>=1e6?(v/1e6).toFixed(1)+'M':v>=1e3?(v/1e3).toFixed(0)+'K':''+v;
const fmtMCap = m => !m?'—':m>=1e12?'₪'+(m/1e12).toFixed(2)+'T':m>=1e9?'₪'+(m/1e9).toFixed(1)+'B':m>=1e6?'₪'+(m/1e6).toFixed(0)+'M':'₪'+m;

const RANGES = [
  {v:'5d',   l:'5 ימים',    interval:'1h'},
  {v:'1mo',  l:'חודש',      interval:'1d'},
  {v:'3mo',  l:'3 חודשים',  interval:'1d'},
  {v:'6mo',  l:'6 חודשים',  interval:'1d'},
  {v:'1y',   l:'שנה',       interval:'1wk'},
  {v:'5y',   l:'5 שנים',    interval:'1mo'},
];

function calcMA(data, period) {
  return data.map((item, idx) => {
    if (idx < period - 1) return item;
    const slice = data.slice(idx - period + 1, idx + 1);
    const avg = slice.reduce((s, d) => s + (d.close || 0), 0) / period;
    return { ...item, [`ma${period}`]: parseFloat(avg.toFixed(3)) };
  });
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  const d = payload[0]?.payload;
  if (!d) return null;
  const up = d.close >= d.open;
  return (
    <div style={{background:'#0a1929',border:`1px solid ${C.border}`,borderRadius:8,padding:'10px 14px',fontFamily:"'Space Mono',monospace",fontSize:11,direction:'rtl'}}>
      <div style={{color:C.dim,marginBottom:6}}>{label}</div>
      <div style={{color:C.white,fontSize:13,fontWeight:700,marginBottom:4}}>₪{fmt(d.close)}</div>
      {d.open && <div style={{color:C.dim}}>פתיחה: ₪{fmt(d.open)}</div>}
      {d.high && <div style={{color:C.gain}}>גבוה: ₪{fmt(d.high)}</div>}
      {d.low  && <div style={{color:C.loss}}>נמוך: ₪{fmt(d.low)}</div>}
      {d.volume>0 && <div style={{color:C.accent,marginTop:4}}>מחזור: {fmtVol(d.volume)}</div>}
      {d.ma20 && <div style={{color:'#f59e0b',marginTop:4}}>MA20: ₪{fmt(d.ma20)}</div>}
      {d.ma50 && <div style={{color:'#8b5cf6'}}>MA50: ₪{fmt(d.ma50)}</div>}
    </div>
  );
}

export default function StockDetail() {
  const { symbol } = useParams();
  const navigate   = useNavigate();

  const [chartData, setChartData] = useState([]);
  const [meta,      setMeta]      = useState(null);
  const [range,     setRange]     = useState('3mo');
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState(null);

  const info   = STOCK_META[symbol] || { he: symbol, en: symbol, sec: null };
  const sector = SECTORS[info.sec] || null;

  useEffect(() => { loadHistory(); }, [symbol, range]);

  async function loadHistory() {
    setLoading(true); setError(null);
    try {
      const ri = RANGES.find(r => r.v === range) || RANGES[1];
      const r  = await fetch(`/api/history?symbol=${symbol}&range=${range}&interval=${ri.interval}`);
      const d  = await r.json();
      if (d.error) throw new Error(d.error);

      let data = d.data || [];
      data = calcMA(data, 20);
      data = calcMA(data, 50);

      setChartData(data);
      setMeta(d.meta);
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  const currentPrice = meta?.regularMarketPrice || chartData[chartData.length - 1]?.close;
  const prevClose    = meta?.chartPreviousClose  || meta?.previousClose;
  const change       = currentPrice && prevClose ? currentPrice - prevClose : null;
  const changePct    = change && prevClose ? (change / prevClose * 100) : null;
  const isUp         = (changePct || 0) >= 0;

  const periodReturn = useMemo(() => {
    if (chartData.length < 2) return null;
    const first = chartData[0]?.close;
    const last  = chartData[chartData.length - 1]?.close;
    if (!first || !last) return null;
    return ((last - first) / first * 100).toFixed(2);
  }, [chartData]);

  const yMin = useMemo(() => {
    const vals = chartData.map(d => d.low || d.close).filter(Boolean);
    if (!vals.length) return 0;
    const min = Math.min(...vals);
    return min - (Math.max(...vals) - min) * 0.08;
  }, [chartData]);

  const yMax = useMemo(() => {
    const vals = chartData.map(d => d.high || d.close).filter(Boolean);
    if (!vals.length) return 0;
    const max = Math.max(...vals);
    return max + (max - Math.min(...vals)) * 0.08;
  }, [chartData]);

  const chartColor = isUp ? C.gain : C.loss;

  // Show every N-th label to avoid crowding
  const labelInterval = Math.max(1, Math.floor(chartData.length / 8));

  return (
    <div style={{minHeight:'100vh',background:C.bg,color:C.text,fontFamily:"'Heebo',sans-serif",direction:'rtl',
      backgroundImage:`radial-gradient(ellipse 80% 40% at 50% -10%,rgba(0,100,200,.12),transparent)`}}>

      {/* HEADER */}
      <header style={{padding:'14px 24px',borderBottom:`1px solid ${C.border}`,background:'rgba(5,12,22,.95)',backdropFilter:'blur(20px)',position:'sticky',top:0,zIndex:100}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:12}}>

          {/* Right: back + name */}
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <button onClick={()=>navigate('/')} style={{background:'rgba(255,255,255,.06)',border:`1px solid ${C.border}`,color:C.text,padding:'8px 16px',borderRadius:8,cursor:'pointer',fontSize:13,fontFamily:"'Heebo',sans-serif",display:'flex',alignItems:'center',gap:6}}>
              ← חזור
            </button>
            <div>
              <div style={{display:'flex',alignItems:'center',gap:10}}>
                <span style={{fontSize:22,fontWeight:900,color:C.white}}>{info.he}</span>
                {sector && (
                  <span style={{fontSize:11,padding:'3px 10px',borderRadius:20,background:`${sector.color}18`,color:sector.color,border:`1px solid ${sector.color}33`}}>
                    {sector.he}
                  </span>
                )}
              </div>
              <div style={{fontSize:12,color:C.dim,marginTop:2}}>{info.en} · {symbol}</div>
            </div>
          </div>

          {/* Center: price */}
          {currentPrice && (
            <div style={{textAlign:'center'}}>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:32,fontWeight:700,color:C.white,lineHeight:1}}>
                ₪{fmt(currentPrice)}
              </div>
              <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,marginTop:6}}>
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:16,fontWeight:700,color:isUp?C.gain:C.loss}}>
                  {isUp?'▲ +':'▼ '}{Math.abs(changePct||0).toFixed(2)}%
                </span>
                <span style={{fontFamily:"'Space Mono',monospace",fontSize:14,color:isUp?C.gain:C.loss,opacity:.7}}>
                  ({isUp?'+':''}{fmt(change)})
                </span>
              </div>
            </div>
          )}

          {/* Left: period return */}
          {periodReturn && (
            <div style={{textAlign:'left'}}>
              <div style={{fontSize:11,color:C.dim}}>תשואה בתקופה</div>
              <div style={{fontFamily:"'Space Mono',monospace",fontSize:20,fontWeight:700,color:parseFloat(periodReturn)>=0?C.gain:C.loss}}>
                {parseFloat(periodReturn)>=0?'+':''}{periodReturn}%
              </div>
            </div>
          )}
        </div>
      </header>

      <main style={{padding:'20px 24px',maxWidth:1400,margin:'0 auto'}}>

        {/* RANGE SELECTOR */}
        <div style={{display:'flex',gap:8,marginBottom:20,justifyContent:'flex-end'}}>
          {RANGES.map(r=>(
            <button key={r.v} onClick={()=>setRange(r.v)} style={{
              padding:'7px 16px',borderRadius:20,cursor:'pointer',fontSize:12,fontFamily:"'Heebo',sans-serif",
              background:range===r.v?C.accent:'transparent',
              border:`1px solid ${range===r.v?C.accent:C.border}`,
              color:range===r.v?'#000':C.text,fontWeight:range===r.v?700:400,
              transition:'all .15s',
            }}>{r.l}</button>
          ))}
        </div>

        {/* ERROR */}
        {error && (
          <div style={{padding:'16px',background:'rgba(255,51,102,.08)',border:`1px solid rgba(255,51,102,.2)`,borderRadius:10,color:C.loss,marginBottom:20,textAlign:'center'}}>
            ⚠️ {error}
            <button onClick={loadHistory} style={{marginRight:12,background:C.loss,color:'#000',padding:'4px 12px',borderRadius:6,fontSize:12,cursor:'pointer',border:'none'}}>נסה שוב</button>
          </div>
        )}

        {/* LOADING */}
        {loading && (
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:400,gap:16}}>
            <div style={{width:40,height:40,border:`3px solid ${C.border}`,borderTop:`3px solid ${C.accent}`,borderRadius:'50%',animation:'spin .9s linear infinite'}}/>
            <span style={{color:C.accent,fontSize:14}}>טוען נתונים היסטוריים...</span>
          </div>
        )}

        {!loading && chartData.length > 0 && (
          <>
            {/* LEGEND */}
            <div style={{display:'flex',gap:16,marginBottom:12,justifyContent:'flex-end',fontSize:11}}>
              <span style={{display:'flex',alignItems:'center',gap:5,color:chartColor}}>
                <span style={{width:20,height:2,background:chartColor,display:'inline-block'}}/>מחיר
              </span>
              <span style={{display:'flex',alignItems:'center',gap:5,color:'#f59e0b'}}>
                <span style={{width:20,height:2,background:'#f59e0b',display:'inline-block',borderStyle:'dashed'}}/>MA20
              </span>
              <span style={{display:'flex',alignItems:'center',gap:5,color:'#8b5cf6'}}>
                <span style={{width:20,height:2,background:'#8b5cf6',display:'inline-block'}}/>MA50
              </span>
            </div>

            {/* PRICE CHART */}
            <div style={{background:C.card,borderRadius:14,padding:'20px 8px 12px',border:`1px solid ${C.border}`,marginBottom:12}}>
              <ResponsiveContainer width="100%" height={350}>
                <ComposedChart data={chartData} margin={{top:5,right:20,left:10,bottom:5}}>
                  <defs>
                    <linearGradient id="priceGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor={chartColor} stopOpacity={0.25}/>
                      <stop offset="95%" stopColor={chartColor} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,200,255,0.06)" vertical={false}/>
                  <XAxis dataKey="date" tick={{fill:C.dim,fontSize:10}} tickLine={false} axisLine={false}
                    interval={labelInterval} />
                  <YAxis domain={[yMin, yMax]} tick={{fill:C.dim,fontSize:10}} tickLine={false} axisLine={false}
                    tickFormatter={v=>`₪${v.toFixed(1)}`} width={65} orientation="right"/>
                  <Tooltip content={<CustomTooltip/>}/>
                  <Area type="monotone" dataKey="close" fill="url(#priceGrad)" stroke={chartColor}
                    strokeWidth={2} dot={false} activeDot={{r:4,fill:chartColor}}/>
                  <Line type="monotone" dataKey="ma20" stroke="#f59e0b" strokeWidth={1.5}
                    dot={false} strokeDasharray="5 3"/>
                  <Line type="monotone" dataKey="ma50" stroke="#8b5cf6" strokeWidth={1.5}
                    dot={false}/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* VOLUME CHART */}
            <div style={{background:C.card,borderRadius:10,padding:'12px 8px 8px',border:`1px solid ${C.border}`,marginBottom:20}}>
              <div style={{fontSize:11,color:C.dim,marginBottom:4,paddingRight:8}}>נפח מסחר</div>
              <ResponsiveContainer width="100%" height={70}>
                <ComposedChart data={chartData} margin={{top:0,right:20,left:10,bottom:0}}>
                  <XAxis dataKey="date" hide/>
                  <YAxis hide tickFormatter={fmtVol}/>
                  <Tooltip formatter={(v)=>[fmtVol(v),'נפח']}/>
                  <Bar dataKey="volume" fill={C.accent} opacity={0.35} radius={[2,2,0,0]}/>
                </ComposedChart>
              </ResponsiveContainer>
            </div>

            {/* STATS GRID */}
            {meta && (
              <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(160px,1fr))',gap:10,marginBottom:20}}>
                {[
                  {l:'מחיר נוכחי',   v:`₪${fmt(meta.regularMarketPrice)}`},
                  {l:'סגירה קודמת',  v:`₪${fmt(meta.chartPreviousClose||meta.previousClose)}`},
                  {l:'פתיחה',        v:`₪${fmt(meta.regularMarketOpen)}`},
                  {l:'גבוה יומי',    v:`₪${fmt(meta.regularMarketDayHigh)}`},
                  {l:'נמוך יומי',    v:`₪${fmt(meta.regularMarketDayLow)}`},
                  {l:'גבוה 52 שבועות', v:`₪${fmt(meta.fiftyTwoWeekHigh)}`},
                  {l:'נמוך 52 שבועות', v:`₪${fmt(meta.fiftyTwoWeekLow)}`},
                  {l:'מחזור יומי',   v:fmtVol(meta.regularMarketVolume)},
                  {l:'שווי שוק',     v:fmtMCap(meta.marketCap)},
                  {l:'מטבע',         v:meta.currency||'ILS'},
                ].map(({l,v})=>(
                  <div key={l} style={{background:C.card,borderRadius:9,padding:'12px 14px',border:`1px solid ${C.border}`}}>
                    <div style={{fontSize:10,color:C.dim,marginBottom:5}}>{l}</div>
                    <div style={{fontFamily:"'Space Mono',monospace",fontSize:14,color:C.white,fontWeight:700}}>{v}</div>
                  </div>
                ))}
              </div>
            )}

            {/* ABOUT */}
            <div style={{background:C.card,borderRadius:12,padding:'18px 20px',border:`1px solid ${C.border}`}}>
              <div style={{fontSize:14,fontWeight:700,color:C.white,marginBottom:10}}>על המניה</div>
              <div style={{fontSize:13,color:C.text,lineHeight:1.7}}>
                <strong style={{color:C.white}}>{info.he}</strong> ({symbol}) נסחרת בבורסת תל אביב (TASE) בתחום <strong style={{color:sector?.color||C.accent}}>{sector?.he||'—'}</strong>.
                מחיר הסגירה האחרון: <strong style={{color:C.white}}>₪{fmt(currentPrice)}</strong>.
                {periodReturn && (
                  <span> תשואה בתקופה הנבחרת: <strong style={{color:parseFloat(periodReturn)>=0?C.gain:C.loss}}>{parseFloat(periodReturn)>=0?'+':''}{periodReturn}%</strong>.</span>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
