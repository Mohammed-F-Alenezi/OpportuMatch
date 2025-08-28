"use client";
import "./registry";
import { Line } from "react-chartjs-2";

export default function FinanceLine({
  labels, revenue, expenses, surplus, height=240
}: { labels:string[]; revenue:number[]; expenses:number[]; surplus:number[]; height?:number }) {
  return (
    <Line height={height} data={{
      labels,
      datasets: [
        { label:"الإيرادات", data: revenue, tension:.35, borderWidth:2, pointRadius:0, borderColor:"#52E29F" },
        { label:"النفقات",  data: expenses, tension:.35, borderWidth:2, pointRadius:0, borderColor:"#6FC2FF" },
        { label:"الفائض",   data: surplus, tension:.35, borderWidth:2, pointRadius:0, borderColor:"#C6A5FF" },
      ],
    }} options={{
      plugins:{ legend:{ display:true, labels:{ color:"rgba(255,255,255,.8)" } }, tooltip:{ mode:"index", intersect:false }},
      scales:{
        x:{ grid:{ display:false }, ticks:{ color:"rgba(255,255,255,.6)" } },
        y:{ grid:{ color:"rgba(255,255,255,.07)" }, ticks:{ color:"rgba(255,255,255,.6)" } },
      },
      maintainAspectRatio:false,
      responsive:true
    }}/>
  );
}
