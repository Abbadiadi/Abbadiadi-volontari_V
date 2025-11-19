
import React, { useMemo, useState } from 'react';
import { Location } from '../types';
import { EmptyState } from './ui/Feedback';

interface LocationsViewProps {
    locations: Location[];
}

const LocationsView: React.FC<LocationsViewProps> = ({ locations }) => {
    const [filter, setFilter] = useState('');

    const filteredLocations = useMemo(() => {
        return locations.filter(l => l.id.toLowerCase().includes(filter.toLowerCase()));
    }, [locations, filter]);

    const openMap = (locationId: string) => {
        const query = encodeURIComponent(locationId + ", Pinerolo"); // Defaulting to Pinerolo context if generic
        window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    };

    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="p-6 border-l-4 border-teal-500 bg-teal-50 dark:bg-teal-900/20 rounded-r-2xl shadow-sm">
                <h1 className="font-serif text-3xl text-teal-800 dark:text-teal-100 font-bold">Luoghi Evento</h1>
                <p className="text-teal-700 dark:text-teal-200 mt-1">
                    Trova rapidamente dove devi andare. Tocca una card per aprire il navigatore.
                </p>
            </div>

            <div className="relative">
                <span className="material-symbols-rounded absolute left-4 top-1/2 -translate-y-1/2 text-text-color-secondary">search</span>
                <input 
                    type="text" 
                    placeholder="Cerca un luogo..." 
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                    className="w-full pl-12 pr-4 py-3 bg-surface-1 border border-surface-3 rounded-2xl focus:ring-2 focus:ring-primary focus:outline-none shadow-sm"
                />
            </div>

            {filteredLocations.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredLocations.map(loc => (
                        <div 
                            key={loc.id} 
                            onClick={() => openMap(loc.id)}
                            className="group bg-surface-1 p-4 rounded-2xl border border-surface-2 shadow-m3-sm hover:shadow-m3-md transition-all cursor-pointer flex items-center justify-between active:scale-[0.98]"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300 flex items-center justify-center group-hover:bg-teal-500 group-hover:text-white transition-colors">
                                    <span className="material-symbols-rounded text-2xl">location_on</span>
                                </div>
                                <span className="font-bold text-lg">{loc.id}</span>
                            </div>
                            <span className="material-symbols-rounded text-text-color-secondary group-hover:translate-x-1 transition-transform">arrow_forward</span>
                        </div>
                    ))}
                </div>
            ) : (
                <EmptyState 
                    icon="wrong_location" 
                    title="Nessun luogo trovato" 
                    description={`Non abbiamo trovato luoghi che corrispondono a "${filter}".`} 
                    actionLabel="Mostra tutti"
                    onAction={() => setFilter('')}
                />
            )}
        </div>
    );
};

export default LocationsView;
