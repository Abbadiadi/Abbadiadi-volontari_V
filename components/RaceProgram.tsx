import React, { useMemo, useState } from 'react';
import { RaceEvent, DashboardEvent, Sport } from '../types';
import { db } from '../services/firebase';
import { writeBatch, doc } from "firebase/firestore";
import { Modal, showToast } from '../App';
import Spinner from './ui/Spinner';


interface RaceProgramProps {
  appData: {
    raceEvents: RaceEvent[];
    dashboardEvents: DashboardEvent[];
    sportsList: Sport[];
  };
  isAdmin: boolean;
  setCurrentView: (view: string) => void;
}

// ====================================================================
// # HELPER COMPONENTS (Scoped to RaceProgram)
// ====================================================================

const MaterialSymbol: React.FC<{ name: string; className?: string; }> = ({ name, className }) => (
    <span className={`material-symbols-rounded ${className || ''}`}>{name}</span>
);

const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-text-color-secondary mb-1">{label}</label>
        <input {...props} className="w-full p-3 bg-surface-2 border border-surface-3 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition" />
    </div>
);

const SetDateForRaceEventsModal: React.FC<{ onClose: () => void; events: RaceEvent[]; }> = ({ onClose, events }) => {
    const [targetDate, setTargetDate] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleUpdate = async () => {
        if (!targetDate) {
            showToast("Per favore, seleziona una data.", 'error');
            return;
        }
        setIsLoading(true);
        try {
            const batch = writeBatch(db);
            events.forEach(event => {
                const eventRef = doc(db, 'race_events', event.id);
                batch.update(eventRef, { date: targetDate });
            });
            await batch.commit();
            showToast(`Tutti i ${events.length} eventi sono stati aggiornati al ${new Date(targetDate).toLocaleDateString('it-IT')}!`, 'success');
            onClose();
        } catch (error) {
            console.error("Failed to update all race events:", error);
            showToast("Si è verificato un errore durante l'aggiornamento.", 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal title="Imposta Data Unica per Eventi Gara" onClose={onClose}>
            <div className="space-y-4">
                <p className="text-text-color-secondary">
                    Questa azione modificherà la data di <strong>tutti gli eventi di tipo 'Gara'</strong>.
                    L'operazione non può essere annullata.
                </p>
                <FormInput
                    label="Seleziona la nuova data"
                    type="date"
                    value={targetDate}
                    onChange={(e) => setTargetDate(e.target.value)}
                    required
                />
                 <div className="pt-4">
                    <button
                        onClick={handleUpdate}
                        disabled={isLoading}
                        className="w-full bg-accent-orange text-white p-3 rounded-full font-bold flex justify-center items-center gap-2 hover:opacity-90 transition disabled:opacity-50"
                    >
                        {isLoading ? <Spinner /> : 'Applica a Tutti gli Eventi'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};


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

const EventRow: React.FC<{ event: CombinedEvent; isLast: boolean; logoUrl?: string; }> = ({ event, isLast, logoUrl }) => {
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

    return (
        <div className={`
            flex items-stretch transition-colors hover:bg-surface-2/50
            ${!isLast ? 'border-b border-surface-3' : ''}
            ${event.isPast ? 'opacity-60' : ''}
        `}>
            {/* Color Bar */}
            <div
                className="w-2 flex-shrink-0"
                style={{ backgroundColor: event.isOngoing ? 'var(--accent-green)' : colorVar }}
            ></div>

            {/* Time Block */}
            <div className="w-24 flex-shrink-0 flex flex-col items-center justify-center p-2 text-center" style={{ backgroundColor: `rgba(${colorRgb}, 0.15)` }}>
                <p className="font-mono font-bold text-lg text-text-color">{event.startTime}</p>
                <div className="w-px h-2 bg-surface-3 my-0.5"></div>
                <p className="font-mono text-sm text-text-color-secondary">{event.endTime}</p>
            </div>

            {/* Main Details */}
            <div className="flex-grow p-3 min-w-0">
                <div className="flex justify-between items-start">
                     <div className="flex items-center gap-3 min-w-0">
                        {logoUrl && <img src={logoUrl} alt={`${sportName} logo`} className="w-7 h-7 flex-shrink-0 object-contain" />}
                        <h3 className="font-extrabold text-lg leading-tight truncate" style={{ color: colorVar }}>
                            {sportName}
                        </h3>
                    </div>
                    <div className="flex-shrink-0 ml-2">
                        {event.isOngoing && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-500 text-white pulse-badge-animation">LIVE</span>}
                        {event.isPast && !event.isOngoing && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-surface-3 text-text-color-secondary flex items-center gap-1"><MaterialSymbol name="check" className="text-sm"/>CONCLUSO</span>}
                    </div>
                </div>

                <p className="text-sm text-text-color-secondary mt-1 flex items-center gap-1.5">
                    <MaterialSymbol name="location_on" className="text-base flex-shrink-0" />
                    <span className="truncate">{event.location}</span>
                </p>

                <div className="mt-2 flex items-center flex-wrap gap-2 text-xs font-medium">
                    {category && (
                        <span
                            className="px-2.5 py-1 rounded-full"
                            style={{ backgroundColor: `rgba(${colorRgb}, 0.2)`, color: colorVar }}
                        >
                            {category}
                        </span>
                    )}
                    {gender && getGenderIcon(gender) && (
                        <span
                            className="flex items-center gap-1 px-2.5 py-1 rounded-full"
                            style={{ backgroundColor: `rgba(${colorRgb}, 0.2)`, color: colorVar }}
                        >
                            <MaterialSymbol name={getGenderIcon(gender)!} className="text-sm" />
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
    const [isSetDateModalOpen, setIsSetDateModalOpen] = useState(false);
    
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

        // Group by date, standardizing to YYYY-MM-DD
        return filtered.reduce((acc, event) => {
            const dateKey = event.date?.includes('/') ? event.date.split('/').reverse().join('-') : (event.date || 'N-A');
            if (!acc[dateKey]) acc[dateKey] = [];
            acc[dateKey].push(event);
            return acc;
        }, {} as Record<string, CombinedEvent[]>);

    }, [raceEvents, dashboardEvents, filterSport]);

    const sortedDateKeys = useMemo(() => {
        const now = new Date();
        now.setHours(0, 0, 0, 0); // Start of today
        return Object.keys(eventsByDate).sort((a, b) => {
            const dateA = new Date(a);
            const dateB = new Date(b);

            const aIsPast = dateA < now;
            const bIsPast = dateB < now;

            if (aIsPast && !bIsPast) return 1;
            if (!aIsPast && bIsPast) return -1;

            // if both are future or both are past, sort chronologically
            return dateA.getTime() - dateB.getTime();
        });
    }, [eventsByDate]);


    return (
        <div className="space-y-6 animate-fade-in">
            <div className="p-4 border-l-4 border-primary bg-primary-container rounded-r-lg">
                <h1 className="font-serif text-3xl text-on-primary-container font-bold">Programma Gare</h1>
                <p className="text-on-primary-container/90 mt-1">
                    Consulta il programma completo degli eventi. Gli eventi in corso sono evidenziati.
                </p>
            </div>

            <div className="p-3 bg-surface-1 rounded-full border border-surface-2 flex flex-wrap gap-2 items-center justify-center sticky top-[70px] z-30 shadow-m3-sm">
                <div className="relative">
                    <MaterialSymbol name="sports_soccer" className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-color-secondary" />
                    <select
                        aria-label="Filtra per sport"
                        value={filterSport}
                        onChange={(e) => setFilterSport(e.target.value)}
                        className="appearance-none bg-surface-2 hover:bg-surface-3 text-text-color-secondary font-semibold rounded-full pl-10 pr-8 py-2 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                        {availableSports.map(sport => (
                            <option key={sport} value={sport}>{sport === 'Tutti' ? 'Tutti gli Sport' : sport}</option>
                        ))}
                    </select>
                    <MaterialSymbol name="arrow_drop_down" className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-text-color-secondary" />
                </div>
                 {isAdmin && (
                    <div className="flex items-center gap-2 border-l border-surface-3 ml-2 pl-4">
                        <button onClick={() => setIsSetDateModalOpen(true)} className="bg-orange-500/20 text-orange-600 dark:text-orange-300 font-semibold rounded-full px-4 py-2 text-sm flex items-center gap-2 hover:bg-orange-500/30 transition">
                            <MaterialSymbol name="calendar_month" className="text-base" />
                            Imposta Data Unica
                        </button>
                        <button onClick={() => setCurrentView('admin-race-program')} className="bg-blue-500/20 text-blue-600 dark:text-blue-300 font-semibold rounded-full px-4 py-2 text-sm flex items-center gap-2 hover:bg-blue-500/30 transition">
                             <MaterialSymbol name="edit" className="text-base" />
                            Modifica Avanzata
                        </button>
                    </div>
                )}
            </div>

            {sortedDateKeys.length > 0 ? (
                sortedDateKeys.map(dateKey => {
                    const eventsForDate = eventsByDate[dateKey].sort((a,b) => a.startTime.localeCompare(b.startTime));
                    const dateObj = new Date(dateKey);
                    const formattedDate = dateObj.toLocaleDateString('it-IT', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

                    return (
                        <div key={dateKey}>
                            <h2 className="text-xl font-serif font-bold text-secondary sticky top-[135px] bg-surface/80 backdrop-blur-sm py-2 z-20 px-2 -mx-2">
                               {formattedDate}
                            </h2>
                            <div className="mt-2 bg-surface-1 rounded-2xl overflow-hidden border border-surface-3">
                                {eventsForDate.map((event, index) => {
                                    const sportName = (event as RaceEvent).sport || (event as DashboardEvent).title;
                                    const details = sportDetailsMap.get(sportName);
                                    return <EventRow key={event.id} event={event} isLast={index === eventsForDate.length - 1} logoUrl={details?.logoUrl} />
                                })}
                            </div>
                        </div>
                    );
                })
            ) : (
                <div className="text-center py-10 bg-surface-1 rounded-2xl">
                    <MaterialSymbol name="search_off" className="text-5xl text-text-color-secondary" />
                    <p className="mt-2 text-text-color-secondary">Nessun evento corrisponde ai filtri selezionati.</p>
                </div>
            )}
            {isSetDateModalOpen && <SetDateForRaceEventsModal events={appData.raceEvents} onClose={() => setIsSetDateModalOpen(false)} />}
        </div>
    );
};

export default RaceProgram;