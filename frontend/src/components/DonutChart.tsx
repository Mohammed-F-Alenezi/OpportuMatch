"use client";
import { Doughnut } from "react-chartjs-2";
import { Chart, ArcElement, Tooltip, Legend } from "chart.js";
Chart.register(ArcElement, Tooltip, Legend);

export default function DonutChart(){
  const data = {
    labels:["مايكرو","صغيرة","متوسطة"],
    datasets:[{
      data:[78,18,4],
      backgroundColor:["#00C37A","#2ECC71","#1ABC9C"],
      borderColor:"rgba(255,255,255,.06)", borderWidth:2
    }]
  };
  const options:any = {
    plugins:{ legend:{labels:{color:"#B0B0B0"}}, tooltip:{backgroundColor:"rgba(11,61,46,.95)"} },
    cutout:"72%"
  };
  return <div className="card p-4"><Doughnut data={data} options={options}/></div>;
}
