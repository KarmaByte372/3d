import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { FileDrop } from "@/components/FileDrop";
import { PageTitle } from "@/components/Shell";
import { ALLOWED_EXTENSIONS } from "@/lib/files";
import { createRequestAction } from "../../actions";

const TECHNOLOGIES = ["FDM", "SLA / Reçine", "SLS", "MJF", "Farketmez"];
const MATERIALS = ["PLA", "PETG", "ABS", "ASA", "TPU (esnek)", "Naylon", "Reçine", "Karbon katkılı", "Diğer"];

function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section className="grid gap-4 border-t border-ink-100 pt-6 first:border-0 first:pt-0 md:grid-cols-[180px_1fr]">
      <div>
        <span className="font-mono text-xs text-brand-600">0{n}</span>
        <h2 className="text-base font-semibold">{title}</h2>
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export default function NewRequestPage() {
  return (
    <>
      <PageTitle eyebrow="Yeni talep" description="Ne kadar detay verirsen teklifler o kadar isabetli olur.">
        Baskı talebi oluştur
      </PageTitle>
      <div className="card max-w-4xl p-6 sm:p-8">
        <ActionForm action={createRequestAction} className="space-y-6">
          <Section n={1} title="Model">
            <FileDrop name="file" accept={ALLOWED_EXTENSIONS.join(",")} />
            <div>
              <label className="label" htmlFor="title">Başlık</label>
              <input className="input" id="title" name="title" placeholder="Örn. Drone gövdesi, 2 parça" required />
            </div>
            <div>
              <label className="label" htmlFor="description">Açıklama</label>
              <textarea className="input min-h-28" id="description" name="description" required
                placeholder="Ölçüler, doluluk oranı, katman yüksekliği, yüzey kalitesi, kullanım amacı…" />
            </div>
          </Section>
          <Section n={2} title="Baskı ayarları">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="technology">Teknoloji</label>
                <select className="input" id="technology" name="technology">
                  {TECHNOLOGIES.map((t) => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="material">Malzeme</label>
                <select className="input" id="material" name="material">
                  {MATERIALS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="color">Renk</label>
                <input className="input" id="color" name="color" placeholder="Siyah" />
              </div>
            </div>
            <div className="max-w-[10rem]">
              <label className="label" htmlFor="quantity">Adet</label>
              <input className="input" id="quantity" name="quantity" type="number" min={1} defaultValue={1} required />
            </div>
          </Section>
          <Section n={3} title="Teslimat & bütçe">
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="city">Şehir</label>
                <input className="input" id="city" name="city" required />
              </div>
              <div>
                <label className="label" htmlFor="budget">Bütçe (TL, ops.)</label>
                <input className="input" id="budget" name="budget" inputMode="decimal" placeholder="500" />
              </div>
              <div>
                <label className="label" htmlFor="deadline">Son tarih (ops.)</label>
                <input className="input" id="deadline" name="deadline" type="date" />
              </div>
            </div>
          </Section>
          <div className="flex justify-end border-t border-ink-100 pt-6">
            <SubmitButton className="btn px-6 py-3">Talebi yayınla</SubmitButton>
          </div>
        </ActionForm>
      </div>
    </>
  );
}
