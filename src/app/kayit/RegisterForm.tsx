"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { IconCube, IconNozzle } from "@/components/Icons";
import { registerAction } from "../actions";

export function RegisterForm({ initialRole }: { initialRole: "CUSTOMER" | "BUSINESS" }) {
  const [role, setRole] = useState(initialRole);
  return (
    <ActionForm action={registerAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        {(
          [
            ["CUSTOMER", "Müşteri", "Baskı yaptırıyorum", IconCube],
            ["BUSINESS", "Atölye", "Baskı hizmeti veriyorum", IconNozzle],
          ] as const
        ).map(([value, title, desc, Icon]) => {
          const selected = role === value;
          return (
            <label
              key={value}
              className={`relative cursor-pointer rounded-xl border p-3.5 text-sm transition ${
                selected ? "border-transparent bg-ink-900 text-white shadow-glow" : "border-ink-200 bg-white hover:border-ink-300"
              }`}
            >
              <input type="radio" name="role" value={value} checked={selected} onChange={() => setRole(value)} className="sr-only" />
              <Icon className={`h-5 w-5 ${selected ? "text-filament-orange" : "text-ink-400"}`} />
              <span className="mt-2 block font-semibold">{title}</span>
              <span className={`text-xs ${selected ? "text-ink-300" : "text-ink-500"}`}>{desc}</span>
            </label>
          );
        })}
      </div>
      <div>
        <label className="label" htmlFor="name">Ad soyad</label>
        <input className="input" id="name" name="name" required />
      </div>
      {role === "BUSINESS" && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="companyName">İşletme adı</label>
            <input className="input" id="companyName" name="companyName" required />
          </div>
          <div>
            <label className="label" htmlFor="city">Şehir</label>
            <input className="input" id="city" name="city" required />
          </div>
        </div>
      )}
      <div>
        <label className="label" htmlFor="email">E-posta</label>
        <input className="input" id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div>
        <label className="label" htmlFor="phone">Cep telefonu</label>
        <input className="input" id="phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="05XX XXX XX XX" required />
        <p className="mt-1 text-xs text-ink-400">Numarana SMS ile doğrulama kodu gönderilecek. Şifreni unutursan da bu numarayı kullanacaksın.</p>
      </div>
      <div>
        <label className="label" htmlFor="password">Şifre</label>
        <input className="input" id="password" name="password" type="password" minLength={8} required autoComplete="new-password" />
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="terms" className="mt-1 accent-brand-500" required />
        <span className="text-ink-500"><a href="/kullanim-sartlari" target="_blank" className="link">Kullanım Şartları</a>&apos;nı ve <a href="/gizlilik" target="_blank" className="link">Gizlilik Politikası</a>&apos;nı okudum, kabul ediyorum. <a href="/kvkk" target="_blank" className="link">KVKK Aydınlatma Metni</a>&apos;ni okudum.</span>
      </label>
      <SubmitButton className="btn w-full py-3">Hesap oluştur</SubmitButton>
    </ActionForm>
  );
}
