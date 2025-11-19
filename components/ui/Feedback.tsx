
import React from 'react';

export const Skeleton: React.FC<{ className?: string }> = ({ className }) => (
    <div className={`animate-pulse bg-surface-3 rounded-xl ${className}`}></div>
);

export const SkeletonCard: React.FC = () => (
    <div className="p-4 rounded-3xl bg-surface-1 border border-surface-2 shadow-sm h-32 flex flex-col justify-between">
        <div className="flex justify-between">
            <Skeleton className="h-6 w-24" />
            <Skeleton className="h-6 w-6 rounded-full" />
        </div>
        <Skeleton className="h-4 w-3/4 mt-2" />
        <div className="flex gap-2 mt-auto">
            <Skeleton className="h-6 w-16 rounded-lg" />
            <Skeleton className="h-6 w-20 rounded-lg" />
        </div>
    </div>
);

export const EmptyState: React.FC<{ 
    icon: string; 
    title: string; 
    description: string; 
    actionLabel?: string; 
    onAction?: () => void; 
}> = ({ icon, title, description, actionLabel, onAction }) => (
    <div className="flex flex-col items-center justify-center text-center p-8 py-12 bg-surface-1 rounded-3xl border-2 border-dashed border-surface-3 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-surface-2 flex items-center justify-center mb-4">
            <span className="material-symbols-rounded text-5xl text-text-color-secondary opacity-50">{icon}</span>
        </div>
        <h3 className="text-xl font-serif font-bold text-text-color mb-2">{title}</h3>
        <p className="text-text-color-secondary max-w-xs mb-6">{description}</p>
        {actionLabel && onAction && (
            <button 
                onClick={onAction}
                className="px-6 py-2.5 bg-primary text-on-primary rounded-full font-bold hover:opacity-90 transition-opacity shadow-m3-sm active:scale-95 transition-transform"
            >
                {actionLabel}
            </button>
        )}
    </div>
);
