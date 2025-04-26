import { NextResponse } from 'next/server';

async function fetchFromEndpoint(endpoint: string) {
  try {
    const response = await fetch(`http://localhost:3000/api/v1/${endpoint}`);
    const data = await response.json();
    return data.success ? data.data : [];
  } catch (error) {
    console.error(`${endpoint} verileri alınırken hata:`, error);
    return [];
  }
}

export async function GET() {
  try {
    // Tüm kaynaklardan veri çek
    const [
      usgsData,
      koeriData,
      emscData,
      ingvData,
      ssnData,
      geonetData,
      gaData,
      fdsnwsData,
      jmaData,
      esmData,
      irisData
    ] = await Promise.all([
      fetchFromEndpoint('usgs'),
      fetchFromEndpoint('koeri'),
      fetchFromEndpoint('emsc'),
      fetchFromEndpoint('ingv'),
      fetchFromEndpoint('ssn'),
      fetchFromEndpoint('geonet'),
      fetchFromEndpoint('ga'),
      fetchFromEndpoint('fdsnws'),
      fetchFromEndpoint('jma'),
      fetchFromEndpoint('esm'),
      fetchFromEndpoint('iris')
    ]);

    // Tüm verileri birleştir
    const allEarthquakes = [
      ...usgsData,
      ...koeriData,
      ...emscData,
      ...ingvData,
      ...ssnData,
      ...geonetData,
      ...gaData,
      ...fdsnwsData,
      ...jmaData,
      ...esmData,
      ...irisData
    ];

    // Tekrar eden kayıtları temizle (aynı zaman ve koordinata sahip olanlar)
    const uniqueEarthquakes = Array.from(
      new Map(
        allEarthquakes.map(eq => [
          `${eq.time}-${eq.latitude}-${eq.longitude}-${eq.magnitude}`,
          eq
        ])
      ).values()
    );

    // Depremleri zamana göre sırala (en yeni en üstte)
    const sortedEarthquakes = uniqueEarthquakes.sort(
      (a, b) => new Date(b.time).getTime() - new Date(a.time).getTime()
    );

    return NextResponse.json({
      success: true,
      data: sortedEarthquakes
    });
  } catch (error) {
    console.error('Deprem verileri birleştirilirken hata oluştu:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Deprem verileri birleştirilirken bir hata oluştu'
      },
      { status: 500 }
    );
  }
} 