"use client";

import GaugeStat from "@/components/GaugeStat";

export default function ReadinessPanel() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 items-start">
      <GaugeStat
        title="منصة إد..."
        percent={71}
        tone="sky"
        note="في نفس القطاع والمنطقة؛ بلغت جاهزية المنشآت المشابهة حوالي 65%."
      />
      <GaugeStat
        title="حل مدفوع..."
        percent={58}
        tone="amber"
        note="في نفس القطاع والمنطقة؛ بلغت جاهزية المنشآت المشابهة حوالي 65%."
      />
      <GaugeStat
        title="تطبيق د..."
        percent={12}
        tone="emerald"
        note="في نفس القطاع والمنطقة؛ بلغت جاهزية المنشآت المشابهة حوالي 65%."
      />
    </div>
  );
}
