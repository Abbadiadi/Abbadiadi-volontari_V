
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
    <div className="flex items-start gap-3">
        <div 
            className="w-8 h-8 flex-shrink-0 flex items-center justify-center rounded-full bg-surface-2 text-text-color" 
        >
            <span className="material-symbols-rounded text-lg" style={{ color: color }}>{icon}</span>
        </div>
        <div className="text-text-color flex-1 pt-1 text-sm">
            {text && <p className="font-medium">{text}</p>}
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

    return (
        <div className={`rounded-3xl shadow-m3-sm hover:shadow-m3-md overflow-hidden transition-all duration-300 flex flex-col ${isPast ? 'opacity-60 grayscale' : ''}`}>
            <div className="relative cursor-pointer group" onClick={() => setIsExpanded(!isExpanded)}>
                {/* Gradient Background */}
                <div className={`absolute inset-0 bg-gradient-to-br ${gradient}`}></div>
                
                 {/* Progress overlay for ongoing shifts */}
                {isOngoing && (
                    <div className="absolute inset-0 bg-white/30 backdrop-blur-[2px] transition-all duration-500" style={{ clipPath: `inset(0 ${100 - progress}% 0 0)` }}></div>
                )}
                
                {/* Main Content - Compact Design */}
                <div className="relative z-10 p-4 flex flex-col text-white min-h-[110px] justify-center">
                    
                    {/* Absolute Top Right Controls - Removes vertical space */}
                    <div className="absolute top-2 right-2 flex items-center gap-1 z-20">
                         {isUpNext && !isPast && (
                            <div className="bg-white/90 text-black text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shadow-sm">
                                Prossimo
                            </div>
                        )}
                        <button className={`text-white/80 hover:text-white p-1 rounded-full transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`}>
                            <span className="material-symbols-rounded text-2xl">expand_more</span>
                        </button>
                    </div>

                    {/* Time and Title */}
                    <div className="pr-6">
                         <div className="flex items-baseline gap-1.5">
                            <h2 className="text-3xl font-mono font-bold leading-none tracking-tight drop-shadow-md">
                                {shift.ora_inizio}
                            </h2>
                            <span className="text-sm font-medium opacity-90 leading-none drop-shadow-sm">- {shift.ora_fine}</span>
                        </div>
                         <h3 className="font-bold text-lg leading-tight mt-1 truncate drop-shadow-md">
                            {formattedTitle}
                        </h3>
                    </div>
                    
                    {/* Pills Section - High Contrast & Collapsible */}
                    <div className={`flex flex-wrap gap-2 mt-3 transition-all duration-300 origin-top ${isExpanded ? 'scale-y-0 opacity-0 h-0 overflow-hidden mt-0' : 'scale-y-100 opacity-100 h-auto'}`}>
                         {/* Date Pill */}
                         <div className="bg-surface-1 text-text-color rounded-lg px-2.5 py-1 shadow-md flex items-center gap-1.5 flex-shrink-0">
                             <span className="material-symbols-rounded text-[16px] text-primary">calendar_today</span>
                             <span className="text-xs font-bold">{shift.data_inizio.slice(0, 5)}</span>
                        </div>
                         {/* Location Pill */}
                        <div className="bg-surface-1 text-text-color rounded-lg px-2.5 py-1 shadow-md flex items-center gap-1.5 max-w-full">
                             <span className="material-symbols-rounded text-[16px] text-primary">location_on</span>
                             <span className="text-xs font-bold truncate">{shift.luogo}</span>
                        </div>
                    </div>
                </div>
                 {isOngoing && ( <div className="absolute inset-0 border-2 border-white/40 rounded-3xl animate-pulse pointer-events-none"></div> )}
            </div>
            
             {/* Expanded Details Section */}
            <div 
                className={`bg-surface-1 transition-all duration-300 ease-in-out overflow-hidden ${isExpanded ? 'max-h-[500px] border-t border-surface-3' : 'max-h-0'}`}
            >
                <div className="p-4 space-y-3">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                        <span className="text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-surface-2 text-text-color-secondary">{shift.categoria}</span>
                        {isOngoing && <span className="text-xs font-bold px-2 py-1 rounded-md bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">IN CORSO</span>}
                        {isPast && <span className="text-xs font-bold px-2 py-1 rounded-md bg-surface-3 text-text-color-secondary">CONCLUSO</span>}
                    </div>
                    
                    <DetailRow icon="event" text={shift.data_inizio} color={colorVar} colorRgb={colorRgb} />
                    <DetailRow icon="location_on" text={`${shift.luogo}`} color={colorVar} colorRgb={colorRgb} />
                    {shift.descrizione && <DetailRow icon="notes" text={shift.descrizione} color={colorVar} colorRgb={colorRgb} />}
                    
                    <DetailRow icon="group" color={colorVar} colorRgb={colorRgb}>
                         {colleagues.length > 0 ? (
                            <div className="flex flex-wrap gap-1 mt-1">
                                {colleagues.map(v => <span key={v.id} className="bg-surface-2 text-text-color px-2 py-1 text-xs font-medium rounded-md border border-surface-3">{v.nome} {v.cognome.charAt(0)}.</span>)}
                            </div>
                        ) : <p className="text-text-color-secondary text-xs italic">Nessun altro volontario assegnato.</p>}
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
                        <div className="md:col-span-2 text-center text-text-color-secondary mt-8 p-6 bg-surface-1 rounded-2xl border border-surface-2">
                            <span className="material-symbols-rounded text-5xl opacity-50">event_busy</span>
                            <p className="mt-2 font-semibold">Nessun turno assegnato</p>
                            <p className="text-sm">Goditi il tuo tempo libero!</p>
                        </div>
                    )
                )}
            </div>
        </div>
    );
};

export default MyShifts;
