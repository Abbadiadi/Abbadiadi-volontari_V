
import React, { useState, useEffect } from 'react';
import { doc, deleteDoc, setDoc, collection, updateDoc } from "firebase/firestore";
import { db } from '../../services/firebase';
import { showToast } from '../../App';
import { DashboardEvent, Location, UsefulLink } from '../../types';
import { FormInput, FormSelect, FormTextarea } from './AdminCommon';
import Spinner from '../ui/Spinner';

// --- DASHBOARD ---
export const AdminDashboard: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 animate-scale-in">
        {[
            { id: 'admin-shifts', icon: 'assignment', label: 'Turni', color: 'bg-blue-500', desc: 'Crea turni e assegna volontari' },
            { id: 'admin-volunteers', icon: 'group', label: 'Volontari', color: 'bg-green-500', desc: 'Gestisci anagrafica utenti' },
            { id: 'admin-race-program', icon: 'sports_score', label: 'Programma', color: 'bg-orange-500', desc: 'Eventi sportivi e gare' },
            { id: 'admin-dashboard-cards', icon: 'dashboard', label: 'Home Cards', color: 'bg-purple-500', desc: 'Gestisci cards e avvisi' },
            { id: 'admin-locations', icon: 'pin_drop', label: 'Luoghi', color: 'bg-teal-500', desc: 'Mappe e location' },
            { id: 'admin-settings', icon: 'settings', label: 'Impostazioni', color: 'bg-indigo-500', desc: 'Link utili e config' },
        ].map(item => (
            <button key={item.id} onClick={() => onNavigate(item.id)} className="bg-surface-1 p-6 rounded-3xl border border-surface-2 hover:shadow-m3-md transition-all text-left group active:scale-95">
                <div className={`w-14 h-14 rounded-2xl ${item.color}/20 text-${item.color.split('-')[1]}-500 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                    <span className="material-symbols-rounded text-3xl">{item.icon}</span>
                </div>
                <h3 className="text-xl font-bold">{item.label}</h3>
                <p className="text-text-color-secondary text-sm mt-1">{item.desc}</p>
            </button>
        ))}
    </div>
);

// --- LOCATIONS ---
export const AdminLocations: React.FC<{ appData: { locations: Location[] } }> = ({ appData }) => {
    const [newLoc, setNewLoc] = useState('');
    const [loading, setLoading] = useState(false);
    
    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!newLoc.trim()) return;
        setLoading(true);
        try {
            await setDoc(doc(db, 'locations', newLoc.trim()), {});
            setNewLoc('');
            showToast('Luogo aggiunto!');
        } catch (e) { showToast('Errore.', 'error'); }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if(!window.confirm(`Eliminare ${id}?`)) return;
        try { await deleteDoc(doc(db, 'locations', id)); showToast('Eliminato.'); } catch (e) { showToast('Errore.', 'error'); }
    };

    return (
        <div className="grid lg:grid-cols-2 gap-6">
            <div className="bg-surface-1 rounded-3xl p-6 border border-surface-2">
                <h3 className="font-bold text-xl mb-4">Lista Luoghi</h3>
                <ul className="space-y-2">
                    {appData.locations.map(l => (
                        <li key={l.id} className="flex justify-between items-center p-3 bg-surface-2 rounded-xl">
                            <span className="font-medium">{l.id}</span>
                            <button onClick={() => handleDelete(l.id)} className="p-2 hover:bg-red-100 text-red-500 rounded-full transition"><span className="material-symbols-rounded">delete</span></button>
                        </li>
                    ))}
                </ul>
            </div>
            <div className="bg-surface-1 rounded-3xl p-6 border border-surface-2 h-fit">
                <h3 className="font-bold text-xl mb-4">Nuovo Luogo</h3>
                <form onSubmit={handleAdd} className="space-y-4">
                    <FormInput label="Nome Luogo" value={newLoc} onChange={e => setNewLoc(e.target.value)} placeholder="es. Palazzetto" />
                    <button disabled={loading} className="w-full bg-primary text-on-primary py-3 rounded-full font-bold">{loading ? <Spinner/> : 'Aggiungi'}</button>
                </form>
            </div>
        </div>
    );
};

// --- SETTINGS ---
export const AdminSettings: React.FC<{ appData: { usefulLinks: UsefulLink[] } }> = ({ appData }) => {
    const [editingLink, setEditingLink] = useState<UsefulLink | 'new' | null>(null);
    const [formData, setFormData] = useState<Partial<UsefulLink>>({});

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const ref = editingLink === 'new' ? doc(collection(db, 'useful_links')) : doc(db, 'useful_links', formData.id!);
            await setDoc(ref, { ...formData, id: ref.id }, { merge: true });
            setEditingLink(null);
            showToast('Link salvato!');
        } catch (e) { showToast('Errore.', 'error'); }
    };

    const handleDelete = async (id: string) => {
         if(!window.confirm('Eliminare?')) return;
         await deleteDoc(doc(db, 'useful_links', id));
    };

    return (
        <div className="grid lg:grid-cols-2 gap-6">
             <div className="space-y-4">
                <button onClick={() => { setEditingLink('new'); setFormData({ icon: 'public', order: 99 }); }} className="w-full py-3 border-2 border-dashed border-primary text-primary font-bold rounded-2xl hover:bg-primary-container transition">Aggiungi Link</button>
                {appData.usefulLinks.map(link => (
                    <div key={link.id} onClick={() => { setEditingLink(link); setFormData(link); }} className="bg-surface-1 p-4 rounded-2xl border border-surface-2 flex items-center gap-4 cursor-pointer hover:ring-2 ring-primary transition">
                         <span className="material-symbols-rounded text-3xl text-secondary">{link.icon}</span>
                         <div className="flex-grow">
                             <h4 className="font-bold">{link.name}</h4>
                             <p className="text-xs truncate">{link.url}</p>
                         </div>
                         <button onClick={(e) => { e.stopPropagation(); handleDelete(link.id); }} className="text-red-500"><span className="material-symbols-rounded">delete</span></button>
                    </div>
                ))}
             </div>
             {editingLink && (
                 <div className="bg-surface-1 rounded-3xl p-6 border border-surface-2 shadow-lg sticky top-24">
                     <h3 className="font-bold text-xl mb-4">{editingLink === 'new' ? 'Nuovo Link' : 'Modifica Link'}</h3>
                     <form onSubmit={handleSave} className="space-y-4">
                         <FormInput label="Titolo" value={formData.name || ''} onChange={e => setFormData({...formData, name: e.target.value})} />
                         <FormInput label="URL" value={formData.url || ''} onChange={e => setFormData({...formData, url: e.target.value})} />
                         <FormSelect label="Icona" value={formData.icon} onChange={e => setFormData({...formData, icon: e.target.value as any})}>
                            <option value="public">Web</option><option value="instagram">Instagram</option><option value="facebook">Facebook</option><option value="whatsapp">WhatsApp</option><option value="phone">Telefono</option>
                         </FormSelect>
                         <FormInput label="Ordine" type="number" value={formData.order} onChange={e => setFormData({...formData, order: parseInt(e.target.value)})} />
                         <div className="flex gap-2">
                             <button type="button" onClick={() => setEditingLink(null)} className="flex-1 py-3 font-bold text-text-color-secondary">Annulla</button>
                             <button type="submit" className="flex-1 py-3 bg-primary text-on-primary rounded-full font-bold">Salva</button>
                         </div>
                     </form>
                 </div>
             )}
        </div>
    );
};

// --- DASHBOARD CARDS (Full Featured) ---
export const AdminDashboardCards: React.FC<{ appData: { dashboardEvents: DashboardEvent[], locations: Location[] } }> = ({ appData }) => {
    const [editing, setEditing] = useState<DashboardEvent | 'new' | null>(null);
    const [formData, setFormData] = useState<Partial<DashboardEvent>>({});
    const [loading, setLoading] = useState(false);

    const handleEdit = (event: DashboardEvent | 'new') => {
        setEditing(event);
        setFormData(event === 'new' ? { 
            title: '', subtitle: '', description: '', 
            icon: 'event', color: 'blue', 
            showOnDashboard: true, showCalendarButton: false, isCountdown: false 
        } : event);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const ref = editing === 'new' ? doc(collection(db, 'dashboard_events')) : doc(db, 'dashboard_events', formData.id!);
            await setDoc(ref, { ...formData, id: ref.id }, { merge: true });
            setEditing(null);
            showToast('Card salvata!');
        } catch (e) { showToast('Errore.', 'error'); }
        setLoading(false);
    };

    const handleDelete = async (id: string) => {
        if(!window.confirm('Eliminare questa card?')) return;
        try { await deleteDoc(doc(db, 'dashboard_events', id)); showToast('Card eliminata.'); } 
        catch (e) { showToast('Errore.', 'error'); }
    };

    const handleChange = (field: string, value: any) => setFormData(prev => ({ ...prev, [field]: value }));

    return (
        <div className="grid lg:grid-cols-2 gap-6 h-[calc(100vh-150px)]">
            <div className="flex flex-col h-full">
                 <button onClick={() => handleEdit('new')} className="w-full py-3 mb-4 border-2 border-dashed border-primary text-primary font-bold rounded-2xl hover:bg-primary-container transition">Crea Nuova Card</button>
                 <div className="overflow-y-auto flex-grow space-y-3 custom-scrollbar pb-20">
                    {appData.dashboardEvents.map(e => (
                        <div key={e.id} onClick={() => handleEdit(e)} className={`bg-surface-1 p-4 rounded-2xl border-2 cursor-pointer transition-all hover:shadow-md flex items-center gap-4 ${editing === e || (editing && editing !== 'new' && editing.id === e.id) ? 'border-primary' : 'border-surface-2'}`}>
                            <div className={`w-10 h-10 rounded-full flex items-center justify-center bg-${e.color || 'gray'}-100 text-${e.color || 'gray'}-600`}>
                                <span className="material-symbols-rounded">{e.icon}</span>
                            </div>
                            <div className="flex-grow overflow-hidden">
                                <h4 className="font-bold truncate">{e.title}</h4>
                                <p className="text-xs text-text-color-secondary truncate">{e.subtitle}</p>
                            </div>
                            {!e.showOnDashboard && <span className="text-xs bg-surface-3 px-2 py-1 rounded">Nascosta</span>}
                        </div>
                    ))}
                 </div>
            </div>
            
            <div className="h-full overflow-y-auto custom-scrollbar">
                {editing ? (
                    <div className="bg-surface-1 rounded-3xl p-6 border border-surface-2 shadow-lg">
                         <div className="flex justify-between items-center mb-4">
                            <h3 className="font-bold text-xl">{editing === 'new' ? 'Nuova Card' : 'Modifica Card'}</h3>
                            {editing !== 'new' && <button onClick={() => handleDelete(editing.id)} className="text-red-500 bg-red-50 p-2 rounded-full"><span className="material-symbols-rounded">delete</span></button>}
                         </div>
                         <form onSubmit={handleSave} className="space-y-4">
                             <FormInput label="Titolo" value={formData.title || ''} onChange={e => handleChange('title', e.target.value)} required />
                             <FormInput label="Sottotitolo" value={formData.subtitle || ''} onChange={e => handleChange('subtitle', e.target.value)} required />
                             <FormTextarea label="Descrizione Completa" value={formData.description || ''} onChange={e => handleChange('description', e.target.value)} />
                             
                             <div className="grid grid-cols-2 gap-3">
                                <FormInput label="Icona (Material Name)" value={formData.icon || ''} onChange={e => handleChange('icon', e.target.value)} />
                                <FormSelect label="Colore" value={formData.color} onChange={e => handleChange('color', e.target.value)}>
                                    <option value="blue">Blu</option><option value="red">Rosso</option><option value="green">Verde</option>
                                    <option value="yellow">Giallo</option><option value="purple">Viola</option><option value="orange">Arancione</option>
                                    <option value="teal">Verde Acqua</option><option value="pink">Rosa</option>
                                </FormSelect>
                             </div>

                             <div className="grid grid-cols-2 gap-3">
                                <FormInput type="date" label="Data Evento" value={formData.date || ''} onChange={e => handleChange('date', e.target.value)} />
                                <FormInput type="time" label="Ora" value={formData.time || ''} onChange={e => handleChange('time', e.target.value)} />
                             </div>
                             
                             <div className="grid grid-cols-2 gap-3 bg-surface-2 p-3 rounded-xl">
                                <FormInput type="datetime-local" label="Visibile Dal" value={formData.visibleFrom || ''} onChange={e => handleChange('visibleFrom', e.target.value)} />
                                <FormInput type="datetime-local" label="Visibile Al" value={formData.visibleUntil || ''} onChange={e => handleChange('visibleUntil', e.target.value)} />
                             </div>

                             <FormSelect label="Luogo" value={formData.location || ''} onChange={e => handleChange('location', e.target.value)}>
                                <option value="">Nessun Luogo</option>
                                {appData.locations.map(l => <option key={l.id} value={l.id}>{l.id}</option>)}
                             </FormSelect>

                             <div className="bg-surface-2 p-4 rounded-xl space-y-2">
                                 <label className="flex items-center gap-2 cursor-pointer">
                                     <input type="checkbox" checked={formData.showOnDashboard || false} onChange={e => handleChange('showOnDashboard', e.target.checked)} className="w-5 h-5 accent-primary" />
                                     <span className="font-bold text-sm">Mostra in Dashboard</span>
                                 </label>
                                 <label className="flex items-center gap-2 cursor-pointer">
                                     <input type="checkbox" checked={formData.isCountdown || false} onChange={e => handleChange('isCountdown', e.target.checked)} className="w-5 h-5 accent-primary" />
                                     <span className="font-bold text-sm">Attiva Countdown giorni</span>
                                 </label>
                                 <label className="flex items-center gap-2 cursor-pointer">
                                     <input type="checkbox" checked={formData.showInRaceProgram || false} onChange={e => handleChange('showInRaceProgram', e.target.checked)} className="w-5 h-5 accent-primary" />
                                     <span className="font-bold text-sm">Includi nel Programma Gare</span>
                                 </label>
                                 <label className="flex items-center gap-2 cursor-pointer">
                                     <input type="checkbox" checked={formData.showCalendarButton || false} onChange={e => handleChange('showCalendarButton', e.target.checked)} className="w-5 h-5 accent-primary" />
                                     <span className="font-bold text-sm">Mostra Pulsante Calendario</span>
                                 </label>
                             </div>

                             <div className="flex gap-2 pt-2">
                                 <button type="button" onClick={() => setEditing(null)} className="flex-1 py-3 font-bold text-text-color-secondary">Annulla</button>
                                 <button type="submit" disabled={loading} className="flex-1 py-3 bg-primary text-on-primary rounded-full font-bold">{loading ? <Spinner/> : 'Salva'}</button>
                             </div>
                         </form>
                    </div>
                ) : (
                    <div className="h-full flex items-center justify-center bg-surface-1 rounded-3xl border-2 border-dashed border-surface-3 text-text-color-secondary">
                        Seleziona una card per modificare
                    </div>
                )}
            </div>
        </div>
    );
}
