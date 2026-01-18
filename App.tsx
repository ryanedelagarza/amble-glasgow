import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  MapPin, 
  Navigation, 
  Coffee, 
  ShoppingBag, 
  Utensils, 
  Camera, 
  Info, 
  ArrowLeft, 
  Star,
  Send,
  Compass,
  Home,
  Heart,
  X,
  Maximize2,
  Map as MapIcon
} from 'lucide-react';
import { 
  Place, 
  Category, 
  DistanceMode, 
  UserPreferences, 
  Coordinates, 
  ChatMessage 
} from './types';
import { PLACES, DEFAULT_BIO, HOTEL_COORDINATES } from './constants';
import { calculateDistance, formatDistance } from './utils';
import { getVibeCheck, getExploreRecommendations } from './services/geminiService';

// --- Types for Leaflet (since we load it via CDN) ---
declare global {
  interface Window {
    L: any;
  }
}

// --- Sub-Components ---

const CategoryCard: React.FC<{ 
  title: string; 
  icon: React.ReactNode; 
  onClick: () => void; 
  colorClass: string 
}> = ({ title, icon, onClick, colorClass }) => (
  <button 
    onClick={onClick}
    className={`${colorClass} w-full aspect-[4/3] rounded-2xl p-6 flex flex-col justify-between shadow-sm hover:shadow-md transition-all active:scale-95`}
  >
    <div className="bg-white/20 w-fit p-3 rounded-xl backdrop-blur-sm text-white">
      {icon}
    </div>
    <span className="text-white text-2xl font-bold tracking-wide text-left">{title}</span>
  </button>
);

const PlaceListItem: React.FC<{
  place: Place;
  distanceText: string;
  isFavorite: boolean;
  onClick: () => void;
}> = ({ place, distanceText, isFavorite, onClick }) => (
  <button 
    onClick={onClick}
    className={`w-full bg-white rounded-xl p-4 flex items-center justify-between shadow-sm border-l-4 ${place.priority ? 'border-amber-400' : 'border-transparent'} hover:bg-slate-50 transition-colors mb-3`}
  >
    <div className="flex flex-col items-start text-left w-full">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
           <h3 className="font-bold text-slate-800 text-lg">{place.name}</h3>
           {isFavorite && <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />}
           {!isFavorite && place.priority && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
        </div>
        <ArrowLeft className="w-5 h-5 rotate-180 text-slate-300" />
      </div>
      <p className="text-sm text-slate-500 line-clamp-1 mt-1">{place.description}</p>
      <div className="flex items-center gap-2 mt-2">
        <span className={`w-2 h-2 rounded-full ${place.isOpen ? 'bg-emerald-500' : 'bg-red-500'}`} />
        <span className="text-xs font-medium text-slate-400">{distanceText}</span>
      </div>
    </div>
  </button>
);

const ChatBubble: React.FC<{ message: ChatMessage }> = ({ message }) => {
  const isUser = message.role === 'user';
  
  const formatText = (text: string) => {
    const parts = text.split(/(\*\*\[(?:KNOWN|NEW):.*?\]\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**[KNOWN:')) {
        const content = part.replace('**[KNOWN:', '').replace(']**', '').trim();
        return <span key={i} className="bg-amber-100 text-amber-800 font-bold px-1 rounded mx-0.5 border border-amber-200">{content}</span>;
      }
      if (part.startsWith('**[NEW:')) {
        const content = part.replace('**[NEW:', '').replace(']**', '').trim();
        return <span key={i} className="bg-blue-100 text-blue-800 font-bold px-1 rounded mx-0.5 border border-blue-200">{content}</span>;
      }
      return part;
    });
  };

  return (
    <div className={`flex w-full mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`max-w-[80%] rounded-2xl p-4 ${
        isUser 
          ? 'bg-slate-800 text-white rounded-br-none' 
          : 'bg-white border border-slate-100 shadow-sm rounded-bl-none text-slate-700'
      }`}>
        <p className="text-sm leading-relaxed whitespace-pre-wrap">
          {isUser ? message.text : formatText(message.text)}
        </p>
      </div>
    </div>
  );
};

const ImageGallery: React.FC<{ images: string[], name: string }> = ({ images, name }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <>
      <div className="relative h-72 bg-slate-200 overflow-hidden group">
         <div className="flex overflow-x-auto snap-x snap-mandatory h-full scrollbar-hide">
            {images.map((img, i) => (
              <div key={i} className="w-full flex-shrink-0 snap-center relative">
                 <img 
                   src={img} 
                   alt={`${name} view ${i + 1}`}
                   className="w-full h-full object-cover"
                 />
                 <button 
                   onClick={() => { setActiveIndex(i); setIsOpen(true); }}
                   className="absolute bottom-4 right-4 bg-black/50 text-white p-2 rounded-full backdrop-blur-sm opacity-0 group-hover:opacity-100 transition-opacity"
                 >
                   <Maximize2 className="w-5 h-5" />
                 </button>
              </div>
            ))}
         </div>
         <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-1.5 pointer-events-none">
            {images.map((_, i) => (
              <div key={i} className="w-1.5 h-1.5 rounded-full bg-white/80 shadow-sm" />
            ))}
         </div>
         <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-black/80 to-transparent pointer-events-none"></div>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center p-4 animate-in fade-in duration-200">
           <button 
             onClick={() => setIsOpen(false)}
             className="absolute top-6 right-6 text-white/80 hover:text-white p-2"
           >
             <X className="w-8 h-8" />
           </button>
           <img 
             src={images[activeIndex]}
             alt="Full screen"
             className="max-w-full max-h-[85vh] object-contain rounded-lg shadow-2xl"
           />
           <div className="flex gap-2 mt-6 overflow-x-auto w-full justify-center">
              {images.map((img, i) => (
                <button 
                  key={i}
                  onClick={() => setActiveIndex(i)}
                  className={`w-16 h-16 flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${i === activeIndex ? 'border-amber-500 scale-110' : 'border-transparent opacity-50'}`}
                >
                  <img src={img} className="w-full h-full object-cover" />
                </button>
              ))}
           </div>
        </div>
      )}
    </>
  );
};

// --- Map Component ---

const MapView: React.FC<{
  places: Place[];
  userLocation: Coordinates | null;
  hotelLocation: Coordinates;
  filters: Record<Category, boolean>;
  onSelectPlace: (place: Place) => void;
}> = ({ places, userLocation, hotelLocation, filters, onSelectPlace }) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const leafletMap = useRef<any>(null);
  const markersRef = useRef<any[]>([]);

  // Initialize Map
  useEffect(() => {
    if (!mapRef.current || leafletMap.current) return;
    
    if (window.L) {
      const initialCenter = userLocation ? [userLocation.lat, userLocation.lng] : [hotelLocation.lat, hotelLocation.lng];
      leafletMap.current = window.L.map(mapRef.current).setView(initialCenter, 14);
      
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20
      }).addTo(leafletMap.current);
    }
  }, [userLocation, hotelLocation]);

  // Handle Markers
  useEffect(() => {
    if (!leafletMap.current || !window.L) return;

    // Clear existing markers
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];

    // Add Hotel Marker (Anchor)
    const hotelIcon = window.L.divIcon({
      className: 'custom-pin',
      html: `<div class="pin-inner" style="background-color: #0f172a; color: white;">
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
             </div>`
    });
    const hotelMarker = window.L.marker([hotelLocation.lat, hotelLocation.lng], { icon: hotelIcon, zIndexOffset: 1000 })
      .addTo(leafletMap.current)
      .bindPopup("<b>Home Base</b><br>Native Glasgow");
    markersRef.current.push(hotelMarker);

    // Add User Marker (Blue Dot)
    if (userLocation) {
       const userIcon = window.L.divIcon({
        className: 'custom-pin',
        html: `<div style="width: 16px; height: 16px; background-color: #3b82f6; border: 3px solid white; border-radius: 50%; box-shadow: 0 2px 4px rgba(0,0,0,0.3);"></div>`
      });
      const userMarker = window.L.marker([userLocation.lat, userLocation.lng], { icon: userIcon, zIndexOffset: 999 })
        .addTo(leafletMap.current);
      markersRef.current.push(userMarker);
    }

    // Add Places
    places.forEach(place => {
      if (!filters[place.category]) return;

      let color = '#64748b'; // default slate
      let iconSvg = '';
      
      switch(place.category) {
        case 'Food': 
          color = '#fb923c'; // orange-400
          iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 2v7c0 1.1.9 2 2 2h4a2 2 0 0 0 2-2V2"/><path d="M7 2v20"/><path d="M21 15V2v0a5 5 0 0 0-5 5v6c0 1.1.9 2 2 2h3Zm0 0v7"/></svg>';
          break;
        case 'Coffee': 
          color = '#b45309'; // amber-700
          iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 8h1a4 4 0 1 1 0 8h-1"/><path d="M3 8h14v9a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4Z"/><line x1="6" x2="6" y1="2" y2="4"/><line x1="10" x2="10" y1="2" y2="4"/><line x1="14" x2="14" y1="2" y2="4"/></svg>';
          break;
        case 'Shopping': 
          color = '#fb7185'; // rose-400
          iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>';
          break;
        case 'Sites': 
          color = '#9333ea'; // purple-600
          iconSvg = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><circle cx="10" cy="13" r="2"/></svg>';
          break;
      }

      const priorityStyle = place.priority ? 'box-shadow: 0 0 0 3px #fbbf24;' : ''; // Gold ring

      const customIcon = window.L.divIcon({
        className: 'custom-pin',
        html: `<div class="pin-inner" style="background-color: ${color}; ${priorityStyle}">
                ${iconSvg}
               </div>`
      });

      const marker = window.L.marker([place.coordinates.lat, place.coordinates.lng], { icon: customIcon })
        .addTo(leafletMap.current)
        .on('click', () => onSelectPlace(place));
      
      markersRef.current.push(marker);
    });

  }, [places, userLocation, hotelLocation, filters, onSelectPlace]);

  return <div ref={mapRef} className="w-full h-full z-0" />;
};

// --- Main App ---

export default function App() {
  // State
  const [view, setView] = useState<'ONBOARDING' | 'DASHBOARD' | 'LIST' | 'DETAIL' | 'EXPLORE' | 'MAP'>('ONBOARDING');
  const [userBio, setUserBio] = useState(DEFAULT_BIO);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [distanceMode, setDistanceMode] = useState<DistanceMode>(DistanceMode.FROM_ME);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [vibeCheckLoading, setVibeCheckLoading] = useState(false);
  const [vibeCheckResult, setVibeCheckResult] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  
  // Map Filters
  const [mapFilters, setMapFilters] = useState<Record<Category, boolean>>({
    Food: true,
    Coffee: true,
    Shopping: true,
    Sites: true
  });
  
  // Explore Chat State
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Initialize
  useEffect(() => {
    // Check local storage
    const savedBio = localStorage.getItem('amble_user_bio');
    if (savedBio) {
      setUserBio(savedBio);
      setView('DASHBOARD');
    }
    const savedFavs = localStorage.getItem('amble_favorites');
    if (savedFavs) {
      setFavorites(JSON.parse(savedFavs));
    }

    // Get Location
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        },
        (err) => {
          console.error("Geo error", err);
          setUserLocation({ lat: 55.8600, lng: -4.2500 }); 
        }
      );
    }
  }, []);

  // Scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages, isTyping]);

  // Derived Data
  const currentAnchor = distanceMode === DistanceMode.FROM_ME 
    ? (userLocation || HOTEL_COORDINATES) 
    : HOTEL_COORDINATES;

  const sortedPlaces = useMemo(() => {
    if (!selectedCategory) return [];
    return PLACES
      .filter(p => p.category === selectedCategory)
      .map(p => ({
        ...p,
        distanceKm: calculateDistance(currentAnchor, p.coordinates)
      }))
      .sort((a, b) => {
        // Sort by favorite first, then by distance
        const aFav = favorites.includes(a.id);
        const bFav = favorites.includes(b.id);
        if (aFav && !bFav) return -1;
        if (!aFav && bFav) return 1;
        return a.distanceKm - b.distanceKm;
      });
  }, [selectedCategory, currentAnchor, favorites]);

  // Handlers
  const handleBioSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    localStorage.setItem('amble_user_bio', userBio);
    setView('DASHBOARD');
  };

  const toggleFavorite = (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setFavorites(prev => {
      const newFavs = prev.includes(id) 
        ? prev.filter(f => f !== id) 
        : [...prev, id];
      localStorage.setItem('amble_favorites', JSON.stringify(newFavs));
      return newFavs;
    });
  };

  const handlePlaceSelect = async (place: Place) => {
    setSelectedPlace(place);
    setVibeCheckResult(null);
    setView('DETAIL');
    
    // Trigger AI Vibe Check
    setVibeCheckLoading(true);
    const vibe = await getVibeCheck(place, userBio);
    setVibeCheckResult(vibe);
    setVibeCheckLoading(false);
  };
  
  const handleMapPlaceSelect = (place: Place) => {
    setSelectedPlace(place);
    // Note: We do NOT immediately switch to DETAIL view in Map mode, we show bottom sheet
  };

  const handleExploreContext = () => {
    setView('EXPLORE');
    if (selectedPlace) {
      const initialMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'model',
        text: `You're currently near **${selectedPlace.name}**. What are you in the mood for next?`
      };
      setChatMessages(prev => [...prev, initialMsg]);
    } else if (chatMessages.length === 0) {
      const initialMsg: ChatMessage = {
        id: Date.now().toString(),
        role: 'model',
        text: "Hi! I'm Amble. I can help you find hidden gems that match your vibe. What are you looking for?"
      };
      setChatMessages([initialMsg]);
    }
  };

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;
    
    const userMsg: ChatMessage = { id: Date.now().toString(), role: 'user', text };
    setChatMessages(prev => [...prev, userMsg]);
    setChatInput('');
    setIsTyping(true);

    const contextDesc = selectedPlace 
      ? `Near ${selectedPlace.name} (${selectedPlace.category})`
      : userLocation ? `Lat: ${userLocation.lat}, Lng: ${userLocation.lng}` : "Central Glasgow";

    const responseText = await getExploreRecommendations(text, userBio, PLACES, contextDesc);
    
    setIsTyping(false);
    setChatMessages(prev => [...prev, {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: responseText
    }]);
  };

  const toggleMapFilter = (cat: Category) => {
    setMapFilters(prev => ({ ...prev, [cat]: !prev[cat] }));
  };

  // Views

  const renderOnboarding = () => (
    <div className="flex flex-col h-full p-8 justify-center bg-slate-900 text-white bg-[url('https://images.unsplash.com/photo-1514517220813-a7f8714de65d?q=80&w=1000&auto=format&fit=crop')] bg-cover bg-center bg-no-repeat relative">
      <div className="absolute inset-0 bg-slate-900/80 backdrop-blur-sm z-0"></div>
      <div className="relative z-10">
        <h1 className="text-4xl font-light mb-2 tracking-tighter">amble.</h1>
        <p className="text-slate-300 mb-8 font-light">Wander intentionally.</p>
        
        <form onSubmit={handleBioSubmit} className="space-y-6">
          <div className="space-y-2">
            <label className="text-sm uppercase tracking-widest text-amber-400 font-bold">Your Vibe</label>
            <p className="text-xs text-slate-400">What makes a place special to you?</p>
            <textarea 
              value={userBio}
              onChange={(e) => setUserBio(e.target.value)}
              className="w-full h-32 bg-white/10 border border-white/20 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-amber-500 text-sm leading-relaxed"
            />
          </div>
          <button 
            type="submit"
            className="w-full bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold py-4 rounded-xl transition-all active:scale-95"
          >
            Start Exploring
          </button>
        </form>
      </div>
    </div>
  );

  const renderDashboard = () => (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="p-6 pb-2">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-3xl font-bold text-slate-900">Amble</h1>
            <p className="text-slate-500 text-sm">Glasgow Edition</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-200 border-2 border-white shadow-sm overflow-hidden">
             <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=Felix`} alt="User" />
          </div>
        </div>

        {/* Distance Toggle */}
        <div className="bg-white p-1 rounded-xl shadow-sm border border-slate-100 flex relative">
           <div 
             className={`absolute top-1 bottom-1 w-[48%] bg-slate-900 rounded-lg transition-all duration-300 ${distanceMode === DistanceMode.FROM_HOTEL ? 'left-[50%]' : 'left-1'}`}
           />
           <button 
             onClick={() => setDistanceMode(DistanceMode.FROM_ME)}
             className={`flex-1 py-2 text-xs font-bold text-center z-10 transition-colors ${distanceMode === DistanceMode.FROM_ME ? 'text-white' : 'text-slate-500'}`}
           >
             FROM ME
           </button>
           <button 
             onClick={() => setDistanceMode(DistanceMode.FROM_HOTEL)}
             className={`flex-1 py-2 text-xs font-bold text-center z-10 transition-colors ${distanceMode === DistanceMode.FROM_HOTEL ? 'text-white' : 'text-slate-500'}`}
           >
             FROM HOTEL
           </button>
        </div>
      </header>

      <div className="flex-1 overflow-y-auto p-6 pt-2 grid grid-cols-2 gap-4 pb-24">
        <CategoryCard 
          title="Food" 
          icon={<Utensils className="w-6 h-6" />} 
          colorClass="bg-orange-400"
          onClick={() => { setSelectedCategory('Food'); setView('LIST'); }}
        />
        <CategoryCard 
          title="Coffee" 
          icon={<Coffee className="w-6 h-6" />} 
          colorClass="bg-amber-700"
          onClick={() => { setSelectedCategory('Coffee'); setView('LIST'); }}
        />
        <CategoryCard 
          title="Shopping" 
          icon={<ShoppingBag className="w-6 h-6" />} 
          colorClass="bg-rose-400"
          onClick={() => { setSelectedCategory('Shopping'); setView('LIST'); }}
        />
        <CategoryCard 
          title="Sites" 
          icon={<Camera className="w-6 h-6" />} 
          colorClass="bg-teal-600"
          onClick={() => { setSelectedCategory('Sites'); setView('LIST'); }}
        />
      </div>
    </div>
  );

  const renderList = () => (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="p-4 bg-white shadow-sm z-10 flex items-center gap-4 sticky top-0">
        <button onClick={() => setView('DASHBOARD')} className="p-2 hover:bg-slate-100 rounded-full">
          <ArrowLeft className="w-6 h-6 text-slate-700" />
        </button>
        <h2 className="text-xl font-bold text-slate-900">{selectedCategory}</h2>
      </header>
      <div className="flex-1 overflow-y-auto p-4 pb-24">
        <p className="text-xs text-slate-400 uppercase font-bold tracking-wider mb-4 pl-1">
          Sorted by distance from {distanceMode === DistanceMode.FROM_ME ? 'You' : 'Hotel'}
        </p>
        {sortedPlaces.map(place => (
          <PlaceListItem 
            key={place.id}
            place={place}
            distanceText={formatDistance(place.distanceKm)}
            isFavorite={favorites.includes(place.id)}
            onClick={() => handlePlaceSelect(place)}
          />
        ))}
      </div>
    </div>
  );

  const renderDetail = () => {
    if (!selectedPlace) return null;
    const distanceKm = calculateDistance(currentAnchor, selectedPlace.coordinates);
    const isFav = favorites.includes(selectedPlace.id);

    return (
      <div className="flex flex-col h-full bg-white">
        
        {/* New Gallery Component replaces static image */}
        <div className="relative">
          <button 
             onClick={() => setView('LIST')}
             className="absolute top-4 left-4 z-20 p-2 bg-white/90 backdrop-blur rounded-full shadow-lg hover:bg-white"
           >
             <ArrowLeft className="w-6 h-6 text-slate-900" />
           </button>
           
          <ImageGallery images={selectedPlace.images} name={selectedPlace.name} />

           <div className="absolute bottom-0 left-0 right-0 p-6 pointer-events-none">
             <div className="flex items-end justify-between">
                <div>
                   <h1 className="text-3xl font-bold text-white mb-1 shadow-black/50 drop-shadow-lg">{selectedPlace.name}</h1>
                   <div className="flex items-center gap-2 text-white/90 text-sm font-medium shadow-black/50 drop-shadow-md">
                      <MapPin className="w-4 h-4" />
                      <span>{selectedPlace.address}</span>
                   </div>
                </div>
             </div>
           </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 pb-24">
          <div className="flex items-center justify-between mb-6">
             <div className="bg-slate-100 px-3 py-1 rounded-full text-xs font-bold text-slate-600">
               {formatDistance(distanceKm)} away
             </div>
             
             <div className="flex gap-2">
               {selectedPlace.priority && (
                 <div className="bg-amber-100 px-3 py-1 rounded-full text-xs font-bold text-amber-700 flex items-center gap-1">
                   <Star className="w-3 h-3 fill-amber-700" /> Curator Pick
                 </div>
               )}
               <button 
                onClick={() => toggleFavorite(selectedPlace.id)}
                className={`flex items-center gap-1 px-3 py-1 rounded-full text-xs font-bold border ${
                  isFav 
                    ? 'bg-pink-100 text-pink-700 border-pink-200' 
                    : 'bg-white text-slate-500 border-slate-200'
                }`}
               >
                 <Heart className={`w-3 h-3 ${isFav ? 'fill-pink-700' : ''}`} />
                 {isFav ? 'Favorited' : 'Favorite'}
               </button>
             </div>
          </div>

          <div className="mb-8">
            <h3 className="text-sm font-bold text-slate-900 uppercase tracking-widest mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-amber-500" />
              Vibe Check
            </h3>
            <div className="p-5 bg-amber-50 rounded-2xl border border-amber-100 relative">
              {vibeCheckLoading ? (
                 <div className="flex items-center gap-2 text-amber-800/60 text-sm animate-pulse">
                   <div className="w-2 h-2 bg-amber-500 rounded-full animate-bounce" />
                   Checking vibes...
                 </div>
              ) : (
                 <p className="text-slate-800 italic leading-relaxed text-lg font-medium">
                   "{vibeCheckResult}"
                 </p>
              )}
            </div>
          </div>

          <div className="space-y-3">
             <a 
               href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.coordinates.lat},${selectedPlace.coordinates.lng}&travelmode=walking`}
               target="_blank"
               rel="noreferrer"
               className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-95 transition-all"
             >
               <Navigation className="w-5 h-5" />
               Go Now
             </a>
             <button 
               onClick={handleExploreContext}
               className="w-full bg-white border-2 border-slate-200 text-slate-700 font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 active:scale-95 transition-all"
             >
               <Compass className="w-5 h-5" />
               What else is near here?
             </button>
          </div>
        </div>
      </div>
    );
  };

  const renderExplore = () => (
    <div className="flex flex-col h-full bg-slate-50">
      <header className="p-4 bg-white shadow-sm z-10 flex items-center gap-3">
         {selectedPlace && (
           <button onClick={() => setView('DETAIL')} className="p-2 hover:bg-slate-100 rounded-full">
             <ArrowLeft className="w-5 h-5 text-slate-700" />
           </button>
         )}
         <div>
            <h2 className="text-lg font-bold text-slate-900">Explore Concierge</h2>
            <p className="text-xs text-slate-500 flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              Online
            </p>
         </div>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-4">
         {chatMessages.map((msg) => (
           <ChatBubble key={msg.id} message={msg} />
         ))}
         {isTyping && (
           <div className="flex w-full justify-start mb-4">
              <div className="bg-white border border-slate-100 shadow-sm rounded-2xl rounded-bl-none p-4 flex gap-1">
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-75"></span>
                <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce delay-150"></span>
              </div>
           </div>
         )}
         <div ref={chatEndRef} />
      </div>

      {chatMessages.length < 3 && (
        <div className="px-4 py-2 flex gap-2 overflow-x-auto scrollbar-hide">
          {['Find good coffee', 'Lunch spots', 'Architecture nearby', 'Something artisan'].map(chip => (
            <button
              key={chip}
              onClick={() => handleSendMessage(chip)}
              className="whitespace-nowrap bg-white border border-slate-200 px-4 py-2 rounded-full text-sm font-medium text-slate-600 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-700 transition-colors"
            >
              {chip}
            </button>
          ))}
        </div>
      )}

      <div className="p-4 bg-white border-t border-slate-100 pb-24">
        <form 
          className="flex gap-2"
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(chatInput); }}
        >
          <input 
            type="text"
            value={chatInput}
            onChange={(e) => setChatInput(e.target.value)}
            placeholder="Ask Amble anything..."
            className="flex-1 bg-slate-100 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-amber-500"
          />
          <button 
            type="submit"
            disabled={!chatInput.trim() || isTyping}
            className="bg-slate-900 text-white p-3 rounded-xl disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send className="w-5 h-5" />
          </button>
        </form>
      </div>
    </div>
  );

  const renderMap = () => (
    <div className="flex flex-col h-full bg-slate-50 relative">
      <div className="absolute top-4 left-4 right-4 z-10 flex gap-2 overflow-x-auto scrollbar-hide py-1">
         {(['Food', 'Coffee', 'Shopping', 'Sites'] as Category[]).map(cat => (
           <button
             key={cat}
             onClick={() => toggleMapFilter(cat)}
             className={`px-4 py-2 rounded-full text-xs font-bold shadow-sm transition-all border whitespace-nowrap ${
               mapFilters[cat] 
                 ? 'bg-slate-900 text-white border-slate-900' 
                 : 'bg-white text-slate-500 border-slate-200 opacity-80'
             }`}
           >
             {cat}
           </button>
         ))}
      </div>
      
      <MapView 
        places={PLACES} 
        userLocation={userLocation} 
        hotelLocation={HOTEL_COORDINATES} 
        filters={mapFilters}
        onSelectPlace={handleMapPlaceSelect}
      />

      {/* Bottom Sheet for Map */}
      {selectedPlace && view === 'MAP' && (
        <div className="absolute bottom-24 left-4 right-4 bg-white rounded-2xl shadow-2xl p-4 z-20 animate-in slide-in-from-bottom duration-300">
           <div className="flex justify-between items-start mb-2">
              <div>
                 <h3 className="font-bold text-lg text-slate-900">{selectedPlace.name}</h3>
                 <p className="text-sm text-slate-500">{selectedPlace.category}</p>
              </div>
              <button onClick={() => setSelectedPlace(null)} className="p-1 bg-slate-100 rounded-full">
                <X className="w-4 h-4 text-slate-500" />
              </button>
           </div>
           <p className="text-sm text-slate-600 mb-4 line-clamp-2">
             {selectedPlace.description}
           </p>
           <div className="flex gap-2">
              <button 
                onClick={() => handlePlaceSelect(selectedPlace)}
                className="flex-1 bg-white border-2 border-slate-100 text-slate-700 py-2 rounded-lg text-sm font-bold"
              >
                More Info
              </button>
              <a 
                href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.coordinates.lat},${selectedPlace.coordinates.lng}&travelmode=walking`}
                target="_blank"
                rel="noreferrer"
                className="flex-1 bg-slate-900 text-white py-2 rounded-lg text-sm font-bold flex items-center justify-center gap-1"
              >
                <Navigation className="w-3 h-3" /> Go Now
              </a>
           </div>
        </div>
      )}
    </div>
  );

  // --- Layout Render ---

  if (view === 'ONBOARDING') return renderOnboarding();

  return (
    <div className="h-full relative bg-slate-50">
      {view === 'DASHBOARD' && renderDashboard()}
      {view === 'LIST' && renderList()}
      {view === 'DETAIL' && renderDetail()}
      {view === 'EXPLORE' && renderExplore()}
      {view === 'MAP' && renderMap()}

      {/* Bottom Nav - Sticky */}
      <nav className="absolute bottom-6 left-6 right-6 bg-slate-900 text-slate-300 rounded-2xl shadow-2xl flex justify-around items-center p-4 backdrop-blur-md z-50">
         <button 
           onClick={() => { setView('DASHBOARD'); setSelectedPlace(null); }}
           className={`flex flex-col items-center gap-1 w-12 ${view === 'DASHBOARD' || view === 'LIST' || view === 'DETAIL' ? 'text-amber-400' : 'hover:text-white'}`}
         >
           <Home className="w-6 h-6" />
           <span className="text-[10px] font-bold uppercase">Home</span>
         </button>
         
         <button 
           onClick={() => { setView('MAP'); setSelectedPlace(null); }}
           className={`flex flex-col items-center gap-1 w-12 ${view === 'MAP' ? 'text-amber-400' : 'hover:text-white'}`}
         >
           <MapIcon className="w-6 h-6" />
           <span className="text-[10px] font-bold uppercase">Map</span>
         </button>

         <button 
           onClick={() => {
             if (view !== 'EXPLORE') {
               setView('EXPLORE'); 
               setChatMessages([]); // Clear chat on fresh entry if desired, or keep history
               handleExploreContext(); // Initialize chat
             }
           }}
           className={`flex flex-col items-center gap-1 w-12 ${view === 'EXPLORE' ? 'text-amber-400' : 'hover:text-white'}`}
         >
           <Compass className="w-6 h-6" />
           <span className="text-[10px] font-bold uppercase">Explore</span>
         </button>
      </nav>
    </div>
  );
}
