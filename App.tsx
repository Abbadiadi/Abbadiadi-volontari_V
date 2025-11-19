
import React, { useState, useEffect, useCallback, useMemo } from 'react';

// --- SERVICE IMPORTS ---
import { auth, db } from './services/firebase';
import { signInAnonymously, onAuthStateChanged } from "firebase/auth";
import { collection, doc, getDoc, onSnapshot, setDoc, addDoc, deleteDoc, query, where, writeBatch, serverTimestamp, updateDoc, arrayUnion, getDocs, orderBy } from "firebase/firestore";
import { generateShiftFromPrompt } from './services/geminiService';

// --- TYPE IMPORTS ---
import { Volunteer, Shift, Assignment, RaceEvent, DashboardEvent, Notification, Sport, Location, UsefulLink } from './types';

// --- UI & ASSET IMPORTS ---
import { Skeleton } from './components/ui/Feedback';
import AdminPanel from './components/AdminPanel';
import Dashboard from './components/Dashboard';
import MyShifts from './components/MyShifts';
import RaceProgram from './components/RaceProgram';
import LocationsView from './components/LocationsView';
import Spinner from './components/ui/Spinner';

// ====================================================================
// # UTILITY FUNCTIONS & HELPERS
// ====================================================================

export const showToast = (message: string, type: 'success' | 'error' = 'success') => {
    const toastContainer = document.getElementById('toast-container') || createToastContainer();
    
    while (toastContainer.children.length >= 3) {
        toastContainer.removeChild(toastContainer.firstChild!);
    }
    
    const toast = document.createElement('div');
    const toastClasses = {
        base: 'p-4 mb-4 rounded-2xl shadow-m3-lg text-white font-semibold transition-all duration-300 transform flex items-center gap-3',
        success: 'bg-green-500',
        error: 'bg-red-500'
    };
    const icon = type === 'success' ? 'check_circle' : 'error';
    toast.className = `${toastClasses.base} ${type === 'success' ? toastClasses.success : toastClasses.error} translate-y-full opacity-0`;
    toast.innerHTML = `<span class="material-symbols-rounded">${icon}</span> <p>${message}</p>`;
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
        toast.classList.remove('translate-y-full', 'opacity-0');
        toast.classList.add('translate-y-0', 'opacity-100');
    }, 100);

    setTimeout(() => {
        toast.classList.add('translate-y-full', 'opacity-0');
    }, 2700);

    setTimeout(() => {
        toast.remove();
    }, 3000);
};

const createToastContainer = () => {
    const container = document.createElement('div');
    container.id = 'toast-container';
    container.className = 'fixed top-5 right-5 z-[2000] w-full max-w-xs';
    document.body.appendChild(container);
    return container;
};

// ====================================================================
// # HELPER COMPONENTS (Keeping SocialLinks, Modal, etc. here for brevity or move to separate files if preferred)
// ====================================================================

const MaterialSymbol: React.FC<{ name: string; className?: string; isFilled?: boolean; }> = ({ name, className, isFilled }) => (
    <span className={`material-symbols-rounded ${isFilled ? 'fill' : ''} ${className || ''}`}>{name}</span>
);

// ... (Social Icons components remain same, omitted for brevity in this diff but assume present) ...
const InstagramIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.85s-.011 3.584-.069 4.85c-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.584-.012-4.85-.07c-3.252-.148-4.771-1.691-4.919-4.919-.058-1.265-.069-1.645-.069-4.85s.011-3.584.069-4.85c.149-3.225 1.664-4.771 4.919-4.919C8.416 2.175 8.796 2.163 12 2.163zm0 1.802c-3.141 0-3.504.011-4.718.067-2.618.119-3.693 1.193-3.812 3.812C3.411 9.496 3.4 9.859 3.4 12s.011 2.504.067 3.718c.119 2.618 1.193 3.693 3.812 3.812 1.214.056 1.577.067 4.718.067s3.504-.011 4.718-.067c2.618-.119 3.693-1.193 3.812-3.812.056-1.214.067-1.577.067-4.718s-.011-2.504-.067-3.718c-.119-2.618-1.193-3.693-3.812-3.812C15.504 3.975 15.141 3.965 12 3.965zM12 7.838a4.162 4.162 0 100 8.324 4.162 4.162 0 000-8.324zm0 6.666a2.502 2.502 0 110-5.004 2.502 2.502 0 010 5.004zm5.188-7.906a.96.96 0 100-1.92.96.96 0 000 1.92z" /></svg>
);
const FacebookIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.879V15.5H8.078v-3.5h2.36v-2.65c0-2.328 1.383-3.691 3.593-3.691 1.055 0 2.156.188 2.156.188v2.969h-1.508c-1.16 0-1.547.703-1.547 1.484v1.734h3.328l-.531 3.5h-2.797v6.379C18.343 21.128 22 16.991 22 12z" /></svg> );
const WhatsAppIcon: React.FC<{ className?: string }> = ({ className }) => ( <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M12.04 2c-5.46 0-9.91 4.45-9.91 9.91 0 1.75.46 3.45 1.32 4.95L2 22l5.25-1.38c1.45.77 3.06 1.18 4.79 1.18h.01c5.46 0 9.91-4.45 9.91-9.91s-4.45-9.91-9.91-9.91zM17.2 15.3c-.28-.14-1.67-.82-1.92-.92s-.44-.14-.62.14c-.18.28-.72.92-.89 1.1-.16.18-.32.2-.6.07-.28-.14-1.18-.43-2.25-1.39s-1.78-1.59-2.07-2.22c-.29-.63-.06-1.04.12-1.22.16-.16.35-.42.53-.63.18-.21.24-.35.35-.58.12-.23.06-.44-.03-.58-.09-.14-.62-1.5-1-2.06-.35-.52-.71-.44-.97-.44H6.9c-.25 0-.67.12-.97.42-.3.3-.97.95-.97 2.3 0 1.35 1 2.67 1.14 2.85.14.18 1.97 3.1 4.78 4.22.65.26 1.18.42 1.6.53.6.14 1.15.12 1.58-.06.48-.21 1.42-1.39 1.62-1.62.2-.23.2-.44.14-.58l-.24-.1z" /></svg> );

const iconMap: Record<UsefulLink['icon'], React.ReactElement<{ className?: string }>> = { instagram: <InstagramIcon />, facebook: <FacebookIcon />, public: <MaterialSymbol name="public" />, whatsapp: <WhatsAppIcon />, phone: <MaterialSymbol name="call" /> };

const SocialLinks: React.FC<{ links: UsefulLink[], collapsed?: boolean; className?: string; layout?: 'vertical' | 'horizontal' }> = ({ links, collapsed = false, className = '', layout = 'vertical' }) => {
    if (layout === 'horizontal') {
        return ( <div className={`flex justify-center items-center gap-4 ${className}`}> {links.map(link => ( <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full text-text-color-secondary hover:bg-surface-2 hover:text-primary transition-colors"> {React.cloneElement(iconMap[link.icon], { className: 'w-6 h-6' })} </a> ))} </div> );
    }
    if (!collapsed) {
        return ( <div className={`flex justify-start items-center gap-1 px-3 ${className}`}> {links.map(link => ( <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="p-2 rounded-full text-text-color-secondary hover:bg-surface-2 hover:text-text-color transition-colors"> {React.cloneElement(iconMap[link.icon], { className: 'w-6 h-6' })} </a> ))} </div> );
    }
    return ( <div className={`space-y-1 ${className}`}> {links.map(link => ( <a key={link.id} href={link.url} target="_blank" rel="noopener noreferrer" className="w-full flex items-center justify-center py-3 px-3 rounded-xl text-text-color-secondary hover:bg-surface-2 hover:text-text-color"> {React.cloneElement(iconMap[link.icon], { className: 'w-6 h-6 flex-shrink-0' })} </a> ))} </div> );
};

export const Modal: React.FC<{ title: string; children: React.ReactNode; onClose: () => void; }> = ({ title, children, onClose }) => {
    useEffect(() => { const handleEsc = (event: KeyboardEvent) => { if (event.key === 'Escape') onClose(); }; window.addEventListener('keydown', handleEsc); return () => window.removeEventListener('keydown', handleEsc); }, [onClose]);
    return ( <div className="fixed inset-0 bg-black bg-opacity-70 backdrop-blur-sm flex justify-center items-center z-[100] animate-fade-in" onClick={onClose}> <div className="bg-surface-1 text-text-color rounded-5xl shadow-m3-lg w-full max-w-lg m-4 border border-surface-3 animate-scale-in" onClick={e => e.stopPropagation()}> <div className="flex justify-between items-center p-6 border-b border-surface-3"> <h2 className="text-2xl font-serif text-primary">{title}</h2> <button onClick={onClose} className="p-2 rounded-full hover:bg-surface-2"><MaterialSymbol name="close"/></button> </div> <div className="p-6 max-h-[70vh] overflow-y-auto"> {children} </div> </div> </div> );
};

// ... (AiShiftModal, Login, ProfileModal components remain generally the same) ...
const AiShiftModal: React.FC<{ onClose: () => void; onShiftGenerated: (shift: Partial<Shift>) => void; }> = ({ onClose, onShiftGenerated }) => {
    const [prompt, setPrompt] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const handleSubmit = async (e: React.FormEvent) => { e.preventDefault(); if (!prompt.trim()) { showToast("Inserisci una descrizione.", 'error'); return; } setIsLoading(true); try { const generatedShift = await generateShiftFromPrompt(prompt); showToast("Turno generato!", 'success'); onShiftGenerated(generatedShift); onClose(); } catch (error: any) { showToast(error.message || "Errore.", 'error'); } finally { setIsLoading(false); } };
    return ( <Modal title="Crea Turno con AI" onClose={onClose}> <form onSubmit={handleSubmit}> <div className="space-y-4"> <label className="block font-bold text-lg text-secondary">Descrivi il turno</label> <textarea value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Esempio: Turno accoglienza..." className="w-full h-32 p-3 bg-surface-2 border border-surface-3 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition" disabled={isLoading} /> </div> <div className="mt-6"> <button type="submit" className="w-full bg-gradient-to-r from-accent-blue to-accent-green text-white font-bold py-3 rounded-full hover:opacity-90 disabled:opacity-50" disabled={isLoading}> {isLoading ? <><Spinner size="sm" /> Generazione...</> : "Genera Turno"} </button> </div> </form> </Modal> );
};

const Login: React.FC<{ onLogin: (email: string, remember: boolean) => Promise<void> }> = ({ onLogin }) => {
    const [email, setEmail] = useState('');
    const [remember, setRemember] = useState(false);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    useEffect(() => { const rem = localStorage.getItem('rememberedEmail'); if (rem) { setEmail(rem); setRemember(true); } }, []);
    const handleLoginSubmit = async (e: React.FormEvent) => { e.preventDefault(); setIsLoading(true); setError(''); try { await onLogin(email, remember); } catch (err: any) { setError(err.message || 'Login fallito.'); setIsLoading(false); } };
    return ( <div className="flex justify-center items-center min-h-screen p-4 bg-surface"> <div className="bg-surface-1 p-8 rounded-5xl shadow-m3-lg w-full max-w-sm text-center border border-surface-3"> <div className="mx-auto w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-6 shadow-lg"> <MaterialSymbol name="diversity_3" className="text-5xl text-white" /> </div> <h2 className="text-3xl font-serif font-bold mb-2 text-text-color">Benvenuto!</h2> <form onSubmit={handleLoginSubmit}> <div className="my-6"> <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="La tua email" required className="w-full border-2 border-surface-3 rounded-2xl p-4 bg-surface-2 text-text-color text-base focus:border-primary focus:outline-none" /> </div> <p className="text-red-400 mt-2 text-sm min-h-[20px]">{error || ' '}</p> <button type="submit" disabled={isLoading} className="w-full h-14 bg-primary text-on-primary text-lg font-bold rounded-full hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"> {isLoading ? <Spinner /> : 'Accedi'} </button> <div className="flex justify-between items-center mt-6 text-sm text-text-color-secondary"> <label className="flex items-center gap-2 cursor-pointer"> <input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} className="hidden" /> <div className={`w-5 h-5 border-2 border-outline rounded-md flex items-center justify-center ${remember ? 'bg-primary border-primary' : 'bg-surface-2'}`}> {remember && <MaterialSymbol name="check" className="text-sm text-on-primary" />} </div> Ricordami </label> </div> </form> </div> </div> );
};

const NotificationsModal: React.FC<{ user: Volunteer, onClose: () => void }> = ({ user, onClose }) => {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    useEffect(() => { const q = query(collection(db, "notifications"), where('targetEmails', 'array-contains', user.email)); const unsub = onSnapshot(q, snap => { setNotifications(snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)).filter(n => !(n.deletedBy && n.deletedBy.includes(user.email))).sort((a, b) => (b.timestamp?.toDate().getTime() || 0) - (a.timestamp?.toDate().getTime() || 0))); }); return () => unsub(); }, [user.email]);
    const markAsRead = async (id: string) => { await updateDoc(doc(db, "notifications", id), { readBy: arrayUnion(user.email) }); };
    const deleteNotification = async (id: string) => { await updateDoc(doc(db, "notifications", id), { deletedBy: arrayUnion(user.email) }); showToast("Notifica nascosta."); };
    return ( <Modal title="Notifiche" onClose={onClose}> {notifications.length > 0 ? ( <ul className="space-y-2"> {notifications.map(n => { const isUnread = !n.readBy.includes(user.email); return ( <li key={n.id} onClick={() => isUnread && markAsRead(n.id)} className={`p-4 rounded-2xl transition-colors flex group items-center gap-4 ${isUnread ? 'bg-primary-container/50 cursor-pointer' : 'bg-surface-2'}`}> {isUnread && <div className="w-2 h-2 bg-primary rounded-full flex-shrink-0"></div>} <div className="flex-grow"> <p>{n.message}</p> <p className="text-xs text-text-color-secondary mt-1">{n.timestamp?.toDate().toLocaleString('it-IT')}</p> </div> <button onClick={(e) => { e.stopPropagation(); deleteNotification(n.id); }} className="opacity-0 group-hover:opacity-100 text-text-color-secondary hover:text-accent-red transition-opacity p-2 rounded-full hover:bg-surface-3"> <MaterialSymbol name="delete"/> </button> </li> ); })} </ul> ) : <p className="text-center text-text-color-secondary">Nessuna notifica.</p>} </Modal> );
};

const ProfileModal: React.FC<{ user: Volunteer; onClose: () => void; onLogout: () => void; onSetTheme: (theme: string) => void; currentTheme: string; onAvatarChange: () => void; usefulLinks: UsefulLink[] }> = ({ user, onClose, onLogout, onSetTheme, currentTheme, onAvatarChange, usefulLinks }) => {
    const [avatar, setAvatar] = useState(localStorage.getItem(`avatar_${user.email}`) || '');
    const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => { const file = e.target.files?.[0]; if (file) { const reader = new FileReader(); reader.onload = (event) => { const base64 = event.target?.result as string; localStorage.setItem(`avatar_${user.email}`, base64); setAvatar(base64); onAvatarChange(); showToast('Immagine aggiornata!'); }; reader.readAsDataURL(file); } };
    return ( <Modal title="Il Mio Profilo" onClose={onClose}> <div className="text-center"> <div className="relative w-24 h-24 mx-auto mb-4"> {avatar ? <img src={avatar} alt="Avatar" className="w-24 h-24 rounded-full object-cover"/> : <div className="w-24 h-24 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-4xl">{user.nome.charAt(0)}{user.cognome.charAt(0)}</div> } <label htmlFor="avatar-upload" className="absolute bottom-0 right-0 bg-secondary w-8 h-8 rounded-full flex items-center justify-center cursor-pointer border-2 border-surface-1 hover:brightness-110 transition"> <MaterialSymbol name="edit" className="text-lg text-on-secondary" /> </label> <input type="file" id="avatar-upload" accept="image/*" className="hidden" onChange={handleAvatarUpload} /> </div> <h3 className="text-2xl font-bold">{user.nome} {user.cognome}</h3> <div className="mt-8 pt-6 border-t border-surface-3"> <h4 className="text-center font-bold mb-2 text-text-color-secondary">Seguici sui Social</h4> <SocialLinks links={usefulLinks} layout="horizontal" /> </div> <div className="mt-6 text-left"> <label htmlFor="theme-select" className="font-bold">Tema App</label> <select id="theme-select" value={currentTheme} onChange={e => onSetTheme(e.target.value)} className="w-full mt-2 p-3 bg-surface-2 border border-surface-3 rounded-xl"> <option value="dark">Scuro</option> <option value="light">Chiaro</option> </select> </div> <button onClick={onLogout} className="w-full mt-8 bg-red-600 text-white font-bold py-3 rounded-full hover:bg-red-700 transition">Logout</button> </div> </Modal> );
};

const EventDetailModal: React.FC<{ event: DashboardEvent; onClose: () => void }> = ({ event, onClose }) => ( <Modal title={event.title} onClose={onClose}> <div className="space-y-4"> <p className="text-lg font-bold">{event.subtitle}</p> <p>{event.description}</p> <div className="space-y-2 text-sm text-text-color-secondary"> <div className="flex items-center gap-2"><MaterialSymbol name="calendar_month"/> {event.date}</div> <div className="flex items-center gap-2"><MaterialSymbol name="schedule"/> {event.time}</div> <div className="flex items-center gap-2"><MaterialSymbol name="location_on"/> {event.location}</div> </div> </div> </Modal> );

export default function App() {
    const [currentUser, setCurrentUser] = useState<Volunteer | null>(null);
    const [loading, setLoading] = useState(true);
    const [appData, setAppData] = useState<{ volunteers: Volunteer[]; shifts: Shift[]; assignments: Assignment[]; shiftCategories: string[]; volunteerCategories: string[]; raceEvents: RaceEvent[]; dashboardEvents: DashboardEvent[]; notifications: Notification[]; sportsList: Sport[]; locations: Location[]; usefulLinks: UsefulLink[]; }>({ volunteers: [], shifts: [], assignments: [], shiftCategories: [], volunteerCategories: [], raceEvents: [], dashboardEvents: [], notifications: [], sportsList: [], locations: [], usefulLinks: [] });
    const [currentView, setCurrentView] = useState('dashboard');
    const [theme, setTheme] = useState(localStorage.getItem('theme') || 'dark');
    const [isAiModalOpen, setIsAiModalOpen] = useState(false);
    const [initialShiftData, setInitialShiftData] = useState<Partial<Shift> | null>(null);
    const [eventDetail, setEventDetail] = useState<DashboardEvent | null>(null);
    const [profileModalOpen, setProfileModalOpen] = useState(false);
    const [notificationsModalOpen, setNotificationsModalOpen] = useState(false);
    const [avatarKey, setAvatarKey] = useState(Date.now());
    const [isSideNavCollapsed, setIsSideNavCollapsed] = useState(localStorage.getItem('isSideNavCollapsed') === 'true');

    const handleToggleSideNav = () => { setIsSideNavCollapsed(!isSideNavCollapsed); localStorage.setItem('isSideNavCollapsed', String(!isSideNavCollapsed)); };
    const handleSetTheme = (newTheme: string) => { localStorage.setItem('theme', newTheme); setTheme(newTheme); };
    useEffect(() => { document.body.classList.toggle('dark', theme === 'dark'); }, [theme]);

    const handleLogin = useCallback(async (email: string, remember: boolean) => { const userDoc = await getDoc(doc(db, 'volunteers', email.trim().toLowerCase())); if (userDoc.exists()) { const userData = { id: userDoc.id, ...userDoc.data() } as Volunteer; setCurrentUser(userData); localStorage.setItem('userEmail', userData.email); if (remember) localStorage.setItem('rememberedEmail', userData.email); else localStorage.removeItem('rememberedEmail'); } else throw new Error('Email non trovata.'); }, []);
    const handleLogout = () => { localStorage.removeItem('userEmail'); setCurrentUser(null); window.location.reload(); };
    
    useEffect(() => { const checkSession = async () => { setLoading(true); await signInAnonymously(auth); const userEmail = localStorage.getItem('userEmail'); if (userEmail) try { await handleLogin(userEmail, false); } catch { localStorage.removeItem('userEmail'); } setLoading(false); }; const unsubscribe = onAuthStateChanged(auth, user => { if (user) checkSession(); else setLoading(false); }); return () => unsubscribe(); }, [handleLogin]);

    useEffect(() => { if (!currentUser) return; const unsubscribers = [ onSnapshot(collection(db, "volunteers"), snap => setAppData(d => ({...d, volunteers: snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Volunteer)).sort((a,b) => a.cognome.localeCompare(b.cognome))}))), onSnapshot(collection(db, "shifts"), snap => setAppData(d => ({...d, shifts: snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Shift))}))), onSnapshot(collection(db, "assignments"), snap => setAppData(d => ({...d, assignments: snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Assignment))}))), onSnapshot(collection(db, "shift_categories"), snap => setAppData(d => ({...d, shiftCategories: snap.docs.map(doc => doc.id).sort()}))), onSnapshot(collection(db, "race_events"), snap => setAppData(d => ({...d, raceEvents: snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as RaceEvent))}))), onSnapshot(collection(db, "dashboard_events"), snap => setAppData(d => ({...d, dashboardEvents: snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as DashboardEvent))}))), onSnapshot(collection(db, "sports_list"), snap => setAppData(d => ({...d, sportsList: snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Sport)).sort((a,b) => a.id.localeCompare(b.id))}))), onSnapshot(collection(db, "locations"), snap => setAppData(d => ({...d, locations: snap.docs.map(doc => ({ id: doc.id })).sort((a,b) => a.id.localeCompare(b.id))}))), onSnapshot(query(collection(db, "useful_links"), orderBy("order")), snap => setAppData(d => ({...d, usefulLinks: snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as UsefulLink))}))), onSnapshot(query(collection(db, "notifications"), where('targetEmails', 'array-contains', currentUser.email)), snap => setAppData(d => ({...d, notifications: snap.docs.map(doc => ({ id: doc.id, ...doc.data() } as Notification)).filter(n => !(n.deletedBy && n.deletedBy.includes(currentUser.email))).sort((a, b) => (b.timestamp?.toDate().getTime() || 0) - (a.timestamp?.toDate().getTime() || 0))}))) ]; return () => unsubscribers.forEach(unsub => unsub()); }, [currentUser]);

    const isAdmin = useMemo(() => currentUser?.ruolo === 'Admin' || currentUser?.ruolo === 'Responsabile', [currentUser]);
    const unreadNotifications = useMemo(() => appData.notifications.filter(n => !n.readBy.includes(currentUser?.email || '')).length, [appData.notifications, currentUser]);
    const handleAiShiftGenerated = (shiftData: Partial<Shift>) => { setInitialShiftData(shiftData); setCurrentView('admin-shifts'); };

    if (loading) return <div className="flex justify-center items-center h-screen bg-surface"><div className="flex flex-col gap-4 items-center"><Skeleton className="w-16 h-16 rounded-full"/><Skeleton className="w-32 h-4 rounded-lg"/></div></div>;
    if (!currentUser) return <Login onLogin={handleLogin} />;

    const renderView = () => {
        const commonProps = { currentUser, appData, isAdmin, setCurrentView };
        if (currentView.startsWith('admin')) return <AdminPanel {...commonProps} initialView={currentView} onOpenAiModal={() => setIsAiModalOpen(true)} initialShiftData={initialShiftData} clearInitialShiftData={() => setInitialShiftData(null)} />;
        switch (currentView) {
            case 'dashboard': return <Dashboard {...commonProps} onShowDetails={setEventDetail} />;
            case 'my-shifts': return <MyShifts {...commonProps} />;
            case 'race-program': return <RaceProgram {...commonProps} />;
            case 'locations-view': return <LocationsView locations={appData.locations} />;
            default: return <Dashboard {...commonProps} onShowDetails={setEventDetail} />;
        }
    };

    return (
        <div className={`font-main min-h-screen bg-surface text-text-color`}>
            <SideNav currentView={currentView} onNavigate={setCurrentView} isAdmin={isAdmin} currentUser={currentUser} onProfileClick={() => setProfileModalOpen(true)} avatarKey={avatarKey} isSideNavCollapsed={isSideNavCollapsed} onToggleCollapse={handleToggleSideNav} usefulLinks={appData.usefulLinks} />
            <div className={`flex flex-col min-h-screen transition-all duration-300 ${isSideNavCollapsed ? 'lg:pl-20' : 'lg:pl-64'}`}>
                <Header currentUser={currentUser} isAdmin={isAdmin} unreadCount={unreadNotifications} onNavigate={setCurrentView} onProfileClick={() => setProfileModalOpen(true)} onNotificationsClick={() => setNotificationsModalOpen(true)} avatarKey={avatarKey} />
                <main className="flex-grow p-4 sm:p-6">{renderView()}</main>
                <BottomNav currentView={currentView} onNavigate={setCurrentView} />
            </div>
            {profileModalOpen && <ProfileModal user={currentUser} onClose={() => setProfileModalOpen(false)} onLogout={handleLogout} onSetTheme={handleSetTheme} currentTheme={theme} onAvatarChange={() => setAvatarKey(Date.now())} usefulLinks={appData.usefulLinks} />}
            {notificationsModalOpen && <NotificationsModal user={currentUser} onClose={() => setNotificationsModalOpen(false)} />}
            {isAiModalOpen && <AiShiftModal onClose={() => setIsAiModalOpen(false)} onShiftGenerated={handleAiShiftGenerated}/>}
            {eventDetail && <EventDetailModal event={eventDetail} onClose={() => setEventDetail(null)}/>}
        </div>
    );
}

const SideNav: React.FC<{ currentView: string; onNavigate: (view: string) => void; isAdmin: boolean; currentUser: Volunteer; onProfileClick: () => void; avatarKey: number; isSideNavCollapsed: boolean; onToggleCollapse: () => void; usefulLinks: UsefulLink[]; }> = ({ currentView, onNavigate, isAdmin, currentUser, onProfileClick, avatarKey, isSideNavCollapsed, onToggleCollapse, usefulLinks }) => {
    const navItems = [
        { view: 'dashboard', icon: 'dashboard', label: 'Dashboard' },
        { view: 'my-shifts', icon: 'calendar_month', label: 'I Miei Turni' },
        { view: 'race-program', icon: 'grid_view', label: 'Programma' },
        { view: 'locations-view', icon: 'map', label: 'Mappa Luoghi' },
    ];
    if (isAdmin) navItems.push({ view: 'admin-dashboard', icon: 'admin_panel_settings', label: 'Admin' });

    const getAvatar = (collapsed: boolean) => { const sizeClass = collapsed ? 'w-9 h-9 text-base' : 'w-10 h-10 text-lg'; const saved = localStorage.getItem(`avatar_${currentUser.email}`); return saved ? <div className={`rounded-full bg-cover bg-center ${sizeClass}`} style={{ backgroundImage: `url(${saved})` }} /> : <div className={`rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold ${sizeClass}`}>{currentUser.nome.charAt(0)}{currentUser.cognome.charAt(0)}</div>; }

    return (
        <aside className={`hidden lg:flex flex-col h-screen bg-surface-1 border-r border-surface-3 fixed top-0 left-0 z-50 transition-all duration-300 ${isSideNavCollapsed ? 'w-20' : 'w-64'}`}>
            <div className={`p-4 flex items-center border-b border-surface-3 h-[73px] transition-all duration-300 ${isSideNavCollapsed ? 'justify-center' : 'justify-start'}`}> {isSideNavCollapsed ? ( <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center text-on-primary font-bold text-xl">V</div> ) : ( <div className="font-serif text-2xl font-bold"> <span className="text-primary">Volontari</span>Abbadiadi </div> )} </div>
            <nav className="flex-grow p-3 space-y-1"> {navItems.map(item => { const isActive = currentView.startsWith(item.view); return ( <button key={item.view} onClick={() => onNavigate(item.view)} title={isSideNavCollapsed ? item.label : undefined} className={`w-full flex items-center gap-4 py-3 rounded-xl text-base transition-colors ${isSideNavCollapsed ? 'px-3 justify-center' : 'px-4'} ${isActive ? 'bg-primary-container text-on-primary-container font-bold' : 'text-text-color-secondary hover:bg-surface-2 hover:text-text-color'}`} > <MaterialSymbol name={item.icon} isFilled={isActive} /> {!isSideNavCollapsed && <span>{item.label}</span>} </button> ); })} </nav>
            <div className="p-3 border-t border-surface-3"> {!isSideNavCollapsed && <h4 className="px-4 pb-2 text-xs font-bold text-text-color-secondary uppercase tracking-wider">Link Utili</h4>} <SocialLinks links={usefulLinks} collapsed={isSideNavCollapsed} /> </div>
            <div className="p-3 border-t border-surface-3 space-y-2"> <button onClick={onProfileClick} className={`w-full flex items-center gap-3 p-2 rounded-xl text-left hover:bg-surface-2 transition-colors ${isSideNavCollapsed ? 'justify-center' : ''}`} key={avatarKey}> {getAvatar(isSideNavCollapsed)} {!isSideNavCollapsed && ( <div className="flex-grow overflow-hidden"> <p className="font-bold text-text-color truncate">{currentUser.nome} {currentUser.cognome}</p> <p className="text-xs text-text-color-secondary truncate">{currentUser.email}</p> </div> )} </button> <button onClick={onToggleCollapse} className={`w-full flex items-center gap-4 py-3 rounded-xl text-base text-text-color-secondary hover:bg-surface-2 hover:text-text-color ${isSideNavCollapsed ? 'px-3 justify-center' : 'px-4'}`}> <MaterialSymbol name={isSideNavCollapsed ? 'menu_open' : 'menu'} /> {!isSideNavCollapsed && <span>Comprimi</span>} </button> </div>
        </aside>
    );
};

const Header: React.FC<{ currentUser: Volunteer; isAdmin: boolean; unreadCount: number; onNavigate: (view: string) => void; onProfileClick: () => void; onNotificationsClick: () => void; avatarKey: number; }> = ({ currentUser, isAdmin, unreadCount, onNavigate, onProfileClick, onNotificationsClick, avatarKey }) => {
    const getAvatar = () => { const saved = localStorage.getItem(`avatar_${currentUser.email}`); return saved ? <div className="w-11 h-11 rounded-full bg-cover bg-center" style={{ backgroundImage: `url(${saved})` }} /> : <div className="w-11 h-11 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center font-bold text-lg">{currentUser.nome.charAt(0)}{currentUser.cognome.charAt(0)}</div>; }
    return ( <header className="bg-surface p-3 px-6 flex justify-between lg:justify-end items-center sticky top-0 z-40 border-b border-surface-2"> <div className="font-serif text-xl font-bold lg:hidden"> <span className="text-primary">Volontari</span>Abbadiadi </div> <div className="flex items-center gap-2"> {isAdmin && <button title="Admin Panel" onClick={() => onNavigate('admin-dashboard')} className="p-2 rounded-full hover:bg-surface-2 transition lg:hidden"><MaterialSymbol name="admin_panel_settings" className="text-3xl" /></button>} <button title="Notifiche" className="relative p-2 rounded-full hover:bg-surface-2 transition" onClick={onNotificationsClick}> <MaterialSymbol name="notifications" className="text-3xl" /> {unreadCount > 0 && <span className="absolute top-1 right-1 w-5 h-5 bg-accent-red text-white text-xs font-bold rounded-full flex items-center justify-center border-2 border-surface-1">{unreadCount}</span>} </button> <button onClick={onProfileClick} key={avatarKey} className="lg:hidden"> {getAvatar()} </button> </div> </header> );
};

const BottomNav: React.FC<{ currentView: string; onNavigate: (view: string) => void; }> = ({ currentView, onNavigate }) => {
    const navItems = [ { view: 'dashboard', icon: 'home', label: 'Dashboard' }, { view: 'my-shifts', icon: 'calendar_month', label: 'Turni' }, { view: 'race-program', icon: 'grid_view', label: 'Programma' }, { view: 'locations-view', icon: 'map', label: 'Luoghi' } ];
    return ( <nav className="bg-surface-1/80 backdrop-blur-md border-t border-surface-3 p-2 flex justify-around items-start sticky bottom-0 z-40 lg:hidden"> {navItems.map(item => { const isActive = currentView.startsWith(item.view); return ( <button key={item.view} onClick={() => onNavigate(item.view)} className="flex flex-col items-center justify-start w-16 h-14 pt-2 transition-colors group" aria-label={item.label} > <div className={`flex items-center justify-center h-8 w-12 rounded-full transition-all duration-300 ${isActive ? 'bg-primary-container' : ''}`}> <MaterialSymbol name={item.icon} isFilled={isActive} className={isActive ? 'text-on-primary-container' : 'text-text-color-secondary'}/> </div> <span className={`mt-1 text-[10px] font-bold transition-colors ${isActive ? 'text-on-primary-container' : 'text-text-color-secondary'}`}>{item.label}</span> </button> ); })} </nav> );
};
