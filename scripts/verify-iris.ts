import { fetchIRISEarthquakes } from '../lib/scrapers/iris';

async function testIRIS() {
  try {
    const earthquakes = await fetchIRISEarthquakes();
    
    if (earthquakes.length > 0) {
      earthquakes.slice(0, 5).forEach((eq, index) => {
        console.log(`${index + 1}: Yer: ${eq.location}, Büyüklük: ${eq.magnitude}, Derinlik: ${eq.depth}km, Zaman: ${eq.time.toISOString()}`);
      });
    }
  } catch (error) {
    console.error('IRIS API test hatası:', error);
  }
}

testIRIS(); 