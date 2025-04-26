import { fetchESMEarthquakes } from "@/lib/scrapers/esm";
import { NextResponse } from "next/server";
import axios from "axios";

/**
 * ESM API verilerini test etmek için endpoint
 */
export async function GET() {
  try {
    // Önce doğrudan API'yi test edelim
    const testUrl = "https://esm-db.eu/fdsnws/event/1/query?starttime=2023-01-01T00:00:00&endtime=2023-12-31T23:59:59&minmagnitude=5&includeallmagnitudes=True&format=json";
    console.log("Doğrudan ESM API testi:", testUrl);
    
    try {
      const directResponse = await axios.get(testUrl, {
        timeout: 10000,
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Deprem-Nerede-Test/1.0'
        }
      });
      
      console.log("ESM API doğrudan yanıt durumu:", directResponse.status);
      console.log("ESM API doğrudan yanıt veri tipi:", typeof directResponse.data);
      
      if (directResponse.data) {
        if (Array.isArray(directResponse.data)) {
          console.log("ESM API dizi yanıtı uzunluğu:", directResponse.data.length);
          if (directResponse.data.length > 0) {
            console.log("ESM API ilk öğe örneği:", JSON.stringify(directResponse.data[0]).substring(0, 200) + '...');
          }
        } else {
          console.log("ESM API yanıtı dizi değil");
        }
      }
    } catch (error) {
      if (axios.isAxiosError(error)) {
        console.error("ESM API doğrudan erişim hatası:", error.message);
        if (error.response) {
          console.error("ESM API hata durumu:", error.response.status);
        }
      } else {
        console.error("ESM API bilinmeyen hata:", error);
      }
    }
    
    // Şimdi normal scraper üzerinden deneyelim
    const startTime = "2023-01-01T00:00:00";
    const endTime = "2023-12-31T23:59:59";
    const minMagnitude = 5; 
    
    const earthquakes = await fetchESMEarthquakes(startTime, endTime, minMagnitude);
    
    return NextResponse.json({
      success: true,
      count: earthquakes.length,
      data: earthquakes
    });
  } catch (error) {
    console.error("ESM test hatası:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Bilinmeyen hata"
      },
      { status: 500 }
    );
  }
} 