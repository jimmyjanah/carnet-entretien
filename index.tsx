import React, { useState, useEffect, useMemo } from 'react';
import { createRoot } from 'react-dom/client';

// FIX: Add type declaration for window.jspdf to fix TypeScript error on line 500.
declare global {
    interface Window {
        jspdf: any;
    }
}

// --- TYPES ---
interface Vehicle {
    id: string;
    name: string;
    plate?: string;
    fuel: 'Essence' | 'Diesel' | 'Hybride' | 'Électrique';
    firstRegistrationDate: string; // YYYY-MM-DD
    km: number;
    argusUrl?: string;
}

interface MaintenanceEvent {
    id:string;
    vehicleId: string;
    type: string;
    date: string; // ISO format YYYY-MM-DD
    km: number;
    cost?: number;
    notes?: string;
    photo?: string; // Base64 Data URL
}

interface MaintenanceRule {
    type: string;
    everyMonths?: number;
    everyKm?: number;
}

// --- CONSTANTS ---
const MAINTENANCE_RULES: { [key: string]: MaintenanceRule[] } = {
    'Essence': [
        { type: 'Vidange & Filtre à huile', everyMonths: 12, everyKm: 15000 },
        { type: 'Filtre à air', everyKm: 30000 },
        { type: 'Filtre habitacle', everyMonths: 12, everyKm: 15000 },
        { type: 'Bougies d\'allumage', everyKm: 60000 },
        { type: 'Liquide de frein', everyMonths: 24 },
        { type: 'Contrôle Technique', everyMonths: 24 },
        { type: 'Pneus été/hiver', everyMonths: 6 },
    ],
    'Diesel': [
        { type: 'Vidange & Filtre à huile', everyMonths: 12, everyKm: 20000 },
        { type: 'Filtre à carburant', everyKm: 40000 },
        { type: 'Filtre à air', everyKm: 40000 },
        { type: 'Filtre habitacle', everyMonths: 12, everyKm: 20000 },
        { type: 'Liquide de frein', everyMonths: 24 },
        { type: 'Contrôle Technique', everyMonths: 24 },
        { type: 'Pneus été/hiver', everyMonths: 6 },
    ],
    'Hybride': [
        { type: 'Vidange & Filtre à huile', everyMonths: 12, everyKm: 15000 },
        { type: 'Filtre à air', everyKm: 40000 },
        { type: 'Filtre habitacle', everyMonths: 12, everyKm: 15000 },
        { type: 'Liquide de frein', everyMonths: 24 },
        { type: 'Contrôle Technique', everyMonths: 24 },
        { type: 'Pneus été/hiver', everyMonths: 6 },
    ],
    'Électrique': [
        { type: 'Filtre habitacle', everyMonths: 12, everyKm: 25000 },
        { type: 'Liquide de frein', everyMonths: 24 },
        { type: 'Contrôle Technique', everyMonths: 24 },
        { type: 'Pneus été/hiver', everyMonths: 6 },
    ]
};

const ALL_MAINTENANCE_TYPES = [...new Set(Object.values(MAINTENANCE_RULES).flat().map(r => r.type))];

// --- ICONS ---
const CarIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 17H5.236a2 2 0 01-1.98-1.756l-1.26-6.3A2 2 0 013.976 6.5h12.048a2 2 0 011.98 2.244l-1.26 6.3A2 2 0 0118.764 17H13" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 11h14M5 11a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v3a2 2 0 01-2 2M5 11v6m14-6v6" /></svg>;
const PlusIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>;
const BackIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>;
const WrenchIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M11.49 3.17c-.38-1.56-2.6-1.56-2.98 0L8 5.45c-.32.14-.64.32-.95.53l-2.12-.8c-1.5-.56-3.08.92-2.52 2.52l.8 2.12c-.21.31-.39.63-.53.95l-2.28.52c-1.56.38-1.56 2.6 0 2.98l2.28.52c.14.32.32.64.53.95l-.8 2.12c-.56 1.5.92 3.08 2.52 2.52l2.12-.8c.31.21.63.39.95.53l.52 2.28c.38 1.56 2.6 1.56 2.98 0l.52-2.28c.32-.14.64-.32.95-.53l2.12.8c1.5.56 3.08-.92 2.52-2.52l-.8-2.12c.21-.31.39-.63.53.95l2.28-.52c-1.56-.38-1.56-2.6 0-2.98l-2.28-.52c-.14-.32-.32-.64-.53-.95l.8-2.12c.56-1.5-.92-3.08-2.52-2.52l-2.12.8c-.31-.21-.63-.39-.95-.53L11.49 3.17zM10 13a3 3 0 100-6 3 3 0 000 6z" clipRule="evenodd" /></svg>;
const HistoryIcon = () => <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.414-1.414L11 9.586V6z" clipRule="evenodd" /></svg>;

// --- HOOKS ---
function useLocalStorage<T>(key: string, initialValue: T): [T, React.Dispatch<React.SetStateAction<T>>] {
    const [storedValue, setStoredValue] = useState<T>(() => {
        try {
            const item = window.localStorage.getItem(key);
            return item ? JSON.parse(item) : initialValue;
        } catch (error) {
            console.error(error);
            return initialValue;
        }
    });

    const setValue = (value: T | ((val: T) => T)) => {
        try {
            const valueToStore = value instanceof Function ? value(storedValue) : value;
            setStoredValue(valueToStore);
            window.localStorage.setItem(key, JSON.stringify(valueToStore));
        } catch (error) {
            console.error(error);
        }
    };

    return [storedValue, setValue];
}

// --- UTILS ---
const formatDate = (date: Date) => date.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
const addMonths = (date: Date, months: number) => {
    const d = new Date(date);
    d.setMonth(d.getMonth() + months);
    return d;
};
const fileToBase64 = (file: File): Promise<string> => new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = error => reject(error);
});

const calculateMaintenanceStatuses = (vehicle: Vehicle, vehicleEvents: MaintenanceEvent[]) => {
    const rules = MAINTENANCE_RULES[vehicle.fuel];
    if (!rules) return [];

    const now = new Date();
    now.setHours(0, 0, 0, 0); // Compare dates only

    return rules.map(rule => {
        const lastEvent = vehicleEvents
            .filter(e => e.type === rule.type)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

        // Special logic for Contrôle Technique if no event exists yet
        if (rule.type === 'Contrôle Technique' && !lastEvent) {
            if (!vehicle.firstRegistrationDate) {
                 return { ...rule, status: 'unknown' as const, details: 'Date de 1ère immat. manquante' };
            }

            const firstRegDate = new Date(vehicle.firstRegistrationDate);
            const firstDueDate = addMonths(firstRegDate, 48); // First one is after 4 years

            const daysRemaining = Math.ceil((firstDueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
            
            let status: 'ok' | 'soon' | 'overdue' = 'ok';
            let details = '';

            if (now > firstDueDate) {
                status = 'overdue';
                details = `À faire depuis le ${formatDate(firstDueDate)}`;
            } else if (daysRemaining <= 90) { // Give more notice for CT
                status = 'soon';
                details = `À prévoir avant le ${formatDate(firstDueDate)} (${daysRemaining} jours restants)`;
            } else {
                status = 'ok';
                details = `Prochain: ${formatDate(firstDueDate)}`;
            }
            return { ...rule, status, details };
        }


        if (!lastEvent) {
            return { ...rule, status: 'unknown' as const, details: 'Aucun historique' };
        }

        let dueDate: Date | null = null;
        let dueKm: number | null = null;

        if (rule.everyMonths) {
            dueDate = addMonths(new Date(lastEvent.date), rule.everyMonths);
        }
        if (rule.everyKm) {
            dueKm = lastEvent.km + rule.everyKm;
        }
        
        const kmRemaining = dueKm ? dueKm - vehicle.km : Infinity;
        const daysRemaining = dueDate ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)) : Infinity;
        
        let status: 'ok' | 'soon' | 'overdue' = 'ok';
        let details = '';
        
        const warningDays = rule.type === 'Contrôle Technique' ? 90 : 30;
        const warningKm = 1000;

        if ((dueDate && now > dueDate) || (dueKm && vehicle.km > dueKm)) {
            status = 'overdue';
            details = 'À faire immédiatement';
        } else if ((dueDate && daysRemaining <= warningDays) || (dueKm && kmRemaining <= warningKm)) {
            status = 'soon';
            const parts = [];
            if (dueDate && daysRemaining <= warningDays) parts.push(`dans ${daysRemaining} jours`);
            if (dueKm && kmRemaining <= warningKm) parts.push(`dans ${kmRemaining.toLocaleString('fr-FR')} km`);
            details = `À prévoir ${parts.join(' ou ')}`;
        } else {
             status = 'ok';
             const parts = [];
             if(dueDate) parts.push(`Prochain: ${formatDate(dueDate)}`);
             if(dueKm) parts.push(`à ${dueKm.toLocaleString('fr-FR')} km`);
             details = parts.join(' / ');
        }

        return { ...rule, status, details };
    }).sort((a, b) => {
        const order = { overdue: 0, soon: 1, unknown: 2, ok: 3 };
        return order[a.status] - order[b.status];
    });
};


// --- COMPONENTS ---

const Header = ({ title, onBack }: { title: string, onBack?: () => void }) => (
    <header className="sticky top-0 z-10 bg-white/80 dark:bg-gray-900/80 backdrop-blur-sm shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center">
            {onBack && (
                <button onClick={onBack} className="p-2 -ml-2 mr-2 rounded-full text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700">
                    <BackIcon />
                </button>
            )}
            <h1 className="text-2xl font-bold text-gray-800 dark:text-white">{title}</h1>
        </div>
    </header>
);

// FIX: Made the 'children' prop optional to fix TypeScript errors where it was not being correctly inferred from JSX usage.
const Modal = ({ children, onClose }: { children?: React.ReactNode, onClose: () => void }) => (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-lg w-full p-6 fade-in" onClick={e => e.stopPropagation()}>
            {children}
        </div>
    </div>
);

const ConfirmationModal = ({ title, message, confirmText, onConfirm, onClose }: {
    title: string;
    message: string;
    confirmText: string;
    onConfirm: () => void;
    onClose: () => void;
}) => (
    <Modal onClose={onClose}>
        <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
        <p className="text-gray-600 dark:text-gray-300 mb-6">{message}</p>
        <div className="flex justify-end gap-3">
            <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
                Annuler
            </button>
            <button
                type="button"
                onClick={onConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
            >
                {confirmText}
            </button>
        </div>
    </Modal>
);

const VehicleForm = ({ onSave, onCancel, vehicleToEdit }: { onSave: (vehicle: Vehicle) => void, onCancel: () => void, vehicleToEdit?: Vehicle }) => {
    const [vehicle, setVehicle] = useState<Omit<Vehicle, 'id'>>(
        vehicleToEdit || { name: '', fuel: 'Essence', firstRegistrationDate: new Date().toISOString().split('T')[0], km: 0, plate: '', argusUrl: '' }
    );

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setVehicle(prev => ({ ...prev, [name]: name === 'km' ? Number(value) : value }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSave({ ...vehicle, id: vehicleToEdit?.id || Date.now().toString() });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Nom du véhicule</label>
                <input type="text" name="name" id="name" value={vehicle.name} onChange={handleChange} required className="mt-1 block w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="Ex: Peugeot 208"/>
            </div>
            <div>
                <label htmlFor="km" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Kilométrage actuel</label>
                <input type="number" name="km" id="km" value={vehicle.km} onChange={handleChange} required className="mt-1 block w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
                <label htmlFor="fuel" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Carburant</label>
                <select name="fuel" id="fuel" value={vehicle.fuel} onChange={handleChange} className="mt-1 block w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                    <option>Essence</option>
                    <option>Diesel</option>
                    <option>Hybride</option>
                    <option>Électrique</option>
                </select>
            </div>
            <div>
                <label htmlFor="firstRegistrationDate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date de 1ère mise en circulation</label>
                <input type="date" name="firstRegistrationDate" id="firstRegistrationDate" value={vehicle.firstRegistrationDate} onChange={handleChange} required className="mt-1 block w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
             <div>
                <label htmlFor="plate" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Immatriculation (optionnel)</label>
                <input type="text" name="plate" id="plate" value={vehicle.plate} onChange={handleChange} className="mt-1 block w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="Ex: AB-123-CD"/>
            </div>
            <div>
                <label htmlFor="argusUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Lien Cote Argus (optionnel)</label>
                <input type="url" name="argusUrl" id="argusUrl" value={vehicle.argusUrl || ''} onChange={handleChange} className="mt-1 block w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" placeholder="https://www.largus.fr/..."/>
            </div>
            <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600">Annuler</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700">Enregistrer</button>
            </div>
        </form>
    );
};

const EventForm = ({ onSave, onCancel, vehicle }: { onSave: (event: MaintenanceEvent) => void, onCancel: () => void, vehicle: Vehicle }) => {
    const [event, setEvent] = useState<Omit<MaintenanceEvent, 'id' | 'vehicleId'>>({
        type: '',
        date: new Date().toISOString().split('T')[0],
        km: vehicle.km,
        cost: 0,
        notes: '',
        photo: ''
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setEvent(prev => ({ ...prev, [name]: (name === 'km' || name === 'cost') ? Number(value) : value }));
    };
    
    const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            try {
                const base64 = await fileToBase64(e.target.files[0]);
                setEvent(prev => ({ ...prev, photo: base64 }));
            } catch (error) {
                console.error("Error converting file to base64", error);
                alert("Erreur lors du chargement de l'image.");
            }
        }
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if(!event.type) {
            alert("Veuillez sélectionner un type d'intervention.");
            return;
        }
        onSave({ ...event, id: Date.now().toString(), vehicleId: vehicle.id });
    };
    
    return (
        <form onSubmit={handleSubmit} className="space-y-4">
            <div>
                <label htmlFor="type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type d'intervention</label>
                <select name="type" id="type" value={event.type} onChange={handleChange} required className="mt-1 block w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500">
                   <option value="" disabled>-- Choisir --</option>
                   {ALL_MAINTENANCE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
            </div>
             <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date</label>
                <input type="date" name="date" id="date" value={event.date} onChange={handleChange} required className="mt-1 block w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"/>
            </div>
            <div>
                <label htmlFor="km" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Kilométrage</label>
                <input type="number" name="km" id="km" value={event.km} onChange={handleChange} required className="mt-1 block w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
                <label htmlFor="cost" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Coût (€) (optionnel)</label>
                <input type="number" name="cost" id="cost" value={event.cost} step="0.01" onChange={handleChange} className="mt-1 block w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500" />
            </div>
            <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Notes (optionnel)</label>
                <textarea name="notes" id="notes" value={event.notes} onChange={handleChange} rows={3} className="mt-1 block w-full bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"></textarea>
            </div>
            <div>
                <label htmlFor="photo" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Photo de la facture (optionnel)</label>
                <input type="file" name="photo" id="photo" accept="image/*" onChange={handlePhotoChange} className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 dark:file:bg-indigo-900/50 file:text-indigo-700 dark:file:text-indigo-300 hover:file:bg-indigo-100 dark:hover:file:bg-indigo-900"/>
                {event.photo && <img src={event.photo} alt="Aperçu facture" className="mt-2 rounded-md max-h-40"/>}
            </div>
            <div className="flex justify-end gap-3 pt-4">
                <button type="button" onClick={onCancel} className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600">Annuler</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700">Enregistrer</button>
            </div>
        </form>
    );
};


const GarageView = ({ vehicles, onSelectVehicle, onAddVehicleClick }: { vehicles: Vehicle[], onSelectVehicle: (id: string) => void, onAddVehicleClick: () => void }) => (
    <>
        <Header title="Mon Garage" />
        <main className="container mx-auto p-4">
            {vehicles.length === 0 ? (
                <div className="text-center py-20">
                    <CarIcon />
                    <h2 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Aucun véhicule pour le moment</h2>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Ajoutez votre premier véhicule pour commencer le suivi.</p>
                    <button onClick={onAddVehicleClick} className="mt-6 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500">
                        Ajouter un véhicule
                    </button>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {vehicles.map(v => (
                        <div key={v.id} onClick={() => onSelectVehicle(v.id)} className="bg-white dark:bg-gray-800 rounded-lg shadow p-5 cursor-pointer hover:shadow-lg transition-shadow duration-300 fade-in">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center">
                                    <div className="flex-shrink-0 bg-indigo-500 text-white rounded-full h-12 w-12 flex items-center justify-center">
                                        <CarIcon />
                                    </div>
                                    <div className="ml-4">
                                        <p className="text-lg font-bold text-gray-900 dark:text-white">{v.name}</p>
                                        <p className="text-sm text-gray-500 dark:text-gray-400">{v.km.toLocaleString('fr-FR')} km</p>
                                    </div>
                                </div>
                                {v.argusUrl && (
                                    <a
                                        href={v.argusUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        onClick={(e) => e.stopPropagation()}
                                        title="Voir la cote Argus"
                                        className="ml-4 flex-shrink-0 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                                    >
                                        Cote
                                    </a>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}
            <button onClick={onAddVehicleClick} title="Ajouter un véhicule" className="fixed bottom-6 right-6 bg-indigo-600 text-white rounded-full p-4 shadow-lg hover:bg-indigo-700 transition-transform hover:scale-110">
                <PlusIcon />
            </button>
        </main>
    </>
);

const MaintenanceStatus = ({ vehicle, vehicleEvents }: { vehicle: Vehicle, vehicleEvents: MaintenanceEvent[] }) => {
    const statuses = useMemo(() => {
        return calculateMaintenanceStatuses(vehicle, vehicleEvents);
    }, [vehicle, vehicleEvents]);

    const statusColors = {
        overdue: 'bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200',
        soon: 'bg-yellow-100 dark:bg-yellow-900/50 text-yellow-800 dark:text-yellow-200',
        ok: 'bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200',
        unknown: 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200',
    };

    return (
        <div className="space-y-3 p-4">
            {statuses.map(item => (
                <div key={item.type} className={`p-4 rounded-lg ${statusColors[item.status]} fade-in`}>
                    <p className="font-bold">{item.type}</p>
                    <p className="text-sm">{item.details}</p>
                </div>
            ))}
        </div>
    );
};

const History = ({ events, onInitiateDeleteEvent }: { events: MaintenanceEvent[], onInitiateDeleteEvent: (id: string) => void }) => (
    <div className="space-y-4 p-4">
        {events.length === 0 ? (
            <p className="text-center text-gray-500 dark:text-gray-400 py-8">Aucun évènement enregistré.</p>
        ) : (
            events.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map(event => (
                <div key={event.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 fade-in">
                    <div className="flex justify-between items-start">
                        <div>
                            <p className="font-bold">{event.type}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">{formatDate(new Date(event.date))} - {event.km.toLocaleString('fr-FR')} km</p>
                            {event.cost && <p className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{event.cost.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR'})}</p>}
                        </div>
                        <button onClick={() => onInitiateDeleteEvent(event.id)} className="text-red-500 hover:text-red-700 dark:hover:text-red-400 text-xs font-medium">Supprimer</button>
                    </div>
                    {event.notes && <p className="mt-2 text-sm bg-gray-50 dark:bg-gray-700/50 p-2 rounded-md">{event.notes}</p>}
                    {event.photo && <img src={event.photo} alt="Facture" className="mt-2 rounded-md max-h-60 cursor-pointer" onClick={() => window.open(event.photo, '_blank')}/>}
                </div>
            ))
        )}
    </div>
);


const VehicleDetailView = ({ vehicle, events, onAddEvent, onUpdateVehicle, onBack, onDeleteVehicle, onDeleteEvent, onGeneratePdf }: { 
    vehicle: Vehicle, events: MaintenanceEvent[], onAddEvent: (event: MaintenanceEvent) => void, onUpdateVehicle: (vehicle: Vehicle) => void, onBack: () => void,
    onDeleteVehicle: (id: string) => void, onDeleteEvent: (id: string) => void, onGeneratePdf: (vehicle: Vehicle, events: MaintenanceEvent[]) => void,
}) => {
    const [currentTab, setCurrentTab] = useState<'status' | 'history'>('status');
    const [isEventModalOpen, setEventModalOpen] = useState(false);
    const [isDeleteVehicleModalOpen, setDeleteVehicleModalOpen] = useState(false);
    const [eventToDeleteId, setEventToDeleteId] = useState<string | null>(null);

    const vehicleEvents = events.filter(e => e.vehicleId === vehicle.id);

    return (
        <>
            <Header title={vehicle.name} onBack={onBack} />
            <main className="container mx-auto">
                 <div className="p-4 bg-white dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between items-center">
                        <p className="text-lg font-semibold">{vehicle.km.toLocaleString('fr-FR')} km</p>
                        <div className="flex items-center gap-2">
                           {vehicle.argusUrl && (
                                <a href={vehicle.argusUrl} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700">
                                    Voir la cote
                                </a>
                            )}
                            <button onClick={() => onGeneratePdf(vehicle, vehicleEvents)} className="px-3 py-1.5 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700">Exporter PDF</button>
                        </div>
                    </div>
                </div>

                <div className="border-b border-gray-200 dark:border-gray-700">
                    <nav className="-mb-px flex justify-center gap-6" aria-label="Tabs">
                        <button onClick={() => setCurrentTab('status')} className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${currentTab === 'status' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'}`}>
                           <WrenchIcon/> Suivi
                        </button>
                        <button onClick={() => setCurrentTab('history')} className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center ${currentTab === 'history' ? 'border-indigo-500 text-indigo-600 dark:text-indigo-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-200'}`}>
                            <HistoryIcon/> Historique ({vehicleEvents.length})
                        </button>
                    </nav>
                </div>
                
                {currentTab === 'status' ? <MaintenanceStatus vehicle={vehicle} vehicleEvents={vehicleEvents} /> : <History events={vehicleEvents} onInitiateDeleteEvent={setEventToDeleteId} />}
                
                <div className="p-4 mt-auto">
                     <button onClick={() => setDeleteVehicleModalOpen(true)} className="w-full text-center text-sm text-red-500 dark:text-red-400 hover:underline">
                        Supprimer le véhicule
                    </button>
                </div>

            </main>
             <button onClick={() => setEventModalOpen(true)} title="Ajouter un évènement" className="fixed bottom-6 right-6 bg-indigo-600 text-white rounded-full p-4 shadow-lg hover:bg-indigo-700 transition-transform hover:scale-110">
                <PlusIcon />
            </button>
            {isEventModalOpen && (
                <Modal onClose={() => setEventModalOpen(false)}>
                    <h2 className="text-xl font-bold mb-4">Ajouter un évènement</h2>
                    <EventForm
                        vehicle={vehicle}
                        onSave={(event) => {
                            onAddEvent(event);
                            if(event.km > vehicle.km) {
                                onUpdateVehicle({...vehicle, km: event.km});
                            }
                            setEventModalOpen(false);
                        }}
                        onCancel={() => setEventModalOpen(false)}
                    />
                </Modal>
            )}
             {isDeleteVehicleModalOpen && (
                <ConfirmationModal
                    title="Supprimer le véhicule"
                    message="Êtes-vous sûr de vouloir supprimer ce véhicule et tout son historique ? Cette action est irréversible."
                    confirmText="Supprimer"
                    onConfirm={() => onDeleteVehicle(vehicle.id)}
                    onClose={() => setDeleteVehicleModalOpen(false)}
                />
            )}
            {eventToDeleteId && (
                <ConfirmationModal
                    title="Supprimer l'évènement"
                    message="Êtes-vous sûr de vouloir supprimer cet évènement d'entretien ?"
                    confirmText="Supprimer"
                    onConfirm={() => {
                        onDeleteEvent(eventToDeleteId);
                        setEventToDeleteId(null);
                    }}
                    onClose={() => setEventToDeleteId(null)}
                />
            )}
        </>
    );
};

// --- MAIN APP ---
const App = () => {
    const [vehicles, setVehicles] = useLocalStorage<Vehicle[]>('vehicles', []);
    const [events, setEvents] = useLocalStorage<MaintenanceEvent[]>('events', []);
    const [view, setView] = useState<'garage' | 'vehicleDetail'>('garage');
    const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>(null);
    const [isVehicleModalOpen, setVehicleModalOpen] = useState(false);

    useEffect(() => {
        const requestAndCheckNotifications = () => {
            if (!('Notification' in window)) {
                console.log("This browser does not support desktop notification");
                return;
            }

            const handlePermission = (permission: NotificationPermission) => {
                if (permission === 'granted') {
                    checkForDueMaintenance();
                }
            };

            const checkForDueMaintenance = () => {
                const now = Date.now();
                const NOTIFICATION_COOLDOWN = 24 * 60 * 60 * 1000; // 24 hours

                vehicles.forEach(vehicle => {
                    const vehicleEvents = events.filter(e => e.vehicleId === vehicle.id);
                    const statuses = calculateMaintenanceStatuses(vehicle, vehicleEvents);

                    (statuses || []).forEach(status => {
                        if (status.status === 'soon' || status.status === 'overdue') {
                            const notificationKey = `notified_${vehicle.id}_${status.type.replace(/\s/g, '_')}`;
                            const lastNotified = localStorage.getItem(notificationKey);

                            if (!lastNotified || (now - parseInt(lastNotified, 10)) > NOTIFICATION_COOLDOWN) {
                                const title = `Rappel d'entretien: ${vehicle.name}`;
                                const options = {
                                    body: `${status.type}: ${status.details}.`,
                                    icon: 'data:image/svg+xml,<svg xmlns=%22http://www.w3.org/2000/svg%22 viewBox=%220 0 100 100%22><text y=%22.9em%22 font-size=%2290%22>🔧</text></svg>'
                                };
                                new Notification(title, options);
                                localStorage.setItem(notificationKey, now.toString());
                            }
                        }
                    });
                });
            };
            
            if (Notification.permission === 'granted') {
                 checkForDueMaintenance();
            } else if (Notification.permission !== 'denied') {
                Notification.requestPermission().then(handlePermission);
            }
        };

        requestAndCheckNotifications();
    }, [vehicles, events]);

    const handleAddVehicleClick = () => {
        if (vehicles.length >= 1) { // Pro version check
            alert("Version gratuite limitée à 1 véhicule.\nPassez à la version Pro pour gérer des véhicules illimités !");
        } else {
            setVehicleModalOpen(true);
        }
    };
    
    const handleSaveVehicle = (vehicle: Vehicle) => {
        setVehicles(prev => {
            const existing = prev.find(v => v.id === vehicle.id);
            if (existing) {
                return prev.map(v => v.id === vehicle.id ? vehicle : v);
            }
            return [...prev, vehicle];
        });
        setVehicleModalOpen(false);
    };

    const handleDeleteVehicle = (id: string) => {
        setVehicles(prev => prev.filter(v => v.id !== id));
        setEvents(prev => prev.filter(e => e.vehicleId !== id));
        setView('garage');
    };
    
    const handleDeleteEvent = (id: string) => {
        setEvents(prev => prev.filter(e => e.id !== id));
    };

    const handleSelectVehicle = (id: string) => {
        setSelectedVehicleId(id);
        setView('vehicleDetail');
    };
    
    const handleGeneratePdf = (vehicle: Vehicle, vehicleEvents: MaintenanceEvent[]) => {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(22);
        doc.text(`Carnet d'Entretien`, 105, 20, { align: 'center' });
        
        doc.setFontSize(16);
        doc.text(vehicle.name, 105, 30, { align: 'center' });
        
        doc.setFontSize(10);
        doc.setTextColor(100);
        let yPos = 36;
        doc.text(`MEC: ${formatDate(new Date(vehicle.firstRegistrationDate))} - ${vehicle.fuel} - ${vehicle.km.toLocaleString('fr-FR')} km`, 105, yPos, { align: 'center' });
        yPos += 6;
        if(vehicle.plate) {
          doc.text(`Immatriculation: ${vehicle.plate}`, 105, yPos, { align: 'center' });
          yPos += 6;
        }
        if(vehicle.argusUrl) {
           doc.text(`Cote Argus: ${vehicle.argusUrl}`, 105, yPos, { align: 'center' });
           yPos += 6;
        }

        doc.setLineWidth(0.5);
        doc.line(20, yPos + 4, 190, yPos + 4);

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(14);
        doc.text("Historique des interventions", 20, yPos + 14);

        const sortedEvents = vehicleEvents.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        let y = yPos + 24;

        sortedEvents.forEach(event => {
            if (y > 270) {
                doc.addPage();
                y = 20;
            }
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text(event.type, 20, y);
            
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(10);
            doc.setTextColor(100);
            
            let details = `${formatDate(new Date(event.date))} à ${event.km.toLocaleString('fr-FR')} km`;
            if (event.cost) {
                details += ` - Coût: ${event.cost.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR'})}`;
            }
            doc.text(details, 20, y + 5);

            if (event.notes) {
                const notes = doc.splitTextToSize(`Notes: ${event.notes}`, 170);
                doc.text(notes, 20, y + 10);
                y += (notes.length * 4);
            }

            y += 20;
        });

        doc.save(`carnet_entretien_${vehicle.name.replace(/\s/g, '_')}.pdf`);
    };

    const selectedVehicle = vehicles.find(v => v.id === selectedVehicleId);

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-gray-100">
            {view === 'garage' && <GarageView vehicles={vehicles} onSelectVehicle={handleSelectVehicle} onAddVehicleClick={handleAddVehicleClick} />}
            {view === 'vehicleDetail' && selectedVehicle && (
                <VehicleDetailView 
                    vehicle={selectedVehicle} 
                    events={events}
                    onAddEvent={(event) => setEvents(prev => [...prev, event])}
                    onUpdateVehicle={handleSaveVehicle}
                    onBack={() => setView('garage')}
                    onDeleteVehicle={handleDeleteVehicle}
                    onDeleteEvent={handleDeleteEvent}
                    onGeneratePdf={handleGeneratePdf}
                />
            )}
            {isVehicleModalOpen && (
                <Modal onClose={() => setVehicleModalOpen(false)}>
                    <h2 className="text-xl font-bold mb-4">Ajouter un véhicule</h2>
                    <VehicleForm onSave={handleSaveVehicle} onCancel={() => setVehicleModalOpen(false)} />
                </Modal>
            )}
        </div>
    );
};

const container = document.getElementById('root');
if (container) {
    const root = createRoot(container);
    root.render(<React.StrictMode><App /></React.StrictMode>);
}