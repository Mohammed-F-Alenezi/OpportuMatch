export default function CompassGauge({value=41}:{value?:number}){
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div className="card p-5 relative overflow-hidden">
      <div className="absolute -right-10 -bottom-10 w-40 h-40 rounded-full bg-highlight/10 blur-2xl" />
      <p className="text-sm text-textSecondary mb-2">بوصلة الجاهزية</p>
      <div className="grid grid-cols-2 gap-4 items-center">
        <svg viewBox="0 0 120 70" className="w-full">
          <defs>
            <linearGradient id="g" x1="0" x2="1">
              <stop offset="0%" stopColor="#1ABC9C" />
              <stop offset="100%" stopColor="#00C37A" />
            </linearGradient>
          </defs>
          <path d="M10,60 A50,50 0 0,1 110,60" fill="none" stroke="url(#g)" strokeWidth="10" opacity=".2"/>
          <path d={`M10,60 A50,50 0 ${clamped>50?1:0},1 ${10 + clamped*1.0},60`} 
                fill="none" stroke="url(#g)" strokeWidth="10"/>
          <circle cx={10 + clamped*1.0} cy="60" r="4" fill="#00C37A"/>
        </svg>
        <div className="text-center">
          <div className="text-4xl font-extrabold text-highlight">{clamped}%</div>
          <p className="text-xs text-textSecondary mt-1">
            {clamped>=70 ? "جاهزة للنمو" : clamped>=50 ? "محتملة للنمو" : "بحاجة لتحسين"}
          </p>
        </div>
      </div>
    </div>
  );
}
