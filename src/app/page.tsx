import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { formatBps } from "@/lib/money";
import { HOME_BY_ROLE } from "@/lib/session";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [user, settings] = await Promise.all([getCurrentUser(), getSettings()]);
  return (
    <div>
      <header className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4">
        <span className="text-xl font-bold text-brand-600">Baskı3D</span>
        <div className="flex gap-2">
          {user ? (
            <Link href={HOME_BY_ROLE[user.role]} className="btn">Panelim</Link>
          ) : (
            <>
              <Link href="/giris" className="btn-secondary">Giriş yap</Link>
              <Link href="/kayit" className="btn">Kayıt ol</Link>
            </>
          )}
        </div>
      </header>

      <section className="mx-auto max-w-6xl px-4 py-16 text-center">
        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl">
          3D baskı ihtiyacını yaz, <span className="text-brand-600">işletmeler teklif versin</span>
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-lg text-gray-600">
          Modelini yükle, malzemeyi seç. Yakınındaki 3D baskı işletmelerinden fiyat teklifi al, en uygununu seç.
          Ödemen iş teslim edilene kadar güvencede kalır.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/kayit?rol=musteri" className="btn px-6 py-3 text-base">Baskı yaptır</Link>
          <Link href="/kayit?rol=isletme" className="btn-secondary px-6 py-3 text-base">İşletme olarak katıl</Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-6xl gap-4 px-4 pb-16 md:grid-cols-2">
        <div className="card">
          <h2 className="text-lg font-bold">Müşteriler için</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-700">
            <li>Bakiye yükle (kart veya havale/EFT).</li>
            <li>Talebini oluştur: model dosyası, malzeme, adet, şehir.</li>
            <li>İşletmelerden gelen teklifleri karşılaştır ve birini kabul et.</li>
            <li>Ürün eline ulaşınca teslimi onayla. Sorun olursa ödeme iade edilir.</li>
          </ol>
        </div>
        <div className="card">
          <h2 className="text-lg font-bold">İşletmeler için</h2>
          <ol className="mt-3 list-decimal space-y-2 pl-5 text-sm text-gray-700">
            <li>Ücretsiz kayıt ol, yazıcılarını ve malzemelerini tanıt.</li>
            <li>Açık taleplere ücretsiz teklif ver.</li>
            <li>İş tamamlanınca kazancın bakiyene geçer (komisyon: {formatBps(settings.commissionBps)}).</li>
            <li>Biriken kazancın her <strong>çarşamba</strong> IBAN&apos;ına gönderilir.</li>
          </ol>
        </div>
      </section>
    </div>
  );
}
