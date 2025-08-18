"use client";
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from "recharts";

export default function Donut({ value }: { value: number }) {
  const data = [{ name: "match", value }, { name: "rest", value: 1 - value }];
  const COLORS = ["#1B8354", "#475569"];
  return (
    <div className="h-[220px] w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="value" innerRadius={60} outerRadius={90} startAngle={90} endAngle={-270}>
            {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
          </Pie>
          <Tooltip formatter={(v:number)=>`${Math.round(v*100)}%`} />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
