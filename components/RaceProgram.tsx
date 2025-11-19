
import React, { useMemo, useState } from 'react';
import { RaceEvent, DashboardEvent, Sport } from '../types';
import { EmptyState } from './ui/Feedback';

interface RaceProgramProps {
  appData: {
    raceEvents: RaceEvent[];
    dashboardEvents: DashboardEvent[];
    sportsList: Sport[];
  };
  isAdmin: boolean;
  setCurrentView: (view: string) => void;
}

const MaterialSymbol: React.FC<{ name: string; className?: string; }> = ({ name, className }) => (
    <span className={`material-symbols-rounded ${className || ''}`}>{name}</span>
);

const COLOR_DETAILS: { [key: string]: { name: string; rgb: string } } = {
    blue: { name: 'accent-blue', rgb: '66, 133, 244' }, red: { name: 'accent-red', rgb: '234, 67, 53' },
    yellow: { name: 'accent-yellow', rgb: '251, 188, 5' }, green: { name: 'accent-green', rgb: '52, 168, 83' },
    purple: { name: 'accent-purple', rgb: '142, 68, 173' }, orange: { name: 'accent-orange', rgb: '230, 126, 34' },
    teal: { name: 'accent-teal', rgb: '20, 184, 166' }, pink: { name: 'accent-pink', rgb: '236, 72, 153' },
    indigo: { name: 'accent-indigo', rgb: '99, 102, 241' },
};

const getEventColorInfo = (sportName: string) => {
    const colorKeys = Object.keys(COLOR_DETAILS);
    if (!sportName) {
        const defaultColor = COLOR_DETAILS['blue'];
        return {
            colorVar: `var(--${defaultColor.name})`,
            colorRgb: defaultColor.rgb
        };
    }
    let hash = 0;
    for (let i = 0; i < sportName.length; i++) hash = sportName.charCodeAt(i) + ((hash << 5) - hash);
    const colorKey = colorKeys[Math.abs(hash) % colorKeys.length];
    const selectedColor = COLOR_DETAILS[colorKey as keyof typeof COLOR_DETAILS];
    return {
        colorVar: `var(--${selectedColor.name})`,
        colorRgb: selectedColor.rgb
    };
};

type CombinedEvent = (RaceEvent | DashboardEvent) & { isOngoing: boolean; isPast: boolean };

const TimelineEvent: React.FC<{ event: CombinedEvent; isLast: boolean; logoUrl?: string; }> = ({ event, isLast, logoUrl }) => {
    const sportName = (event as RaceEvent).sport || (event as DashboardEvent).title;
    const { colorVar, colorRgb } = getEventColorInfo(sportName);
    const { category, gender } = event as RaceEvent;

    const getGenderIcon = (gender?: string) => {
        switch (gender) {
            case 'Maschile': return 'man';
            case 'Femminile': return 'woman';
            case 'Misto': return 'wc';
            default: return null;
        }
    };

    const openMap = (e: React.MouseEvent, loc: string) => {
        e.stopPropagation();
        const query = encodeURIComponent(loc + ", Pinerolo");
        window.open(`https://www.google.com/maps/search/?api=1&query=${query}`, '_blank');
    }

    return (
        <div className="flex relative pl-6 pb-8 group">
            {/* Timeline Line */}
            {!isLast && <div className="absolute left-[11px] top-4 bottom-0 w-0.5 bg-surface-3 border-l-2 border-dotted border-surface-3"></div>}
            
            {/* Timeline Dot */}
            <div 
                className="absolute left-0 top-1.5 w-6 h-6 rounded-full border-4 border-surface-1 z-10 transition-transform group-hover:scale-125"
                style={{ backgroundColor: event.isOngoing ? 'var(--accent-green)' : colorVar }}
            ></div>

            <div className={`flex-grow bg-surface-1 rounded-2xl p-4 border border-surface-2 shadow-m3-sm hover:shadow-m3-md transition-all ${event.isPast ? 'opacity-70 grayscale-[0.5]' : ''}`}>
                <div className="flex justify-between items-start mb-2">
                    <div className="flex items-center gap-3">
                         {logoUrl ? (
                             <img src={logoUrl} alt={sportName} className="w-8 h-8 object-contain" />
                         ) : (
                            <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center">
                                <MaterialSymbol name="sports_score" className="text-lg text-text-color-secondary"/>
                            </div>
                         )}
                         <div>
                             <h3 className="font-bold text-lg leading-tight text-text-color">{sportName}</h3>
                             <div className="text-sm font-mono font-medium text-text-color-secondary">
                                {event.startTime} - {event.endTime}
                             </div>
                         </div>
                    </div>
                    {event.isOngoing && <span className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100 text-xs font-bold px-2 py-1 rounded-full animate-pulse">LIVE</span>}
                </div>

                <button 
                    onClick={(e) => openMap(e, event.location || '')}
                    className="text-sm text-text-color-secondary mb-3 flex items-center gap-1 hover:text-primary transition-colors w-fit"
                >
                    <MaterialSymbol name="location_on" className="text-base"/>
                    <span className="truncate">{event.location}</span>
                </button>

                <div className="flex flex-wrap gap-2">
                     {category && (
                        <span className="px-2 py-1 rounded-lg text-xs font-bold bg-surface-2 text-text-color-secondary">
                            {category}
                        </span>
                    )}
                    {gender && (
                        <span className="px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1" style={{ backgroundColor: `rgba(${colorRgb}, 0.15)`, color: colorVar }}>
                             {getGenderIcon(gender) && <MaterialSymbol name={getGenderIcon(gender)!} className="text-sm" />}
                            {gender}
                        </span>
                    )}
                </div>
            </div>
        </div>
    );
};

const RaceProgram: React.FC<RaceProgramProps> = ({ appData, isAdmin, setCurrentView }) => {
    const { raceEvents, dashboardEvents, sportsList } = appData;
    const [filterSport, setFilterSport] = useState<string>('Tutti');
    
    const sportDetailsMap = useMemo(() => {
        return new Map(sportsList.map(sport => [sport.id, { logoUrl: sport.logoUrl }]));
    }, [sportsList]);

    const availableSports = useMemo(() => {
        const sports = new Set(raceEvents.map(e => e.sport).filter(Boolean));
        return ['Tutti', ...Array.from(sports).sort()];
    }, [raceEvents]);

    const eventsByDate = useMemo(() => {
        const allEvents: (RaceEvent | DashboardEvent)[] = [ ...raceEvents, ...dashboardEvents.filter(e => e.showInRaceProgram) ];
        const now = new Date();

        const combinedEvents: CombinedEvent[] = allEvents.map(event => {
            try {
                const dateStr = event.date?.includes('-') ? event.date : event.date?.split('/').reverse().join('-');
                if (!dateStr || !event.startTime || !event.endTime) return null;
                const start = new Date(`${dateStr}T${event.startTime}`);
                const end = new Date(`${dateStr}T${event.endTime}`);
                return { ...event, isPast: end < now, isOngoing: start <= now && end >= now };
            } catch { return null; }
        }).filter((e): e is CombinedEvent => e !== null);

        const filtered = combinedEvents.filter(event => {
            if (filterSport !== 'Tutti') {
                const sportName = (event as RaceEvent).sport || (event as DashboardEvent).title;
                return sportName === filterSport;
            }
            return true;
        });

        return filtered.reduce((acc, event) => {
            const dateKey = event.date?.includes('/') ? event.date.split('/').reverse().join('-') : (event.date || 'N-A');
            if (!acc[dateKey]) acc[dateKey] = [];
            acc[dateKey].push(event);
            return acc;
        }, {} as Record<string, CombinedEvent[]>);

    }, [raceEvents, dashboardEvents, filterSport]);

    const sortedDateKeys = useMemo(() => {
        return Object.keys(eventsByDate).sort();
    }, [eventsByDate]);


    return (
        <div className="space-y-6 animate-fade-in pb-20">
            <div className="p-6 border-l-4 border-orange-500 bg-orange-50 dark:bg-orange-900/20 rounded-r-2xl shadow-sm">
                <h1 className="font-serif text-3xl text-orange-800 dark:text-orange-100 font-bold">Programma Gare</h1>
                <p className="text-orange-700 dark:text-orange-200 mt-1">
                    Segui gli eventi in tempo reale. Filtra per sport per trovare quello che ti interessa.
                </p>
            </div>

            <div className="sticky top-[70px] z-30 bg-surface/95 backdrop-blur-md py-3 -mx-4 px-4 border-b border-surface-2 flex gap-2 overflow-x-auto no-scrollbar">
                 {availableSports.map(sport => (
                    <button
                        key={sport}
                        onClick={() => setFilterSport(sport)}
                        className={`whitespace-nowrap px-4 py-2 rounded-full font-bold text-sm transition-all ${
                            filterSport === sport 
                            ? 'bg-primary text-on-primary shadow-md' 
                            : 'bg-surface-2 text-text-color-secondary hover:bg-surface-3'
                        }`}
                    >
                        {sport}
                    </button>
                ))}
            </div>

            {sortedDateKeys.length > 0 ? (
                sortedDateKeys.map(dateKey => {
                    const eventsForDate = eventsByDate[dateKey].sort((a,b) => a.startTime.localeCompare(b.startTime));
                    const dateObj = new Date(dateKey);
                    const formattedDate = dateObj.toLocaleDateString('it-IT', { weekday: 'long', day: 'numeric', month: 'long' });

                    return (
                        <div key={dateKey} className="mb-8">
                            <div className="flex items-center gap-4 mb-4">
                                <h2 className="text-2xl font-serif font-bold text-text-color capitalize">{formattedDate}</h2>
                                <div className="h-px bg-surface-3 flex-grow"></div>
                            </div>
                            <div className="ml-2">
                                {eventsForDate.map((event, index) => {
                                    const sportName = (event as RaceEvent).sport || (event as DashboardEvent).title;
                                    const details = sportDetailsMap.get(sportName);
                                    return <TimelineEvent key={event.id} event={event} isLast={index === eventsForDate.length - 1} logoUrl={details?.logoUrl} />
                                })}
                            </div>
                        </div>
                    );
                })
            ) : (
                <EmptyState 
                    icon="event_busy" 
                    title="Nessun evento trovato" 
                    description="Prova a cambiare i filtri di ricerca." 
                    actionLabel="Mostra tutti"
                    onAction={() => setFilterSport('Tutti')}
                />
            )}
        </div>
    );
};

export default RaceProgram;
