export type CsvRow = {
  السنة: number;
  القطاع_العام: string;
  الحجم: string;
  المنطقة: string;
  إجمالي_عدد_المنشآت?: number;
  share?: number;
  الإيرادات_موزع?: number;
  النفقات_موزع?: number;
  التعويضات_موزع?: number;
  الفائض_موزع?: number;
};

export type ExcelRow = {
  السنة: number;
  الربع?: string | number;
  المنطقة: string;
  "عدد المنشآت متناهية الصغر"?: number;
  "عدد المنشآت الصغيرة"?: number;
  "عدد المنشآت المتوسطة"?: number;
  "عدد المنشآت الكبيرة"?: number;
  "عدد المنشآت"?: number;
};
