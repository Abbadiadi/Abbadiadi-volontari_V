import React, { useState, useEffect, useMemo } from 'react';
import { Volunteer, Shift, Assignment, RaceEvent, DashboardEvent } from '../types';
import MyShifts from './MyShifts';

interface DashboardProps {
  currentUser: Volunteer;
  appData: {
    shifts: Shift[];
    assignments: Assignment[];
    raceEvents: RaceEvent[];
    dashboardEvents: DashboardEvent[];
    volunteers: Volunteer[];
  };
  setCurrentView: (view: string) => void;
  onShowDetails: (event: DashboardEvent) => void;
}

const COLOR_DETAILS: { [key: string]: { name: string; rgb: string } } = {
    blue: { name: 'accent-blue', rgb: '66, 133, 244' },
    red: { name: 'accent-red', rgb: '234, 67, 53' },
    yellow: { name: 'accent-yellow', rgb: '251, 188, 5' },
    green: { name: 'accent-green', rgb: '52, 168, 83' },
    purple: { name: 'accent-purple', rgb: '142, 68, 173' },
    orange: { name: 'accent-orange', rgb: '230, 126, 34' },
    teal: { name: 'accent-teal', rgb: '20, 184, 166' },
    pink: { name: 'accent-pink', rgb: '236, 72, 153' },
    indigo: { name: 'accent-indigo', rgb: '99, 102, 241' },
};

const SummaryCard: React.FC<{
  icon: string;
  value: string;
  subtitle: string;
  colorName?: keyof typeof COLOR_DETAILS;
  date?: string;
  onClick?: () => void;
}> = ({ icon, value, subtitle, colorName = 'blue', date, onClick }) => {
    const theme = COLOR_DETAILS[colorName] || COLOR_DETAILS['blue'];

    return (
        <div
            className={`relative flex-shrink-0 w-56 h-44 p-4 sm:w-64 sm:h-48 sm:p-6 rounded-4xl flex flex-col justify-between shadow-m3-md transition-all duration-300 hover:-translate-y-1.5 hover:shadow-m3-lg overflow-hidden group ${onClick ? 'cursor-pointer' : ''}`}
            style={{ backgroundColor: `rgba(${theme.rgb}, 0.1)` }}
            onClick={onClick}
        >
            <div 
                className="absolute -top-10 -right-10 w-32 h-32 rounded-full opacity-50 transition-transform duration-500 group-hover:scale-125"
                style={{ backgroundColor: `rgba(${theme.rgb}, 0.1)` }}
            ></div>
            
            <div className="relative z-10 flex justify-between items-start">
                <div 
                    className="p-3 rounded-full"
                    style={{ backgroundColor: `rgba(${theme.rgb}, 0.2)` }}
                >
                    <span 
                        className="material-symbols-rounded text-3xl sm:text-4xl"
                        style={{ color: `var(--${theme.name})` }}
                    >{icon}</span>
                </div>
                {date && <div className="bg-surface/50 backdrop-blur-sm text-xs font-bold px-3 py-1.5 rounded-full text-text-color">{date}</div>}
            </div>
            <div className="relative z-10">
                <div className="text-2xl sm:text-3xl font-bold leading-tight text-text-color">{value}</div>
                <div className="text-sm sm:text-base text-text-color-secondary">{subtitle}</div>
            </div>
        </div>
    );
};


const WeatherCard: React.FC = () => {
    const [weather, setWeather] = useState<{ temp: number; icon: string; desc: string } | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchWeather = async () => {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=44.88&longitude=7.33&current=temperature_2m,weather_code`;
            try {
                const res = await fetch(url);
                const data = await res.json();
                const { temperature_2m, weather_code } = data.current;
                const getWeatherIcon = (code: number) => {
                    if (code === 0) return 'clear_day'; if (code >= 1 && code <= 3) return 'cloudy'; if (code >= 45 && code <= 48) return 'foggy'; if (code >= 51 && code <= 67) return 'rainy'; if (code >= 71 && code <= 77) return 'weather_snowy'; if (code >= 80 && code <= 82) return 'rainy'; if (code >= 85 && code <= 86) return 'weather_snowy'; if (code >= 95 && code <= 99) return 'thunderstorm'; return 'help';
                }
                const getWeatherDescription = (code: number) => {
                    const descriptions: { [key: number]: string } = { 0: 'Sereno', 1: 'Prevalentemente sereno', 2: 'Parzialmente nuvoloso', 3: 'Nuvoloso', 45: 'Nebbia', 51: 'Pioggerella', 61: 'Pioggia debole', 63: 'Pioggia', 71: 'Neve debole', 80: 'Rovescio', 95: 'Temporale' };
                    return descriptions[code] || 'Sconosciuto';
                };
                setWeather({ temp: Math.round(temperature_2m), icon: getWeatherIcon(weather_code), desc: getWeatherDescription(weather_code) });
            } catch (e) {
                console.error("Failed to fetch weather");
            } finally {
                setLoading(false);
            }
        };
        fetchWeather();
    }, []);

    if (loading) return <SummaryCard icon="progress_activity" value="Carico..." subtitle="Meteo a Pinerolo" colorName="indigo" />;
    if (!weather) return <SummaryCard icon="error" value="Errore" subtitle="Meteo non disp." colorName="red" />;

    return <SummaryCard icon={weather.icon} value={`${weather.temp}°C`} subtitle={weather.desc} colorName="teal" />;
};


const Dashboard: React.FC<DashboardProps> = ({ currentUser, appData, setCurrentView, onShowDetails }) => {
    const { shifts, assignments, dashboardEvents } = appData;

    const myShifts = useMemo(() => {
        const myAssignmentIds = new Set(assignments.filter(a => a.email_volontario === currentUser.email).map(a => a.id_turno));
        return shifts.filter(s => myAssignmentIds.has(s.id_turno));
    }, [assignments, shifts, currentUser.email]);

    const completedShifts = useMemo(() => {
        const now = new Date();
        return myShifts.filter(s => {
            try {
                return new Date(`${s.data_inizio.split('/').reverse().join('-')}T${s.ora_fine}`) < now;
            } catch { return false; }
        }).length;
    }, [myShifts]);

    const upcomingShifts = useMemo(() => {
        const now = new Date();
        return myShifts
            .filter(s => {
                try {
                    return new Date(`${s.data_inizio.split('/').reverse().join('-')}T${s.ora_fine}`) > now;
                } catch { return false; }
            })
            .sort((a, b) => {
                try {
                    return new Date(`${a.data_inizio.split('/').reverse().join('-')}T${a.ora_inizio}`).getTime() - new Date(`${b.data_inizio.split('/').reverse().join('-')}T${b.ora_inizio}`).getTime();
                } catch { return 0; }
            })
            .slice(0, 3);
    }, [myShifts]);
    
    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h1 className="text-3xl sm:text-4xl font-serif font-bold text-text-color">Ciao, {currentUser.nome}!</h1>
                <p className="text-base sm:text-lg text-text-color-secondary">Ecco un riepilogo delle tue attività.</p>
            </div>
            
            <div className="flex flex-nowrap lg:flex-wrap gap-4 overflow-x-auto lg:overflow-visible pb-4 -mx-4 px-4 lg:mx-0 lg:px-0">
                {dashboardEvents.filter(e => e.showOnDashboard).map(event => {
                    let value = event.title, subtitle = event.subtitle, dateBadge = '';
                     if (event.date) {
                         try {
                             const targetDate = new Date(event.date);
                             dateBadge = targetDate.toLocaleDateString('it-IT', { day: '2-digit', month: 'short' });
                             if (event.isCountdown) {
                                const diffDays = Math.ceil((targetDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
                                value = `${diffDays > 0 ? diffDays : '0'} giorni`;
                                subtitle = `a ${event.title}`;
                             }
                         } catch (e) { /* Invalid date, ignore */ }
                     }
                    return <SummaryCard 
                        key={event.id} 
                        icon={event.icon} 
                        value={value} 
                        subtitle={subtitle} 
                        date={dateBadge} 
                        onClick={() => onShowDetails(event)}
                        colorName={event.color as keyof typeof COLOR_DETAILS}
                    />
                })}
                <WeatherCard />
                <SummaryCard 
                    icon="check_circle" 
                    value={`${completedShifts} / ${myShifts.length}`} 
                    subtitle="Turni completati" 
                    colorName="green"
                />
            </div>

            {upcomingShifts.length > 0 && (
                <div>
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-2xl font-bold font-serif text-text-color">I miei prossimi turni</h2>
                        <button onClick={() => setCurrentView('my-shifts')} className="text-sm font-bold text-primary hover:underline">Vedi tutti</button>
                    </div>
                    {/* Re-using MyShifts component to display the cards */}
                    <MyShifts currentUser={currentUser} appData={{...appData, shifts: upcomingShifts}} isDashboard={true} />
                </div>
            )}
        </div>
    );
};

export default Dashboard;