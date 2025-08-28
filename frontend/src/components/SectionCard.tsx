// components/SectionCard.tsx
export default function SectionCard({
  title,
  children,
  actions,
}: {
  title: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="card">
      <header className="mb-4 flex items-center justify-between">
        <h3 className="text-base font-medium">{title}</h3>
        <div className="flex items-center gap-2">{actions}</div>
      </header>
      {children}
    </section>
  );
}
