
import React, { useState, useEffect, useMemo, useRef, forwardRef, useImperativeHandle } from 'react';
import { db } from '../services/firebase';
import { collection, doc, setDoc, addDoc, deleteDoc, writeBatch, query, where, getDocs, updateDoc, serverTimestamp } from "firebase/firestore";
import { Volunteer, Shift, Assignment, RaceEvent, DashboardEvent, Sport, Location, UsefulLink } from '../types';
import { Modal, showToast } from '../App';
import Spinner from './ui/Spinner';

// ====================================================================
// # ADMIN PANEL PROPS & CONSTANTS
// ====================================================================
interface AdminPanelProps {
    currentUser: Volunteer;
    appData: {
        volunteers: Volunteer[];
        shifts: Shift[];
        assignments: Assignment[];
        shiftCategories: string[];
        volunteerCategories: string[];
        raceEvents: RaceEvent[];
        dashboardEvents: DashboardEvent[];
        sportsList: Sport[];
        locations: Location[];
        usefulLinks: UsefulLink[];
    };
    isAdmin: boolean;
    initialView: string;
    onOpenAiModal: () => void;
    initialShiftData: Partial<Shift> | null;
    clearInitialShiftData: () => void;
    setCurrentView: (view: string) => void;
}

const MaterialSymbol: React.FC<{ name: string; className?: string; isFilled?: boolean; }> = ({ name, className, isFilled }) => (
    <span className={`material-symbols-rounded ${isFilled ? 'fill' : ''} ${className || ''}`}>{name}</span>
);

const CATEGORIES_LIST = ["Mini", "Junior", "Senior"];
const GENDERS_LIST = ["Misto", "Maschile", "Femminile"];

// ====================================================================
// # HELPER & EDITOR COMPONENTS (Scoped to Admin Panel)
// ====================================================================
const ConfirmationModal: React.FC<{ title: string; message: React.ReactNode; onConfirm: () => void; onClose: () => void; confirmText?: string; }> = ({ title, message, onConfirm, onClose, confirmText = "Conferma" }) => (
    <Modal title={title} onClose={onClose}>
        <div>{message}</div>
        <div className="flex justify-end gap-4 mt-6">
            <button onClick={onClose} className="px-6 py-2 rounded-full bg-surface-3 text-text-color hover:bg-outline/30 transition">Annulla</button>
            <button onClick={() => { onConfirm(); onClose(); }} className="px-6 py-2 rounded-full bg-accent-red text-white hover:opacity-90 transition">{confirmText}</button>
        </div>
    </Modal>
);

const EditorPlaceholder: React.FC<{ message: string; icon: string }> = ({ message, icon }) => (
    <div className="hidden lg:flex h-full min-h-[60vh] items-center justify-center bg-surface-1 rounded-2xl border-2 border-dashed border-surface-3">
        <div className="text-center text-text-color-secondary p-4">
            <MaterialSymbol name={icon} className="text-6xl" />
            <p className="mt-4 font-semibold">{message}</p>
        </div>
    </div>
);


const AdminDashboard: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => (
    <div className="space-y-4 animate-fade-in">
        <button onClick={() => onNavigate('admin-race-program')} className="w-full text-left flex items-center gap-6 p-6 bg-surface-1 rounded-4xl border border-surface-2 hover:bg-surface-2 transition-colors">
            <div className="p-4 rounded-full bg-orange-500/20 text-orange-400"><MaterialSymbol name="sports_score" className="text-4xl" /></div>
            <div>
                <h3 className="text-xl font-bold">Gestisci Programma Gara</h3>
                <p className="text-text-color-secondary">Crea e organizza gli eventi sportivi e generali del programma.</p>
            </div>
        </button>
         <button onClick={() => onNavigate('admin-dashboard-cards')} className="w-full text-left flex items-center gap-6 p-6 bg-surface-1 rounded-4xl border border-surface-2 hover:bg-surface-2 transition-colors">
            <div className="p-4 rounded-full bg-purple-500/20 text-purple-400"><MaterialSymbol name="dashboard" className="text-4xl" /></div>
            <div>
                <h3 className="text-xl font-bold">Gestisci Dashboard</h3>
                <p className="text-text-color-secondary">Modifica le card informative visualizzate nella home.</p>
            </div>
        </button>
        <button onClick={() => onNavigate('admin-shifts')} className="w-full text-left flex items-center gap-6 p-6 bg-surface-1 rounded-4xl border border-surface-2 hover:bg-surface-2 transition-colors">
            <div className="p-4 rounded-full bg-blue-500/20 text-blue-400"><MaterialSymbol name="assignment" className="text-4xl" /></div>
            <div>
                <h3 className="text-xl font-bold">Gestisci Turni</h3>
                <p className="text-text-color-secondary">Aggiungi turni, assegna volontari e gestisci le categorie.</p>
            </div>
        </button>
        <button onClick={() => onNavigate('admin-volunteers')} className="w-full text-left flex items-center gap-6 p-6 bg-surface-1 rounded-4xl border border-surface-2 hover:bg-surface-2 transition-colors">
            <div className="p-4 rounded-full bg-green-500/20 text-green-400"><MaterialSymbol name="group" className="text-4xl" /></div>
            <div>
                <h3 className="text-xl font-bold">Gestisci Volontari</h3>
                <p className="text-text-color-secondary">Visualizza, aggiungi o modifica i volontari iscritti.</p>
            </div>
        </button>
         <button onClick={() => onNavigate('admin-locations')} className="w-full text-left flex items-center gap-6 p-6 bg-surface-1 rounded-4xl border border-surface-2 hover:bg-surface-2 transition-colors">
            <div className="p-4 rounded-full bg-teal-500/20 text-teal-400"><MaterialSymbol name="pin_drop" className="text-4xl" /></div>
            <div>
                <h3 className="text-xl font-bold">Gestisci Luoghi</h3>
                <p className="text-text-color-secondary">Aggiungi o modifica i luoghi utilizzabili in turni ed eventi.</p>
            </div>
        </button>
         <button onClick={() => onNavigate('admin-settings')} className="w-full text-left flex items-center gap-6 p-6 bg-surface-1 rounded-4xl border border-surface-2 hover:bg-surface-2 transition-colors">
            <div className="p-4 rounded-full bg-indigo-500/20 text-indigo-400"><MaterialSymbol name="settings" className="text-4xl" /></div>
            <div>
                <h3 className="text-xl font-bold">Impostazioni</h3>
                <p className="text-text-color-secondary">Modifica link utili e altre impostazioni globali.</p>
            </div>
        </button>
    </div>
);

// Define a standard interface for editor refs to enforce consistency
interface EditorRef {
  submitForm: () => Promise<boolean>; // Returns true on success
  isDirty: () => boolean;
}

// ====================================================================
// # SHIFT MANAGEMENT VIEW & EDITORS
// ====================================================================
const ShiftEditor = forwardRef<EditorRef, { shift: Shift | Partial<Shift> | 'new'; categories: string[]; locations: Location[]; onSave: () => void; onCancel: () => void; }>((props, ref) => {
    const { shift, categories, locations, onSave, onCancel } = props;
    const isNew = shift === 'new';
    const initialData = useMemo(() => isNew ? { data_inizio: '02/06/2026'} : shift, [shift, isNew]);
    const [formData, setFormData] = useState<Partial<Shift>>(initialData);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showConfirm, setShowConfirm] = useState(false);
    
    const isEditing = !isNew && 'id' in formData;

    useEffect(() => {
        setFormData(initialData);
    }, [initialData]);
    
    const isDirty = useMemo(() => JSON.stringify(initialData) !== JSON.stringify(formData), [initialData, formData]);

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
            onSave(); // To refresh and close editor
        } catch (error) {
            showToast('Errore durante la rimozione.', 'error');
        } finally {
            setIsDeleting(false);
        }
    };
    
    return (
        <div className="bg-surface-1 rounded-2xl p-6 border border-surface-3 sticky top-24">
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
                     {!isNew && <button type="button" onClick={() => setShowConfirm(true)} disabled={isDeleting} className="flex-1 bg-red-600 hover:bg-red-700 text-white p-3 rounded-full font-bold transition disabled:opacity-50 flex justify-center">{isDeleting ? <Spinner/> : 'Elimina'}</button>}
                    <button type="button" onClick={onCancel} className="flex-1 bg-surface-3 hover:bg-outline/30 text-text-color p-3 rounded-full font-bold transition">Annulla</button>
                    <button type="submit" className="flex-1 bg-primary hover:opacity-90 text-on-primary p-3 rounded-full font-bold transition">Salva</button>
                </div>
            </form>
            {showConfirm && <ConfirmationModal title="Conferma Eliminazione" message={`Sei sicuro di voler eliminare il turno "${formData.nome_turno}"?`} onConfirm={handleDelete} onClose={() => setShowConfirm(false)} />}
        </div>
    );
});

const Avatar: React.FC<{ volunteer: Volunteer }> = ({ volunteer }) => {
    const savedAvatar = localStorage.getItem(`avatar_${volunteer.email}`);
    return savedAvatar ? 
        <img src={savedAvatar} alt="Avatar" className="w-8 h-8 rounded-full object-cover flex-shrink-0" /> :
        <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-sm flex-shrink-0">
            {volunteer.nome.charAt(0)}{volunteer.cognome.charAt(0)}
        </div>;
};

const VolunteerCard: React.FC<{
    volunteer: Volunteer,
    isAssigned: boolean,
    onAssign: (email: string) => void,
    onUnassign: (email: string) => void,
    onDragStart: (e: React.DragEvent, email: string) => void,
}> = ({ volunteer, isAssigned, onAssign, onUnassign, onDragStart }) => (
    <div
        draggable="true"
        onDragStart={(e) => onDragStart(e, volunteer.email)}
        className="flex justify-between items-center p-2 bg-surface-1 hover:bg-surface-3 rounded-lg cursor-grab active:cursor-grabbing transition-colors duration-150 shadow-sm border border-surface-2"
    >
        <div className="flex items-center gap-3 overflow-hidden">
            <Avatar volunteer={volunteer} />
            <span className="truncate">{volunteer.nome} {volunteer.cognome}</span>
        </div>
        <button 
            onClick={() => isAssigned ? onUnassign(volunteer.email) : onAssign(volunteer.email)} 
            className={`p-1 rounded-full text-white transition-transform hover:scale-110 ${isAssigned ? 'bg-red-500 hover:bg-red-600' : 'bg-green-500 hover:bg-green-600'}`}
            aria-label={isAssigned ? 'Rimuovi assegnazione' : 'Assegna'}
        >
            {isAssigned ? <MaterialSymbol name="remove" className="text-sm"/> : <MaterialSymbol name="add" className="text-sm"/>}
        </button>
    </div>
);

const AssignmentEditor: React.FC<{shift: Shift; volunteers: Volunteer[]; assignments: Assignment[];}> = ({ shift, volunteers, assignments }) => {
    const [search, setSearch] = useState('');
    const [assignedEmails, setAssignedEmails] = useState<Set<string>>(() => new Set(assignments.filter(a => a.id_turno === shift.id_turno).map(a => a.email_volontario)));
    const [isDraggingOver, setIsDraggingOver] = useState<'available' | 'assigned' | null>(null);
    
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

    const handleAssign = async (email: string) => {
        try {
            await addDoc(collection(db, "assignments"), { email_volontario: email, id_turno: shift.id_turno });
            await addDoc(collection(db, "notifications"), {
                message: `Sei stato assegnato a un nuovo turno: "${shift.nome_turno}".`,
                sender: 'Sistema',
                timestamp: serverTimestamp(),
                targetEmails: [email],
                readBy: [],
                deletedBy: []
            });
            setAssignedEmails(prev => new Set(prev).add(email));
        } catch (e) { console.error(e); showToast('Errore assegnazione.', 'error'); }
    };

    const handleUnassign = async (email: string) => {
        try {
            const q = query(collection(db, "assignments"), where('id_turno', '==', shift.id_turno), where('email_volontario', '==', email));
            const snapshot = await getDocs(q);
            if (!snapshot.empty) {
                await deleteDoc(snapshot.docs[0].ref);
                await addDoc(collection(db, "notifications"), {
                    message: `La tua assegnazione per il turno "${shift.nome_turno}" è stata rimossa.`,
                    sender: 'Sistema',
                    timestamp: serverTimestamp(),
                    targetEmails: [email],
                    readBy: [],
                    deletedBy: []
                });
                setAssignedEmails(prev => {
                    const next = new Set(prev); next.delete(email); return next;
                });
            }
        } catch (e) { console.error(e); showToast('Errore rimozione assegnazione.', 'error'); }
    };

    const handleDragStart = (e: React.DragEvent, email: string) => { e.dataTransfer.setData('volunteerEmail', email); };

    const handleDrop = (e: React.DragEvent, targetList: 'assigned' | 'available') => {
        e.preventDefault();
        const email = e.dataTransfer.getData('volunteerEmail');
        if (!email) return;

        if (targetList === 'assigned' && !assignedEmails.has(email)) handleAssign(email);
        else if (targetList === 'available' && assignedEmails.has(email)) handleUnassign(email);
        setIsDraggingOver(null);
    };

    const handleDragOver = (e: React.DragEvent) => { e.preventDefault(); };

    const renderDropZone = (volunteers: Volunteer[], type: 'available' | 'assigned', title: string) => (
         <div 
            onDrop={(e) => handleDrop(e, type)} 
            onDragOver={handleDragOver}
            onDragEnter={() => setIsDraggingOver(type)}
            onDragLeave={() => setIsDraggingOver(null)}
            className={`h-[40rem] bg-surface-2 p-3 rounded-2xl border-2 border-dashed transition-colors ${isDraggingOver === type ? 'border-primary bg-primary-container/30' : 'border-surface-3'}`}
        >
            <h4 className="font-bold mb-2 text-center text-text-color-secondary">{title} ({volunteers.length})</h4>
            <div className="h-full overflow-y-auto space-y-2 pr-1">
                {volunteers.length > 0 ? (
                    volunteers.map(v => <VolunteerCard key={v.id} volunteer={v} isAssigned={type === 'assigned'} onAssign={handleAssign} onUnassign={handleUnassign} onDragStart={handleDragStart}/>)
                ) : (
                    <div className="flex items-center justify-center h-full text-text-color-secondary italic">
                        {isDraggingOver === type ? 'Rilascia per aggiungere' : 'Trascina qui'}
                    </div>
                )}
            </div>
        </div>
    );

    return (
        <div className="bg-surface-1 rounded-2xl p-6 border border-surface-3 sticky top-24">
            <h3 className="text-2xl font-serif font-bold mb-4">Assegna: {shift.nome_turno}</h3>
            <input type="search" placeholder="Cerca volontario..." value={search} onChange={e => setSearch(e.target.value)} className="w-full p-3 mb-4 bg-surface-2 border border-surface-3 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition" />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {renderDropZone(available, 'available', 'Disponibili')}
                {renderDropZone(assigned, 'assigned', 'Assegnati')}
            </div>
        </div>
    );
};

const ManageShiftCategoriesModal: React.FC<{ categories: string[]; shifts: Shift[]; onClose: () => void; }> = ({ categories, shifts, onClose }) => {
    const [newCategoryName, setNewCategoryName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [categoryToDelete, setCategoryToDelete] = useState<string | null>(null);
    const categoriesInUse = useMemo(() => new Set(shifts.map(s => s.categoria)), [shifts]);

    const handleAdd = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmed = newCategoryName.trim();
        if (!trimmed) {
            showToast('Il nome della categoria non può essere vuoto.', 'error');
            return;
        }
        if (categories.some(c => c.toLowerCase() === trimmed.toLowerCase())) {
            showToast('Questa categoria esiste già.', 'error');
            return;
        }
        setIsLoading(true);
        try {
            await setDoc(doc(db, 'shift_categories', trimmed), {});
            showToast('Categoria aggiunta!');
            setNewCategoryName('');
        } catch (error) { showToast('Errore durante l\'aggiunta.', 'error'); }
        finally { setIsLoading(false); }
    };
    
    const handleDelete = async () => {
        if (!categoryToDelete) return;
        setIsLoading(true);
        try {
            await deleteDoc(doc(db, 'shift_categories', categoryToDelete));
            showToast('Categoria eliminata!');
        } catch(error) { showToast('Errore durante l\'eliminazione.', 'error'); }
        finally {
            setIsLoading(false);
            setCategoryToDelete(null);
        }
    };

    return (
        <>
        <Modal title="Gestisci Categorie Turno" onClose={onClose}>
            <ul className="space-y-2 max-h-60 overflow-y-auto pr-2 mb-4">
                {categories.map(cat => (
                    <li key={cat} className="flex items-center justify-between p-2 bg-surface-2 rounded-lg group">
                        <span className="font-semibold">{cat}</span>
                        <button 
                            onClick={() => {
                                if (categoriesInUse.has(cat)) {
                                    showToast('Impossibile eliminare una categoria in uso.', 'error');
                                } else {
                                    setCategoryToDelete(cat);
                                }
                            }} 
                            className="p-2 rounded-full hover:bg-surface-3 opacity-0 group-hover:opacity-100 transition-opacity disabled:cursor-not-allowed"
                            disabled={isLoading}
                            title={categoriesInUse.has(cat) ? "Categoria in uso" : "Elimina"}
                        >
                            <MaterialSymbol name="delete" className={`${categoriesInUse.has(cat) ? 'text-gray-400' : 'text-red-500'}`} />
                        </button>
                    </li>
                ))}
            </ul>
             <form onSubmit={handleAdd} className="space-y-2 pt-4 border-t border-surface-3">
                 <FormInput type="text" value={newCategoryName} onChange={e => setNewCategoryName(e.target.value)} label="Nome Nuova Categoria" placeholder="Es. Logistica" disabled={isLoading} />
                <div className="pt-2">
                    <button type="submit" className="w-full bg-primary text-on-primary p-3 rounded-full font-bold flex items-center justify-center hover:opacity-90 transition disabled:opacity-50" disabled={isLoading || !newCategoryName.trim()}>
                        {isLoading ? <Spinner /> : <><MaterialSymbol name="add"/> Aggiungi Categoria</>}
                    </button>
                </div>
            </form>
        </Modal>
        {categoryToDelete && (
             <ConfirmationModal
                title="Conferma Eliminazione"
                message={`Sei sicuro di voler eliminare la categoria "${categoryToDelete}"? L'operazione non può essere annullata.`}
                onConfirm={handleDelete}
                onClose={() => setCategoryToDelete(null)}
            />
        )}
        </>
    );
};

const SetDateForShiftsModal: React.FC<{ shifts: Shift[]; onClose: () => void; }> = ({ shifts, onClose }) => {
    const [targetDate, setTargetDate] = useState(''); // YYYY-MM-DD
    const [isLoading, setIsLoading] = useState(false);

    const handleUpdate = async () => {
        if (!targetDate) {
            showToast("Per favore, seleziona una data.", 'error');
            return;
        }
        setIsLoading(true);
        try {
            // Convert YYYY-MM-DD to DD/MM/YYYY for consistency
            const [year, month, day] = targetDate.split('-');
            const formattedDate = `${day}/${month}/${year}`;

            const batch = writeBatch(db);
            shifts.forEach(shift => {
                const shiftRef = doc(db, 'shifts', shift.id);
                batch.update(shiftRef, { data_inizio: formattedDate });
            });
            await batch.commit();
            showToast(`La data di ${shifts.length} turni è stata aggiornata!`, 'success');
            onClose();
        } catch (error) {
            console.error("Failed to update all shifts:", error);
            showToast("Si è verificato un errore durante l'aggiornamento.", 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <Modal title="Imposta Data Unica per Turni" onClose={onClose}>
            <div className="space-y-4">
                 <p className="text-text-color-secondary">
                    Questa azione modificherà la data di <strong>tutti i turni esistenti</strong>. 
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
                        {isLoading ? <Spinner /> : 'Applica a Tutti i Turni'}
                    </button>
                </div>
            </div>
        </Modal>
    );
};

const MultiShiftEditModal: React.FC<{
    selectedShiftIds: string[];
    categories: string[];
    locations: Location[];
    onClose: () => void;
}> = ({ selectedShiftIds, categories, locations, onClose }) => {
    const [changes, setChanges] = useState<Partial<Shift>>({});
    const [isLoading, setIsLoading] = useState(false);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setChanges(prev => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleUpdate = async () => {
        setIsLoading(true);
        try {
            const batch = writeBatch(db);
            const updatesToApply: { [key: string]: any } = {};

            (Object.keys(changes) as Array<keyof Partial<Shift>>).forEach(key => {
                if (changes[key]) {
                    updatesToApply[key] = changes[key];
                }
            });

            if (Object.keys(updatesToApply).length === 0) {
                showToast("Nessuna modifica da applicare.", 'error');
                setIsLoading(false);
                return;
            }

            selectedShiftIds.forEach(id => {
                const shiftRef = doc(db, 'shifts', id);
                batch.update(shiftRef, updatesToApply);
            });

            await batch.commit();
            showToast(`${selectedShiftIds.length} turni aggiornati con successo!`, 'success');
            onClose();
        } catch (error) {
            console.error("Failed to bulk update shifts:", error);
            showToast("Si è verificato un errore durante l'aggiornamento.", 'error');
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <Modal title={`Modifica ${selectedShiftIds.length} Turni`} onClose={onClose}>
            <div className="space-y-4">
                <p className="text-text-color-secondary text-sm">
                    Compila solo i campi che vuoi modificare. I campi lasciati vuoti non verranno alterati.
                </p>
                <FormSelect name="categoria" value={changes.categoria || ''} onChange={handleChange} label="Nuova Categoria">
                    <option value="">Mantieni originale</option>
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                </FormSelect>
                <FormSelect name="luogo" value={changes.luogo || ''} onChange={handleChange} label="Nuovo Luogo">
                    <option value="">Mantieni originale</option>
                    {locations.map(l => <option key={l.id} value={l.id}>{l.id}</option>)}
                </FormSelect>
                <FormInput name="data_inizio" type="text" value={changes.data_inizio || ''} onChange={handleChange} label="Nuova Data (DD/MM/YYYY)" placeholder="Mantieni originale" />
                <div className="grid grid-cols-2 gap-2">
                    <FormInput type="time" name="ora_inizio" value={changes.ora_inizio || ''} onChange={handleChange} label="Nuova Ora Inizio" />
                    <FormInput type="time" name="ora_fine" value={changes.ora_fine || ''} onChange={handleChange} label="Nuova Ora Fine" />
                </div>
                <div className="pt-4">
                    <button onClick={handleUpdate} disabled={isLoading} className="w-full bg-primary text-on-primary p-3 rounded-full font-bold flex justify-center items-center gap-2 hover:opacity-90 transition disabled:opacity-50">
                        {isLoading ? <Spinner /> : `Applica a ${selectedShiftIds.length} Turni`}
                    </button>
                </div>
            </div>
        </Modal>
    );
};


const AdminShifts: React.FC<AdminPanelProps> = (props) => {
    const { appData, onOpenAiModal } = props;
    const editorRef = useRef<EditorRef>(null);
    const [activeEditor, setActiveEditor] = useState<'shift' | 'assignment' | null>(null);
    const [selectedShift, setSelectedShift] = useState<Shift | Partial<Shift> | 'new' | null>(null);
    const [showMobileEditor, setShowMobileEditor] = useState(false);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isDateModalOpen, setIsDateModalOpen] = useState(false);
    const [selectedShifts, setSelectedShifts] = useState<Set<string>>(new Set());
    const [isMultiEditModalOpen, setIsMultiEditModalOpen] = useState(false);

    useEffect(() => {
        if (props.initialShiftData) {
            handleSelectShift(props.initialShiftData);
            props.clearInitialShiftData();
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [props.initialShiftData]);

    const handleAutoSaveAndSwitch = async (callback: () => void) => {
        if (editorRef.current?.isDirty()) {
            await editorRef.current.submitForm();
        }
        callback();
    };

    const handleSelectShift = (shift: Shift | 'new' | Partial<Shift>) => {
        handleAutoSaveAndSwitch(() => {
            setSelectedShift(shift);
            setActiveEditor('shift');
            setShowMobileEditor(true);
        });
    };

    const handleManageVolunteers = (shift: Shift) => {
        handleAutoSaveAndSwitch(() => {
            setSelectedShift(shift);
            setActiveEditor('assignment');
            setShowMobileEditor(true);
        });
    };

    const handleCloseEditor = () => {
        handleAutoSaveAndSwitch(() => {
            setSelectedShift(null);
            setActiveEditor(null);
            setShowMobileEditor(false);
        });
    };
    
    const handleCheckboxChange = (shiftId: string, isChecked: boolean) => {
        const newSet = new Set(selectedShifts);
        if (isChecked) {
            newSet.add(shiftId);
        } else {
            newSet.delete(shiftId);
        }
        setSelectedShifts(newSet);
    };


    const shiftsByCategory = useMemo(() => {
        return appData.shifts.reduce((acc, shift) => {
            const category = shift.categoria || 'Senza Categoria';
            if (!acc[category]) acc[category] = [];
            acc[category].push(shift);
            return acc;
        }, {} as Record<string, Shift[]>);
    }, [appData.shifts]);
    
    const isShiftSelected = (shift: Shift) => activeEditor === 'shift' && typeof selectedShift === 'object' && selectedShift?.id === shift.id;
    const isAssignmentSelected = (shift: Shift) => activeEditor === 'assignment' && typeof selectedShift === 'object' && selectedShift?.id === shift.id;

    const editorContent = (
        <>
            {activeEditor === 'shift' && selectedShift && (
                 <ShiftEditor ref={editorRef} shift={selectedShift} categories={appData.shiftCategories} locations={appData.locations} onSave={handleCloseEditor} onCancel={handleCloseEditor} />
            )}
            {activeEditor === 'assignment' && typeof selectedShift === 'object' && selectedShift && 'id' in selectedShift && (
                <AssignmentEditor shift={selectedShift as Shift} volunteers={appData.volunteers} assignments={appData.assignments} />
            )}
            {!activeEditor && <EditorPlaceholder message="Seleziona un turno, assegna volontari o crea un nuovo turno." icon="assignment" />}
        </>
    );

    return (
        <div className="lg:grid lg:grid-cols-3 lg:gap-8">
            {/* Left Column (List) */}
            <div className={`lg:col-span-1 animate-fade-in ${showMobileEditor ? 'hidden lg:block' : ''}`}>
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-3xl font-serif font-bold">Gestione Turni</h2>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <button onClick={() => handleSelectShift('new')} className="bg-primary text-on-primary px-4 py-3 rounded-full flex items-center justify-center gap-2 hover:opacity-90 transition font-bold"><MaterialSymbol name="add"/> Crea Turno</button>
                    <button onClick={onOpenAiModal} className="bg-gradient-to-r from-accent-blue to-accent-green text-white px-4 py-3 rounded-full flex items-center justify-center gap-2 hover:opacity-90 transition font-bold"><MaterialSymbol name="auto_awesome"/>Crea con AI</button>
                </div>
                 <div className="grid grid-cols-2 gap-4 mb-6">
                    <button onClick={() => setIsDateModalOpen(true)} className="w-full bg-surface-2 text-text-color-secondary px-4 py-3 rounded-full flex items-center justify-center gap-2 hover:bg-surface-3 transition font-bold"><MaterialSymbol name="calendar_month"/> Imposta Data Unica</button>
                    <button onClick={() => setIsCategoryModalOpen(true)} className="w-full bg-surface-2 text-text-color-secondary px-4 py-3 rounded-full flex items-center justify-center gap-2 hover:bg-surface-3 transition font-bold"><MaterialSymbol name="category"/> Gestisci Categorie</button>
                </div>
                
                <div className="space-y-6">
                    {Object.keys(shiftsByCategory).sort().map(category => (
                        <div key={category}>
                            <h3 className="text-xl font-bold text-secondary mb-2 border-b-2 border-surface-2 pb-1">{category}</h3>
                            <ul className="space-y-2">
                                {shiftsByCategory[category].sort((a,b) => a.nome_turno.localeCompare(b.nome_turno)).map(shift => (
                                    <li key={shift.id} 
                                        className={`bg-surface-1 p-3 rounded-2xl transition-all duration-200 relative pl-10 ${isShiftSelected(shift) || isAssignmentSelected(shift) ? 'ring-2 ring-primary shadow-lg' : 'hover:shadow-md'}`}
                                    >
                                        <div className="absolute top-3 left-3">
                                            <input 
                                                type="checkbox"
                                                className="h-5 w-5 rounded border-gray-300 text-primary focus:ring-primary"
                                                checked={selectedShifts.has(shift.id)}
                                                onChange={(e) => handleCheckboxChange(shift.id, e.target.checked)}
                                                onClick={e => e.stopPropagation()}
                                            />
                                        </div>
                                        <div onClick={() => handleSelectShift(shift)} className="cursor-pointer">
                                            <p className="font-semibold">{shift.nome_turno}</p>
                                            <p className="text-sm text-text-color-secondary">{shift.data_inizio} | {shift.ora_inizio} - {shift.ora_fine}</p>
                                        </div>
                                        <div className="flex gap-2 mt-2 pt-2 border-t border-surface-2">
                                            <button onClick={() => handleManageVolunteers(shift)} className={`w-full text-sm font-semibold p-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${isAssignmentSelected(shift) ? 'bg-green-500/30 text-green-700 dark:text-green-300' : 'bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400'}`}><MaterialSymbol name="group"/> Assegna</button>
                                            <button onClick={() => handleSelectShift(shift)} className={`w-full text-sm font-semibold p-2 rounded-lg flex items-center justify-center gap-2 transition-colors ${isShiftSelected(shift) ? 'bg-blue-500/30 text-blue-700 dark:text-blue-300' : 'bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400'}`}><MaterialSymbol name="edit"/> Modifica</button>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        </div>
                    ))}
                </div>
            </div>

            {/* Right Column (Editor/Manager) */}
            <div className="hidden lg:block lg:col-span-2">
                {editorContent}
            </div>
            
            {/* Mobile/Modal view for editor */}
            {showMobileEditor && (
                 <div className="fixed inset-0 bg-surface z-[100] p-4 lg:hidden animate-fade-in">
                    <button onClick={handleCloseEditor} className="absolute top-4 right-4 p-2 bg-surface-1 rounded-full shadow-md z-10"><MaterialSymbol name="close"/></button>
                    <div className="h-full overflow-y-auto">
                        {editorContent}
                    </div>
                </div>
            )}
            {selectedShifts.size > 0 && (
                <div className="fixed bottom-20 lg:bottom-5 right-5 z-[101] bg-secondary text-on-secondary p-3 rounded-2xl shadow-m3-lg flex items-center gap-4 animate-fade-in">
                    <span className="font-bold">{selectedShifts.size} turni selezionati</span>
                    <button onClick={() => setIsMultiEditModalOpen(true)} className="bg-on-secondary text-secondary font-bold px-4 py-2 rounded-lg hover:bg-on-secondary/90 transition">Modifica</button>
                    <button onClick={() => setSelectedShifts(new Set())} className="p-2 rounded-full hover:bg-white/20" title="Deseleziona tutto"><MaterialSymbol name="close"/></button>
                </div>
            )}
            {isCategoryModalOpen && <ManageShiftCategoriesModal categories={appData.shiftCategories} shifts={appData.shifts} onClose={() => setIsCategoryModalOpen(false)} />}
            {isDateModalOpen && <SetDateForShiftsModal shifts={appData.shifts} onClose={() => setIsDateModalOpen(false)} />}
            {isMultiEditModalOpen && <MultiShiftEditModal selectedShiftIds={Array.from(selectedShifts)} categories={appData.shiftCategories} locations={appData.locations} onClose={() => { setIsMultiEditModalOpen(false); setSelectedShifts(new Set()); }} />}
        </div>
    );
};


// ====================================================================
// # VOLUNTEER MANAGEMENT VIEW & EDITORS
// ====================================================================
const VolunteerEditor = forwardRef<EditorRef, { volunteer: Volunteer | 'new'; onSave: () => void; onCancel: () => void; }>((props, ref) => {
    const { volunteer, onSave, onCancel } = props;
    const isNew = volunteer === 'new';
    const initialData = useMemo(() => isNew ? { ruolo: 'Volontario' } : volunteer, [volunteer, isNew]);
    const [formData, setFormData] = useState<Partial<Volunteer>>(initialData);
    
    useEffect(() => {
        setFormData(initialData);
    }, [initialData]);
    
    const isEditing = !isNew;
    const isDirty = useMemo(() => JSON.stringify(initialData) !== JSON.stringify(formData), [initialData, formData]);
    
    const handleSave = async (): Promise<boolean> => {
        const email = formData.email?.trim().toLowerCase();
        if (!email) {
            showToast('Email è obbligatoria.', 'error');
            return false;
        }
        try {
            await setDoc(doc(db, 'volunteers', email), formData, { merge: isEditing });
            return true;
        } catch (error) {
            console.error(error);
            showToast('Errore nel salvataggio.', 'error');
            return false;
        }
    };

    useImperativeHandle(ref, () => ({
      submitForm: async () => {
        const success = await handleSave();
        if(success) showToast('Volontario salvato automaticamente!');
        return success;
      },
      isDirty: () => isDirty,
    }));

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await handleSave();
        if (success) {
             showToast(`Volontario ${isEditing ? 'aggiornato' : 'creato'}!`);
            onSave();
        }
    };

    return (
         <div className="bg-surface-1 rounded-2xl p-6 h-full border border-surface-3 sticky top-24">
             <h3 className="text-2xl font-serif font-bold mb-4">{isNew ? 'Nuovo Volontario' : 'Modifica Volontario'}</h3>
             <form onSubmit={handleSubmit} className="space-y-3">
                <FormInput label="Email" name="email" type="email" value={formData.email || ''} onChange={handleChange} required readOnly={isEditing} />
                <div className="grid grid-cols-2 gap-2">
                    <FormInput label="Nome" name="nome" value={formData.nome || ''} onChange={handleChange} required />
                    <FormInput label="Cognome" name="cognome" value={formData.cognome || ''} onChange={handleChange} required />
                </div>
                <FormInput label="Telefono" name="telefono" type="tel" value={formData.telefono || ''} onChange={handleChange} />
                <FormSelect label="Ruolo" name="ruolo" value={formData.ruolo || 'Volontario'} onChange={handleChange}>
                    <option value="Volontario">Volontario</option>
                    <option value="Responsabile">Responsabile</option>
                    <option value="Admin">Admin</option>
                </FormSelect>
                <div className="flex gap-4 pt-4">
                    <button type="button" onClick={onCancel} className="flex-1 bg-surface-3 hover:bg-outline/30 text-text-color p-3 rounded-full font-bold transition">Annulla</button>
                    <button type="submit" className="flex-1 bg-primary hover:opacity-90 text-on-primary p-3 rounded-full font-bold transition">Salva</button>
                </div>
            </form>
        </div>
    );
});

const AdminVolunteers: React.FC<AdminPanelProps> = ({ appData }) => {
    const editorRef = useRef<EditorRef>(null);
    const [selectedVolunteer, setSelectedVolunteer] = useState<Volunteer | 'new' | null>(null);
    const [volunteerToDelete, setVolunteerToDelete] = useState<Volunteer | null>(null);

    const handleSelectVolunteer = (volunteer: Volunteer | 'new') => {
        if (editorRef.current?.isDirty()) {
            editorRef.current.submitForm().then(() => {
                setSelectedVolunteer(volunteer);
            });
        } else {
            setSelectedVolunteer(volunteer);
        }
    };

    const handleDeleteVolunteer = async () => {
        if (!volunteerToDelete) return;
        try {
            const batch = writeBatch(db);
            batch.delete(doc(db, 'volunteers', volunteerToDelete.id));
            const q = query(collection(db, "assignments"), where('email_volontario', '==', volunteerToDelete.id));
            const assignmentsSnapshot = await getDocs(q);
            assignmentsSnapshot.forEach(doc => batch.delete(doc.ref));
            await batch.commit();
            showToast('Volontario e relative assegnazioni eliminati!');
        } catch (error) {
            console.error(error);
            showToast("Errore durante l'eliminazione.", 'error');
        } finally {
            setVolunteerToDelete(null);
            setSelectedVolunteer(null);
        }
    };

    return (
        <div className="lg:grid lg:grid-cols-2 lg:gap-6">
            <div className={`animate-fade-in ${selectedVolunteer ? 'hidden lg:block' : ''}`}>
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-serif font-bold">Volontari</h2>
                    <button onClick={() => handleSelectVolunteer('new')} className="bg-primary text-on-primary px-4 py-2 rounded-full flex items-center gap-2 font-bold"><MaterialSymbol name="add" /> Aggiungi</button>
                </div>
                
                <ul className="space-y-2">
                    {appData.volunteers.map(v => (
                        <li key={v.id} 
                            onClick={() => handleSelectVolunteer(v)}
                            className={`p-3 rounded-2xl flex justify-between items-center cursor-pointer transition-colors ${selectedVolunteer !== 'new' && selectedVolunteer?.id === v.id ? 'bg-primary-container ring-2 ring-primary' : 'bg-surface-1 hover:bg-surface-2'}`}
                        >
                            <div>
                                <p className="font-semibold">{v.nome} {v.cognome} <span className="text-xs bg-surface-2 px-2 py-0.5 rounded-full">{v.ruolo}</span></p>
                                <p className="text-sm text-text-color-secondary">{v.email}</p>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); handleSelectVolunteer(v); }} className="p-2 bg-blue-500/20 rounded-full hover:bg-blue-500/40 transition"><MaterialSymbol name="edit" className="text-blue-400" /></button>
                                <button onClick={(e) => { e.stopPropagation(); setVolunteerToDelete(v); }} className="p-2 bg-red-500/20 rounded-full hover:bg-red-500/40 transition"><MaterialSymbol name="delete" className="text-red-400" /></button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>

            <div className={`${!selectedVolunteer ? 'hidden lg:block' : ''}`}>
                {selectedVolunteer ? (
                    <VolunteerEditor ref={editorRef} volunteer={selectedVolunteer} onSave={() => setSelectedVolunteer(null)} onCancel={() => setSelectedVolunteer(null)} />
                ) : (
                    <EditorPlaceholder message="Seleziona un volontario da modificare o creane uno nuovo." icon="group" />
                )}
            </div>
            {volunteerToDelete && <ConfirmationModal title="Conferma Eliminazione" message={`Sei sicuro di voler eliminare ${volunteerToDelete.nome} ${volunteerToDelete.cognome}? Verranno rimosse anche tutte le sue assegnazioni.`} onConfirm={handleDeleteVolunteer} onClose={() => setVolunteerToDelete(null)} />}
        </div>
    );
};


// ====================================================================
// # LOCATION MANAGEMENT VIEW & EDITORS
// ====================================================================
const LocationEditor: React.FC<{onSave: () => void}> = ({ onSave }) => {
    const [newLocationName, setNewLocationName] = useState('');
    const [isLoading, setIsLoading] = useState(false);

    const handleAddLocation = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = newLocationName.trim();
        if (!trimmedName) return;
        
        setIsLoading(true);
        try {
            // Check for existence manually before writing
            const existingDoc = await getDocs(query(collection(db, 'locations'), where('id', '==', trimmedName)));
            if (!existingDoc.empty) {
                 showToast('Questo luogo esiste già.', 'error');
                 setIsLoading(false);
                 return;
            }
            await setDoc(doc(db, 'locations', trimmedName), {});
            showToast('Luogo aggiunto!');
            setNewLocationName('');
            onSave();
        } catch (error) {
            showToast("Errore durante l'aggiunta.", 'error');
        } finally {
            setIsLoading(false);
        }
    };
    
    return (
        <div className="bg-surface-1 rounded-2xl p-6 h-full border border-surface-3 sticky top-24">
            <h3 className="text-2xl font-serif font-bold mb-4">Aggiungi Luogo</h3>
            <form onSubmit={handleAddLocation} className="space-y-4">
                <FormInput
                    label="Nome nuovo luogo"
                    type="text"
                    value={newLocationName}
                    onChange={e => setNewLocationName(e.target.value)}
                    placeholder="Es. Palazzetto"
                    disabled={isLoading}
                />
                <button
                    type="submit"
                    className="w-full bg-primary text-on-primary p-3 rounded-full font-bold flex items-center justify-center hover:opacity-90 transition disabled:opacity-50"
                    disabled={isLoading || !newLocationName.trim()}
                >
                    {isLoading ? <Spinner /> : <><MaterialSymbol name="add"/> Aggiungi</>}
                </button>
            </form>
        </div>
    );
}

const AdminLocations: React.FC<AdminPanelProps> = ({ appData }) => {
    const [locationToDelete, setLocationToDelete] = useState<Location | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [refreshKey, setRefreshKey] = useState(0);

    const handleDeleteLocation = async () => {
        if (!locationToDelete) return;
        setIsLoading(true);
        try {
            await deleteDoc(doc(db, 'locations', locationToDelete.id));
            showToast(`Luogo "${locationToDelete.id}" eliminato.`);
        } catch (error) {
            showToast("Errore durante l'eliminazione.", 'error');
        } finally {
            setIsLoading(false);
            setLocationToDelete(null);
        }
    };

    return (
        <div className="lg:grid lg:grid-cols-2 lg:gap-6">
            <div className="animate-fade-in">
                <h2 className="text-3xl font-serif font-bold mb-6">Luoghi</h2>
                <ul className="space-y-2">
                    {appData.locations.map(loc => (
                        <li key={loc.id} className="flex items-center justify-between p-3 pl-4 bg-surface-1 rounded-2xl group">
                            <span className="font-semibold">{loc.id}</span>
                            <button
                                onClick={() => setLocationToDelete(loc)}
                                className="p-2 rounded-full hover:bg-surface-3 opacity-0 group-hover:opacity-100 transition-opacity"
                                disabled={isLoading}
                            >
                                <MaterialSymbol name="delete" className="text-red-500" />
                            </button>
                        </li>
                    ))}
                </ul>
            </div>
            
            <div>
                 <LocationEditor onSave={() => setRefreshKey(k => k + 1)} />
            </div>

            {locationToDelete && (
                <ConfirmationModal
                    title="Conferma Eliminazione"
                    message={ <div><p>Sei sicuro di voler eliminare il luogo <strong>"{locationToDelete.id}"</strong>?</p><p className="mt-2 p-2 bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 rounded-md text-sm"><strong>Attenzione:</strong> Se questo luogo è usato in turni o eventi, dovrai aggiornarli manualmente.</p></div> }
                    onConfirm={handleDeleteLocation}
                    onClose={() => setLocationToDelete(null)}
                />
            )}
        </div>
    );
};


// ====================================================================
// # EVENT & DASHBOARD MANAGEMENT VIEWS & EDITORS
// ====================================================================
const EditableCell: React.FC<{ value: string; onSave: (newValue: string) => void; type?: 'text' | 'date' | 'time'; className?: string; }> = ({ value, onSave, type = 'text', className }) => {
    const [currentValue, setCurrentValue] = useState(value);
    const inputRef = useRef<HTMLInputElement>(null);

    const handleSave = () => {
        if (currentValue.trim() !== '' && currentValue !== value) {
            onSave(currentValue);
        } else {
            setCurrentValue(value);
        }
    };
    
    return (
        <input
            ref={inputRef}
            type={type}
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            className={`bg-transparent p-1 -m-1 rounded-md outline-none focus:bg-surface-3 focus:ring-2 ring-primary w-full ${className}`}
        />
    );
};

const EditableSelect: React.FC<{ value: string; onSave: (newValue: string) => void; options: string[]; className?: string; }> = ({ value, onSave, options, className }) => {
    const [currentValue, setCurrentValue] = useState(value);

    const handleSave = (newValue: string) => {
        if (newValue !== value) {
            onSave(newValue);
        }
    };

    return (
        <select
            value={currentValue}
            onChange={(e) => {
                setCurrentValue(e.target.value);
                handleSave(e.target.value);
            }}
            className={`bg-transparent p-1 -m-1 rounded-md outline-none focus:bg-surface-3 focus:ring-2 ring-primary w-full appearance-none ${className}`}
        >
            {options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
        </select>
    );
};

const NewEventRow: React.FC<{ sportsList: string[]; locationsList: string[]; onSave: (event: Partial<RaceEvent>) => void; onCancel: () => void; }> = ({ sportsList, locationsList, onSave, onCancel }) => {
    const [newEvent, setNewEvent] = useState<Partial<RaceEvent>>({
        sport: sportsList[0] || '', location: locationsList[0] || '', date: '2026-06-02', startTime: '09:00', endTime: '10:00',
        category: 'Junior', gender: 'Misto', tipologia: 'Sport', showInRaceProgram: true
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        setNewEvent(prev => ({ ...prev, [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value }));
    };

    const handleSave = () => {
        if (!newEvent.sport || !newEvent.location) {
            showToast("Sport e luogo sono obbligatori.", 'error');
            return;
        }
        onSave(newEvent);
    };

    return (
        <tr className="bg-primary-container/30">
            <td className="p-2"><select name="sport" value={newEvent.sport} onChange={handleChange} className="w-full bg-surface-1 p-1 rounded-md">{sportsList.map(s => <option key={s} value={s}>{s}</option>)}</select></td>
            <td className="p-2"><select name="location" value={newEvent.location} onChange={handleChange} className="w-full bg-surface-1 p-1 rounded-md">{locationsList.map(l => <option key={l} value={l}>{l}</option>)}</select></td>
            <td className="p-2"><input name="date" value={newEvent.date} onChange={handleChange} type="date" className="w-full bg-surface-1 p-1 rounded-md" /></td>
            <td className="p-2"><input name="startTime" value={newEvent.startTime} onChange={handleChange} type="time" className="w-full bg-surface-1 p-1 rounded-md" /></td>
            <td className="p-2"><input name="endTime" value={newEvent.endTime} onChange={handleChange} type="time" className="w-full bg-surface-1 p-1 rounded-md" /></td>
            <td className="p-2"><select name="category" value={newEvent.category} onChange={handleChange} className="w-full bg-surface-1 p-1 rounded-md">{CATEGORIES_LIST.map(c => <option key={c} value={c}>{c}</option>)}</select></td>
            <td className="p-2"><select name="gender" value={newEvent.gender} onChange={handleChange} className="w-full bg-surface-1 p-1 rounded-md">{GENDERS_LIST.map(g => <option key={g} value={g}>{g}</option>)}</select></td>
            <td className="p-2 text-center"><input name="showInRaceProgram" type="checkbox" checked={newEvent.showInRaceProgram} onChange={handleChange} className="h-5 w-5" /></td>
            <td className="p-2">
                <div className="flex items-center gap-1">
                    <button onClick={handleSave} className="p-2 bg-green-500/20 rounded-full" title="Salva"><MaterialSymbol name="check" className="text-green-500 text-base" /></button>
                    <button onClick={onCancel} className="p-2 bg-red-500/20 rounded-full" title="Annulla"><MaterialSymbol name="close" className="text-red-400 text-base" /></button>
                </div>
            </td>
        </tr>
    );
};


const AdminRaceProgram: React.FC<AdminPanelProps> = (props) => {
    const { appData } = props;
    const [eventToDelete, setEventToDelete] = useState<{ id: string, name: string } | null>(null);
    const [isSetDateModalOpen, setIsSetDateModalOpen] = useState(false);
    const [isSportModalOpen, setIsSportModalOpen] = useState(false);
    const [isAdding, setIsAdding] = useState(false);

    const [searchTerm, setSearchTerm] = useState('');
    type SortableKeys = keyof RaceEvent;
    const [sortConfig, setSortConfig] = useState<{ key: SortableKeys; direction: 'ascending' | 'descending' }>({ key: 'date', direction: 'ascending' });
    
    const sportsOptions = useMemo(() => appData.sportsList.map(s => s.id), [appData.sportsList]);
    const locationsOptions = useMemo(() => appData.locations.map(l => l.id), [appData.locations]);


    const handleUpdateEvent = async (id: string, field: keyof RaceEvent, value: any) => {
        try {
            const eventRef = doc(db, 'race_events', id);
            await updateDoc(eventRef, { [field]: value });
            showToast('Evento aggiornato!', 'success');
        } catch (error) {
            console.error("Error updating event:", error);
            showToast("Errore durante l'aggiornamento.", 'error');
        }
    };
    
    const handleCreateEvent = async (eventData: Partial<RaceEvent>) => {
        try {
            const docRef = doc(collection(db, 'race_events'));
            await setDoc(docRef, { ...eventData, id: docRef.id });
            showToast('Evento creato con successo!');
            setIsAdding(false);
        } catch (error) {
            showToast("Errore durante la creazione.", 'error');
        }
    };

    const filteredAndSortedEvents = useMemo(() => {
        let sortableEvents = [...appData.raceEvents];
        if (searchTerm) {
            sortableEvents = sortableEvents.filter(event =>
                Object.values(event).some(val => 
                    String(val).toLowerCase().includes(searchTerm.toLowerCase())
                )
            );
        }

        sortableEvents.sort((a, b) => {
            const key = sortConfig.key;
            let comparison = 0;
            
            const valA = a[key] || '';
            const valB = b[key] || '';
            
            if (key === 'date') {
                comparison = new Date(a.date).getTime() - new Date(b.date).getTime() || a.startTime.localeCompare(b.startTime);
            } else {
                comparison = String(valA).localeCompare(String(valB));
            }

            return sortConfig.direction === 'ascending' ? comparison : -comparison;
        });

        return sortableEvents;
    }, [appData.raceEvents, searchTerm, sortConfig]);

    const requestSort = (key: SortableKeys) => {
        let direction: 'ascending' | 'descending' = 'ascending';
        if (sortConfig.key === key && sortConfig.direction === 'ascending') {
            direction = 'descending';
        }
        setSortConfig({ key, direction });
    };

    const handleDelete = async () => {
        if (!eventToDelete) return;
        try {
            await deleteDoc(doc(db, 'race_events', eventToDelete.id));
            showToast('Evento eliminato con successo!');
        } catch (error) {
            showToast("Errore durante l'eliminazione.", 'error');
        } finally {
            setEventToDelete(null);
        }
    };

    const SortableHeader: React.FC<{ sortKey: SortableKeys; children: React.ReactNode; className?: string }> = ({ sortKey, children, className }) => {
        const isSorted = sortConfig.key === sortKey;
        const icon = !isSorted ? 'unfold_more' : (sortConfig.direction === 'ascending' ? 'arrow_upward' : 'arrow_downward');
        return (
            <th className={`p-2 cursor-pointer select-none whitespace-nowrap ${className}`} onClick={() => requestSort(sortKey)}>
                <div className="flex items-center gap-1">
                    {children}
                    <MaterialSymbol name={icon} className="text-base" />
                </div>
            </th>
        );
    };

    return (
        <div className="animate-fade-in space-y-4">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-4">
                 <div className="relative w-full sm:w-auto">
                    <MaterialSymbol name="search" className="absolute left-3 top-1/2 -translate-y-1/2 text-text-color-secondary" />
                    <input
                        type="search"
                        placeholder="Cerca..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full sm:w-64 pl-10 pr-4 py-2 bg-surface-2 border border-surface-3 rounded-full focus:ring-2 focus:ring-primary focus:outline-none transition"
                    />
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap justify-center">
                    <button onClick={() => setIsSetDateModalOpen(true)} className="flex-1 sm:flex-initial bg-surface-2 text-text-color-secondary px-4 py-2 rounded-full flex items-center justify-center gap-2 font-bold hover:bg-surface-3 transition whitespace-nowrap">
                        <MaterialSymbol name="calendar_month"/> Imposta Data Unica
                    </button>
                    <button onClick={() => setIsSportModalOpen(true)} className="flex-1 sm:flex-initial bg-surface-2 text-text-color-secondary px-4 py-2 rounded-full flex items-center justify-center gap-2 font-bold hover:bg-surface-3 transition whitespace-nowrap"><MaterialSymbol name="sports"/> Gestisci Sport</button>
                    <button onClick={() => setIsAdding(!isAdding)} className={`flex-1 sm:flex-initial text-on-primary px-4 py-2 rounded-full flex items-center justify-center gap-2 font-bold transition ${isAdding ? 'bg-accent-red' : 'bg-primary'}`}>
                        <MaterialSymbol name={isAdding ? "close" : "add"}/> {isAdding ? 'Annulla' : 'Aggiungi'}
                    </button>
                </div>
            </div>

            <div className="overflow-x-auto bg-surface-1 rounded-2xl border border-surface-3">
                <table className="w-full text-left text-sm whitespace-nowrap">
                    <thead className="bg-surface-2 text-text-color-secondary uppercase text-xs">
                        <tr>
                            <SortableHeader sortKey="sport" className="min-w-[200px]">Sport</SortableHeader>
                            <SortableHeader sortKey="location" className="min-w-[150px]">Luogo</SortableHeader>
                            <SortableHeader sortKey="date">Data</SortableHeader>
                            <SortableHeader sortKey="startTime">Inizio</SortableHeader>
                            <SortableHeader sortKey="endTime">Fine</SortableHeader>
                            <SortableHeader sortKey="category">Cat.</SortableHeader>
                            <SortableHeader sortKey="gender">Genere</SortableHeader>
                            <SortableHeader sortKey="showInRaceProgram">Visibile</SortableHeader>
                            <th className="p-2">Azioni</th>
                        </tr>
                    </thead>
                    <tbody>
                        {isAdding && <NewEventRow sportsList={sportsOptions} locationsList={locationsOptions} onSave={handleCreateEvent} onCancel={() => setIsAdding(false)} />}
                        {filteredAndSortedEvents.map(event => (
                            <tr key={event.id} className="border-t border-surface-2 hover:bg-surface-2/50">
                                <td className="p-2 font-semibold"><EditableSelect value={event.sport} options={sportsOptions} onSave={v => handleUpdateEvent(event.id, 'sport', v)} /></td>
                                <td className="p-2"><EditableSelect value={event.location} options={locationsOptions} onSave={v => handleUpdateEvent(event.id, 'location', v)} /></td>
                                <td className="p-2"><EditableCell value={event.date} type="date" onSave={v => handleUpdateEvent(event.id, 'date', v)} /></td>
                                <td className="p-2"><EditableCell value={event.startTime} type="time" onSave={v => handleUpdateEvent(event.id, 'startTime', v)} /></td>
                                <td className="p-2"><EditableCell value={event.endTime} type="time" onSave={v => handleUpdateEvent(event.id, 'endTime', v)} /></td>
                                <td className="p-2"><EditableSelect value={event.category || ''} options={CATEGORIES_LIST} onSave={v => handleUpdateEvent(event.id, 'category', v)} /></td>
                                <td className="p-2"><EditableSelect value={event.gender || ''} options={GENDERS_LIST} onSave={v => handleUpdateEvent(event.id, 'gender', v)} /></td>
                                <td className="p-2 text-center"><input type="checkbox" checked={event.showInRaceProgram} onChange={e => handleUpdateEvent(event.id, 'showInRaceProgram', e.target.checked)} className="h-5 w-5" /></td>
                                <td className="p-2">
                                    <button onClick={() => setEventToDelete({ id: event.id, name: event.sport })} className="p-2 bg-red-500/20 rounded-full hover:bg-red-500/40" title="Elimina evento"><MaterialSymbol name="delete" className="text-red-400 text-base" /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {isSetDateModalOpen && <SetDateForRaceEventsModal events={appData.raceEvents} onClose={() => setIsSetDateModalOpen(false)} />}
            {isSportModalOpen && <SportManagementModal sports={appData.sportsList} events={appData.raceEvents} onClose={() => setIsSportModalOpen(false)} />}
            {eventToDelete && <ConfirmationModal title="Conferma Eliminazione" message={`Sei sicuro di voler eliminare l'evento "${eventToDelete.name}"?`} onConfirm={handleDelete} onClose={() => setEventToDelete(null)} />}
        </div>
    );
};

const DashboardEventEditor = forwardRef<EditorRef, { event: DashboardEvent | 'new'; onSave: () => void; onCancel: () => void; }>((props, ref) => {
    const { event, onSave, onCancel } = props;
    const isNew = event === 'new';
    const initialData = useMemo(() => isNew ? { date: '2026-06-02', showOnDashboard: true } : event, [event, isNew]);
    const [formData, setFormData] = useState<Partial<DashboardEvent>>(initialData);
    
    useEffect(() => {
        setFormData(initialData);
    }, [initialData]);

    const isEditing = !isNew;
    const isDirty = useMemo(() => JSON.stringify(initialData) !== JSON.stringify(formData), [initialData, formData]);

    const handleSave = async (): Promise<boolean> => {
         try {
            const docRef = isEditing ? doc(db, 'dashboard_events', formData.id!) : doc(collection(db, 'dashboard_events'));
            await setDoc(docRef, { ...formData, id: docRef.id }, { merge: isEditing });
            return true;
        } catch (error) { 
            showToast("Errore nel salvataggio.", 'error'); 
            return false;
        }
    };

    useImperativeHandle(ref, () => ({
      submitForm: async () => {
        const success = await handleSave();
        if(success) showToast('Card salvata automaticamente!');
        return success;
      },
      isDirty: () => isDirty,
    }));


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        const isCheckbox = type === 'checkbox';
        setFormData(prev => ({ ...prev, [name]: isCheckbox ? (e.target as HTMLInputElement).checked : value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        const success = await handleSave();
        if (success) {
            showToast(`Card ${isEditing ? 'aggiornata' : 'creata'}!`);
            onSave();
        }
    };
    
    return (
         <div className="bg-surface-1 rounded-2xl p-6 h-full border border-surface-3 sticky top-24">
            <h3 className="text-2xl font-serif font-bold mb-4">{isNew ? 'Crea Card' : 'Modifica Card'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
                 <FormInput label="Titolo" name="title" value={formData.title || ''} onChange={handleChange} required />
                 <FormInput label="Sottotitolo" name="subtitle" value={formData.subtitle || ''} onChange={handleChange} required />
                 <FormInput label="Icona (Material Symbol)" name="icon" value={formData.icon || ''} onChange={handleChange} required />
                 <FormTextarea label="Descrizione (per modale)" name="description" value={formData.description || ''} onChange={handleChange} />
                 <FormInput label="Data (YYYY-MM-DD)" name="date" type="date" value={formData.date || ''} onChange={handleChange} />
                 <FormInput label="Ora (HH:MM)" name="time" type="time" value={formData.time || ''} onChange={handleChange} />
                 <FormInput label="Luogo" name="location" value={formData.location || ''} onChange={handleChange} />
                 <div className="grid grid-cols-2 gap-4 pt-2">
                     <FormCheckbox label="Mostra su Dashboard" name="showOnDashboard" checked={formData.showOnDashboard ?? true} onChange={handleChange} />
                     <FormCheckbox label="Mostra nel programma" name="showInRaceProgram" checked={formData.showInRaceProgram ?? false} onChange={handleChange} />
                     <FormCheckbox label="È un Countdown?" name="isCountdown" checked={formData.isCountdown ?? false} onChange={handleChange} />
                     <FormCheckbox label="Pulsante Calendario" name="showCalendarButton" checked={formData.showCalendarButton ?? false} onChange={handleChange} />
                 </div>
                 <div className="flex gap-4 pt-4">
                    <button type="button" onClick={onCancel} className="flex-1 bg-surface-3 hover:bg-outline/30 text-text-color p-3 rounded-full font-bold transition">Annulla</button>
                    <button type="submit" className="flex-1 bg-primary hover:opacity-90 text-on-primary p-3 rounded-full font-bold transition">Salva</button>
                </div>
            </form>
        </div>
    );
});


const AdminDashboardCards: React.FC<AdminPanelProps> = (props) => {
    const { appData } = props;
    const editorRef = useRef<EditorRef>(null);
    const [selectedEvent, setSelectedEvent] = useState<DashboardEvent | 'new' | null>(null);
    const [eventToDelete, setEventToDelete] = useState<{ id: string, name: string } | null>(null);

    const handleSelectEvent = (event: DashboardEvent | 'new') => {
        if (editorRef.current?.isDirty()) {
            editorRef.current.submitForm().then(() => {
                setSelectedEvent(event);
            });
        } else {
            setSelectedEvent(event);
        }
    };
    
    const handleDelete = async () => {
        if (!eventToDelete) return;
        try {
            await deleteDoc(doc(db, 'dashboard_events', eventToDelete.id));
            showToast('Card eliminata con successo!');
        } catch (error) {
            showToast("Errore durante l'eliminazione.", 'error');
        } finally {
            setEventToDelete(null);
            setSelectedEvent(null);
        }
    };

    return (
        <div className="lg:grid lg:grid-cols-2 lg:gap-6">
            <div className={`animate-fade-in ${selectedEvent ? 'hidden lg:block' : ''}`}>
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-serif font-bold">Card Dashboard</h3>
                    <button onClick={() => handleSelectEvent('new')} className="bg-primary text-on-primary px-4 py-2 rounded-full flex items-center gap-2 font-bold"><MaterialSymbol name="add"/> Crea Card</button>
                </div>
                <ul className="space-y-3">
                    {appData.dashboardEvents.map(event => (
                        <li key={event.id} onClick={() => handleSelectEvent(event)} className={`p-4 rounded-2xl flex justify-between items-center cursor-pointer transition-colors ${selectedEvent !== 'new' && selectedEvent?.id === event.id ? 'bg-primary-container ring-2 ring-primary' : 'bg-surface-1 hover:bg-surface-2'}`}>
                            <div>
                                <p className="font-semibold">{event.title} <span className="text-text-color-secondary font-normal">- {event.subtitle}</span></p>
                                <div className="flex items-center gap-2 mt-2">
                                    {event.showOnDashboard && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-green-500/20 text-green-600">VISIBILE</span>}
                                    {event.isCountdown && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-600">COUNTDOWN</span>}
                                    {event.showInRaceProgram && <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-600">IN PROGRAMMA</span>}
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); handleSelectEvent(event); }} className="p-2 bg-blue-500/20 rounded-full hover:bg-blue-500/40"><MaterialSymbol name="edit" className="text-blue-400" /></button>
                                <button onClick={(e) => { e.stopPropagation(); setEventToDelete({ id: event.id, name: event.title }); }} className="p-2 bg-red-500/20 rounded-full hover:bg-red-500/40"><MaterialSymbol name="delete" className="text-red-400" /></button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
            <div className={`${!selectedEvent ? 'hidden lg:block' : ''}`}>
                {selectedEvent ? (
                    <DashboardEventEditor ref={editorRef} event={selectedEvent} onSave={() => setSelectedEvent(null)} onCancel={() => setSelectedEvent(null)} />
                ) : (
                     <EditorPlaceholder message="Seleziona una card da modificare o creane una nuova." icon="dashboard" />
                )}
            </div>

            {eventToDelete && <ConfirmationModal title="Conferma Eliminazione" message={`Sei sicuro di voler eliminare la card "${eventToDelete.name}"?`} onConfirm={handleDelete} onClose={() => setEventToDelete(null)} />}
        </div>
    );
};


// ====================================================================
// # SETTINGS MANAGEMENT
// ====================================================================

const AdminSettings: React.FC<AdminPanelProps> = (props) => {
    const { usefulLinks } = props.appData;
    const [selectedLink, setSelectedLink] = useState<UsefulLink | 'new' | null>(null);
    const [linkToDelete, setLinkToDelete] = useState<UsefulLink | null>(null);

    const handleSave = () => {
        showToast('Link salvato!');
        setSelectedLink(null);
    };

    const handleDelete = async () => {
        if (!linkToDelete) return;
        try {
            await deleteDoc(doc(db, 'useful_links', linkToDelete.id));
            showToast('Link eliminato con successo!');
        } catch (error) {
            showToast("Errore durante l'eliminazione.", 'error');
        } finally {
            setLinkToDelete(null);
            setSelectedLink(null);
        }
    };
    
    return (
        <div className="lg:grid lg:grid-cols-2 lg:gap-6">
            <div className={`animate-fade-in ${selectedLink ? 'hidden lg:block' : ''}`}>
                 <div className="flex justify-between items-center mb-4">
                    <h3 className="text-2xl font-serif font-bold">Link Utili</h3>
                    <button onClick={() => setSelectedLink('new')} className="bg-primary text-on-primary px-4 py-2 rounded-full flex items-center gap-2 font-bold"><MaterialSymbol name="add"/> Aggiungi Link</button>
                </div>
                <ul className="space-y-3">
                    {usefulLinks.map(link => (
                        <li key={link.id} onClick={() => setSelectedLink(link)} className={`p-4 rounded-2xl flex justify-between items-center cursor-pointer transition-colors ${selectedLink !== 'new' && selectedLink?.id === link.id ? 'bg-primary-container ring-2 ring-primary' : 'bg-surface-1 hover:bg-surface-2'}`}>
                            <div className="flex items-center gap-3">
                                <MaterialSymbol name={link.icon} className="text-secondary" />
                                <div>
                                    <p className="font-semibold">{link.name}</p>
                                    <p className="text-xs text-text-color-secondary">{link.url}</p>
                                </div>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={(e) => { e.stopPropagation(); setSelectedLink(link); }} className="p-2 bg-blue-500/20 rounded-full hover:bg-blue-500/40"><MaterialSymbol name="edit" className="text-blue-400" /></button>
                                <button onClick={(e) => { e.stopPropagation(); setLinkToDelete(link); }} className="p-2 bg-red-500/20 rounded-full hover:bg-red-500/40"><MaterialSymbol name="delete" className="text-red-400" /></button>
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
             <div className={`${!selectedLink ? 'hidden lg:block' : ''}`}>
                {selectedLink ? (
                    <UsefulLinkEditor link={selectedLink} onSave={handleSave} onCancel={() => setSelectedLink(null)} />
                ) : (
                     <EditorPlaceholder message="Seleziona un link da modificare o creane uno nuovo." icon="link" />
                )}
            </div>
             {linkToDelete && <ConfirmationModal title="Conferma Eliminazione" message={`Sei sicuro di voler eliminare il link "${linkToDelete.name}"?`} onConfirm={handleDelete} onClose={() => setLinkToDelete(null)} />}
        </div>
    );
};

const UsefulLinkEditor: React.FC<{ link: UsefulLink | 'new'; onSave: () => void; onCancel: () => void; }> = ({ link, onSave, onCancel }) => {
    const isNew = link === 'new';
    const [formData, setFormData] = useState<Partial<UsefulLink>>(isNew ? { icon: 'public', order: 99 } : link);
    const isEditing = !isNew;

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({ ...prev, [name]: type === 'number' ? Number(value) : value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const docRef = isEditing ? doc(db, 'useful_links', formData.id!) : doc(collection(db, 'useful_links'));
            await setDoc(docRef, { ...formData, id: docRef.id }, { merge: isEditing });
            onSave();
        } catch (error) {
            showToast('Errore nel salvataggio del link.', 'error');
        }
    };

    return (
        <div className="bg-surface-1 rounded-2xl p-6 h-full border border-surface-3 sticky top-24">
            <h3 className="text-2xl font-serif font-bold mb-4">{isNew ? 'Nuovo Link' : 'Modifica Link'}</h3>
            <form onSubmit={handleSubmit} className="space-y-3">
                <FormInput label="Nome" name="name" value={formData.name || ''} onChange={handleChange} required />
                <FormInput label="URL" name="url" value={formData.url || ''} onChange={handleChange} required placeholder="https://... o tel:..." />
                <FormSelect label="Icona" name="icon" value={formData.icon || 'public'} onChange={handleChange}>
                    <option value="public">Sito Web (Globo)</option>
                    <option value="instagram">Instagram</option>
                    <option value="facebook">Facebook</option>
                    <option value="whatsapp">WhatsApp</option>
                    <option value="phone">Telefono</option>
                </FormSelect>
                <FormInput label="Ordine" name="order" type="number" value={formData.order || 99} onChange={handleChange} required />

                <div className="flex gap-4 pt-4">
                    <button type="button" onClick={onCancel} className="flex-1 bg-surface-3 hover:bg-outline/30 text-text-color p-3 rounded-full font-bold transition">Annulla</button>
                    <button type="submit" className="flex-1 bg-primary hover:opacity-90 text-on-primary p-3 rounded-full font-bold transition">Salva</button>
                </div>
            </form>
        </div>
    );
};


// ====================================================================
// # MODAL IMPLEMENTATIONS (that remain modals)
// ====================================================================

const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-text-color-secondary mb-1">{label}</label>
        <input {...props} className="w-full p-3 bg-surface-2 border border-surface-3 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition" />
    </div>
);
const FormTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-text-color-secondary mb-1">{label}</label>
        <textarea {...props} className="w-full p-3 bg-surface-2 border border-surface-3 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition" />
    </div>
);
const FormSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string, children: React.ReactNode }> = ({ label, children, ...props }) => (
    <div>
        <label className="block text-sm font-medium text-text-color-secondary mb-1">{label}</label>
        <select {...props} className="w-full p-3 bg-surface-2 border border-surface-3 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition">{children}</select>
    </div>
);
const FormCheckbox: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <label className="flex items-center gap-2">
        <input type="checkbox" {...props} className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary" />
        <span>{label}</span>
    </label>
);

const SportManagementModal: React.FC<{ sports: Sport[]; events: RaceEvent[]; onClose: () => void; }> = ({ sports, events, onClose }) => {
    const [newSportName, setNewSportName] = useState('');
    const [newLogoUrl, setNewLogoUrl] = useState('');
    const [sportToDelete, setSportToDelete] = useState<Sport | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const sportsInUse = useMemo(() => new Set(events.map(e => e.sport)), [events]);

    const handleAddSport = async (e: React.FormEvent) => {
        e.preventDefault();
        const trimmedName = newSportName.trim();
        if (!trimmedName) return;
        if (sports.some(s => s.id.toLowerCase() === trimmedName.toLowerCase())) {
            showToast('Questo sport esiste già.', 'error'); return;
        }
        setIsLoading(true);
        try {
            await setDoc(doc(db, 'sports_list', trimmedName), { logoUrl: newLogoUrl.trim() });
            showToast('Sport aggiunto!');
            setNewSportName('');
            setNewLogoUrl('');
        } catch (error) { showToast("Errore durante l'aggiunta.", 'error'); } 
        finally { setIsLoading(false); }
    };

    const handleDeleteSport = async () => {
        if (!sportToDelete) return;
        setIsLoading(true);
        try {
            await deleteDoc(doc(db, 'sports_list', sportToDelete.id));
            showToast(`Sport "${sportToDelete.id}" eliminato.`);
        } catch (error) { showToast("Errore durante l'eliminazione.", 'error'); }
        finally {
            setIsLoading(false);
            setSportToDelete(null);
        }
    };
    
    return (
        <>
        <Modal title="Gestione Sport" onClose={onClose}>
            <ul className="space-y-2 max-h-64 overflow-y-auto pr-2 mb-4">
                {sports.map(sport => (
                    <li key={sport.id} className="flex items-center justify-between p-2 pl-4 bg-surface-2 rounded-lg group">
                        <span className="font-semibold">{sport.id}</span>
                        <button onClick={() => setSportToDelete(sport)} className="p-2 rounded-full hover:bg-surface-3 opacity-0 group-hover:opacity-100 transition-opacity" disabled={isLoading}>
                            <MaterialSymbol name="delete" className="text-red-500" />
                        </button>
                    </li>
                ))}
            </ul>
            <form onSubmit={handleAddSport} className="space-y-2 pt-4 border-t border-surface-3">
                 <FormInput type="text" value={newSportName} onChange={e => setNewSportName(e.target.value)} label="Nome Nuovo Sport" placeholder="Es. Pallavolo" disabled={isLoading} />
                 <FormInput type="url" value={newLogoUrl} onChange={e => setNewLogoUrl(e.target.value)} label="URL Logo (Opzionale)" placeholder="https://..." disabled={isLoading} />
                <div className="pt-2">
                    <button type="submit" className="w-full bg-primary text-on-primary p-3 rounded-full font-bold flex items-center justify-center hover:opacity-90 transition disabled:opacity-50" disabled={isLoading || !newSportName.trim()}>
                        {isLoading ? <Spinner /> : <><MaterialSymbol name="add"/> Aggiungi Sport</>}
                    </button>
                </div>
            </form>
        </Modal>
        {sportToDelete && (
            <ConfirmationModal
                title="Conferma Eliminazione"
                message={
                    <div>
                        <p>Sei sicuro di voler eliminare lo sport <strong>"{sportToDelete.id}"</strong>?</p>
                        {sportsInUse.has(sportToDelete.id) && 
                            <p className="mt-2 p-2 bg-yellow-500/20 text-yellow-700 dark:text-yellow-300 rounded-md text-sm">
                                <strong>Attenzione:</strong> Questo sport è attualmente in uso in uno o più eventi. Non sarà più selezionabile per nuovi eventi.
                            </p>
                        }
                    </div>
                }
                onConfirm={handleDeleteSport}
                onClose={() => setSportToDelete(null)}
                confirmText="Elimina Comunque"
            />
        )}
        </>
    );
};


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
                    Questa azione modificherà la data di <strong>tutti gli eventi del programma</strong>. 
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


// ====================================================================
// # MAIN ADMIN PANEL COMPONENT
// ====================================================================
const AdminPanel: React.FC<AdminPanelProps> = (props) => {
    const [adminView, setAdminView] = useState(props.initialView);

    useEffect(() => {
        if (props.initialView !== adminView) {
            setAdminView(props.initialView);
        }
    }, [props.initialView, adminView]);

    const renderAdminContent = () => {
        switch (adminView) {
            case 'admin-shifts': return <AdminShifts {...props} />;
            case 'admin-volunteers': return <AdminVolunteers {...props} />;
            case 'admin-race-program': return <AdminRaceProgram {...props} />;
            case 'admin-dashboard-cards': return <AdminDashboardCards {...props} />;
            case 'admin-locations': return <AdminLocations {...props} />;
            case 'admin-settings': return <AdminSettings {...props} />;
            case 'admin-dashboard':
            default:
                return <AdminDashboard onNavigate={(view) => {
                    setAdminView(view);
                    props.setCurrentView(view);
                }} />;
        }
    };
    
    return (
        <div className="animate-fade-in">
             <div className="flex items-center gap-4 mb-6">
                {adminView !== 'admin-dashboard' && (
                    <button onClick={() => { setAdminView('admin-dashboard'); props.setCurrentView('admin-dashboard'); }} className="p-2 hover:bg-surface-1 rounded-full">
                        <MaterialSymbol name="arrow_back" className="text-3xl" />
                    </button>
                )}
                <h1 className="text-4xl font-serif font-bold text-text-color">Pannello Admin</h1>
            </div>
            {renderAdminContent()}
        </div>
    );
};

export default AdminPanel;