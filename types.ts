
export interface Volunteer {
    id: string;
    nome: string;
    cognome: string;
    email: string;
    telefono: string;
    ruolo: 'Volontario' | 'Responsabile' | 'Admin';
    category?: string;
}

export interface Shift {
    id: string;
    id_turno: string;
    categoria: string;
    nome_turno: string;
    descrizione: string;
    luogo: string;
    data_inizio: string; // "DD/MM/YYYY"
    ora_inizio: string; // "HH:MM"
    ora_fine: string; // "HH:MM"
    icon?: string;
    color?: string;
}

export interface Assignment {
    id: string;
    email_volontario: string;
    id_turno: string;
}

export interface RaceEvent {
    id: string;
    sport: string;
    level: string;
    location: string;
    date: string; // "DD/MM/YYYY" or "YYYY-MM-DD"
    startTime: string; // "HH:MM"
    endTime: string; // "HH:MM"
    description?: string;
    tipologia: 'Sport' | 'Generale';
    showInRaceProgram?: boolean;
    category?: 'Mini' | 'Junior' | 'Senior';
    gender?: 'Maschile' | 'Femminile' | 'Misto';
}

export interface DashboardEvent {
    id: string;
    title: string;
    subtitle: string;
    description: string;
    icon: string;
    color?: string;
    date?: string; // YYYY-MM-DD
    time?: string;
    location?: string;
    isCountdown: boolean;
    showOnDashboard: boolean;
    showCalendarButton: boolean;
    showInRaceProgram?: boolean;
    visibleFrom?: string; // ISO datetime
    visibleUntil?: string; // ISO datetime
    // compatibility with RaceEvent
    startTime?: string;
    endTime?: string;
    eventName?: string;
}

export interface Notification {
    id: string;
    message: string;
    sender: string;
    timestamp: {
        toDate: () => Date;
    };
    targetEmails: string[];
    readBy: string[];
    deletedBy: string[];
}

export interface Sport {
    id: string;
    logoUrl?: string;
}

export interface Location {
    id: string;
}

export interface UsefulLink {
    id: string;
    name: string;
    url: string;
    icon: 'instagram' | 'facebook' | 'public' | 'whatsapp' | 'phone';
    order: number;
}
