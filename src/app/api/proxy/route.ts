import { NextRequest, NextResponse } from 'next/server';
import axios, { AxiosError } from 'axios';
import https from 'https';

// Rate limiting için basit bir Map
const requestCounts = new Map<string, { count: number; timestamp: number }>();
const RATE_LIMIT = 10; // 30 saniyede maksimum istek sayısı
const RATE_LIMIT_WINDOW = 30000; // 30 saniye

// Yeniden deneme yapılandırması
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // Exponential backoff: 1s, 2s, 4s

const axiosInstance = axios.create({
  timeout: 60000, // 60 saniye
  httpsAgent: new https.Agent({
    rejectUnauthorized: false
  }),
  headers: {
    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
    'Accept-Language': 'tr,en-US;q=0.7,en;q=0.3',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
    'Upgrade-Insecure-Requests': '1',
    'Cache-Control': 'max-age=0'
  }
});

// Beklemek için yardımcı fonksiyon
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Rate limit kontrolü
function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const userRequests = requestCounts.get(ip);

  if (!userRequests) {
    requestCounts.set(ip, { count: 1, timestamp: now });
    return true;
  }

  if (now - userRequests.timestamp > RATE_LIMIT_WINDOW) {
    requestCounts.set(ip, { count: 1, timestamp: now });
    return true;
  }

  if (userRequests.count >= RATE_LIMIT) {
    return false;
  }

  userRequests.count++;
  return true;
}

// Hata mesajlarını işleme
function handleError(error: unknown): { message: string; status: number } {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    if (axiosError.response) {
      return {
        message: `Hedef sunucu hatası: ${axiosError.response.status}`,
        status: axiosError.response.status
      };
    } else if (axiosError.request) {
      return {
        message: 'Hedef sunucuya ulaşılamadı',
        status: 503
      };
    }
  }
  return {
    message: 'Beklenmeyen bir hata oluştu',
    status: 500
  };
}

const ALLOWED_HEADERS = [
  'content-type',
  'content-length',
  'accept',
  'accept-language',
  'accept-encoding',
  'origin',
  'authorization',
  'x-requested-with'
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get('url');
    const format = searchParams.get('format') || 'html';

    if (!targetUrl) {
      return NextResponse.json({ error: 'URL parametresi gerekli' }, { status: 400 });
    }

    const response = await axios.get(targetUrl, {
      headers: {
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'tr-TR,tr;q=0.8,en-US;q=0.5,en;q=0.3',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      },
      responseType: format === 'json' ? 'json' : 'arraybuffer',
      timeout: 30000
    });

    // Response headers'ı filtrele ve güvenli olanları aktar
    const headers: Record<string, string> = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': ALLOWED_HEADERS.join(', ')
    };

    // Content type'ı belirle
    if (format === 'json') {
      headers['Content-Type'] = 'application/json';
      return NextResponse.json(response.data, { headers });
    } else {
      const decoder = new TextDecoder('windows-1254');
      const html = decoder.decode(response.data);
      headers['Content-Type'] = 'text/html; charset=windows-1254';
      return new NextResponse(html, { headers });
    }
  } catch (error) {
    console.error('Proxy hatası:', error);
    if (axios.isAxiosError(error)) {
      return NextResponse.json({ 
        error: 'Proxy hatası oluştu', 
        details: error.message,
        status: error.response?.status 
      }, { 
        status: error.response?.status || 500 
      });
    }
    return NextResponse.json({ error: 'Proxy hatası oluştu' }, { status: 500 });
  }
} 