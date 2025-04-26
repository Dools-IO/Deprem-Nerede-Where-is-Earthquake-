'use client';

import { useState } from 'react';

export default function ApiTestPage() {
  const [results, setResults] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  
  const apiEndpoints = [
    { name: 'ESM', url: '/api/test-esm' },
    { name: 'JMA', url: '/api/test-jma' },
  ];
  
  // ESM's direct API URLs to test
  const directApiUrls = [
    {
      name: 'ESM Direct API (JSON)',
      url: 'https://esm-db.eu/fdsnws/event/1/query?starttime=2023-01-01T00:00:00&endtime=2023-12-31T23:59:59&minmagnitude=5&includeallmagnitudes=True&format=json'
    },
    {
      name: 'ESM Alt API (ORFEUS)',
      url: 'https://www.orfeus-eu.org/fdsnws/event/1/query?starttime=2023-01-01T00:00:00&endtime=2023-12-31T23:59:59&minmagnitude=5&includeallmagnitudes=True&format=json'
    },
    {
      name: 'JMA Direct API',
      url: 'https://www.jma.go.jp/bosai/quake/data/list.json'
    }
  ];
  
  const testEndpoint = async (url: string) => {
    setLoading(true);
    setResults(`Testing ${url}...\n`);
    
    try {
      const response = await fetch(url);
      const data = await response.json();
      
      setResults(prev => `${prev}\nStatus: ${response.status}\nData: ${JSON.stringify(data, null, 2)}\n`);
    } catch (error) {
      setResults(prev => `${prev}\nError: ${error instanceof Error ? error.message : String(error)}\n`);
    } finally {
      setLoading(false);
    }
  };
  
  const testDirectApi = async (url: string) => {
    setLoading(true);
    setResults(`Testing direct API: ${url}...\n`);
    
    try {
      const response = await fetch(url, {
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'Deprem-Nerede-Browser-Test/1.0'
        }
      });
      
      let result;
      try {
        result = await response.json();
      } catch (e) {
        // If JSON parsing fails, get text
        result = await response.text();
      }
      
      setResults(prev => `${prev}\nStatus: ${response.status}\nContent Type: ${response.headers.get('content-type')}\nData: ${typeof result === 'string' ? result.substring(0, 500) + '...' : JSON.stringify(result, null, 2).substring(0, 500) + '...'}\n`);
    } catch (error) {
      setResults(prev => `${prev}\nError: ${error instanceof Error ? error.message : String(error)}\n`);
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">API Test Sayfası</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Backend API Endpoint'leri</h2>
        <div className="flex flex-wrap gap-2">
          {apiEndpoints.map((endpoint) => (
            <button
              key={endpoint.name}
              onClick={() => testEndpoint(endpoint.url)}
              disabled={loading}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              Test {endpoint.name}
            </button>
          ))}
        </div>
      </div>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-2">Doğrudan API URL'leri (Browser CORS Test)</h2>
        <div className="flex flex-wrap gap-2">
          {directApiUrls.map((api) => (
            <button
              key={api.name}
              onClick={() => testDirectApi(api.url)}
              disabled={loading}
              className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:bg-gray-400"
            >
              Test {api.name}
            </button>
          ))}
        </div>
        <p className="mt-2 text-sm text-gray-600">
          Not: Direkt API çağrıları tarayıcıda CORS hatalarına neden olabilir. 
          Bu normaldir ve backend'den çağrı yapılırken farklı davranabilir.
        </p>
      </div>
      
      <div className="mt-4">
        <h2 className="text-xl font-semibold mb-2">Sonuçlar</h2>
        {loading && <div className="animate-pulse">Yükleniyor...</div>}
        <pre className="bg-gray-100 p-4 rounded overflow-auto max-h-96 whitespace-pre-wrap">
          {results || 'Henüz sonuç yok. Bir API testi yapın.'}
        </pre>
      </div>
    </div>
  );
} 