"use client";
import { Compass, Gauge, LineChart, Map, LayoutDashboard } from "lucide-react";

const Item = ({ icon: Icon, label, active=false }:{
  icon: any; label: string; active?: boolean;
}) => (
  <button
    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl2 
    text-sm ${active ? "bg-white/5 border border-white/10 shadow-glow" : "hover:bg-white/5"} `}
  >
    <Icon size={18} className="text-highlight" />
    <span className="text-textSecondary">{label}</span>
  </button>
);

export default function Sidebar(){
  return (
    <aside className="h-dvh w-64 p-4 border-e border-white/10 bg-black/10">
      <div className="flex items-center gap-2 mb-6">
        <Compass className="text-highlight" />
        <h1 className="font-semibold">بوصلة الممكنات</h1>
      </div>
      <div className="space-y-2">
        <Item icon={LayoutDashboard} label="الداشبورد" active />
        <Item icon={Gauge} label="جاهزية المشاريع" />
        <Item icon={LineChart} label="تحليلات السوق" />
        <Item icon={Map} label="خريطة البوصلة" />
      </div>
      <div className="mt-8 card p-4">
        <p className="text-sm text-textSecondary">نصائح</p>
        <p className="mt-1 text-xs text-textSecondary/80">
          حافظ على نموك فوق متوسط القطاع. راجع تكاليفك الفصلية.
        </p>
      </div>
    </aside>
  );
}
