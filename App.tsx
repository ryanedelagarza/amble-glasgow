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
  Map as MapIcon,
  Plus,
  Search,
  Loader,
  AlertCircle,
  WifiOff,
  Trash2
} from 'lucide-react';
import { 
  Place, 
  Category, 
  DistanceMode, 
  UserPreferences, 
  Coordinates, 
  ChatMessage,
  GooglePlaceResult
} from './types';
import { PLACES, DEFAULT_BIO, HOTEL_COORDINATES } from './constants';
import { calculateDistance, formatDistance, getWalkingMinutes } from './utils';
import { getVibeCheck, getExploreRecommendations, rankSearchResults } from './services/geminiService';
import { searchPlaces, getPhotoUrl, assignCategory, PlacesApiError, OfflineError } from './services/googlePlacesService';
import analytics from './services/analytics';

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
    className={`w-full bg-white rounded-xl p-4 flex items-center justify-between shadow-sm border-l-4 ${place.priority ? 'border-amber-400' : place.source === 'user' ? 'border-blue-400' : 'border-transparent'} hover:bg-slate-50 transition-colors mb-3`}
  >
    <div className="flex flex-col items-start text-left w-full">
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2">
           <h3 className="font-bold text-slate-800 text-lg">{place.name}</h3>
           {isFavorite && <Heart className="w-4 h-4 text-pink-500 fill-pink-500" />}
           {!isFavorite && place.priority && <Star className="w-4 h-4 text-amber-500 fill-amber-500" />}
           {place.source === 'user' && (
             <span className="text-[10px] bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded font-medium">Added</span>
           )}
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

const Toast: React.FC<{
  message: string;
  action?: () => void;
  actionLabel?: string;
  onClose: () => void;
}> = ({ message, action, actionLabel, onClose }) => (
  <div className="fixed bottom-32 left-4 right-4 z-50 animate-in slide-in-from-bottom duration-300">
    <div className="bg-slate-900 text-white rounded-xl p-4 shadow-2xl flex items-center justify-between gap-3">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <span className="text-sm font-medium">{message}</span>
      </div>
      <div className="flex items-center gap-2">
        {action && actionLabel && (
          <button
            onClick={action}
            className="text-amber-400 text-sm font-bold hover:text-amber-300 whitespace-nowrap"
          >
            {actionLabel}
          </button>
        )}
        <button onClick={onClose} className="p-1 hover:bg-white/10 rounded">
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  </div>
);

const DeleteConfirmModal: React.FC<{
  placeName: string;
  onConfirm: () => void;
  onCancel: () => void;
}> = ({ placeName, onConfirm, onCancel }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
    {/* Backdrop */}
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
    
    {/* Modal */}
    <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
      <div className="flex flex-col items-center text-center">
        <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
          <Trash2 className="w-7 h-7 text-red-600" />
        </div>
        
        <h3 className="text-xl font-bold text-slate-900 mb-2">Remove Place?</h3>
        <p className="text-sm text-slate-500 mb-6">
          Are you sure you want to remove <span className="font-semibold text-slate-700">{placeName}</span> from your collection?
        </p>
        
        <div className="flex gap-3 w-full">
          <button
            onClick={onCancel}
            className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-3 px-4 bg-red-600 text-white font-bold rounded-xl hover:bg-red-700 transition-colors"
          >
            Remove
          </button>
        </div>
      </div>
    </div>
  </div>
);

const CategoryConfirmModal: React.FC<{
  placeName: string;
  suggestedCategory: Category;
  onConfirm: (category: Category) => void;
  onCancel: () => void;
}> = ({ placeName, suggestedCategory, onConfirm, onCancel }) => {
  const [selectedCategory, setSelectedCategory] = useState<Category>(suggestedCategory);
  
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onCancel} />
      
      {/* Modal */}
      <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
        <div className="flex flex-col">
          {/* Header */}
          <h3 className="text-xl font-bold text-slate-900 mb-2">Add to Collection?</h3>
          <p className="text-sm text-slate-600 mb-4">
            <span className="font-semibold text-slate-800">{placeName}</span> will be added to:
          </p>
          
          {/* Category Selection Grid - CO1 Issue 2: Clear visual hierarchy */}
          <div className="grid grid-cols-2 gap-3 mb-6">
            {(['Food', 'Coffee', 'Shopping', 'Sites'] as Category[]).map(cat => {
              const isSelected = selectedCategory === cat;
              
              return (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`
                    py-4 px-4 rounded-xl font-semibold text-sm transition-all
                    ${isSelected 
                      ? 'bg-slate-900 text-white shadow-lg scale-105' 
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95'
                    }
                  `}
                >
                  {cat}
                </button>
              );
            })}
          </div>
          
          {/* Action Buttons - CO1 Issue 2: Ghost Cancel, Amber Primary */}
          <div className="flex gap-3">
            {/* Cancel - Ghost/Outlined Style */}
            <button
              onClick={onCancel}
              className="flex-1 py-3 px-4 bg-white border-2 border-slate-200 text-slate-700 font-semibold rounded-xl hover:bg-slate-50 hover:border-slate-300 active:scale-95 transition-all"
            >
              Cancel
            </button>
            
            {/* Add - Primary Action with Brand Color */}
            <button
              onClick={() => onConfirm(selectedCategory)}
              className="flex-1 py-3 px-4 bg-amber-500 text-white font-bold rounded-xl hover:bg-amber-600 shadow-md hover:shadow-lg active:scale-95 transition-all"
            >
              Add Place
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const DuplicateModal: React.FC<{
  place: Place;
  onViewPlace: () => void;
  onSearchAgain: () => void;
}> = ({ place, onViewPlace, onSearchAgain }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
    {/* Backdrop */}
    <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onSearchAgain} />
    
    {/* Modal */}
    <div className="relative bg-white rounded-2xl p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 duration-200">
      <div className="flex flex-col items-center text-center">
        <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center mb-4">
          <Star className="w-7 h-7 text-amber-600 fill-amber-600" />
        </div>
        
        <h3 className="text-xl font-bold text-slate-900 mb-2">Already in Your Collection</h3>
        <p className="text-sm text-slate-500 mb-6">
          <span className="font-semibold text-slate-700">{place.name}</span> is already saved in <span className="font-semibold text-slate-700">{place.category}</span>.
        </p>
        
        <div className="flex gap-3 w-full">
          <button
            onClick={onSearchAgain}
            className="flex-1 py-3 px-4 bg-slate-100 text-slate-700 font-bold rounded-xl hover:bg-slate-200 transition-colors"
          >
            Search Again
          </button>
          <button
            onClick={onViewPlace}
            className="flex-1 py-3 px-4 bg-slate-900 text-white font-bold rounded-xl hover:bg-slate-800 transition-colors"
          >
            View Place
          </button>
        </div>
      </div>
    </div>
  </div>
);

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
  const [view, setView] = useState<'ONBOARDING' | 'DASHBOARD' | 'LIST' | 'DETAIL' | 'EXPLORE' | 'MAP' | 'ADD_LOCATION'>('ONBOARDING');
  const [userBio, setUserBio] = useState(DEFAULT_BIO);
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null);
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [distanceMode, setDistanceMode] = useState<DistanceMode>(DistanceMode.FROM_ME);
  const [userLocation, setUserLocation] = useState<Coordinates | null>(null);
  const [vibeCheckLoading, setVibeCheckLoading] = useState(false);
  const [vibeCheckResult, setVibeCheckResult] = useState<string | null>(null);
  const [favorites, setFavorites] = useState<string[]>([]);
  
  // User-added places
  const [userPlaces, setUserPlaces] = useState<Place[]>([]);
  
  // Add Location Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [searchResults, setSearchResults] = useState<GooglePlaceResult[]>([]);
  const [isSearching, setIsSearching] = useState<boolean>(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  
  // Toast notification state
  const [toast, setToast] = useState<{ message: string; action?: () => void; actionLabel?: string } | null>(null);
  
  // Delete confirmation modal state
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  
  // Category confirmation modal state (Bug #1 fix)
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [selectedResult, setSelectedResult] = useState<GooglePlaceResult | null>(null);
  const [suggestedCategory, setSuggestedCategory] = useState<Category>('Sites');
  
  // Google result reference for save flow (CO1 - Issue 1 fix)
  const [selectedGoogleResult, setSelectedGoogleResult] = useState<GooglePlaceResult | null>(null);
  
  // Duplicate detection modal state (Bug #2 fix)
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  
  // Navigation context state (Bug #3 fix)
  const [navContext, setNavContext] = useState<{
    fromView?: 'ONBOARDING' | 'DASHBOARD' | 'LIST' | 'DETAIL' | 'EXPLORE' | 'MAP' | 'ADD_LOCATION';
    preserveState?: {
      searchResults?: GooglePlaceResult[];
      searchQuery?: string;
    };
  }>({});
  
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
    
    // Load user-added places
    const savedUserPlaces = localStorage.getItem('amble_user_places');
    if (savedUserPlaces) {
      setUserPlaces(JSON.parse(savedUserPlaces));
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

  // Auto-dismiss toast after 4 seconds
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => {
        setToast(null);
      }, 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Derived Data
  const currentAnchor = distanceMode === DistanceMode.FROM_ME 
    ? (userLocation || HOTEL_COORDINATES) 
    : HOTEL_COORDINATES;

  // Combine curated places with user-added places
  const allPlaces = useMemo(() => {
    return [...PLACES, ...userPlaces];
  }, [userPlaces]);

  const sortedPlaces = useMemo(() => {
    if (!selectedCategory) return [];
    return allPlaces
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
  }, [selectedCategory, currentAnchor, favorites, allPlaces]);

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

    const responseText = await getExploreRecommendations(text, userBio, allPlaces, contextDesc);
    
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

  // Navigation helpers (Bug #3 fix)
  const navigateToView = (
    newView: 'ONBOARDING' | 'DASHBOARD' | 'LIST' | 'DETAIL' | 'EXPLORE' | 'MAP' | 'ADD_LOCATION',
    options?: {
      preserveSearchState?: boolean;
    }
  ) => {
    // Save current context before navigating
    const context: typeof navContext = {
      fromView: view,
    };
    
    // If leaving ADD_LOCATION, preserve search state if requested
    if (view === 'ADD_LOCATION' && options?.preserveSearchState) {
      context.preserveState = {
        searchResults,
        searchQuery,
      };
    }
    
    setNavContext(context);
    setView(newView);
  };

  const navigateBack = () => {
    const { fromView, preserveState } = navContext;
    
    // If we have a recorded previous view, go there
    if (fromView) {
      setView(fromView);
      
      // Restore preserved state if returning to ADD_LOCATION
      if (fromView === 'ADD_LOCATION' && preserveState) {
        if (preserveState.searchResults) {
          setSearchResults(preserveState.searchResults);
        }
        if (preserveState.searchQuery) {
          setSearchQuery(preserveState.searchQuery);
        }
      }
      
      // Clear context after using it
      setNavContext({});
    } else {
      // Fallback to dashboard if no context
      setView('DASHBOARD');
    }
  };

  // Add Location Handlers
  const handleSearch = async () => {
    if (searchQuery.trim().length < 2) return;
    
    const searchStartTime = performance.now();
    const query = searchQuery.trim();
    
    // Track search initiated
    analytics.searchInitiated(query);
    
    setIsSearching(true);
    setSearchError(null);
    setSearchResults([]);
    
    try {
      const searchLocation = userLocation || HOTEL_COORDINATES;
      const results = await searchPlaces({
        query: query,
        location: searchLocation,
        radius: 5000,
      });
      
      if (results.length === 0) {
        setSearchResults([]);
        // Track search completed with 0 results
        const timeToResults = Math.round(performance.now() - searchStartTime);
        analytics.searchCompleted(0, timeToResults);
        return;
      }
      
      // Use AI to rank results by relevance
      const rankedIds = await rankSearchResults(
        query,
        userBio,
        searchLocation,
        results
      );
      
      // Reorder results based on AI ranking
      const rankedResults = rankedIds
        .map(id => results.find(r => r.place_id === id))
        .filter((r): r is GooglePlaceResult => r !== undefined);
      
      setSearchResults(rankedResults);
      
      // Track search completed with results
      const timeToResults = Math.round(performance.now() - searchStartTime);
      analytics.searchCompleted(rankedResults.length, timeToResults);
      
    } catch (err) {
      console.error('Search error:', err);
      
      // Handle specific error types with user-friendly messages
      let errorType = 'UNKNOWN';
      let errorMessage = 'Something went wrong. Please try again.';
      
      if (err instanceof OfflineError) {
        errorType = 'OFFLINE';
        errorMessage = 'No internet connection. Check your network and try again.';
      } else if (err instanceof PlacesApiError) {
        errorType = err.code;
        errorMessage = err.message;
      }
      
      setSearchError(errorMessage);
      
      // Track search error
      analytics.searchError(errorType, errorMessage);
    } finally {
      setIsSearching(false);
    }
  };

  // CO1 Issue 3: Simple input handler - no auto-search, require explicit trigger
  const handleSearchInputChange = (value: string) => {
    setSearchQuery(value.slice(0, 100));
    setSearchError(null);
    // No auto-search - user must press Enter or click Search button
  };

  const handleSelectResult = (result: GooglePlaceResult, position: number) => {
    // Track result selection
    analytics.resultSelected(position + 1, result.place_id, result.name);
    
    // Check if place already exists
    const existingPlace = allPlaces.find(p => p.googlePlaceId === result.place_id);
    if (existingPlace) {
      // Track duplicate detection
      analytics.duplicateDetected(existingPlace.id, existingPlace.name, existingPlace.category);
      
      // Navigate directly to detail view for existing place
      setSelectedPlace(existingPlace);
      setSelectedGoogleResult(null); // Clear since it's already saved
      navigateToView('DETAIL', { preserveSearchState: true });
      
      // Trigger vibe check
      setVibeCheckResult(null);
      setVibeCheckLoading(true);
      getVibeCheck(existingPlace, userBio).then(vibe => {
        setVibeCheckResult(vibe);
        setVibeCheckLoading(false);
      });
      return;
    }
    
    // CO1 Issue 1 Fix: Navigate to detail view for preview (don't show modal)
    // Transform result to temporary Place for preview
    const category = assignCategory(result.types);
    const tempPlace: Place = {
      id: `preview-${result.place_id}`,
      name: result.name,
      category: category,
      description: result.formatted_address,
      address: result.formatted_address,
      coordinates: {
        lat: result.geometry.location.lat,
        lng: result.geometry.location.lng,
      },
      priority: false,
      isOpen: result.opening_hours?.open_now,
      images: result.photos && result.photos.length > 0
        ? [getPhotoUrl(result.photos[0].photo_reference, 800)]
        : ['https://images.unsplash.com/photo-1486718448742-166226480961?auto=format&fit=crop&w=800&q=80'],
      source: undefined, // Not saved yet - this is a preview
      googlePlaceId: result.place_id,
    };
    
    // Store Google result reference for potential save
    setSelectedGoogleResult(result);
    setSelectedPlace(tempPlace);
    
    // Navigate to detail view with search state preserved
    navigateToView('DETAIL', { preserveSearchState: true });
    
    // Trigger vibe check for preview
    setVibeCheckResult(null);
    setVibeCheckLoading(true);
    getVibeCheck(tempPlace, userBio).then(vibe => {
      setVibeCheckResult(vibe);
      setVibeCheckLoading(false);
    });
  };

  const handleConfirmAdd = (confirmedCategory: Category) => {
    // CO1: Use selectedGoogleResult (from save button) or fall back to selectedResult
    const googleResult = selectedGoogleResult || selectedResult;
    if (!googleResult) return;
    
    // Track if category was changed from suggestion
    if (confirmedCategory !== suggestedCategory) {
      analytics.categoryChanged(googleResult.name, suggestedCategory, confirmedCategory);
    }
    
    // Transform Google Place to our Place type
    const newPlace: Place = {
      id: `user-${googleResult.place_id}`,
      name: googleResult.name,
      category: confirmedCategory,
      description: googleResult.formatted_address,
      address: googleResult.formatted_address,
      coordinates: {
        lat: googleResult.geometry.location.lat,
        lng: googleResult.geometry.location.lng,
      },
      priority: false,
      isOpen: googleResult.opening_hours?.open_now,
      images: googleResult.photos && googleResult.photos.length > 0
        ? [getPhotoUrl(googleResult.photos[0].photo_reference, 800)]
        : ['https://images.unsplash.com/photo-1486718448742-166226480961?auto=format&fit=crop&w=800&q=80'],
      source: 'user',
      googlePlaceId: googleResult.place_id,
      addedAt: new Date().toISOString(),
    };
    
    // Add to userPlaces and persist
    const updatedPlaces = [...userPlaces, newPlace];
    setUserPlaces(updatedPlaces);
    localStorage.setItem('amble_user_places', JSON.stringify(updatedPlaces));
    
    // Track place added
    analytics.placeAdded(newPlace.id, confirmedCategory);
    
    // Close modal and clear references
    setShowCategoryModal(false);
    setSelectedResult(null);
    setSelectedGoogleResult(null);
    
    // Update selectedPlace to the now-saved place (stay in detail view)
    setSelectedPlace(newPlace);
    
    // Show success toast with option to add another
    setToast({
      message: `Added to ${confirmedCategory}!`,
      action: () => {
        navigateBack();
        setToast(null);
      },
      actionLabel: 'Add Another'
    });
  };

  const resetAddLocationView = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(null);
    setView('DASHBOARD');
  };

  // Delete user-added place handler
  const handleDeletePlace = () => {
    if (!selectedPlace || selectedPlace.source !== 'user') return;
    
    // Track place removal
    analytics.placeRemoved(selectedPlace.id, selectedPlace.category);
    
    // Remove from userPlaces
    const updatedPlaces = userPlaces.filter(p => p.id !== selectedPlace.id);
    setUserPlaces(updatedPlaces);
    localStorage.setItem('amble_user_places', JSON.stringify(updatedPlaces));
    
    // Also remove from favorites if it was favorited
    if (favorites.includes(selectedPlace.id)) {
      const updatedFavs = favorites.filter(f => f !== selectedPlace.id);
      setFavorites(updatedFavs);
      localStorage.setItem('amble_favorites', JSON.stringify(updatedFavs));
    }
    
    // Close modal and navigate back
    setShowDeleteModal(false);
    setSelectedPlace(null);
    setView('LIST');
    
    // Show confirmation toast
    setToast({
      message: 'Place removed from your collection',
    });
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
             onClick={navigateBack}
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
          {/* SECTION 1: Distance & Favorite badges */}
          <div className="flex items-center justify-between mb-4">
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

          {/* SECTION 2: PRIMARY ACTIONS - Save & Go Now (CO2: moved above fold) */}
          {(() => {
            // Check if this place is already saved
            const isAlreadySaved = selectedPlace.source === 'user' || userPlaces.some(
              p => p.googlePlaceId === selectedPlace?.googlePlaceId
            );
            const savedPlace = userPlaces.find(p => p.googlePlaceId === selectedPlace?.googlePlaceId);
            const savedCategory = savedPlace?.category || selectedPlace.category;

            return (
              <div className="space-y-3 mb-6 pb-6 border-b border-slate-100">
                {!isAlreadySaved && selectedGoogleResult ? (
                  // NOT SAVED: Show save button
                  <button
                    onClick={() => {
                      const suggestedCat = assignCategory(selectedGoogleResult.types);
                      setSuggestedCategory(suggestedCat);
                      setShowCategoryModal(true);
                      analytics.saveButtonTapped(selectedPlace.name, suggestedCat);
                    }}
                    className="w-full bg-white border-2 border-slate-300 text-slate-700 font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 hover:border-slate-400 active:scale-[0.98] transition-all"
                  >
                    <Plus className="w-5 h-5" />
                    Save to Collection
                  </button>
                ) : (
                  // ALREADY SAVED: Show status and remove option
                  <>
                    <div className="w-full bg-emerald-50 border border-emerald-200 text-emerald-800 font-semibold py-4 rounded-xl flex items-center justify-center gap-2">
                      <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>Saved in <span className="font-bold">{savedCategory}</span></span>
                    </div>
                    
                    {selectedPlace.source === 'user' && (
                      <button
                        onClick={() => setShowDeleteModal(true)}
                        className="w-full bg-white border border-slate-200 text-slate-600 font-medium py-3 rounded-xl flex items-center justify-center gap-2 hover:bg-red-50 hover:text-red-600 hover:border-red-200 active:scale-[0.98] transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                        Remove from Collection
                      </button>
                    )}
                  </>
                )}

                {/* Go Now Button */}
                <a 
                  href={`https://www.google.com/maps/dir/?api=1&destination=${selectedPlace.coordinates.lat},${selectedPlace.coordinates.lng}&travelmode=walking`}
                  target="_blank"
                  rel="noreferrer"
                  className="w-full bg-slate-900 text-white font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-800 active:scale-[0.98] transition-all"
                >
                  <Navigation className="w-5 h-5" />
                  Go Now
                </a>
              </div>
            );
          })()}

          {/* SECTION 3: VIBE CHECK (CO2: moved below fold) */}
          <div className="mb-6">
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

          {/* SECTION 4: EXPLORE CONTEXT */}
          <button 
            onClick={handleExploreContext}
            className="w-full bg-white border-2 border-slate-200 text-slate-700 font-bold py-4 rounded-xl flex items-center justify-center gap-2 hover:bg-slate-50 active:scale-[0.98] transition-all"
          >
            <Compass className="w-5 h-5" />
            What else is near here?
          </button>
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

  const renderAddLocation = () => {
    const searchLocation = userLocation || HOTEL_COORDINATES;
    
    return (
      <div className="flex flex-col h-full bg-slate-50">
        {/* Header */}
        <header className="p-4 bg-white shadow-sm flex items-center gap-3 sticky top-0 z-10">
          <button onClick={resetAddLocationView} className="p-2 hover:bg-slate-100 rounded-full">
            <ArrowLeft className="w-5 h-5 text-slate-700" />
          </button>
          <h2 className="text-lg font-bold text-slate-900">What should we do next?</h2>
        </header>

        {/* Search Input */}
        <div className="p-4 bg-white border-b border-slate-100">
          <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }} className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => handleSearchInputChange(e.target.value)}
              placeholder="Try 'Scottish Design Exchange' or 'coffee near me'"
              className="w-full bg-slate-100 rounded-xl px-4 py-3 pr-12 focus:outline-none focus:ring-2 focus:ring-amber-500"
              autoFocus
              maxLength={100}
            />
            <button
              type="submit"
              disabled={searchQuery.trim().length < 2 || isSearching}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-slate-900 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSearching ? <Loader className="w-5 h-5 animate-spin" /> : <Search className="w-5 h-5" />}
            </button>
          </form>
          {searchQuery.length > 0 && searchQuery.length < 2 && (
            <p className="text-xs text-slate-400 mt-2">Enter at least 2 characters to search</p>
          )}
        </div>

        {/* Results Area */}
        <div className="flex-1 overflow-y-auto p-4 pb-24">
          {/* Error State */}
          {searchError && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              {searchError.includes('internet') || searchError.includes('connection') ? (
                <WifiOff className="w-16 h-16 text-slate-400 mb-4" />
              ) : searchError.includes('Too many') ? (
                <AlertCircle className="w-16 h-16 text-amber-400 mb-4" />
              ) : (
                <AlertCircle className="w-16 h-16 text-red-400 mb-4" />
              )}
              <h3 className="font-bold text-slate-900 mb-2">
                {searchError.includes('internet') ? 'No Connection' : 
                 searchError.includes('Too many') ? 'Slow Down' : 
                 'Something went wrong'}
              </h3>
              <p className="text-sm text-slate-500 mb-4 max-w-xs">{searchError}</p>
              <button
                onClick={() => { setSearchError(null); handleSearch(); }}
                className="px-4 py-2 bg-slate-900 text-white rounded-lg font-medium"
              >
                Retry Search
              </button>
            </div>
          )}

          {/* Loading State */}
          {isSearching && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl p-3 shadow-sm animate-pulse">
                  <div className="flex gap-3">
                    <div className="w-24 h-24 bg-slate-200 rounded-xl" />
                    <div className="flex-1 space-y-3">
                      <div className="h-5 bg-slate-200 rounded w-3/4" />
                      <div className="h-4 bg-slate-200 rounded w-full" />
                      <div className="h-3 bg-slate-200 rounded w-1/2" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Empty State - No Results */}
          {!isSearching && !searchError && searchResults.length === 0 && searchQuery.trim().length >= 2 && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <Search className="w-16 h-16 text-slate-300 mb-4" />
              <h3 className="font-bold text-slate-900 mb-2">No results found</h3>
              <p className="text-sm text-slate-500 mb-4">Try a different search term or check the spelling</p>
              <button
                onClick={() => setSearchQuery('')}
                className="px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg font-medium"
              >
                Clear Search
              </button>
            </div>
          )}

          {/* Initial State - No search yet (CO1 Issue 3: improved empty state with tips) */}
          {!isSearching && !searchError && searchResults.length === 0 && searchQuery.trim().length < 2 && (
            <div className="flex flex-col items-center justify-center py-12 px-6 text-center">
              <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mb-4">
                <Search className="w-8 h-8 text-amber-600" />
              </div>
              <h3 className="text-lg font-bold text-slate-900 mb-2">Discover New Places</h3>
              <p className="text-sm text-slate-500 mb-4">
                Search for places you've heard about and add them to your collection.
              </p>
              <div className="flex flex-wrap gap-2 justify-center">
                {['Coffee shops', 'Design studios', 'Local restaurants', 'Art galleries'].map(term => (
                  <button
                    key={term}
                    onClick={() => setSearchQuery(term)}
                    className="px-3 py-1.5 bg-slate-100 text-slate-600 text-xs font-medium rounded-full hover:bg-slate-200 transition-colors"
                  >
                    {term}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Results */}
          {!isSearching && !searchError && searchResults.length > 0 && (
            <div className="space-y-3">
              {searchResults.map((result, index) => {
                const distanceKm = calculateDistance(searchLocation, result.geometry.location);
                const walkTime = getWalkingMinutes(distanceKm);
                const photoUrl = result.photos?.[0]?.photo_reference
                  ? getPhotoUrl(result.photos[0].photo_reference, 400)
                  : 'https://images.unsplash.com/photo-1486718448742-166226480961?auto=format&fit=crop&w=400&q=80';
                const isTopResult = index === 0;

                return (
                  <button
                    key={result.place_id}
                    onClick={() => handleSelectResult(result, index)}
                    className={`w-full bg-white rounded-2xl p-3 shadow-sm hover:shadow-md hover:bg-slate-50 transition-all border-l-4 ${
                      isTopResult ? 'border-amber-400' : 'border-transparent'
                    } text-left`}
                  >
                    <div className="flex gap-3">
                      {/* Photo */}
                      <div className="w-24 h-24 flex-shrink-0 rounded-xl overflow-hidden bg-slate-200">
                        <img 
                          src={photoUrl} 
                          alt={result.name} 
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1486718448742-166226480961?auto=format&fit=crop&w=400&q=80';
                          }}
                        />
                      </div>
                      
                      {/* Content */}
                      <div className="flex-1 flex flex-col items-start min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <h3 className="font-bold text-slate-900 text-base truncate">{result.name}</h3>
                          {isTopResult && (
                            <span className="text-[10px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 whitespace-nowrap">
                              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
                              Best Match
                            </span>
                          )}
                        </div>
                        
                        <p className="text-sm text-slate-500 line-clamp-1 mb-2 w-full">
                          {result.formatted_address}
                        </p>
                        
                        <div className="flex items-center gap-1 text-xs text-slate-400">
                          <MapPin className="w-3 h-3" />
                          <span>{walkTime} min walk ({distanceKm.toFixed(1)} km)</span>
                        </div>
                        
                        {result.rating && (
                          <div className="flex items-center gap-1 text-xs text-slate-400 mt-1">
                            <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                            <span>{result.rating} ({result.user_ratings_total || 0} reviews)</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

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
        places={allPlaces} 
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
      {view === 'ADD_LOCATION' && renderAddLocation()}

      {/* Toast Notification */}
      {toast && (
        <Toast
          message={toast.message}
          action={toast.action}
          actionLabel={toast.actionLabel}
          onClose={() => setToast(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && selectedPlace && (
        <DeleteConfirmModal
          placeName={selectedPlace.name}
          onConfirm={handleDeletePlace}
          onCancel={() => setShowDeleteModal(false)}
        />
      )}

      {/* Category Confirmation Modal (CO1/CO2 fix) */}
      {showCategoryModal && (selectedGoogleResult || selectedResult) && (
        <CategoryConfirmModal
          placeName={(selectedGoogleResult || selectedResult)!.name}
          suggestedCategory={suggestedCategory}
          onConfirm={handleConfirmAdd}
          onCancel={() => {
            setShowCategoryModal(false);
            setSelectedResult(null);
            setSelectedGoogleResult(null);
          }}
        />
      )}

      {/* Duplicate Detection Modal (Bug #2 fix) */}
      {showDuplicateModal && selectedPlace && (
        <DuplicateModal
          place={selectedPlace}
          onViewPlace={() => {
            setShowDuplicateModal(false);
            navigateToView('DETAIL', { preserveSearchState: true });
          }}
          onSearchAgain={() => {
            setShowDuplicateModal(false);
            setSelectedPlace(null);
          }}
        />
      )}

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
         
         <button 
           onClick={() => {
             analytics.addLocationButtonTapped();
             setSearchQuery('');
             setSearchResults([]);
             setSearchError(null);
             setView('ADD_LOCATION');
           }}
           className={`flex flex-col items-center gap-1 w-12 ${view === 'ADD_LOCATION' ? 'text-amber-400' : 'hover:text-white'}`}
         >
           <Plus className="w-6 h-6" />
           <span className="text-[10px] font-bold uppercase">Add</span>
         </button>
      </nav>
    </div>
  );
}
