"use client";

import { useState } from "react";
import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { registerAction } from "../actions";

export function RegisterForm({ initialRole }: { initialRole: "CUSTOMER" | "BUSINESS" }) {
  const [role, setRole] = useState(initialRole);
  return (
    <ActionForm action={registerAction} className="space-y-4">
      <div className="grid grid-cols-2 gap-2">
        {(
          [
            ["CUSTOMER", "Müşteri", "Baskı yaptırmak istiyorum"],
            ["BUSINESS", "İşletme", "3D baskı hizmeti veriyorum"],
          ] as const
        ).map(([value, title, desc]) => (
          <label
            key={value}
            className={`cursor-pointer rounded-lg border p-3 text-sm ${role === value ? "border-brand-500 bg-brand-50" : "border-gray-300"}`}
          >
            <input type="radio" name="role" value={value} checked={role === value} onChange={() => setRole(value)} className="sr-only" />
            <span className="block font-semibold">{title}</span>
            <span className="text-gray-600">{desc}</span>
          </label>
        ))}
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
        <label className="label" htmlFor="phone">Telefon (opsiyonel)</label>
        <input className="input" id="phone" name="phone" type="tel" />
      </div>
      <div>
        <label className="label" htmlFor="password">Şifre</label>
        <input className="input" id="password" name="password" type="password" minLength={8} required autoComplete="new-password" />
      </div>
      <label className="flex items-start gap-2 text-sm text-gray-700">
        <input type="checkbox" name="terms" className="mt-1" required />
        <span>Kullanım koşullarını ve KVKK aydınlatma metnini okudum, kabul ediyorum.</span>
      </label>
      <SubmitButton className="btn w-full">Hesap oluştur</SubmitButton>
    </ActionForm>
  );
}
