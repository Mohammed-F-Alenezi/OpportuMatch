"use client";
import { useRouter } from "next/navigation";
import Signup from '@/components/signup-form'
export default function Page() {
  const router = useRouter();
  return (
<div className="bg-muted flex min-h-svh flex-col items-center justify-center gap-6 p-6 md:p-10">
      <div className="flex w-full max-w-xl flex-col gap-6">
        <a href="#" className="flex items-center gap-2 self-center font-medium">
          <div className="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md">
          </div>
          Tuwaiq Academy.
        </a>
        <Signup />
      </div>
    </div>
  );
}
