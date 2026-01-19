// Vercel Serverless Function to proxy Google Places API requests
// This avoids CORS issues since the request is made server-side

const PLACES_API_URL = 'https://maps.googleapis.com/maps/api/place';

// Using inline types to avoid @vercel/node dependency
interface VercelRequest {
  method?: string;
  query: Record<string, string | string[] | undefined>;
}

interface VercelResponse {
  status: (code: number) => VercelResponse;
  json: (data: unknown) => void;
  setHeader: (name: string, value: string) => void;
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // Only allow GET requests
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { query, location, radius = '5000' } = req.query;

  // Validate required parameters
  if (!query || typeof query !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid query parameter' });
  }

  if (!location || typeof location !== 'string') {
    return res.status(400).json({ error: 'Missing or invalid location parameter' });
  }

  // Get API key from server-side environment
  const apiKey = process.env.VITE_GOOGLE_PLACES_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
  
  if (!apiKey) {
    console.error('[API] Google Places API key not configured');
    return res.status(500).json({ 
      error: 'Server configuration error',
      status: 'CONFIG_ERROR'
    });
  }

  // Build Google Places API URL
  const url = new URL(`${PLACES_API_URL}/textsearch/json`);
  url.searchParams.append('query', query);
  url.searchParams.append('location', location);
  url.searchParams.append('radius', typeof radius === 'string' ? radius : '5000');
  url.searchParams.append('key', apiKey);
  url.searchParams.append('region', 'uk');

  console.log('[API] Proxying Places request for query:', query);

  try {
    const response = await fetch(url.toString());
    const data = await response.json();

    console.log('[API] Google Places response status:', data.status);

    // Set CORS headers for the response
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET');
    res.setHeader('Cache-Control', 's-maxage=300, stale-while-revalidate'); // Cache for 5 minutes

    // Return the Google Places API response as-is
    return res.status(200).json(data);

  } catch (error) {
    console.error('[API] Error fetching from Google Places:', error);
    return res.status(500).json({
      error: 'Failed to fetch places',
      status: 'FETCH_ERROR'
    });
  }
}
