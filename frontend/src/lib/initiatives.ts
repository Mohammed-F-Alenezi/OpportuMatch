export type Initiative = { id: string; title: string; type: string; agency: string; open: boolean };
export const INITIATIVES: Initiative[] = [
  { id: "001", title: "مسابقة رواد أعمال الجامعات", type: "مسابقة", agency: "منشآت", open: true },
  { id: "002", title: "معسكرات ريادة الأعمال الجامعية", type: "معسكر", agency: "منشآت", open: true },
  { id: "003", title: "مبادرة تعزيز مشاركة المنشآت في توصيل الأدوية", type: "مبادرة", agency: "الهيئة العامة", open: false },
  { id: "004", title: "مبادرة دعم استثمار المرافق التعليمية", type: "مبادرة", agency: "وزارة التعليم", open: true },
  { id: "005", title: "مبادرة دعم الصيدليات الصغيرة والمتوسطة", type: "مبادرة", agency: "الغذاء والدواء", open: true },
  { id: "006", title: "برنامج مسرعات أعمال المشاريع الناشئة الجامعية", type: "برنامج", agency: "جامعات", open: true },
  { id: "007", title: "برنامج مسرعات الأعمال", type: "برنامج", agency: "منشآت", open: false },
  { id: "008", title: "تمكين أندية ريادة الأعمال الجامعية", type: "تمكين", agency: "جامعات", open: true },
  { id: "009", title: "برنامج تحفيز رائدات الأعمال", type: "برنامج", agency: "منشآت", open: true },
  { id: "010", title: "طموح – خدمات المنشآت متسارعة النمو", type: "برنامج", agency: "منشآت", open: true },
  { id: "011", title: "بوابة منظومة الابتكار التجاري – فكرة", type: "بوابة", agency: "وزارة التجارة", open: true },
  { id: "012", title: "برنامج الشركات الناشئة الجامعية", type: "برنامج", agency: "جامعات", open: true },
  { id: "013", title: "برامج وخدمات التجارة الإلكترونية", type: "برامج", agency: "وزارة التجارة", open: true },
];
