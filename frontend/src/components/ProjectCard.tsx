type P = { name:string; location:string; sector:string; score:number; peer:number; };

export default function ProjectCard({name, location, sector, score, peer}:P){
  const diff = score - peer;
  const tip = `منشأتك جاهزة للنمو بنسبة ${score}% (تصنيف: ${score>=70?"جاهزة للنمو":"محتملة للنمو"}). 
في نفس القطاع والمنطقة والحجم، بلغت جاهزية المنشآت المشابهة حوالي ${peer}%.`;

  return (
    <div className="card p-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h4 className="font-semibold">{name}</h4>
          <p className="text-xs text-textSecondary">{sector} • {location}</p>
        </div>
        <span className="badge">{score>=70? "جاهزة للنمو":"محتملة للنمو"}</span>
      </div>

      <p className="mt-3 text-sm text-textSecondary leading-7">{tip}</p>

      <div className="mt-4">
        <div className="h-2 w-full rounded-full bg-white/10 overflow-hidden">
          <div className="h-full bg-highlight" style={{width:`${score}%`}} />
        </div>
        <div className="flex justify-between text-xs mt-1 text-textSecondary">
          <span>مستوى الجاهزية</span>
          <span className="text-highlight font-semibold">{score}%</span>
        </div>
        <div className="flex items-center gap-2 mt-2 text-xs">
          <span className="badge">متوسط النظراء: {peer}%</span>
          <span className={`badge ${diff>=0? "border-highlight/40 text-highlight" : "border-white/10 text-textSecondary"}`}>
            {diff>=0? `+${diff}% فوق المتوسط` : `${diff}% تحت المتوسط`}
          </span>
        </div>
      </div>
    </div>
  );
}
