
import React, { useState, useRef, useMemo, useEffect, useImperativeHandle, forwardRef } from 'react';
import { doc, setDoc, deleteDoc, writeBatch, collection, query, where, getDocs } from "firebase/firestore";
import { db } from '../../services/firebase';
import { showToast } from '../../App';
import { Volunteer } from '../../types';
import { ConfirmationModal, EditorPlaceholder, FormInput, FormSelect, EditorRef } from './AdminCommon';

interface AdminVolunteersProps {
    appData: { volunteers: Volunteer[] };
}

const VolunteerEditor = forwardRef<EditorRef, { volunteer: Volunteer | 'new'; onSave: () => void; onCancel: () => void; }>((props, ref) => {
    const { volunteer, onSave, onCancel } = props;
    const isNew = volunteer === 'new';
    const initialData = useMemo(() => isNew ? { ruolo: 'Volontario' as const } : (volunteer as Volunteer), [volunteer, isNew]);
    const [formData, setFormData] = useState<Partial<Volunteer>>(initialData);
    
    useEffect(() => { setFormData(initialData); }, [initialData]);
    
    const isEditing = !isNew;
    const isDirty = useMemo(() => JSON.stringify(initialData) !== JSON.stringify(formData), [initialData, formData]);
    
    const handleSave = async (): Promise<boolean> => {
        const email = formData.email?.trim().toLowerCase();
        if (!email) { showToast('Email obbligatoria', 'error'); return false; }
        try {
            await setDoc(doc(db, 'volunteers', email), formData, { merge: isEditing });
            return true;
        } catch (e) { return false; }
    };

    useImperativeHandle(ref, () => ({
      submitForm: async () => { const s = await handleSave(); if(s) showToast('Salvato'); return s; },
      isDirty: () => isDirty,
    }));

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (await handleSave()) onSave();
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => setFormData({ ...formData, [e.target.name]: e.target.value });

    return (
         <div className="bg-surface-1 rounded-2xl p-6 h-full border border-surface-3 shadow-lg animate-scale-in">
             <h3 className="text-2xl font-serif font-bold mb-4">{isNew ? 'Nuovo Volontario' : 'Modifica'}</h3>
             <form onSubmit={handleSubmit} className="space-y-4">
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
                    <button type="button" onClick={onCancel} className="flex-1 bg-surface-2 font-bold py-3 rounded-full">Annulla</button>
                    <button type="submit" className="flex-1 bg-primary text-on-primary font-bold py-3 rounded-full">Salva</button>
                </div>
            </form>
        </div>
    );
});

const AdminVolunteers: React.FC<AdminVolunteersProps> = ({ appData }) => {
    const editorRef = useRef<EditorRef>(null);
    const [selected, setSelected] = useState<Volunteer | 'new' | null>(null);
    const [search, setSearch] = useState('');
    const [showMobileEditor, setShowMobileEditor] = useState(false);

    const filtered = useMemo(() => appData.volunteers.filter(v => v.nome.toLowerCase().includes(search.toLowerCase()) || v.cognome.toLowerCase().includes(search.toLowerCase())), [appData.volunteers, search]);

    const handleSelect = async (v: Volunteer | 'new') => {
        if(editorRef.current?.isDirty()) await editorRef.current.submitForm();
        setSelected(v);
        setShowMobileEditor(true);
    };

    return (
        <div className="flex flex-col lg:flex-row gap-6 h-[calc(100vh-150px)]">
            <div className={`lg:w-1/3 flex flex-col ${showMobileEditor ? 'hidden lg:flex' : ''}`}>
                 <div className="flex gap-2 mb-4">
                    <button onClick={() => handleSelect('new')} className="w-full bg-primary text-on-primary py-3 rounded-full font-bold">Aggiungi Volontario</button>
                 </div>
                 <input type="search" placeholder="Cerca..." value={search} onChange={e => setSearch(e.target.value)} className="w-full p-3 bg-surface-1 rounded-xl mb-4" />
                 <div className="overflow-y-auto flex-grow space-y-2 pb-20 custom-scrollbar">
                     {filtered.map(v => (
                         <div key={v.id} onClick={() => handleSelect(v)} className="bg-surface-1 p-3 rounded-xl border border-surface-2 hover:ring-2 ring-primary cursor-pointer">
                             <p className="font-bold">{v.nome} {v.cognome}</p>
                             <p className="text-sm text-text-color-secondary">{v.email}</p>
                         </div>
                     ))}
                 </div>
            </div>
            <div className={`lg:w-2/3 ${showMobileEditor ? 'fixed inset-0 z-50 bg-surface p-4 lg:static lg:bg-transparent lg:p-0' : 'hidden lg:block'}`}>
                 {showMobileEditor && <button onClick={() => setShowMobileEditor(false)} className="lg:hidden absolute top-4 right-4 p-2 bg-surface-2 rounded-full z-20"><span className="material-symbols-rounded">close</span></button>}
                 {selected ? <VolunteerEditor ref={editorRef} volunteer={selected} onSave={() => { setSelected(null); setShowMobileEditor(false); }} onCancel={() => { setSelected(null); setShowMobileEditor(false); }} /> : <EditorPlaceholder message="Seleziona un volontario" icon="person" />}
            </div>
        </div>
    );
};

export default AdminVolunteers;
