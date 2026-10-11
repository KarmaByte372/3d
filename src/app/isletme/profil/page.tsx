import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { PageTitle } from "@/components/Shell";
import { requireUser } from "@/lib/auth";
import { formatIban } from "@/lib/iban";
import { updateProfileAction } from "../actions";

export default async function BusinessProfilePage({ searchParams }: { searchParams: Promise<{ hosgeldin?: string }> }) {
  const { hosgeldin } = await searchParams;
  const user = await requireUser("BUSINESS");
  const b = user.business!;
  return (
    <>
      <PageTitle eyebrow="Atölye">Profil & IBAN</PageTitle>
      {hosgeldin && (
        <div className="mb-5 rounded-lg border border-green-300 bg-green-50 p-4 text-sm text-green-900">
          Hesabın oluşturuldu! Profilini tamamla ve ödeme alabilmek için IBAN&apos;ını ekle.
        </div>
      )}
      <div className="card max-w-3xl">
        <ActionForm action={updateProfileAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="companyName">İşletme adı</label>
              <input className="input" id="companyName" name="companyName" defaultValue={b.companyName} required />
            </div>
            <div>
              <label className="label" htmlFor="taxNumber">Vergi / TC kimlik no</label>
              <input className="input" id="taxNumber" name="taxNumber" defaultValue={b.taxNumber ?? ""} />
            </div>
            <div>
              <label className="label" htmlFor="city">Şehir</label>
              <input className="input" id="city" name="city" defaultValue={b.city} required />
            </div>
            <div>
              <label className="label" htmlFor="phone">Telefon</label>
              <input className="input" id="phone" name="phone" defaultValue={user.phone ?? ""} />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="description">Tanıtım</label>
            <textarea className="input min-h-24" id="description" name="description" defaultValue={b.description} />
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="label" htmlFor="technologies">Teknolojiler</label>
              <input className="input" id="technologies" name="technologies" defaultValue={b.technologies} placeholder="FDM, SLA" />
            </div>
            <div>
              <label className="label" htmlFor="materials">Malzemeler</label>
              <input className="input" id="materials" name="materials" defaultValue={b.materials} placeholder="PLA, PETG, ABS, Reçine" />
            </div>
          </div>
          <fieldset className="rounded-lg border border-ink-200 p-4">
            <legend className="px-1 text-sm font-semibold">Ödeme hesabı (çarşamba ödemeleri)</legend>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label className="label" htmlFor="iban">IBAN</label>
                <input className="input font-mono" id="iban" name="iban" defaultValue={b.iban ? formatIban(b.iban) : ""} placeholder="TR00 0000 …" />
              </div>
              <div>
                <label className="label" htmlFor="ibanHolder">Hesap sahibi</label>
                <input className="input" id="ibanHolder" name="ibanHolder" defaultValue={b.ibanHolder ?? ""} />
              </div>
            </div>
          </fieldset>
          <SubmitButton>Kaydet</SubmitButton>
        </ActionForm>
      </div>
    </>
  );
}
