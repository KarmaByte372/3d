import { ActionForm, SubmitButton } from "@/components/ActionForm";
import { PageTitle } from "@/components/Shell";
import { ALLOWED_EXTENSIONS } from "@/lib/files";
import { createRequestAction } from "../../actions";

const TECHNOLOGIES = ["FDM", "SLA / Reçine", "SLS", "MJF", "Farketmez"];
const MATERIALS = ["PLA", "PETG", "ABS", "ASA", "TPU (esnek)", "Naylon", "Reçine", "Karbon katkılı", "Diğer"];

export default function NewRequestPage() {
  return (
    <>
      <PageTitle>Yeni baskı talebi</PageTitle>
      <div className="card max-w-3xl">
        <ActionForm action={createRequestAction} className="space-y-4">
          <div>
            <label className="label" htmlFor="title">Başlık</label>
            <input className="input" id="title" name="title" placeholder="Örn. Drone gövdesi, 2 parça" required />
          </div>
          <div>
            <label className="label" htmlFor="description">Açıklama</label>
            <textarea className="input min-h-28" id="description" name="description" required
              placeholder="Ölçüler, doluluk oranı, katman yüksekliği, yüzey kalitesi, kullanım amacı…" />
          </div>
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
          <div className="grid gap-4 sm:grid-cols-4">
            <div>
              <label className="label" htmlFor="quantity">Adet</label>
              <input className="input" id="quantity" name="quantity" type="number" min={1} defaultValue={1} required />
            </div>
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
          <div>
            <label className="label" htmlFor="file">Model dosyası (ops., en fazla 50 MB)</label>
            <input className="input" id="file" name="file" type="file" accept={ALLOWED_EXTENSIONS.join(",")} />
            <p className="mt-1 text-xs text-gray-500">{ALLOWED_EXTENSIONS.join(", ")}</p>
          </div>
          <SubmitButton>Talebi yayınla</SubmitButton>
        </ActionForm>
      </div>
    </>
  );
}
