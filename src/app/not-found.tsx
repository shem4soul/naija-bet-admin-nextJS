import Link from "next/link";

export default function NotFound() {
  return (
    <div className="grid min-h-[60dvh] place-items-center text-center">
      <div>
        <p className="text-6xl font-black text-brand">404</p>
        <p className="mt-2 text-muted">That page doesn&apos;t exist.</p>
        <Link href="/" className="btn-primary mt-6">Back to dashboard</Link>
      </div>
    </div>
  );
}
