"use client";
import { Line } from "react-chartjs-2";
import { Chart, CategoryScale, LinearScale, PointElement, LineElement, Legend, Tooltip } from "chart.js";
Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Legend, Tooltip);

export default function LineChart(){
  const data = {
    labels: ["2019","2020","2021","2022","2023","2024","2025"],
    datasets: [
      { label:"مايكرو", data:[880,895,910,940,970,1000,1030], borderColor:"#00C37A", tension:.35 },
      { label:"صغيرة", data:[140,150,158,170,180,195,210], borderColor:"#2ECC71", tension:.35 },
      { label:"متوسطة", data:[18,19,20.5,21,22,22.5,23], borderColor:"#1ABC9C", tension:.35 },
    ]
  };
  const options:any = {
    plugins:{ legend:{labels:{color:"#B0B0B0"}}, tooltip:{backgroundColor:"rgba(11,61,46,.95)"} },
    scales:{ x:{ ticks:{color:"#B0B0B0"}, grid:{color:"rgba(255,255,255,.05)"} }, 
             y:{ ticks:{color:"#B0B0B0"}, grid:{color:"rgba(255,255,255,.05)"}} }
  };
  return <div className="card p-4"><Line data={data} options={options}/></div>;
}
