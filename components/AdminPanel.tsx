
import React, { useState } from 'react';
import { Volunteer, Shift, Assignment, RaceEvent, DashboardEvent, Sport, Location, UsefulLink } from '../types';
import AdminShifts from './admin/AdminShifts';
import AdminVolunteers from './admin/AdminVolunteers';
import AdminRaceProgram from './admin/AdminRaceProgram';
import { AdminDashboard, AdminLocations, AdminSettings, AdminDashboardCards } from './admin/AdminModules';

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

const AdminPanel: React.FC<AdminPanelProps> = (props) => {
    const { initialView, setCurrentView } = props;

    const renderContent = () => {
        switch (initialView) {
            case 'admin-shifts': return <AdminShifts {...props} />;
            case 'admin-volunteers': return <AdminVolunteers appData={props.appData} />;
            case 'admin-race-program': return <AdminRaceProgram appData={props.appData} />;
            case 'admin-dashboard-cards': return <AdminDashboardCards appData={props.appData} />;
            case 'admin-locations': return <AdminLocations appData={props.appData} />;
            case 'admin-settings': return <AdminSettings appData={props.appData} />;
            default: return <AdminDashboard onNavigate={setCurrentView} />;
        }
    };

    return (
        <div className="animate-fade-in pb-20">
            <div className="flex items-center gap-4 mb-6">
                {initialView !== 'admin-dashboard' && (
                    <button onClick={() => setCurrentView('admin-dashboard')} className="p-2 hover:bg-surface-2 rounded-full transition-colors">
                        <span className="material-symbols-rounded text-3xl">arrow_back</span>
                    </button>
                )}
                <h1 className="text-3xl sm:text-4xl font-serif font-bold text-text-color">
                    {initialView === 'admin-dashboard' ? 'Pannello Admin' : ''}
                </h1>
            </div>
            {renderContent()}
        </div>
    );
};

export default AdminPanel;
