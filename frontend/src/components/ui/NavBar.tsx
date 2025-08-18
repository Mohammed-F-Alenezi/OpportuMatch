"use client";

import Link from "next/link";

export default function NavBar() {
  return (
    <nav className="w-full bg-blue-600 text-white shadow-md">
      <div className="max-w-7xl mx-auto flex items-center justify-between px-6 py-3">
        {/* Logo / App Name */}
        <Link href="/">
          <h1 className="text-xl font-bold cursor-pointer">
            منصّة مزايا للتمويل
          </h1>
        </Link>

        {/* Links */}
        <div className="flex space-x-6">
          <Link href="/initiatives" className="hover:text-yellow-300">
            المبادرات
          </Link>
          <Link href="/programs" className="hover:text-yellow-300">
            البرامج
          </Link>
          <Link href="/about" className="hover:text-yellow-300">
            من نحن
          </Link>
        </div>
      </div>
    </nav>
  );
}
