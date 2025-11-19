
import React, { useState, useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { db } from '../../services/firebase';
import { collection, doc, setDoc, addDoc, deleteDoc, writeBatch, query, where, getDocs, serverTimestamp } from "firebase/firestore";
import { Volunteer, Shift, Assignment, Location } from '../../types';
import { Modal, showToast } from '../../App';
import Spinner from '../ui/Spinner';
import { EditorPlaceholder, ConfirmationModal, FormInput, FormSelect, FormTextarea, EditorRef } from './AdminCommon';

interface AdminShiftsProps {
    appData: {
        volunteers: Volunteer[];
        shifts: Shift[];
        assignments: Assignment[];
        shiftCategories: string[];
        locations: Location[];
    };
    onOpenAiModal: () => void;
    initialShiftData: Partial<Shift> | null;
    clearInitialShiftData: () => void;
}

const ShiftEditor = forwardRef<EditorRef, { shift: Shift | Partial<Shift> | 'new'; categories: string[]; locations: Location[]; onSave: () => void; onCancel: () => void; }>((props, ref) => {
    const { shift, categories, locations, onSave, onCancel } = props;
    const isNew = shift === 'new';
    const initialData = useMemo(() => isNew ? { data_inizio: '02/06/2026'} : shift, [shift, isNew]);
    const [formData, setFormData] = useState<Partial<Shift>>(initialData);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    
    const isEditing = !isNew && 'id' in formData;
    const isDirty = useMemo(() => JSON.stringify(initialData) !== JSON.stringify(formData), [initialData, formData]);

    useEffect(() => { setFormData(initialData); }, [initialData]);

    const handleSave = async (): Promise<boolean> => {
        try {
            const docRef = isEditing ? doc(db, 'shifts', formData.id!) : doc(collection(db, 'shifts'));
            const dataToSave = { ...formData, id: docRef.id };
            if (!isEditing) {
                dataToSave.id_turno = dataToSave.id_turno || docRef.id;
            }
            await setDoc(docRef, dataToSave, { merge: true });
            return true;
        } catch (error) {
            console.error(error);
            showToast("Errore nel salvataggio del turno.", 'error');
            return false;
        }
    };

    useImperativeHandle(ref, () => ({
      submitForm: async () => {
        const success = await handleSave();
        if(success) showToast(`Turno salvato automaticamente!`);
        return success;
      },
      isDirty: () => isDirty,
    }));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await handleSave();
        if (success) {
            showToast(`Turno ${isEditing ? 'aggiornato' : 'creato'}!`);
            onSave();
        }
    };
    
    const handleDelete = async () => {
        if (!isEditing || !formData.id_turno) return;
        setIsDeleting(true);
        try {
            const q = query(collection(db, "assignments"), where('id_turno', '==', formData.id_turno));
            const assignmentsSnapshot = await getDocs(q);
            const batch = writeBatch(db);
            assignmentsSnapshot.forEach(doc => batch.delete(doc.ref));
            batch.delete(doc(db, 'shifts', formData.id!));
            await batch.commit();
            showToast('Turno e assegnazioni rimossi.');
            onSave(); 
        } catch (error) { showToast('Errore durante la rimozione.', 'error'); } 
        finally { setIsDeleting(false); }
    };
    
    return (
        <div className="bg-surface-1 rounded-2xl p-6 border border-surface-3 sticky top-24 shadow-m3-lg animate-scale-in">
            <h3 className="text-2xl font-serif font-bold mb-4">{isNew ? 'Crea Turno' : 'Modifica Turno'}</h3>
            <form onSubmit={handleSubmit} className="space-y-4">
                <FormInput name="id_turno" value={formData.id_turno || ''} onChange={handleChange} label="ID Turno (es. ACC-01)" required readOnly={isEditing} />
                <FormSelect name="categoria" value={formData.categoria || ''} onChange={handleChange} label="Categoria" required>
                    <option value="">Seleziona Categoria</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </FormSelect>
                <FormInput name="nome_turno" value={formData.nome_turno || ''} onChange={handleChange} label="Nome Turno" required />
                <FormTextarea name="descrizione" value={formData.descrizione || ''} onChange={handleChange} label="Descrizione" required />
                <FormSelect name="luogo" value={formData.luogo || ''} onChange={handleChange} label="Luogo" required>
                    <option value="">Seleziona Luogo</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.id}</option>)}
                </FormSelect>
                <FormInput name="data_inizio" value={formData.data_inizio || ''} onChange={handleChange} label="Data (DD/MM/YYYY)" required />
                <div className="grid grid-cols-2 gap-2">
                    <FormInput type="time" name="ora_inizio" value={formData.ora_inizio || ''} onChange={handleChange} label="Ora Inizio" required />
                    <FormInput type="time" name="ora_fine" value={formData.ora_fine || ''} onChange={handleChange} label="Ora Fine" required />
                </div>
                
                <div className="flex gap-4 pt-4">
                     {!isNew && <button type="button" onClick={() => setShowConfirm(true)} disabled={isDeleting} className="flex-1 bg-red-500/10 text-red-600 hover:bg-red-500/20 p-3 rounded-full font-bold transition disabled:opacity-50 flex justify-center">{isDeleting ? <Spinner/> : 'Elimina'}</button>}
                    <button type="button" onClick={onCancel} className="flex-1 bg-surface-2 hover:bg-surface-3 text-text-color p-3 rounded-full font-bold transition">Annulla</button>
                    <button type="submit" className="flex-1 bg-primary hover:opacity-90 text-on-primary p-3 rounded-full font-bold transition">Salva</button>
                </div>
            </form>
            {showConfirm && <ConfirmationModal title="Conferma Eliminazione" message={`Sei sicuro di voler eliminare il turno "${formData.nome_turno}"?`} onConfirm={handleDelete} onClose={() => setShowConfirm(false)} />}
        </div>
    );
});

const AssignmentEditor: React.FC<{shift: Shift; volunteers: Volunteer[]; assignments: Assignment[];}> = ({ shift, volunteers, assignments }) => {
    const [search, setSearch] = useState('');
    const [assignedEmails, setAssignedEmails] = useState<Set<string>>(() => new Set(assignments.filter(a => a.id_turno === shift.id_turno).map(a => a.email_volontario)));
    
    useEffect(() => {
        setAssignedEmails(new Set(assignments.filter(a => a.id_turno === shift.id_turno).map(a => a.email_volontario)));
    }, [shift, assignments]);

    const { available, assigned } = useMemo(() => {
        const lowerCaseFilter = search.toLowerCase();
        const filtered = volunteers.filter(v => `${v.nome} ${v.cognome}`.toLowerCase().includes(lowerCaseFilter));
        return {
            available: filtered.filter(v => !assignedEmails.has(v.email)).sort((a,b) => a.cognome.localeCompare(b.cognome)),
            assigned: filtered.filter(v => assignedEmails.has(v.email)).sort((a,b) => a.cognome.localeCompare(b.cognome)),
        };
    }, [search, volunteers, assignedEmails]);

    const handleToggle = async (volunteer: Volunteer, isAssigning: boolean) => {
        try {
            if (isAssigning) {
                await addDoc(collection(db, "assignments"), { email_volontario: volunteer.email, id_turno: shift.id_turno });
                 setAssignedEmails(prev => new Set(prev).add(volunteer.email));
            } else {
                 const q = query(collection(db, "assignments"), where('id_turno', '==', shift.id_turno), where('email_volontario', '==', volunteer.email));
                 const snapshot = await getDocs(q);
                 if (!snapshot.empty) {
                    await deleteDoc(snapshot.docs[0].ref);
                    setAssignedEmails(prev => { const next = new Set(prev); next.delete(volunteer.email); return next; });
                 }
            }
        } catch (e) { showToast('Errore operazione.', 'error'); }
    };

    const VolunteerRow = ({ v, isAssigned }: { v: Volunteer, isAssigned: boolean }) => (
        <div className="flex items-center justify-between p-2 bg-surface-1 rounded-lg border border-surface-2 mb-2">
            <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center text-sm font-bold">
                    {v.nome.charAt(0)}{v.cognome.charAt(0)}
                </div>
                <span className="font-medium text-sm truncate max-w-[120px] sm:max-w-none">{v.nome} {v.cognome}</span>
            </div>
            <button 
                onClick={() => handleToggle(v, !isAssigned)}
                className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${isAssigned ? 'bg-red-500/10 text-red-600 hover:bg-red-500/20' : 'bg-green-500/10 text-green-600 hover:bg-green-500/20'}`}
            >
                <span className="material-symbols-rounded">{isAssigned ? 'remove' : 'add'}</span>
            </button>
        </div>
    );

    return (
        <div className="bg-surface-1 rounded-2xl p-6 border border-surface-3 sticky top-24 shadow-m3-lg h-[80vh] flex flex-col animate-scale-in">
            <h3 className="text-xl font-serif font-bold mb-4 truncate">Assegna: {shift.nome_turno}</h3>
            <input type="search" placeholder="Cerca volontario..." value={search} onChange={e => setSearch(e.target.value)} className="w-full p-3 mb-4 bg-surface-2 border border-surface-3 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition" />
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-grow overflow-hidden">
                <div className="flex flex-col min-h-0">
                    <h4 className="font-bold mb-2 text-text-color-secondary">Assegnati ({assigned.length})</h4>
                    <div className="overflow-y-auto flex-grow pr-2 custom-scrollbar">
                        {assigned.length > 0 ? assigned.map(v => <VolunteerRow key={v.id} v={v} isAssigned={true} />) : <p className="text-sm text-text-color-secondary italic">Nessuno assegnato</p>}
                    </div>
                </div>
                <div className="flex flex-col min-h-0 border-t sm:border-t-0 sm:border-l border-surface-2 pt-2 sm:pt-0 sm:pl-2">
                    <h4 className="font-bold mb-2 text-text-color-secondary">Disponibili ({available.length})</h4>
                    <div className="overflow-y-auto flex-grow pr-2 custom-scrollbar">
                         {available.length > 0 ? available.map(v => <VolunteerRow key={v.id} v={v} isAssigned={false} />) : <p className="text-sm text-text-color-secondary italic">Nessuno disponibile</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};

const BulkActionsEditor: React.FC<{ selectedIds: string[]; categories: string[]; locations: Location[]; onClose: () => void; }> = ({ selectedIds, categories, locations, onClose }) => {
    const [bulkForm, setBulkForm] = useState<{
        data_inizio: string;
        ora_inizio: string;
        ora_fine: string;
        luogo: string;
        categoria: string;
    }>({ data_inizio: '', ora_inizio: '', ora_fine: '', luogo: '', categoria: '' });
    
    const [isLoading, setIsLoading] = useState(false);

    const handleBulkDelete = async () => {
        if (!window.confirm(`Eliminare DEFINITIVAMENTE ${selectedIds.length} turni e le relative assegnazioni?`)) return;
        setIsLoading(true);
        try {
            // Split into chunks of 450 to allow massive deletes
            const chunkSize = 450;
            for (let i = 0; i < selectedIds.length; i += chunkSize) {
                const chunk = selectedIds.slice(i, i + chunkSize);
                const batch = writeBatch(db);
                chunk.forEach(id => batch.delete(doc(db, 'shifts', id)));
                await batch.commit();
            }
            showToast(`${selectedIds.length} turni eliminati.`);
            onClose();
        } catch (e) { showToast('Errore eliminazione massiva.', 'error'); }
        setIsLoading(false);
    };

    const handleBulkUpdate = async () => {
        const updates: any = {};
        if (bulkForm.data_inizio) updates.data_inizio = bulkForm.data_inizio;
        if (bulkForm.ora_inizio) updates.ora_inizio = bulkForm.ora_inizio;
        if (bulkForm.ora_fine) updates.ora_fine = bulkForm.ora_fine;
        if (bulkForm.luogo) updates.luogo = bulkForm.luogo;
        if (bulkForm.categoria) updates.categoria = bulkForm.categoria;

        if (Object.keys(updates).length === 0) {
            showToast('Nessun campo modificato.', 'error');
            return;
        }

        if (!window.confirm(`Aggiornare ${selectedIds.length} turni con i nuovi parametri?`)) return;
        
        setIsLoading(true);
        try {
            const chunkSize = 450;
            for (let i = 0; i < selectedIds.length; i += chunkSize) {
                const chunk = selectedIds.slice(i, i + chunkSize);
                const batch = writeBatch(db);
                chunk.forEach(id => batch.update(doc(db, 'shifts', id), updates));
                await batch.commit();
            }
            showToast('Modifica massiva completata.');
            onClose();
        } catch (e) { showToast('Errore aggiornamento.', 'error'); }
        setIsLoading(false);
    };

    return (
        <div className="bg-surface-1 rounded-2xl p-6 border border-surface-3 sticky top-24 shadow-m3-lg animate-scale-in h-[calc(100vh-120px)] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-2xl font-serif font-bold text-primary">Modifica Multipla</h3>
                <button onClick={onClose} className="p-2 hover:bg-surface-2 rounded-full"><span className="material-symbols-rounded">close</span></button>
            </div>
            <p className="mb-6 text-text-color-secondary font-bold">{selectedIds.length} turni selezionati</p>
            
            <div className="space-y-6">
                <div className="p-4 bg-surface-2 rounded-xl space-y-4">
                    <div className="text-xs font-bold text-text-color-secondary uppercase mb-2">Parametri da Aggiornare</div>
                    <p className="text-xs text-text-color-secondary italic mb-4">Compila solo i campi che vuoi modificare per tutti i turni selezionati.</p>
                    
                    <FormInput label="Nuova Data (DD/MM/YYYY)" value={bulkForm.data_inizio} onChange={e => setBulkForm({...bulkForm, data_inizio: e.target.value})} placeholder="Lascia vuoto per non cambiare" />
                    
                    <div className="grid grid-cols-2 gap-2">
                         <FormInput type="time" label="Ora Inizio" value={bulkForm.ora_inizio} onChange={e => setBulkForm({...bulkForm, ora_inizio: e.target.value})} />
                         <FormInput type="time" label="Ora Fine" value={bulkForm.ora_fine} onChange={e => setBulkForm({...bulkForm, ora_fine: e.target.value})} />
                    </div>

                    <FormSelect label="Nuovo Luogo" value={bulkForm.luogo} onChange={e => setBulkForm({...bulkForm, luogo: e.target.value})}>
                        <option value="">Non cambiare</option>
                        {locations.map(l => <option key={l.id} value={l.id}>{l.id}</option>)}
                    </FormSelect>

                    <FormSelect label="Nuova Categoria" value={bulkForm.categoria} onChange={e => setBulkForm({...bulkForm, categoria: e.target.value})}>
                        <option value="">Non cambiare</option>
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                    </FormSelect>

                    <button onClick={handleBulkUpdate} disabled={isLoading} className="w-full bg-primary text-on-primary py-3 rounded-xl font-bold mt-2 shadow-sm hover:opacity-90">
                        {isLoading ? <Spinner /> : 'Applica Modifiche'}
                    </button>
                </div>

                <div className="p-4 bg-surface-2 rounded-xl border border-red-100 bg-red-50">
                     <label className="block text-xs font-bold text-red-800 uppercase mb-2">Zona Pericolo</label>
                    <button onClick={handleBulkDelete} disabled={isLoading} className="w-full py-3 bg-white text-red-600 rounded-xl font-bold border border-red-200 hover:bg-red-100 transition shadow-sm">
                        Elimina {selectedIds.length} Turni
                    </button>
                </div>
            </div>
        </div>
    );
}

const AdminShifts: React.FC<AdminShiftsProps> = ({ appData, onOpenAiModal, initialShiftData, clearInitialShiftData }) => {
    const editorRef = useRef<EditorRef>(null);
    const [activeEditor, setActiveEditor] = useState<'shift' | 'assignment' | 'bulk' | null>(null);
    const [selectedShift, setSelectedShift] = useState<Shift | Partial<Shift> | 'new' | null>(null);
    const [showMobileEditor, setShowMobileEditor] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    
    // Bulk Action State
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [quickDate, setQuickDate] = useState('');
    const [isQuickActionLoading, setIsQuickActionLoading] = useState(false);

    useEffect(() => {
        if (initialShiftData) {
            setSelectedShift(initialShiftData);
            setActiveEditor('shift');
            setShowMobileEditor(true);
            clearInitialShiftData();
        }
    }, [initialShiftData, clearInitialShiftData]);

    // Filter shifts first
    const filteredShifts = useMemo(() => {
        let filtered = appData.shifts;
        if (searchTerm) {
            const lower = searchTerm.toLowerCase();
            filtered = filtered.filter(s => 
                s.nome_turno.toLowerCase().includes(lower) || 
                s.categoria.toLowerCase().includes(lower) ||
                s.luogo.toLowerCase().includes(lower)
            );
        }
        return filtered;
    }, [appData.shifts, searchTerm]);

    // Then group them
    const shiftsByCategory = useMemo(() => {
        return filteredShifts.reduce((acc, shift) => {
            const category = shift.categoria || 'Senza Categoria';
            if (!acc[category]) acc[category] = [];
            acc[category].push(shift);
            return acc;
        }, {} as Record<string, Shift[]>);
    }, [filteredShifts]);

    const handleSelectShift = async (shift: Shift | 'new' | Partial<Shift>) => {
        if (selectedIds.size > 0) return; // Disable single select if in bulk mode
        if (editorRef.current?.isDirty()) await editorRef.current.submitForm();
        setSelectedShift(shift);
        setActiveEditor('shift');
        setShowMobileEditor(true);
    };
    
    const toggleSelection = (id: string) => {
        const newSet = new Set(selectedIds);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedIds(newSet);
        
        if (newSet.size > 0) {
            setActiveEditor('bulk');
            if (window.innerWidth < 1024) setShowMobileEditor(true);
        } else {
            setActiveEditor(null);
            setShowMobileEditor(false);
        }
    };

    const handleSelectAll = () => {
        if (selectedIds.size === filteredShifts.length) {
            setSelectedIds(new Set());
            setActiveEditor(null);
        } else {
            setSelectedIds(new Set(filteredShifts.map(s => s.id)));
            setActiveEditor('bulk');
            if (window.innerWidth < 1024) setShowMobileEditor(true);
        }
    };

    const handleQuickDateUpdate = async () => {
        if (!quickDate) { showToast('Inserisci una data.', 'error'); return; }
        // Convert YYYY-MM-DD to DD/MM/YYYY
        const [year, month, day] = quickDate.split('-');
        const formattedDate = `${day}/${month}/${year}`;
        
        if (!window.confirm(`Impostare la data ${formattedDate} a TUTTI i ${filteredShifts.length} turni filtrati?`)) return;
        
        setIsQuickActionLoading(true);
        try {
            const chunkSize = 450;
            for (let i = 0; i < filteredShifts.length; i += chunkSize) {
                const chunk = filteredShifts.slice(i, i + chunkSize);
                const batch = writeBatch(db);
                chunk.forEach(shift => batch.update(doc(db, 'shifts', shift.id), { data_inizio: formattedDate }));
                await batch.commit();
            }
            showToast('Date aggiornate!');
        } catch (e) { showToast('Errore aggiornamento.', 'error'); }
        setIsQuickActionLoading(false);
    };

    const handleDuplicate = async (e: React.MouseEvent, shift: Shift) => {
        e.stopPropagation();
        if (editorRef.current?.isDirty()) await editorRef.current.submitForm();
        const { id, ...rest } = shift;
        const copy: Partial<Shift> = { ...rest, nome_turno: `${rest.nome_turno} (Copia)`, id_turno: `${rest.id_turno}-CPY` };
        setSelectedShift(copy);
        setActiveEditor('shift');
        setShowMobileEditor(true);
        showToast("Turno duplicato! Modifica e salva.");
    };

    const handleManageVolunteers = async (e: React.MouseEvent, shift: Shift) => {
        e.stopPropagation();
        if (editorRef.current?.isDirty()) await editorRef.current.submitForm();
        setSelectedShift(shift);
        setActiveEditor('assignment');
        setShowMobileEditor(true);
    };
    
    const handleCloseEditor = async () => {
        if (editorRef.current?.isDirty()) await editorRef.current.submitForm();
        setActiveEditor(null);
        setShowMobileEditor(false);
        setSelectedIds(new Set());
    }

    const editorContent = (
        <>
            {activeEditor === 'shift' && selectedShift && <ShiftEditor ref={editorRef} shift={selectedShift} categories={appData.shiftCategories} locations={appData.locations} onSave={() => {}} onCancel={handleCloseEditor} />}
            {activeEditor === 'assignment' && typeof selectedShift === 'object' && selectedShift && 'id' in selectedShift && <AssignmentEditor shift={selectedShift as Shift} volunteers={appData.volunteers} assignments={appData.assignments} />}
            {activeEditor === 'bulk' && <BulkActionsEditor selectedIds={Array.from(selectedIds)} categories={appData.shiftCategories} locations={appData.locations} onClose={handleCloseEditor} />}
        </>
    );

    return (
        <div className="flex flex-col lg:flex-row gap-6 relative h-[calc(100vh-150px)]">
            <div className={`flex-col lg:w-7/12 xl:w-2/3 flex ${showMobileEditor ? 'hidden lg:flex' : ''}`}>
                {/* Top Buttons */}
                <div className="flex gap-2 mb-4">
                    <button onClick={() => handleSelectShift('new')} className="flex-grow bg-primary text-on-primary py-3 rounded-xl font-bold shadow-m3-sm hover:shadow-m3-md transition flex items-center justify-center gap-2">
                        <span className="material-symbols-rounded">add</span> Nuovo Turno
                    </button>
                    <button onClick={onOpenAiModal} className="bg-surface-1 text-primary border border-surface-2 py-3 px-4 rounded-xl font-bold shadow-m3-sm hover:bg-surface-2 transition" title="Crea con AI">
                        <span className="material-symbols-rounded">auto_awesome</span>
                    </button>
                </div>

                {/* Quick Actions Bar (Global for filtered) */}
                <div className="flex flex-col sm:flex-row gap-3 items-center bg-primary-container/30 p-3 rounded-xl mb-4 border border-primary-container">
                    <span className="font-bold text-sm text-primary uppercase tracking-wider flex items-center gap-2">
                        <span className="material-symbols-rounded">flash_on</span> Azioni Rapide:
                    </span>
                    <div className="flex gap-2 flex-grow w-full sm:w-auto">
                         <input 
                            type="date" 
                            value={quickDate} 
                            onChange={e => setQuickDate(e.target.value)} 
                            className="flex-grow sm:flex-grow-0 p-2 rounded-lg border border-surface-3 bg-surface-1 text-sm"
                        />
                        <button 
                            onClick={handleQuickDateUpdate} 
                            disabled={isQuickActionLoading}
                            className="px-4 py-2 bg-primary text-on-primary text-sm font-bold rounded-lg hover:opacity-90 whitespace-nowrap flex items-center gap-2"
                        >
                            {isQuickActionLoading ? <Spinner size="sm"/> : 'Imposta Data a Tutti i turni visibili'}
                        </button>
                    </div>
                </div>

                {/* Search & Select All */}
                <div className="flex gap-2 mb-4">
                     <div className="relative flex-grow">
                        <span className="material-symbols-rounded absolute left-3 top-1/2 -translate-y-1/2 text-text-color-secondary">search</span>
                        <input 
                            type="search" 
                            placeholder="Cerca turni..." 
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)} 
                            className="w-full pl-10 pr-4 py-3 bg-surface-1 border border-surface-3 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition shadow-sm" 
                        />
                    </div>
                    <button 
                        onClick={handleSelectAll} 
                        className={`px-4 rounded-xl border font-bold transition ${selectedIds.size > 0 && selectedIds.size === filteredShifts.length ? 'bg-primary text-on-primary border-primary' : 'bg-surface-1 border-surface-3 hover:bg-surface-2'}`}
                    >
                        {selectedIds.size > 0 && selectedIds.size === filteredShifts.length ? 'Deseleziona' : 'Seleziona Tutti'}
                    </button>
                </div>

                {/* Shifts List */}
                <div className="overflow-y-auto flex-grow space-y-6 pb-20 custom-scrollbar pr-2">
                    {Object.entries(shiftsByCategory).length > 0 ? Object.entries(shiftsByCategory).map(([category, categoryShifts]) => (
                        <div key={category} className="animate-fade-in">
                            <h4 className="font-bold text-lg text-text-color-secondary mb-3 px-2 border-l-4 border-secondary flex justify-between items-center">
                                {category}
                                <span className="text-xs font-normal bg-surface-2 px-2 py-1 rounded-full">{categoryShifts.length}</span>
                            </h4>
                            <div className="grid gap-3">
                                {categoryShifts.map(shift => (
                                    <div 
                                        key={shift.id} 
                                        onClick={() => handleSelectShift(shift)}
                                        className={`group bg-surface-1 p-4 rounded-2xl border-2 transition-all duration-200 cursor-pointer hover:shadow-md flex items-start gap-3 select-none ${selectedIds.has(shift.id) ? 'border-primary bg-primary-container/10' : 'border-surface-2 hover:border-primary/50'}`}
                                    >
                                        <div className="pt-1" onClick={(e) => { e.stopPropagation(); toggleSelection(shift.id); }}>
                                            <div className={`w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-colors ${selectedIds.has(shift.id) ? 'bg-primary border-primary' : 'border-text-color-secondary'}`}>
                                                {selectedIds.has(shift.id) && <span className="material-symbols-rounded text-white text-sm">check</span>}
                                            </div>
                                        </div>

                                        <div className="flex-grow">
                                            <div className="flex justify-between items-start">
                                                <h5 className="font-bold text-lg leading-tight">{shift.nome_turno}</h5>
                                                <span className="text-xs font-mono font-medium bg-surface-2 px-2 py-1 rounded text-text-color-secondary">{shift.ora_inizio} - {shift.ora_fine}</span>
                                            </div>
                                            <p className="text-sm text-text-color-secondary flex items-center gap-1 mt-1">
                                                <span className="material-symbols-rounded text-sm">calendar_today</span> {shift.data_inizio}
                                                <span className="mx-1">•</span>
                                                <span className="material-symbols-rounded text-sm">location_on</span> {shift.luogo}
                                            </p>
                                        </div>

                                        <div className="flex flex-col gap-1">
                                             <button onClick={(e) => handleManageVolunteers(e, shift)} className="p-2 rounded-full hover:bg-surface-2 text-text-color-secondary hover:text-primary transition" title="Gestisci Volontari">
                                                <span className="material-symbols-rounded">group</span>
                                            </button>
                                            <button onClick={(e) => handleDuplicate(e, shift)} className="p-2 rounded-full hover:bg-surface-2 text-text-color-secondary hover:text-primary transition" title="Duplica">
                                                <span className="material-symbols-rounded">content_copy</span>
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )) : (
                        <div className="flex flex-col items-center justify-center h-40 text-text-color-secondary opacity-60">
                            <span className="material-symbols-rounded text-4xl mb-2">event_busy</span>
                            <p>Nessun turno trovato.</p>
                        </div>
                    )}
                </div>
            </div>

            {/* RIGHT PANEL (EDITOR) */}
            <div className={`lg:w-5/12 xl:w-1/3 ${showMobileEditor ? 'fixed inset-0 z-50 bg-surface p-4 lg:static lg:bg-transparent lg:p-0 flex flex-col' : 'hidden lg:block'}`}>
                {showMobileEditor && (
                    <button onClick={handleCloseEditor} className="lg:hidden absolute top-4 right-4 p-3 bg-surface-1 rounded-full shadow-lg z-50 border border-surface-2">
                        <span className="material-symbols-rounded">close</span>
                    </button>
                )}
                
                {activeEditor ? editorContent : <EditorPlaceholder message="Seleziona un turno per modificarlo o creane uno nuovo." icon="edit_calendar" />}
            </div>
        </div>
    );
};

export default AdminShifts;
