"use client";
import "./registry";
import { Bar } from "react-chartjs-2";

export default function SizesStackedBar({
  labels, micro, small, medium, height=260
}: { labels:string[]; micro:number[]; small:number[]; medium:number[]; height?:number }) {
  return (
    <Bar height={height} data={{
      labels,
      datasets: [
        { label:"متناهية", data: micro,  backgroundColor:"rgba(111,194,255,.85)", borderRadius:8 },
        { label:"صغيرة",   data: small,  backgroundColor:"rgba(82,226,159,.85)",  borderRadius:8 },
        { label:"متوسطة",  data: medium, backgroundColor:"rgba(198,165,255,.85)", borderRadius:8 },
      ],
    }} options={{
      plugins:{ legend:{ labels:{ color:"rgba(255,255,255,.85)" } } },
      scales:{
        x:{ stacked:true, grid:{ display:false }, ticks:{ color:"rgba(255,255,255,.6)" } },
        y:{ stacked:true, grid:{ color:"rgba(255,255,255,.07)" }, ticks:{ color:"rgba(255,255,255,.6)" } },
      },
      maintainAspectRatio:false,
      responsive:true
    }}/>
  );
}
