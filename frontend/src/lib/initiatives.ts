
export type Initiative = {
  id: string;
  slug: string;
  title: string;
  type: string;
  agency: string;
  open: boolean;
  description?: string;
  rule_score?: number;
  content_score?: number;
  goal_alignment?: number;
  final_score?: number;
  applyUrl?: string;
};

export const INITIATIVES: Initiative[] = [
  {
    id: "007",
    slug: "accelerators",
    title: "برنامج مسرعات الأعمال",
    type: "برنامج",
    agency: "منشآت",
    open: true,
    description: "تسريع تطوّر ونمو الشركات الناشئة عبر شراكات عامة/خاصة.",
    rule_score: 82, content_score: 77, goal_alignment: 90, final_score: 84,
    applyUrl: "#"
  },
  {
    id: "006",
    slug: "uni-accelerators",
    title: "مسرعات المشاريع الناشئة الجامعية",
    type: "برنامج",
    agency: "جامعات",
    open: true,
    description: "دعم مشاريع الطلبة وحديثي التخرج لمدة 3–6 أشهر.",
    rule_score: 75, content_score: 80, goal_alignment: 86, final_score: 80,
    applyUrl: "#"
  },
  {
    id: "013",
    slug: "ecommerce",
    title: "برامج وخدمات التجارة الإلكترونية",
    type: "برامج",
    agency: "وزارة التجارة",
    open: true,
    description: "تحويل المنشآت للتجارة الإلكترونية ودعمها.",
    rule_score: 68, content_score: 72, goal_alignment: 78, final_score: 73,
    applyUrl: "#"
  },
  {
    id: "009",
    slug: "women-entrepreneurs",
    title: "برنامج تحفيز رائدات الأعمال",
    type: "برنامج",
    agency: "منشآت",
    open: true,
    description: "تمكين رائدات الأعمال عبر برامج تدريب ودعم.",
    rule_score: 70, content_score: 74, goal_alignment: 82, final_score: 75
  },
  {
    id: "004",
    slug: "edu-facilities",
    title: "مبادرة دعم استثمار المرافق التعليمية",
    type: "مبادرة",
    agency: "وزارة التعليم",
    open: true,
    description: "استثمار المرافق التعليمية في مشاريع ريادية.",
    rule_score: 66, content_score: 69, goal_alignment: 80, final_score: 71
  }
];

