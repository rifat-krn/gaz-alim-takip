# Gaz Alım Takip ve İstasyon Sayaç Yönetim Sistemi

Aksa RMS-A (`gazolcumkontrol.aksa.com.tr`) entegrasyonuna sahip; gaz günü bazlı tüketim, enerji, üst ısıl değer (Ho), ikame GC verisi tespiti ve kromatografi analiz verilerini canlı olarak sorgulayan, operatör PDF raporlarını otomatik indiren, yan yana karşılaştırmalı onay/red ekranı ve otomatik e-posta bildirimleri sunan full-stack web uygulaması.

---

## 🛠️ Teknoloji Yığını (Tech Stack)

### Frontend
- **React 19** (`^19.2.8`) — Bileşen tabanlı modern kullanıcı arayüzü
- **Vite 8** (`^8.3.0`) — Hızlı geliştirme sunucusu ve üretim derleyicisi (`@vitejs/plugin-react`)
- **Tailwind CSS v4** (`^4.3.3` & `@tailwindcss/vite`) — Utility-first modern CSS altyapısı
- **Tremor Design System Pattern** — Analitik KPI kartları, ilerleme çubukları (ProgressBar), tüketim dağılım grafikleri (BarList), segmente sekmeler ve mobil uyumlu (responsive) kart görünümleri
- **Lucide React** (`^1.49.0`) — Modern vektörel ikon seti
- **Axios** (`^1.20.0`) — JWT interceptor destekli HTTP istemcisi
- **SheetJS / XLSX** (`^0.18.5`) — Gaz okumalarını ve GC kaynak bilgilerini `.xlsx` formatında dışa aktarma
- **Oxlint** (`^1.81.0`) — Hızlı JavaScript/JSX kod denetleyicisi

### Backend
- **Node.js 20 (Alpine)** & **Express.js** (`^4.21.2`) — RESTful API sunucusu
- **MongoDB & Mongoose 8** (`^8.9.2`) — NoSQL veritabanı ve şema modelleme (`Station`, `GasReading`, `User`, `NotificationSetting`)
- **JSON Web Token (`jsonwebtoken`) & `bcryptjs`** — Rol tabanlı (`admin` / `station`) kimlik doğrulama ve yetkilendirme
- **Axios** (`^1.7.9`) — Aksa RMS-A (`rmsa_data_entrance.ajax.php`) canlı veri çekme ve uzak PDF operatör raporlarını otomatik indirme
- **Multer** (`^1.4.5-lts.1`) — Dosya yükleme ve `uploads/<istasyonadi>-<yil>-<ay>/` klasörleme standardı
- **Nodemailer 10** (`^10.2.1`) — Kurumsal SMTP üzerinden istasyon bazlı ve genel **TO / CC** alıcılarına HTML rapor ve test e-postası gönderimi
- **node-cron 4** (`^4.6.0`) — `Europe/Istanbul` saat diliminde günde 1 kez çalışan otomatik rapor onay kontrolü ve e-posta zamanlayıcısı

### Dağıtım & Altyapı (DevOps)
- **Docker & Docker Compose** — Çoklu konteyner orkestrasyonu (`gaz_alim_frontend`, `gaz_alim_backend`, `gaz_alim_mongodb`)
- **Nginx (Alpine)** — Frontend statik dosya sunumu ve `/api` / `/uploads` reverse proxy yapılandırması

---

## 🚀 Temel Özellikler

1. **Aksa RMS-A Canlı Veri ve Otomatik PDF Rapor Entegrasyonu**:
   - İstasyon kullanıcı adı (`u`) ve şifre (`p`) bilgileri ile Aksa RMS-A sisteminden 24 saatlik Gaz Günü (`08:00 -> 08:00`) verileri canlı olarak çekilir.
   - Yanıtta yer alan operatör PDF raporu (`files`) otomatik olarak indirilir ve `uploads/<istasyonadi>-<yil>-<ay>/<istasyonadi>-<yil>-<ay>-<gun>.pdf` formatında kaydedilir. Rapor yoksa manuel PDF/belge yükleme desteklenir.

2. **İkame Isıl Değer (GC) Tespiti**:
   - İstasyonun kendi Gaz Kromatograf (GC) cihazı verisini mi (`fld_SHVSelection: 1` / `fld_OperatorSHVSelection: 1`) yoksa başka bir istasyonun ikame ısıl değerini mi (`fld_SHVSelection: 0` / `fld_GCOrganizationId > 0`) kullandığı otomatik tespit edilir.
   - Ana sayfada ve detay sayfasında **`✓ Kendi GC Verisi`** veya **`⚠️ İkame Veri / İkame Isıl Değer`** rozetleriyle işaretlenir ve tek tıkla filtrelenebilir.

3. **Tam Sayfa Yan Yana Doğrulama & Onay Ekranı**:
   - İstasyon seçildiğinde modal yerine tam sayfa doğrulama ekranı açılır:
     - **Sol Panel**: Ölçüm değerleri (`5 - Düzeltilmiş Tüketim`, `6 - Toplam Enerji`, `7 - Üst Isıl Değer (Ho)`, Basınç, Sıcaklık, Özgül Ağırlık), Gaz Bileşimi (C1–C6+, N2, CO2), kopyalanabilir Ham JSON verisi ve Onay/Red karar formu.
     - **Sağ Panel**: Geniş PDF görüntüleyici ve belge yönetim alanı.

4. **Günlük Otomatik Onay Kontrolü & Gelişmiş E-Posta Yönetimi (TO / CC)**:
   - **İstasyon Özelinde Mail Alıcıları**: Her istasyon/kullanıcı için ayrı ayrı birden çok **TO** ve **CC** e-posta adresi tanımlanabilir ve satır bazlı **Test Gönder** butonu ile test edilebilir.
   - **Genel Mail Ayarları (Genel TO & Genel CC)**: Tüm istasyonların günlük onay durum özetini alacak genel **TO** ve **CC** adresleri ile SMTP sunucu ayarları yönetilebilir ve **Genel Test Maili Gönder** butonu ile anlık test yapılabilir.
   - Gönderim sonucunda gerçek zamanlı **E-Posta Gönderimi Başarılı** / **E-Posta Gönderimi Başarısız** bildirimleri gösterilir.

5. **Geçmiş & Arşiv**:
   - Tarih aralığı, istasyon ve onay durumuna göre geçmiş gaz günü okumalarını sorgulama, Excel'e aktarma ve inceleme.

---

## 🐳 Docker ile Kurulum ve Çalıştırma

Projeyi Docker Compose ile derleyip başlatmak için ana dizinde aşağıdaki komutu çalıştırın:

```bash
docker compose up -d --build
```

Konteynerler başlatıldığında:
- **Frontend Web Arayüzü**: `http://localhost:3000`
- **Backend API**: `http://localhost:5000`
- **MongoDB**: `localhost:27017`

### Varsayılan Yönetici Giriş Bilgileri
- **Kullanıcı Adı**: `admin`
- **Şifre**: `admin123`
*(İstasyon yetkilileri kendi istasyon kodları ve şifreleriyle giriş yapabilir.)*

---

## 💻 Yerel Geliştirme (Local Development)

### 1. Backend
```bash
cd backend
npm install
npm run dev
```

### 2. Frontend
```bash
cd frontend
npm install
npm run dev
```
