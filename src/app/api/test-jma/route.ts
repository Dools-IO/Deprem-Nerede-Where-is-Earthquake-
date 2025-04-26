import { fetchJMAEarthquakes } from "@/lib/scrapers/jma";
import { NextResponse } from "next/server";

/**
 * JMA (Japan Meteorological Agency) API verilerini test etmek için endpoint
 */
export async function GET() {
  try {
    const earthquakes = await fetchJMAEarthquakes();
    
    return NextResponse.json({
      success: true,
      count: earthquakes.length,
      data: earthquakes
    });
  } catch (error) {
    console.error("JMA test hatası:", error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : "Bilinmeyen hata"
      },
      { status: 500 }
    );
  }
} 