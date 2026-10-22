# Vestel Smart TV Kumanda — iOS / Mobil (React Native & Expo)

Mevcut masaüstü (PyQt5) Vestel Smart TV uzaktan kumanda uygulamasının **iPhone / iPad (iOS)** ve Android için geliştirilmiş, **bilgisayardan tamamen bağımsız** yerel Wi-Fi üzerinden çalışan mobil sürümüdür.

## Öne Çıkan Özellikler

- **Doğrudan Wi-Fi Kontrolü (Bilgisayar Gerekmez):** iPhone'dan doğrudan Vestel Smart TV'nin yerel ağ arayüzüne (`56791/56792` ve yeni nesil `56789/56790` port profilleri) HTTP/XML komutları gönderir.
- **Otomatik TV Bulucu (Wi-Fi Tarayıcı):** Ev ağınızdaki açık Vestel Smart TV'leri tek dokunuşla tarayıp model adıyla (`dd.xml`) otomatik bulur; ayrıca birden fazla TV (Salon TV, Yatak Odası TV vb.) kaydedilebilir.
- **Tam Kumanda Tuş Desteği:**
  - Güç, Kaynak (`Source`), Sessiz (`Mute`), `Q.Menu`, Ana Menü, Geri, Bilgi, Çıkış
  - **D-Pad veya Dokunmatik Yüzey (Swipe Touchpad):** Tek dokunuşla tuşlu D-Pad ile kaydırmalı Touchpad arasında geçiş
  - Basılı tutarak seri ses/kanal/yön değiştirme (Press & Hold Repeat)
  - 0–9 sayısal tuş takımı, `3D`, Önceki Kanal (`Swap`)
  - **Doğrudan Kanala Git:** Çok haneli kanal numarasını (örn. `24`, `108`) sırayla gönderip `OK` basar
  - **Favori Kanallar:** Tek dokunuşla favori kanallara geçiş + yeni favori ekleme/silme
  - **Toplu Ses Değiştirici:** Tek tuşla `-10`, `-5`, `+5`, `+10` veya özel adım sayısı kadar ses artırma/azaltma
  - **Medya & Kayıt:** Geri Sar, Oynat, Duraklat, İleri Sar, Kayıt (`REC`), Durdur, Medya Tarayıcı
  - **TV Fonksiyonları & Uygulamalar:** Kırmızı/Sarı/Mavi/Yeşil tuşlar, Altyazı, Dil, EPG Rehber, Teletext, Tarayıcı, **Netflix** ve **YouTube**
- **iOS Dokunsal Titreşim (Haptic Feedback):** Tuş basımlarında iPhone Taptic Engine geri bildirimi.

---

## iPhone'da Bilgisayardan Bağımsız Çalıştırma Yöntemleri

Uygulamayı kurduktan sonra **bilgisayarınızın açık kalmasına gerek yoktur**. Size en uygun yöntemi seçebilirsiniz:

### Yöntem 1: Ücretsiz & En Hızlı Kurulum — Expo Go + EAS Bulut Yayınlama (Mac Gerekmez)

Normal `expo start` geliştirme sunucusunun aksine, projeyi **bir kez** ücretsiz Expo hesabınıza yüklediğinizde uygulama telefonunuzdaki **Expo Go** içine kaydedilir ve **bilgisayar kapalıyken bile her zaman çalışır**:

1. iPhone'unuza App Store'dan **Expo Go** uygulamasını indirin.
2. [expo.dev](https://expo.dev) üzerinden ücretsiz bir hesap açın ve iPhone'daki Expo Go uygulamasında bu hesapla giriş yapın.
3. Bilgisayarınızda (Windows, Linux veya Mac) bir kez şu komutları çalıştırın:
   ```bash
   cd mobile
   npm install
   npx eas-cli@latest login
   npx eas-cli@latest update:configure
   npm run publish:cloud
   ```
4. Yayınlama tamamlandığında iPhone'unuzda **Expo Go** uygulamasını açın; **"Projects"** listesinde **Vestel TV Kumanda** kalıcı olarak görünecektir.
5. Artık bilgisayarınızı tamamen kapatabilirsiniz. İstediğiniz zaman Expo Go içinden kumandayı açıp TV'nizi kontrol edebilirsiniz.

---

### Yöntem 2: Ana Ekranda Kendi İkonuyla Bağımsız `.ipa` Kurulumu (GitHub Actions + Sideloadly / SideStore)

Mac bilgisayarınız veya ücretli Apple Developer hesabınız olmasa bile, depodaki hazır **GitHub Actions** iş akışı sayesinde `.ipa` dosyasını bulutta ücretsiz derleyip iPhone ana ekranınıza kurabilirsiniz:

1. Bu repoyu GitHub'a gönderin ve GitHub sayfasında **Actions → Build iOS IPA (Standalone) → Run workflow** butonuna tıklayın.
2. Derleme tamamlandığında (~5-8 dk) oluşan **`VestelTVKumanda-iOS-IPA`** dosyasını indirin ve zipten çıkararak `VestelTVKumanda-iOS.ipa` dosyasını alın.
3. Bilgisayarınıza [Sideloadly](https://sideloadly.io/) veya [AltStore / SideStore](https://sideloadly.io/) kurun, iPhone'unuzu bağlayın ve ücretsiz Apple ID'niz ile `.ipa` dosyasını telefonunuza yükleyin.
4. İlk açılış öncesi iPhone'da **Ayarlar → Genel → VPN ve Aygıt Yönetimi** altından geliştirici profiline güvenin (Developer Mode gerekiyorsa **Ayarlar → Gizlilik ve Güvenlik → Geliştirici Modu** açın).

---

### Yöntem 3: Mac (Xcode) veya EAS Build (Apple Developer Hesabı Varsa)

- **Mac + Xcode ile doğrudan iPhone'a kurulum:**
  ```bash
  cd mobile
  npm install
  npx expo run:ios --device
  ```
- **EAS Build ile bulutta imzalı iOS derlemesi:**
  ```bash
  cd mobile
  npx eas-cli@latest build --platform ios --profile preview
  ```

---

### Hızlı Yerel Test (Geliştirme Modu)

Aynı Wi-Fi ağındayken anında QR kod ile denemek için:
```bash
cd mobile
npm install
npx expo start
```
Ekranda çıkan QR kodu iPhone Kamera uygulamasıyla okuttuğunuzda doğrudan **Expo Go** üzerinde açılır.

---

## iOS Bağlantı Kontrol Listesi (Önemli)

1. **Aynı Wi-Fi Ağı:** iPhone ve Vestel Smart TV aynı ev Wi-Fi ağında olmalıdır.
2. **iOS Yerel Ağ İzni:** İlk bağlantıda iOS *"Yerel ağınızdaki aygıtları bulmak ve onlara bağlanmak istiyor"* uyarısı gösterdiğinde **İzin Ver** seçeneğine dokunun. (Sonradan kontrol etmek için: **iPhone Ayarlar → Gizlilik ve Güvenlik → Yerel Ağ → Expo Go / Vestel TV Kumanda** açık olmalıdır.)
3. **Vestel TV Ayarı:** TV'nizin kendi menüsünde **Menü → Ayarlar → Ağ / İnternet Ayarları → Sanal Kumanda (Virtual Remote)** seçeneğinin **Etkin (Açık)** olduğundan emin olun.
