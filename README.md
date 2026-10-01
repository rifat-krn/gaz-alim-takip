# Gaz Alım Takip ve İstasyon Sayaç Yönetim Sistemi

Aksa OYS (Otomatik Sayaç Okuma) entegrasyonuna sahip, gaz günü bazlı tüketim ve analiz verilerini toplayan, operatör kontrolü, dosya ekleme ve onay/red mekanizmaları sunan tam teşekküllü full-stack web uygulaması.

---

## 🚀 Temel Özellikler

1. **Aksa OYS Entegrasyonu**:
   - `istasyon_listesi.json` içerisindeki veya sistemde tanımlı istasyon kullanıcı adı (`u`) ve şifre (`p`) bilgileri ile OYS portalına otomatik giriş yapılır.
   - 24 saatlik Gaz Günü kuralı: Bir önceki günün **08:00**'ından bulunulan günün **08:00**'ına kadar olan aralık hesaplanır (`dt1`, `dt2`, `dt3`).

2. **Günlük Gaz Okumaları & Operasyon Tablosu**:
   - Tek tıkla tüm istasyonların verilerini sorgulama ("Tüm İstasyonları Çek").
   - İstasyon bazlı tekil veri yenileme.
   - Düzeltilmiş Tüketim (Sm³), Toplam Enerji (kWh), Basınç (Bar), Sıcaklık (°C), Üst Isıl Değer (Ho) ve Kromatografi gaz bileşimi (Metan, Etan, Propan, CO2 vb.) gösterimi.
   - Özet istatistik kartları (Toplam hacim, enerji, onaylanan/bekleyen/reddedilen sayısı).
   - Excel (`.xlsx`) formatında anlık rapor dışa aktarma.

3. **Belge & Dosya Yönetimi**:
   - Onay öncesinde saha tutanakları, sayaç fişleri veya fotoğraflar yüklenebilir.
   - Dosyalar `uploads/<istasyonadi>-<gazgunu>/` klasörleme yapısında düzenli olarak saklanır.
   - Yüklenen belgeleri indirme ve silme desteği.

4. **Kontrol & Onay / Red Akışı**:
   - Değerler kontrol edildikten sonra **Onayla** butonuna basıldığında son onay teyit diyaloğu açılır ve isteğe bağlı açıklama notu girilir.
   - Hatalı veya şüpheli değerler için zorunlu ret sebebi girilerek **Reddet** işlemi yapılır.
   - Tüm işlem adımları MongoDB `GasReading` modeline kaydedilir.

5. **Yönetim Panelleri (CRUD)**:
   - **İstasyon Yönetimi**: İstasyon ekleme, düzenleme, silme, OYS giriş testi ve `istasyon_listesi.json` dosyasından otomatik içe aktarma.
   - **Kullanıcı Yönetimi**: Yönetici (Admin) ve Operatör hesapları oluşturma, düzenleme ve şifre sıfırlama.

6. **Geçmiş & Arşiv**:
   - Tarih aralığı, istasyon ve onay durumuna göre gelişmiş arama ve geçmiş inceleme.

---

## 🛠️ Teknoloji Yığını

- **Backend**: Node.js, Express, MongoDB (Mongoose), JWT, Multer, Axios
- **Frontend**: React 18, React-Bootstrap, Bootstrap 5, Vite, Lucide React, XLSX
- **Dağıtım (Deployment)**: Docker & Docker Compose, Nginx

---

## 🐳 Docker ile Kurulum ve Çalıştırma

Docker kurulu bir ortamda projeyi ayağa kaldırmak için ana dizinde şu komutu çalıştırmanız yeterlidir:

```bash
docker-compose up --build
```

Konteynerler başlatıldığında:
- **Frontend Web Arayüzü**: `http://localhost:3000`
- **Backend API**: `http://localhost:5000`
- **MongoDB**: `localhost:27017`

### Varsayılan Giriş Bilgileri:
- **Kullanıcı Adı**: `admin`
- **Şifre**: `admin123`

---

## 💻 Yerel Geliştirme (Local Development)

### 1. Backend:
```bash
cd backend
npm install
npm run dev
```

### 2. Frontend:
```bash
cd frontend
npm install
npm run dev
```
Uygulama `http://localhost:3000` adresinde çalışacaktır.
