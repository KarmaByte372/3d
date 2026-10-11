import { Logo } from "./Logo";
import { PrintScene } from "./PrintScene";

export function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <aside className="relative hidden overflow-hidden bg-ink-950 text-white lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="bg-plate absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black_35%,transparent_80%)]" />
        <div className="absolute -left-24 bottom-10 h-80 w-80 rounded-full bg-filament-pink/20 blur-[110px]" />
        <div className="relative"><Logo dark /></div>
        <div className="relative flex justify-center"><PrintScene className="max-w-[380px]" /></div>
        <p className="relative max-w-sm text-sm text-ink-300">
          Modelini yükle, atölyelerden teklif al. Ödemen teslimata kadar güvencede.
        </p>
      </aside>
      <main className="bg-plate-light flex flex-col justify-center px-4 py-12 sm:px-10">
        <div className="mx-auto w-full max-w-md">
          <div className="mb-8 lg:hidden"><Logo /></div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-ink-500">{subtitle}</p>
          <div className="card mt-6 p-6">{children}</div>
          <p className="mt-6 text-center text-sm text-ink-500">{footer}</p>
        </div>
      </main>
    </div>
  );
}
