import { Place, Coordinates } from './types';

export const HOTEL_COORDINATES: Coordinates = {
  lat: 55.8606,
  lng: -4.2520, // Native Glasgow
};

export const DEFAULT_BIO = "I love small artisan shops, finding unique vintage pieces, cozy coffee shops, and light lunches. I prefer hidden gems over tourist traps.";

// Helper to get curated images
const getImages = (keyword: string, count: number = 3) => {
  return Array.from({ length: count }).map((_, i) => 
    `https://images.unsplash.com/photo-${getPhotoId(keyword, i)}?auto=format&fit=crop&w=800&q=80`
  );
};

// Map keywords to specific Unsplash IDs for a better "Real" feel
const getPhotoId = (key: string, index: number) => {
  const map: Record<string, string[]> = {
    pizza: ['1574071318508-1cdbab80d002', '1595854341650-150651a232b5', '1513104890138-7c749659a591'],
    burger: ['1568901346375-23c9450c58cd', '1594212699903-ec8a3eca50f5', '1550547660-d949527245ac'],
    pho: ['1582878826629-29b7ad1cdc28', '1503764654157-72d979d9e6f5', '1631705663148-9a3d441c97a7'],
    pasta: ['1626844131082-256783844137', '1563379116110-1e50523e3295', '1608219992752-ab7927249eab'],
    brunch: ['1533089862017-dec9d3e66ce7', '1504754524776-0f4f3b25e7c7', '1520072959219-c595dc3f3a26'],
    coffee: ['1497935586351-b67a49e012bf', '1495474472287-4d71bcdd2085', '1509042239860-f550ce710b93'],
    cafe: ['1554118811-1e0d58224f24', '1559925393-48074b3611fa', '1501339847302-ac426a4a7cbb'],
    shop: ['1441986300917-64674bd600d8', '1472851294608-415522f96319', '1556228453-efd6c1ff04f6'],
    boutique: ['1567401893414-76b7b1e5a7a5', '1441984904996-e0b6ba687e04', '1537832816519-689ad163238b'],
    art: ['1545989253-02cc26577f88', '1518998053901-53069783323b', '1577720580479-7d839d829c73'],
    building: ['1486718448742-166226480961', '1514565131-fce0801e5785', '1479839672679-a472b80d891d'],
    park: ['1519331379826-302206b802e7', '1498958536643-42002 ca74603', '1500530858697-b50c19200eff'],
    university: ['1541339907-76d359097075', '1592280771199-5975681d6d8d', '1625624797672-04e284093952'],
    lane: ['1513635269975-5966ef6c90df', '1477959858617-67f85cf4f1df', '1596122650800-47401a58e235']
  };
  return map[key]?.[index] || map['building'][0];
};

export const PLACES: Place[] = [
  // --- FOOD ---
  {
    id: 'f1',
    name: 'Paesano Pizza',
    category: 'Food',
    description: 'Authentic Neapolitan pizza. Top rated in Glasgow.',
    address: '94 Miller St, Glasgow',
    coordinates: { lat: 55.8590, lng: -4.2510 },
    priority: true,
    isOpen: true,
    images: getImages('pizza')
  },
  {
    id: 'f2',
    name: 'Fat Hippo',
    category: 'Food',
    description: 'Messy, delicious burgers.',
    address: '86 St Vincent St, Glasgow',
    coordinates: { lat: 55.8610, lng: -4.2540 },
    priority: false,
    isOpen: true,
    images: getImages('burger')
  },
  {
    id: 'f3',
    name: 'Pho Glasgow',
    category: 'Food',
    description: 'Healthy Vietnamese street food.',
    address: '65 Renfield St, Glasgow',
    coordinates: { lat: 55.8625, lng: -4.2560 },
    priority: false,
    isOpen: true,
    images: getImages('pho')
  },
  {
    id: 'f4',
    name: 'Sugo Pasta',
    category: 'Food',
    description: 'Fresh pasta made daily. From the team behind Paesano.',
    address: '70 Mitchell St, Glasgow',
    coordinates: { lat: 55.8585, lng: -4.2555 },
    priority: false,
    isOpen: true,
    images: getImages('pasta')
  },
  {
    id: 'f5',
    name: 'Wilson Street Pantry',
    category: 'Food',
    description: 'Famous for Eggs Benedict and brunch.',
    address: '6 Wilson St, Glasgow',
    coordinates: { lat: 55.8580, lng: -4.2480 },
    priority: true,
    isOpen: true,
    images: getImages('brunch')
  },
  {
    id: 'f6',
    name: 'Cafe Wander',
    category: 'Food',
    description: 'Straight forward breakfast option.',
    address: '110 W George St, Glasgow',
    coordinates: { lat: 55.8623, lng: -4.2558 },
    priority: false,
    isOpen: true,
    images: getImages('brunch')
  },
  {
    id: 'f7',
    name: "The Devil's Roast",
    category: 'Food',
    description: 'Great cafe and deli options.',
    address: 'West End / Finnieston, Glasgow',
    coordinates: { lat: 55.8655, lng: -4.2700 }, // Approx placement for West End vibe
    priority: false,
    isOpen: true,
    images: getImages('cafe')
  },

  // --- COFFEE ---
  {
    id: 'c1',
    name: 'Laboratorio Espresso',
    category: 'Coffee',
    description: 'Minimalist espresso bar with breakfast pastries.',
    address: '93 W Nile St, Glasgow',
    coordinates: { lat: 55.8620, lng: -4.2530 },
    priority: true,
    isOpen: true,
    images: getImages('coffee')
  },
  {
    id: 'c2',
    name: 'Piece',
    category: 'Coffee',
    description: 'Gourmet sandwiches and strong coffee.',
    address: '100 Miller St, Glasgow', // City Centre location (3 min walk)
    coordinates: { lat: 55.8592, lng: -4.2512 },
    priority: false,
    isOpen: true,
    images: getImages('cafe')
  },
  {
    id: 'c3',
    name: 'Tempus Cafe',
    category: 'Coffee',
    description: 'Unique grab-and-go coffee in a police booth.',
    address: '64 Wilson St, Glasgow',
    coordinates: { lat: 55.8583, lng: -4.2486 },
    priority: true,
    isOpen: false,
    images: ['1509042239860-f550ce710b93', '1497935586351-b67a49e012bf'].map(id => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=800&q=80`)
  },
  {
    id: 'c4',
    name: 'Riverhill Coffee',
    category: 'Coffee',
    description: 'Quality coffee and baked goods.',
    address: '24 Gordon St, Glasgow',
    coordinates: { lat: 55.8605, lng: -4.2550 },
    priority: false,
    isOpen: true,
    images: getImages('coffee')
  },
  {
    id: 'c5',
    name: 'Outlier Coffee',
    category: 'Coffee',
    description: 'Great coffee, close to Modern Love Store.',
    address: '38 London Rd, Glasgow',
    coordinates: { lat: 55.8562, lng: -4.2435 },
    priority: true,
    isOpen: true,
    images: getImages('coffee')
  },
  {
    id: 'c6',
    name: 'Spitfire Espresso',
    category: 'Coffee',
    description: 'Great coffee spot with good breakfast options.',
    address: '127 Candleriggs, Glasgow',
    coordinates: { lat: 55.8575, lng: -4.2460 },
    priority: false,
    isOpen: true,
    images: getImages('cafe')
  },

  // --- SHOPPING ---
  {
    id: 's1',
    name: 'Knock Nook',
    category: 'Shopping',
    description: 'Curated gifts and homeware.',
    address: 'Southside, Glasgow',
    coordinates: { lat: 55.8300, lng: -4.2700 }, // Approx Southside
    priority: false,
    isOpen: true,
    images: getImages('shop')
  },
  {
    id: 's2',
    name: 'This Must Be The Place',
    category: 'Shopping',
    description: 'Unique prints and gifts.',
    address: 'Glasgow', // Usually West End/Finnieston area
    coordinates: { lat: 55.8660, lng: -4.2800 },
    priority: false,
    isOpen: true,
    images: getImages('art')
  },
  {
    id: 's3',
    name: 'Elkins',
    category: 'Shopping',
    description: 'Clothing and lifestyle.',
    address: 'Glasgow',
    coordinates: { lat: 55.8700, lng: -4.2900 },
    priority: false,
    isOpen: true,
    images: getImages('boutique')
  },
  {
    id: 's4',
    name: 'Papyrus',
    category: 'Shopping',
    description: 'Beautiful stationery and gifts.',
    address: '374 Byres Rd, Glasgow',
    coordinates: { lat: 55.8735, lng: -4.2950 },
    priority: false,
    isOpen: true,
    images: getImages('shop')
  },
  {
    id: 's5',
    name: 'Modern Love Store',
    category: 'Shopping',
    description: 'Design-led lifestyle store.',
    address: 'Trongate, Glasgow',
    coordinates: { lat: 55.8560, lng: -4.2450 },
    priority: false,
    isOpen: true,
    images: getImages('boutique')
  },
  {
    id: 's6',
    name: 'Paper Plane',
    category: 'Shopping',
    description: 'Cards, gifts, and prints.',
    address: 'Shawlands, Glasgow',
    coordinates: { lat: 55.8310, lng: -4.2750 },
    priority: false,
    isOpen: true,
    images: getImages('shop')
  },
  {
    id: 's7',
    name: 'Ajouter',
    category: 'Shopping',
    description: 'Lifestyle and interiors.',
    address: 'Queen Margaret Drive, Glasgow',
    coordinates: { lat: 55.8780, lng: -4.2850 },
    priority: false,
    isOpen: true,
    images: getImages('shop')
  },

  // --- SITES ---
  {
    id: 'v1',
    name: 'The Hidden Lane',
    category: 'Sites',
    description: 'A cobbled lane of studios and tea rooms.',
    address: '1103 Argyle St, Glasgow',
    coordinates: { lat: 55.8645, lng: -4.2810 },
    priority: true,
    isOpen: true,
    images: getImages('lane')
  },
  {
    id: 'v2',
    name: 'City Chambers',
    category: 'Sites',
    description: 'Historic municipal building on George Square.',
    address: 'George Square, Glasgow',
    coordinates: { lat: 55.8610, lng: -4.2505 },
    priority: false,
    isOpen: true,
    images: getImages('building')
  },
  {
    id: 'v3',
    name: 'GoMA',
    category: 'Sites',
    description: 'Gallery of Modern Art.',
    address: 'Royal Exchange Sq, Glasgow',
    coordinates: { lat: 55.8601, lng: -4.2520 },
    priority: false,
    isOpen: true,
    images: getImages('art')
  },
  {
    id: 'v4',
    name: 'Necropolis',
    category: 'Sites',
    description: 'Victorian cemetery with city views.',
    address: 'Castle St, Glasgow',
    coordinates: { lat: 55.8625, lng: -4.2330 },
    priority: false,
    isOpen: true,
    images: getImages('park')
  },
  {
    id: 'v5',
    name: 'Glasgow Cathedral',
    category: 'Sites',
    description: 'Medieval cathedral next to the Necropolis.',
    address: 'Castle St, Glasgow',
    coordinates: { lat: 55.8621, lng: -4.2345 },
    priority: false,
    isOpen: true,
    images: getImages('building')
  },
  {
    id: 'v6',
    name: 'Kelvingrove Art Gallery',
    category: 'Sites',
    description: 'Stunning museum and gallery.',
    address: 'Argyle St, Glasgow',
    coordinates: { lat: 55.8686, lng: -4.2905 },
    priority: true,
    isOpen: true,
    images: getImages('art')
  },
  {
    id: 'v7',
    name: 'Saint Mungo Mural',
    category: 'Sites',
    description: 'Famous street art mural.',
    address: 'High St, Glasgow',
    coordinates: { lat: 55.8602, lng: -4.2390 },
    priority: true,
    isOpen: true,
    images: getImages('art')
  },
  {
    id: 'v8',
    name: 'Ashton Lane',
    category: 'Sites',
    description: 'Cobbled lane with bars and restaurants.',
    address: 'Ashton Lane, West End',
    coordinates: { lat: 55.8742, lng: -4.2935 },
    priority: true,
    isOpen: true,
    images: getImages('lane')
  },
  {
    id: 'v9',
    name: 'University of Glasgow',
    category: 'Sites',
    description: 'Historic university with stunning architecture.',
    address: 'University Ave, Glasgow',
    coordinates: { lat: 55.8719, lng: -4.2883 },
    priority: false,
    isOpen: true,
    images: getImages('university')
  },
  {
    id: 'v10',
    name: 'Pollok Country Park',
    category: 'Sites',
    description: 'Large country park in the Southside.',
    address: '2060 Pollokshaws Rd, Glasgow',
    coordinates: { lat: 55.8300, lng: -4.3000 },
    priority: false,
    isOpen: true,
    images: getImages('park')
  }
];
