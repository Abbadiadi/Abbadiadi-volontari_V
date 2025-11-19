
import React, { useState, useMemo } from 'react';
import { doc, deleteDoc, setDoc, updateDoc, collection, addDoc, writeBatch } from "firebase/firestore";
import { db } from '../../services/firebase';
import { showToast } from '../../App';
import { RaceEvent, Sport, Location } from '../../types';
import Spinner from '../ui/Spinner';

interface AdminRaceProgramProps {
    appData: {
        raceEvents: RaceEvent[];
        sportsList: Sport[];
        locations: Location[];
    };
}

const TableInput: React.FC<React.InputHTMLAttributes<HTMLInputElement>> = (props) => (
    <input 
        {...props} 
        className={`bg-transparent border-b border-transparent hover:border-surface-3 focus:border-primary focus:outline-none w-full py-1 px-2 transition-colors ${props.className || ''}`}
    />
);

const TableSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement>> = (props) => (
    <select 
        {...props} 
        className={`bg-transparent border-b border-transparent hover:border-surface-3 focus:border-primary focus:outline-none w-full py-1 px-2 transition-colors appearance-none ${props.className || ''}`}
    />
);

export default function AdminRaceProgram({ appData }: AdminRaceProgramProps) {
    const { raceEvents, sportsList, locations } = appData;
    
    // --- SPORTS STATE ---
    const [newSport, setNewSport] = useState('');
    const [newSportLogo, setNewSportLogo] = useState('');
    const [isSportLoading, setIsSportLoading] = useState(false);

    // --- EVENTS STATE ---
    const [newEvent, setNewEvent] = useState<Partial<RaceEvent>>({
        date: new Date().toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '10:00',
        tipologia: 'Sport',
        description: '',
        category: 'Senior',
        gender: 'Misto'
    });
    const [isEventLoading, setIsEventLoading] = useState(false);
    
    // --- BULK ACTIONS STATE ---
    const [bulkDate, setBulkDate] = useState('');
    const [isBulkLoading, setIsBulkLoading] = useState(false);

    // --- SPORTS HANDLERS ---
    const handleAddSport = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newSport.trim()) return;
        setIsSportLoading(true);
        try {
            await setDoc(doc(db, 'sports_list', newSport.trim()), { 
                id: newSport.trim(), 
                logoUrl: newSportLogo 
            });
            setNewSport('');
            setNewSportLogo('');
            showToast('Sport aggiunto!');
        } catch (error) {
            showToast('Errore aggiunta sport.', 'error');
        }
        setIsSportLoading(false);
    };

    const handleDeleteSport = async (id: string) => {
        if (!window.confirm(`Sei sicuro di voler eliminare lo sport "${id}"?`)) return;
        try {
            await deleteDoc(doc(db, 'sports_list', id));
            showToast('Sport eliminato.');
        } catch (error) {
            showToast('Errore eliminazione.', 'error');
        }
    };

    // --- EVENTS HANDLERS ---
    const handleAddEvent = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newEvent.sport || !newEvent.date) {
            showToast('Sport e Data sono obbligatori.', 'error');
            return;
        }
        setIsEventLoading(true);
        try {
            await addDoc(collection(db, 'race_events'), newEvent);
            // Reset intelligente: mantieni data e luogo, incrementa ora
            setNewEvent(prev => ({
                ...prev,
                startTime: prev.endTime || '10:00',
                endTime: incrementHour(prev.endTime || '10:00'),
                description: ''
            }));
            showToast('Evento aggiunto!');
        } catch (error) {
            showToast('Errore creazione evento.', 'error');
        }
        setIsEventLoading(false);
    };
    
    const handleBulkUpdateDate = async () => {
        if (!bulkDate) {
            showToast('Seleziona una data prima.', 'error');
            return;
        }
        if (!window.confirm(`Vuoi aggiornare la data di TUTTI i ${raceEvents.length} eventi visualizzati a ${bulkDate}?`)) return;
        
        setIsBulkLoading(true);
        try {
            // Chunking requests to avoid Firestore 500 ops limit
            const chunkSize = 450; 
            for (let i = 0; i < raceEvents.length; i += chunkSize) {
                const chunk = raceEvents.slice(i, i + chunkSize);
                const batch = writeBatch(db);
                chunk.forEach(event => {
                    const ref = doc(db, 'race_events', event.id);
                    batch.update(ref, { date: bulkDate });
                });
                await batch.commit();
            }
            showToast('Date aggiornate con successo!');
        } catch (error) {
            console.error(error);
            showToast('Errore aggiornamento massivo.', 'error');
        }
        setIsBulkLoading(false);
    };

    const incrementHour = (time: string) => {
        const [h, m] = time.split(':').map(Number);
        const newH = (h + 1) % 24;
        return `${newH.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
    };

    const handleUpdateEvent = async (id: string, field: keyof RaceEvent, value: any) => {
        try {
            await updateDoc(doc(db, 'race_events', id), { [field]: value });
        } catch (error) {
            console.error("Error updating event", error);
            showToast("Errore aggiornamento", 'error');
        }
    };

    const handleDeleteEvent = async (id: string) => {
        if (!window.confirm('Eliminare questo evento?')) return;
        try {
            await deleteDoc(doc(db, 'race_events', id));
            showToast('Evento eliminato.');
        } catch (error) {
            showToast('Errore eliminazione.', 'error');
        }
    };

    const sortedEvents = useMemo(() => {
        return [...raceEvents].sort((a, b) => {
            const dateA = new Date(`${a.date}T${a.startTime}`);
            const dateB = new Date(`${b.date}T${b.startTime}`);
            return dateA.getTime() - dateB.getTime();
        });
    }, [raceEvents]);

    return (
        <div className="space-y-8 animate-fade-in pb-20">
            
            {/* --- SECTION 1: SPORTS MANAGER --- */}
            <div className="bg-surface-1 p-6 rounded-3xl border border-surface-2 shadow-sm">
                <h3 className="text-xl font-serif font-bold mb-4 flex items-center gap-2">
                    <span className="material-symbols-rounded text-primary">sports_soccer</span>
                    Gestione Sport
                </h3>
                <div className="flex flex-col md:flex-row gap-6">
                    {/* Add Sport Form */}
                    <form onSubmit={handleAddSport} className="flex-shrink-0 w-full md:w-1/3 space-y-3 bg-surface-2 p-4 rounded-2xl h-fit">
                        <h4 className="font-bold text-sm uppercase text-text-color-secondary">Nuovo Sport</h4>
                        <input 
                            type="text" 
                            placeholder="Nome Sport (es. Volley)" 
                            value={newSport}
                            onChange={e => setNewSport(e.target.value)}
                            className="w-full p-2 rounded-lg border border-surface-3 bg-surface-1 focus:ring-2 focus:ring-primary outline-none"
                        />
                        <input 
                            type="text" 
                            placeholder="URL Logo (opzionale)" 
                            value={newSportLogo}
                            onChange={e => setNewSportLogo(e.target.value)}
                            className="w-full p-2 rounded-lg border border-surface-3 bg-surface-1 focus:ring-2 focus:ring-primary outline-none"
                        />
                        <button disabled={isSportLoading} className="w-full bg-primary text-on-primary font-bold py-2 rounded-lg hover:opacity-90">
                            {isSportLoading ? <Spinner size="sm"/> : 'Aggiungi Sport'}
                        </button>
                    </form>

                    {/* Sports List */}
                    <div className="flex-grow grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 max-h-60 overflow-y-auto custom-scrollbar pr-2">
                        {sportsList.map(s => (
                            <div key={s.id} className="flex items-center gap-2 bg-surface-1 border border-surface-2 p-2 rounded-xl shadow-sm group">
                                {s.logoUrl ? (
                                    <img src={s.logoUrl} alt={s.id} className="w-8 h-8 object-contain"/>
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-surface-2 flex items-center justify-center text-xs font-bold">{s.id.substring(0,2)}</div>
                                )}
                                <span className="font-medium text-sm truncate flex-grow" title={s.id}>{s.id}</span>
                                <button onClick={() => handleDeleteSport(s.id)} className="text-text-color-secondary hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="material-symbols-rounded text-lg">close</span>
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* --- SECTION 2: RACE EVENTS --- */}
            <div className="bg-surface-1 p-6 rounded-3xl border border-surface-2 shadow-sm">
                <h3 className="text-xl font-serif font-bold mb-4 flex items-center gap-2">
                    <span className="material-symbols-rounded text-primary">calendar_month</span>
                    Programma Gare
                </h3>
                
                {/* BULK ACTIONS BAR */}
                <div className="flex flex-col sm:flex-row gap-3 items-center bg-primary-container/30 p-3 rounded-xl mb-6 border border-primary-container">
                    <span className="font-bold text-sm text-primary uppercase tracking-wider flex items-center gap-2">
                        <span className="material-symbols-rounded">flash_on</span> Azioni Rapide:
                    </span>
                    <div className="flex gap-2 flex-grow w-full sm:w-auto">
                         <input 
                            type="date" 
                            value={bulkDate} 
                            onChange={e => setBulkDate(e.target.value)} 
                            className="flex-grow sm:flex-grow-0 p-2 rounded-lg border border-surface-3 bg-surface-1 text-sm"
                        />
                        <button 
                            onClick={handleBulkUpdateDate} 
                            disabled={isBulkLoading}
                            className="px-4 py-2 bg-primary text-on-primary text-sm font-bold rounded-lg hover:opacity-90 whitespace-nowrap flex items-center gap-2"
                        >
                            {isBulkLoading ? <Spinner size="sm"/> : 'Imposta Data a Tutti'}
                        </button>
                    </div>
                </div>
                
                {/* New Event Bar */}
                <form onSubmit={handleAddEvent} className="flex flex-wrap gap-2 items-end bg-surface-2 p-4 rounded-2xl mb-6 border border-surface-3">
                    <div className="flex-grow min-w-[140px]">
                        <label className="text-xs font-bold text-text-color-secondary ml-1">Sport</label>
                        <select 
                            value={newEvent.sport || ''} 
                            onChange={e => setNewEvent({...newEvent, sport: e.target.value})} 
                            className="w-full p-2 rounded-lg border border-surface-3 bg-surface-1"
                            required
                        >
                            <option value="">Seleziona...</option>
                            {sportsList.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                        </select>
                    </div>
                    <div className="flex-grow min-w-[140px]">
                        <label className="text-xs font-bold text-text-color-secondary ml-1">Luogo</label>
                         <select 
                            value={newEvent.location || ''} 
                            onChange={e => setNewEvent({...newEvent, location: e.target.value})} 
                            className="w-full p-2 rounded-lg border border-surface-3 bg-surface-1"
                        >
                            <option value="">Seleziona...</option>
                            {locations.map(l => <option key={l.id} value={l.id}>{l.id}</option>)}
                        </select>
                    </div>
                     <div className="w-[130px]">
                        <label className="text-xs font-bold text-text-color-secondary ml-1">Data</label>
                        <input type="date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} className="w-full p-2 rounded-lg border border-surface-3 bg-surface-1" required />
                    </div>
                    <div className="w-[80px]">
                        <label className="text-xs font-bold text-text-color-secondary ml-1">Inizio</label>
                        <input type="time" value={newEvent.startTime} onChange={e => setNewEvent({...newEvent, startTime: e.target.value})} className="w-full p-2 rounded-lg border border-surface-3 bg-surface-1" required />
                    </div>
                    <div className="w-[80px]">
                        <label className="text-xs font-bold text-text-color-secondary ml-1">Fine</label>
                        <input type="time" value={newEvent.endTime} onChange={e => setNewEvent({...newEvent, endTime: e.target.value})} className="w-full p-2 rounded-lg border border-surface-3 bg-surface-1" required />
                    </div>
                    <div className="w-[100px]">
                         <label className="text-xs font-bold text-text-color-secondary ml-1">Cat.</label>
                         <select value={newEvent.category} onChange={e => setNewEvent({...newEvent, category: e.target.value as any})} className="w-full p-2 rounded-lg border border-surface-3 bg-surface-1">
                             <option value="Mini">Mini</option><option value="Junior">Junior</option><option value="Senior">Senior</option>
                         </select>
                    </div>
                     <div className="w-[100px]">
                         <label className="text-xs font-bold text-text-color-secondary ml-1">Sesso</label>
                         <select value={newEvent.gender} onChange={e => setNewEvent({...newEvent, gender: e.target.value as any})} className="w-full p-2 rounded-lg border border-surface-3 bg-surface-1">
                             <option value="Misto">Misto</option><option value="Maschile">M</option><option value="Femminile">F</option>
                         </select>
                    </div>
                    <button disabled={isEventLoading} className="h-[42px] px-6 bg-primary text-on-primary font-bold rounded-lg hover:opacity-90 flex items-center justify-center">
                        <span className="material-symbols-rounded">add</span>
                    </button>
                </form>

                {/* Events Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="text-text-color-secondary text-xs uppercase tracking-wider border-b border-surface-3">
                                <th className="p-3 font-bold">Data/Ora</th>
                                <th className="p-3 font-bold">Sport & Livello</th>
                                <th className="p-3 font-bold">Luogo</th>
                                <th className="p-3 font-bold">Dettagli</th>
                                <th className="p-3 font-bold text-right">Azioni</th>
                            </tr>
                        </thead>
                        <tbody className="text-sm">
                            {sortedEvents.map(event => (
                                <tr key={event.id} className="group hover:bg-surface-2 transition-colors border-b border-surface-3 last:border-0">
                                    <td className="p-2 align-top min-w-[120px]">
                                        <TableInput 
                                            type="date" 
                                            value={event.date} 
                                            onChange={e => handleUpdateEvent(event.id, 'date', e.target.value)} 
                                            className="font-bold mb-1"
                                        />
                                        <div className="flex gap-1">
                                            <TableInput 
                                                type="time" 
                                                value={event.startTime} 
                                                onChange={e => handleUpdateEvent(event.id, 'startTime', e.target.value)} 
                                            />
                                            <span className="py-1">-</span>
                                            <TableInput 
                                                type="time" 
                                                value={event.endTime} 
                                                onChange={e => handleUpdateEvent(event.id, 'endTime', e.target.value)} 
                                            />
                                        </div>
                                    </td>
                                    <td className="p-2 align-top min-w-[150px]">
                                        <TableSelect 
                                            value={event.sport} 
                                            onChange={e => handleUpdateEvent(event.id, 'sport', e.target.value)}
                                            className="font-bold"
                                        >
                                            {sportsList.map(s => <option key={s.id} value={s.id}>{s.id}</option>)}
                                        </TableSelect>
                                    </td>
                                    <td className="p-2 align-top min-w-[140px]">
                                        <TableSelect 
                                            value={event.location} 
                                            onChange={e => handleUpdateEvent(event.id, 'location', e.target.value)}
                                        >
                                            {locations.map(l => <option key={l.id} value={l.id}>{l.id}</option>)}
                                        </TableSelect>
                                    </td>
                                    <td className="p-2 align-top min-w-[200px]">
                                        <div className="flex gap-2 mb-1">
                                            <TableSelect 
                                                value={event.category || 'Senior'} 
                                                onChange={e => handleUpdateEvent(event.id, 'category', e.target.value)}
                                                className="w-1/2 text-xs"
                                            >
                                                <option value="Mini">Mini</option><option value="Junior">Junior</option><option value="Senior">Senior</option>
                                            </TableSelect>
                                            <TableSelect 
                                                value={event.gender || 'Misto'} 
                                                onChange={e => handleUpdateEvent(event.id, 'gender', e.target.value)}
                                                className="w-1/2 text-xs"
                                            >
                                                <option value="Misto">Misto</option><option value="Maschile">Maschile</option><option value="Femminile">Femminile</option>
                                            </TableSelect>
                                        </div>
                                        <TableInput 
                                            placeholder="Descrizione (es. Girone A)"
                                            value={event.description || ''} 
                                            onChange={e => handleUpdateEvent(event.id, 'description', e.target.value)} 
                                        />
                                    </td>
                                    <td className="p-2 align-middle text-right">
                                        <button 
                                            onClick={() => handleDeleteEvent(event.id)} 
                                            className="p-2 text-text-color-secondary hover:text-red-500 hover:bg-red-50 rounded-full transition-colors"
                                            title="Elimina"
                                        >
                                            <span className="material-symbols-rounded">delete</span>
                                        </button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {raceEvents.length === 0 && (
                        <div className="text-center py-8 text-text-color-secondary">
                            Nessun evento in programma. Aggiungine uno sopra!
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
