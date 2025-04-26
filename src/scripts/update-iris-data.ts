import { fetchIRISEarthquakes } from "../lib/scrapers/iris";
import { appendFile, readFile, writeFile } from "fs/promises";
import path from "path";

const DATA_PATH = path.join(process.cwd(), "data", "earthquakes.json");

async function updateIRISData() {
  console.log("IRIS kaynaklı deprem verilerini alıyor...");
  try {
    // IRIS kaynaklı deprem verilerini al
    const earthquakes = await fetchIRISEarthquakes();
    console.log(`${earthquakes.length} deprem verisi alındı.`);

    // Mevcut verileri oku
    let existingData = [];
    try {
      const rawData = await readFile(DATA_PATH, "utf-8");
      existingData = JSON.parse(rawData);
      console.log(`Mevcut veri dosyasından ${existingData.length} deprem kaydı okundu.`);
    } catch (error) {
      console.log("Mevcut veri dosyası bulunamadı, yeni dosya oluşturulacak.");
    }

    // Yeni deprem kayıtlarını tanımla
    const existingIds = new Set(existingData.map((eq: any) => eq.id));
    const newEarthquakes = earthquakes.filter((eq) => !existingIds.has(eq.id));
    
    if (newEarthquakes.length === 0) {
      console.log("Yeni deprem kaydı bulunamadı.");
      return;
    }
    
    console.log(`${newEarthquakes.length} yeni deprem kaydı eklenecek.`);

    // Tüm verileri birleştir ve son 500 kaydı sakla
    const allEarthquakes = [...newEarthquakes, ...existingData]
      .sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime())
      .slice(0, 500);

    // Dosyaya kaydet
    await writeFile(DATA_PATH, JSON.stringify(allEarthquakes, null, 2), "utf-8");
    console.log(`Veriler başarıyla güncellendi. Toplam ${allEarthquakes.length} deprem kaydı kaydedildi.`);
  } catch (error) {
    console.error("Veri güncelleme sırasında hata oluştu:", error);
  }
}

// Scripti çalıştır
updateIRISData()
  .then(() => console.log("İşlem tamamlandı."))
  .catch((error) => console.error("Hata:", error)); 