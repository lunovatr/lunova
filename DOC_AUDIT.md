# 🔍 Doküman Tutarlılık Denetimi — Talimat Dosyası

> **Bu dosya otomatik yüklenmez ve normal iş akışlarında değerlendirilmeye alınmaz.** Kök `CLAUDE.md` her oturum başında otomatik yükleniyor, bu dosya değil — sadece kullanıcı açıkça "bu dosyayı oku" (veya eşdeğeri) dediğinde okunur ve uygulanır. Kök `CLAUDE.md`'nin "📌 Kalıcı Kural"ı bu dosyadan hiç bahsetmez ve bahsetmemeli — bu, kasıtlı olarak ayrı, isteğe bağlı (opt-in) bir araç.

## Amaç

Lunova, çok-turlu/çok-ajanlı agentic bir şekilde geliştiriliyor. Normal turlarda "bir değişiklik yap → ilgili `claude.md`'yi güncelle" refleksi işliyor (kök `CLAUDE.md`'nin kendi kalıcı kuralı), ama bu satır satır, artımlı bir süreç — küçük gözden kaçmalar birikebilir, ya da bir oturum kuralı unutabilir. Bu dosya, kullanıcının **kendi başlattığı, ayrı bir oturumda** çalıştıracağı bir **tam tarama denetimi**: sistemin tamamını (kod + tüm dokümantasyon) yeniden gözden geçirip, dokümanların gerçek kod tabanıyla hâlâ örtüşüp örtüşmediğini doğrular ve sapmaları düzeltir. Kullanıcının tabiriyle: periyodik bir "kilometre taşı" senkronizasyonu.

## Kapsam ve sınırlar

- **Bu bir kod değişikliği görevi değil.** Doğrulama için kod okunur, ama **uygulama kodunda değişiklik yapılmaz** — sadece dokümantasyon (`CLAUDE.md`'ler ve varsa `ToDo.md`/`CHANGELOG.md` gibi izlenen ekip notları) güncellenir.
- Denetim sırasında yeni bir bug/tutarsızlık fark edilirse: **düzeltilmez**, dokümana önem derecesiyle not düşülür (aşağıya bakın) — kullanıcı bunu görüp ayrı bir oturumda düzeltilmesini isteyip istemeyeceğine kendisi karar verir.
- İstisna: dokümanın kendi içindeki bir hata (yanlış dosya yolu, kodu artık yansıtmayan bir cümle, iki bölüm arasında çelişki) doğrudan düzeltilir — bu döküman-only bir düzeltme, koda dokunmaz.
- Backend'de veya frontend'lerde **çalıştırılabilir bir şey** (server, build) gerekiyorsa (örn. `git log` için repo'nun kendisi yeterli, ama bir iddiayı "gerçekten çalışıyor mu" diye test etmek `tsc`/`vite build` gerektirebilir) bunlar denetimin bir parçası olabilir — ama bunlar **doğrulama** amaçlı, **geliştirme** amaçlı değil.

## Süreç

### 1. Envanteri çıkar

Şunları bul ve oku (context'te değilse `Read`/`Glob` ile aç):
- Kök `CLAUDE.md` (muhtemelen zaten otomatik yüklü, yine de baştan sona dikkatlice oku)
- `backend/CLAUDE.md`, `client/CLAUDE.md`, `expert/CLAUDE.md`
- `expert/ToDo.md`, `expert/CHANGELOG.md` (ekibin kendi güncel notları) — `backend/`, `client/`'de eşdeğeri var mı diye de bak
- Kök ve üç alt dizinde `Glob "**/*.md"` ile başka izlenen/unutulmuş doküman var mı tara (yeni bir README, bir NOTES.md, vb.)
- Her üç alt uygulamanın `README.md`'si — hâlâ şablon README'si mi yoksa proje-özgü mü, bu da bir tutarlılık sorusu
- `docker-compose.yml`, varsa `.env.example` dosyaları — dokümante edilen ortam değişkenleri/kurulum adımlarıyla örtüşüyor mu

### 2. Git tarihiyle çapraz kontrol et

Repo artık `git subtree` ile birleşmiş TEK bir depo (kökte `.git`). Her dosyanın kendi "Son Güncelleme"/son tur tarihinden bu yana neler commit'lenmiş, kontrol et:

```bash
git log --oneline --since="<dosyanın belirttiği son tarih>"
git log --stat --since="<tarih>" -- backend/ client/ expert/
```

Bu tarihten sonraki commit'ler ilgili `claude.md`'de hiç geçmiyorsa, bu bir **dokümantasyon boşluğu** — bulguya ekle.

### 3. Her somut iddiayı kaynağıyla doğrula

Genel okuma yetmez — CLAUDE.md'lerdeki yanlış olabilecek somut iddiaları gerçek kaynakla karşılaştır:

| İddia türü | Nasıl doğrulanır |
|---|---|
| Paket adı/versiyonu, bağımlılık var/yok | İlgili `package.json`/`requirements.txt`'i oku |
| Dosya/klasör var/yok | `Glob` ile kontrol et |
| Endpoint listesi | İlgili `urls.py` dosyalarını oku |
| Model alanları | İlgili `models.py` dosyalarını oku |
| Env değişkenleri/ayarlar | `settings.py`/`.env.example` oku |
| "X hâlâ açık" diye işaretli bir madde | İlgili dosya:satırı aç — bir önceki oturum düzeltmiş ama not düşmemiş olabilir |
| "Y turda kapatıldı" diye işaretli bir madde | Kodda gerçekten hâlâ öyle mi diye rastgele örnekleme yap |
| "Şablon kimliği hâlâ duruyor" gibi genel iddialar | İlgili dosyaları (README, package.json, index.html) tekrar oku, hâlâ doğru mu kontrol et |

### 4. Tutarsızlıkları sınıflandır ve düzelt

- **Drift** (kod değişmiş, doküman değişmemiş) — en yaygın ve en riskli tür. Bul, düzelt, ne zaman fark edildiğini not düş.
- **Duplikasyon** (aynı gerçek birden fazla yerde, biri güncel biri değil) — kök `CLAUDE.md`'nin kalıcı kuralında tarif edilen senaryonun ta kendisi. Tek kaynağa indir, diğerinden link ver.
- **Yanlış kapatılmış/açık işaretli maddeler** — durumunu düzelt, doğru listeye taşı.
- **Önem derecesi artık yanlış** (örn. önceden yüksek risk, ama kod başka bir yerde zaten önlem almış hale gelmiş) — güncelle.
- **Hiç dokümante edilmemiş önemli değişiklik** (git log'da var, hiçbir `claude.md`'de yok) — yeni bir tur girdisi olarak ekle.

### 5. Meta-kurallara uy

Bu denetim de kök `CLAUDE.md`'nin "📌 Kalıcı Kural"ına tabi bir çalışma sayılır — önem derecesi ölçeği (🔴/🟠/🟡/🟢), "Geliştirme Fikirleri" yaşam döngüsü, changelog şişmeyi önleme (son 3 tur) kuralı burada da geçerli. **Bu dosya o kuralları kopyalamaz** — kök dosyadaki hâliyle uygula, oradan okuyup buraya getirme, çünkü iki kopya olursa tam da önlemeye çalıştığımız drift'i burada yaratırız.

### 6. Bulguları uygula

- Kesin/belirsizlik taşımayan drift'leri **hemen düzelt**.
- Kullanıcı kararı gerektiren durumları (örn. "bu bulunan bug önemli mi, düzeltilsin mi") **düzeltme, sadece önem derecesiyle not düş**.
- Kök `CLAUDE.md`'ye yeni bir "🔧 Son Değişiklikler" girdisi ekle: **"🔍 Doküman Tutarlılık Denetimi (tarih)"** başlığıyla — bulunan/düzeltilen her şeyi özetle. Bu girdi de "son 3 tur" kuralına tabi (4. sıraya düşen bir önceki tur arşivlenir).

### 7. Kullanıcıya özet rapor ver

Konuşma sonunda kısa, net bir özet: kaç tutarsızlık bulundu, kaçı doğrudan düzeltildi, kaçı sadece not düşüldü (ve neden kullanıcı kararı gerektiriyor), en öncelikli açık madde ne.

## Kontrol listesi (hızlı referans)

- [ ] Kök + backend/client/expert `CLAUDE.md`'lerin tamamı okundu
- [ ] `ToDo.md`/`CHANGELOG.md`/README'ler tarandı
- [ ] `git log` ile son değişiklikler dokümanlardaki "son güncelleme" tarihleriyle karşılaştırıldı
- [ ] En az paket adları/versiyonlar, dosya ağacı, endpoint listesi, "açık/kapalı" madde durumları örneklem bazlı doğrulandı
- [ ] Bulunan her tutarsızlık: ya düzeltildi ya da önem derecesiyle not düşüldü (ikisi arası yok)
- [ ] Kök `CLAUDE.md`'ye yeni bir denetim turu girdisi eklendi, "son 3 tur" kuralı uygulandı
- [ ] Kullanıcıya özet rapor verildi
