import React, { useState, useMemo, useEffect } from 'react';
import { Volunteer, Shift, Assignment } from '../types';

interface MyShiftsProps {
  currentUser: Volunteer;
  appData: {
    shifts: Shift[];
    assignments: Assignment[];
    volunteers: Volunteer[];
  };
  isDashboard?: boolean;
}

const COLOR_DETAILS: { [key: string]: { name: string; rgb: string; gradient: string; } } = {
    blue: { name: 'accent-blue', rgb: '66, 133, 244', gradient: 'from-blue-500 to-indigo-500' },
    red: { name: 'accent-red', rgb: '234, 67, 53', gradient: 'from-red-500 to-rose-500' },
    yellow: { name: 'accent-yellow', rgb: '251, 188, 5', gradient: 'from-yellow-400 to-amber-500' },
    green: { name: 'accent-green', rgb: '52, 168, 83', gradient: 'from-green-500 to-emerald-500' },
    purple: { name: 'accent-purple', rgb: '142, 68, 173', gradient: 'from-purple-500 to-violet-500' },
    orange: { name: 'accent-orange', rgb: '230, 126, 34', gradient: 'from-orange-500 to-amber-600' },
    teal: { name: 'accent-teal', rgb: '20, 184, 166', gradient: 'from-teal-400 to-cyan-500' },
    pink: { name: 'accent-pink', rgb: '236, 72, 153', gradient: 'from-pink-500 to-rose-500' },
    indigo: { name: 'accent-indigo', rgb: '99, 102, 241', gradient: 'from-indigo-500 to-violet-600' },
};

const getCategoryStyleInfo = (shift: Partial<Shift>) => {
    // Prioritize the color property from the shift object if it's a valid color key
    if (shift.color && COLOR_DETAILS[shift.color]) {
        const selectedColor = COLOR_DETAILS[shift.color as keyof typeof COLOR_DETAILS];
        return {
            colorVar: `var(--${selectedColor.name})`,
            colorRgb: selectedColor.rgb,
            gradient: selectedColor.gradient,
        };
    }

    const categoryName = shift.categoria;
    const colorKeys = Object.keys(COLOR_DETAILS);
    if (!categoryName) {
        const defaultColor = COLOR_DETAILS['blue'];
        return {
            colorVar: `var(--${defaultColor.name})`,
            colorRgb: defaultColor.rgb,
            gradient: defaultColor.gradient,
        };
    }
    let hash = 0;
    for (let i = 0; i < categoryName.length; i++) {
        hash = categoryName.charCodeAt(i) + ((hash << 5) - hash);
    }
    const colorKey = colorKeys[Math.abs(hash) % colorKeys.length];
    const selectedColor = COLOR_DETAILS[colorKey as keyof typeof COLOR_DETAILS];

    return {
        colorVar: `var(--${selectedColor.name})`,
        colorRgb: selectedColor.rgb,
        gradient: selectedColor.gradient,
    };
};


const toTitleCase = (str: string): string => {
    if (!str) return '';
    if (str === str.toUpperCase()) {
        return str.replace(
            /\w\S*/g,
            (txt) => txt.charAt(0).toUpperCase() + txt.substring(1).toLowerCase()
        );
    }
    return str;
};

const DetailRow: React.FC<{icon: string, text?: string, children?: React.ReactNode, color: string, colorRgb: string}> = ({icon, text, children, color, colorRgb}) => (
    <div className="flex items-start gap-4">
        <div 
            className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full" 
            style={{ backgroundColor: `rgba(${colorRgb}, 0.2)` }}
        >
            <span className="material-symbols-rounded text-lg" style={{ color: color }}>{icon}</span>
        </div>
        <div className="text-text-color-secondary flex-1 pt-1">
            {text && <p>{text}</p>}
            {children}
        </div>
    </div>
);


const ShiftCard: React.FC<{ shift: Shift; colleagues: Volunteer[]; isUpNext: boolean; }> = ({ shift, colleagues, isUpNext }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [progress, setProgress] = useState(0);

    const { isPast, isOngoing } = useMemo(() => {
        try {
            const now = new Date();
            const start = new Date(`${shift.data_inizio.split('/').reverse().join('-')}T${shift.ora_inizio}`);
            const end = new Date(`${shift.data_inizio.split('/').reverse().join('-')}T${shift.ora_fine}`);
            return {
                isPast: end < now,
                isOngoing: now >= start && now <= end
            };
        } catch {
            return { isPast: false, isOngoing: false };
        }
    }, [shift.data_inizio, shift.ora_inizio, shift.ora_fine]);

    useEffect(() => {
        const calculateProgress = () => {
             try {
                const now = new Date();
                const start = new Date(`${shift.data_inizio.split('/').reverse().join('-')}T${shift.ora_inizio}`);
                const end = new Date(`${shift.data_inizio.split('/').reverse().join('-')}T${shift.ora_fine}`);
                if (now < start) return 0;
                if (now > end) return 100;
                return Math.min(100, ((now.getTime() - start.getTime()) / (end.getTime() - start.getTime())) * 100);
             } catch { return 0; }
        };

        if (isOngoing) {
            setProgress(calculateProgress());
            const interval = setInterval(() => setProgress(calculateProgress()), 60000);
            return () => clearInterval(interval);
        }
    }, [isOngoing, shift]);
    
    const { colorVar, colorRgb, gradient } = getCategoryStyleInfo(shift);
    const formattedTitle = toTitleCase(shift.nome_turno);

    // Dynamic classes for shrinking effect
    const contentPadding = isExpanded ? 'py-2 px-4' : 'pt-2 pb-3 px-4';
    const timeSize = isExpanded ? 'text-2xl' : 'text-3xl';
    const titleSize = isExpanded ? 'text-base' : 'text-lg';

    return (
        <div className={`rounded-4xl shadow-m3-md overflow-hidden transition-all duration-300 ${isPast ? 'opacity-70 filter grayscale' : ''}`}>
            <div className="relative cursor-pointer" onClick={() => setIsExpanded(!isExpanded)}>
                {/* Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`}></div>
                
                 {/* Progress overlay for ongoing shifts */}
                {isOngoing && (
                    <div className="absolute inset-0 bg-white/25 backdrop-blur-[2px] transition-all duration-500" style={{ clipPath: `inset(0 ${100 - progress}% 0 0)` }}></div>
                )}
                
                {/* Main Content */}
                <div className={`relative z-10 text-white flex flex-col transition-all duration-300 ${contentPadding}`}>
                     {/* Header: UP NEXT and expand button */}
                    <div className="flex justify-end items-center gap-2 -mr-1">
                        {isUpNext && !isPast && !isExpanded && <div className="text-xs font-bold uppercase tracking-widest bg-black/20 px-3 py-1 rounded-full mr-auto">Prossimo Turno</div>}
                        <button className={`p-1 rounded-full bg-black/10 hover:bg-black/20 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                            <span className="material-symbols-rounded">expand_more</span>
                        </button>
                    </div>

                    {/* Time and Title */}
                    <div className="flex-grow transition-all duration-300">
                        <h2 className={`font-mono font-bold transition-all duration-300 ${timeSize}`} style={{ textShadow: '0 2px 4px rgba(0,0,0,0.2)' }}>
                            {shift.ora_inizio} - {shift.ora_fine}
                        </h2>
                        <h3 className={`font-bold transition-all duration-300 ${titleSize}`} style={{ textShadow: '0 1px 3px rgba(0,0,0,0.2)' }}>{formattedTitle}</h3>
                    </div>
                    
                    {/* Collapsible section for location and badges */}
                    <div className={`transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-0 opacity-0' : 'max-h-40 opacity-100 mt-2'}`}>
                        <div className="flex items-center gap-2 mb-2 flex-wrap">
                            <p className="text-sm font-bold uppercase tracking-wider px-2 py-0.5 rounded-md" style={{ backgroundColor: 'rgba(0,0,0,0.2)' }}>{shift.categoria}</p>
                            {isOngoing && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-400 text-green-900 pulse-badge-animation">IN CORSO</span>}
                            {isPast && 
                                <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-black/20 text-white/80">
                                    <span className="material-symbols-rounded text-sm">check_circle</span>
                                    Concluso
                                </span>
                            }
                        </div>
                        <div className="flex items-center justify-between gap-2">
                            {/* Location Pill */}
                            <div className="bg-white/95 backdrop-blur-sm text-gray-800 rounded-full flex items-center shadow-inner p-1 pr-3 gap-2 min-w-0 flex-grow">
                                <div className="flex-shrink-0 flex items-center justify-center rounded-full w-7 h-7" style={{ backgroundColor: `rgba(${colorRgb}, 0.15)` }}>
                                    <span className="material-symbols-rounded text-base" style={{ color: colorVar }}>location_on</span>
                                </div>
                                <div className="flex-grow min-w-0">
                                    <p className="font-bold truncate text-sm">{shift.luogo}</p>
                                </div>
                            </div>
                            {/* Date Pill */}
                            <div className="bg-white/90 backdrop-blur-sm text-gray-800 rounded-full flex-shrink-0">
                                <p className="font-semibold text-xs px-3 py-1.5">{shift.data_inizio.split('/').slice(0, 2).join('/')}</p>
                            </div>
                        </div>
                    </div>
                </div>
                 {isOngoing && ( <div className="absolute inset-0 rounded-4xl pointer-events-none pulse-ring-animation"></div> )}
            </div>
            
             {/* Expanded Details Section */}
            <div 
                className={`transition-all duration-300 ease-in-out overflow-hidden text-text-color ${isExpanded ? 'max-h-[500px]' : 'max-h-0'}`}
                style={{ backgroundColor: `rgba(${colorRgb}, 0.15)` }}
            >
                <div className="p-4 space-y-3">
                    <DetailRow icon="label" color={colorVar} colorRgb={colorRgb}>
                        <div className="flex items-center gap-2 flex-wrap">
                            <p className="font-semibold text-text-color">{shift.categoria}</p>
                            {isOngoing && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-700">IN CORSO</span>}
                            {isPast && 
                                <span className="flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-surface-3">
                                    <span className="material-symbols-rounded text-sm">check_circle</span>
                                    Concluso
                                </span>
                            }
                        </div>
                    </DetailRow>
                    <DetailRow icon="location_on" text={`${shift.luogo}`} color={colorVar} colorRgb={colorRgb} />
                    <DetailRow icon="notes" text={shift.descrizione} color={colorVar} colorRgb={colorRgb} />
                    <DetailRow icon="calendar_month" text={shift.data_inizio} color={colorVar} colorRgb={colorRgb} />
                    <DetailRow icon="group" color={colorVar} colorRgb={colorRgb}>
                         {colleagues.length > 0 ? (
                            <div className="flex flex-wrap gap-1">
                                {colleagues.map(v => <span key={v.id} className="bg-surface-3 px-2 py-1 text-xs rounded-md">{v.nome} {v.cognome.charAt(0)}.</span>)}
                            </div>
                        ) : <p className="text-text-color-secondary text-xs">Sei l'unico assegnato.</p>}
                    </DetailRow>
                </div>
            </div>
        </div>
    );
};


const MyShifts: React.FC<MyShiftsProps> = ({ currentUser, appData, isDashboard = false }) => {
    const { shifts, assignments, volunteers } = appData;
    
    const sortedMyShifts = useMemo(() => {
        if (isDashboard) { // On dashboard, shifts are pre-filtered and sorted
            return shifts;
        }
        const myAssignmentIds = new Set(assignments.filter(a => a.email_volontario === currentUser.email).map(a => a.id_turno));
        return shifts
            .filter(s => myAssignmentIds.has(s.id_turno))
            .sort((a, b) => {
                try {
                    const startA = new Date(`${a.data_inizio.split('/').reverse().join('-')}T${a.ora_inizio}`);
                    const startB = new Date(`${b.data_inizio.split('/').reverse().join('-')}T${b.ora_inizio}`);
                    const endA = new Date(`${a.data_inizio.split('/').reverse().join('-')}T${a.ora_fine}`);
                    const endB = new Date(`${b.data_inizio.split('/').reverse().join('-')}T${b.ora_fine}`);
                    const now = new Date();

                    const aIsPast = endA < now;
                    const bIsPast = endB < now;

                    // Grouping: future shifts first, then past shifts
                    if (!aIsPast && bIsPast) return -1;
                    if (aIsPast && !bIsPast) return 1;

                    // Sorting within groups
                    if (!aIsPast && !bIsPast) {
                        // Both are future/ongoing, sort by start time ascending
                        return startA.getTime() - startB.getTime();
                    } else {
                        // Both are past, sort by end time descending
                        return endB.getTime() - endA.getTime();
                    }

                } catch { return 0; }
            });
    }, [assignments, shifts, currentUser.email, isDashboard]);
    
    const upNextShiftId = useMemo(() => {
        const now = new Date();
        const firstUpcoming = sortedMyShifts.find(s => {
             try {
                const end = new Date(`${s.data_inizio.split('/').reverse().join('-')}T${s.ora_fine}`);
                return end >= now;
            } catch { return false; }
        });
        return firstUpcoming ? firstUpcoming.id : null;
    }, [sortedMyShifts]);


    const getColleaguesForShift = (shiftIdTurno: string) => {
        const colleagueEmails = assignments
            .filter(a => a.id_turno === shiftIdTurno && a.email_volontario !== currentUser.email)
            .map(a => a.email_volontario);
        return volunteers.filter(v => colleagueEmails.includes(v.email));
    };

    return (
        <div className={isDashboard ? '' : 'animate-fade-in'}>
            {!isDashboard && (
                 <div className="mb-6 p-4 border-l-4 border-primary bg-primary-container rounded-r-lg">
                    <p className="font-serif text-lg text-on-primary-container">
                        Qui trovi l'elenco di tutti i turni che ti sono stati assegnati. Tocca una card per vederne i dettagli e i colleghi.
                    </p>
                </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedMyShifts.length > 0 ? (
                    sortedMyShifts.map(shift => (
                        <ShiftCard key={shift.id} shift={shift} colleagues={getColleaguesForShift(shift.id_turno)} isUpNext={shift.id === upNextShiftId}/>
                    ))
                ) : (
                    !isDashboard && (
                        <div className="md:col-span-2 text-center text-text-color-secondary mt-8 p-6 bg-surface-1 rounded-2xl">
                            <span className="material-symbols-rounded text-5xl">sentiment_satisfied</span>
                            <p className="mt-2 font-semibold">Nessun turno assegnato</p>
                            <p>Goditi il tuo tempo libero!</p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default MyShifts;