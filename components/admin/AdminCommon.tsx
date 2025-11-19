
import React from 'react';
import { Modal } from '../../App';

export interface EditorRef {
  submitForm: () => Promise<boolean>;
  isDirty: () => boolean;
}

export const ConfirmationModal: React.FC<{ title: string; message: React.ReactNode; onConfirm: () => void; onClose: () => void; confirmText?: string; }> = ({ title, message, onConfirm, onClose, confirmText = "Conferma" }) => (
    <Modal title={title} onClose={onClose}>
        <div>{message}</div>
        <div className="flex justify-end gap-4 mt-6">
            <button onClick={onClose} className="px-6 py-2 rounded-full bg-surface-3 text-text-color hover:bg-outline/30 transition">Annulla</button>
            <button onClick={() => { onConfirm(); onClose(); }} className="px-6 py-2 rounded-full bg-accent-red text-white hover:opacity-90 transition">{confirmText}</button>
        </div>
    </Modal>
);

export const EditorPlaceholder: React.FC<{ message: string; icon: string }> = ({ message, icon }) => (
    <div className="hidden lg:flex h-full min-h-[60vh] items-center justify-center bg-surface-1 rounded-2xl border-2 border-dashed border-surface-3">
        <div className="text-center text-text-color-secondary p-4">
            <span className="material-symbols-rounded text-6xl opacity-20 mb-4">{icon}</span>
            <p className="font-semibold opacity-60">{message}</p>
        </div>
    </div>
);

export const FormInput: React.FC<React.InputHTMLAttributes<HTMLInputElement> & { label: string }> = ({ label, ...props }) => (
    <div>
        <label className="block text-xs font-bold text-text-color-secondary uppercase tracking-wider mb-1 ml-1">{label}</label>
        <input {...props} className="w-full p-3 bg-surface-2 border border-surface-3 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition font-medium" />
    </div>
);
export const FormTextarea: React.FC<React.TextareaHTMLAttributes<HTMLTextAreaElement> & { label: string }> = ({ label, ...props }) => (
    <div>
         <label className="block text-xs font-bold text-text-color-secondary uppercase tracking-wider mb-1 ml-1">{label}</label>
        <textarea {...props} className="w-full p-3 bg-surface-2 border border-surface-3 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition font-medium min-h-[100px]" />
    </div>
);
export const FormSelect: React.FC<React.SelectHTMLAttributes<HTMLSelectElement> & { label: string, children: React.ReactNode }> = ({ label, children, ...props }) => (
    <div>
         <label className="block text-xs font-bold text-text-color-secondary uppercase tracking-wider mb-1 ml-1">{label}</label>
        <select {...props} className="w-full p-3 bg-surface-2 border border-surface-3 rounded-xl focus:ring-2 focus:ring-primary focus:outline-none transition font-medium">{children}</select>
    </div>
);
