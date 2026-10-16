import React from 'react';
import { useLanguage } from '../context/LanguageContext';

export function SectionHeader({ label, title, action, className = '' }) {
  const { t } = useLanguage();
  return (
    <div className={`flex flex-col gap-3 border-t border-foreground/15 pt-5 sm:flex-row sm:items-center sm:justify-between ${className}`}>
      <div>
        {label && (
          <p className="caption text-foreground/50 tracking-wider text-xs font-semibold">
            {typeof label === 'string' ? t(label) : label}
          </p>
        )}
        <h2 className="font-heading text-lg sm:text-xl font-bold text-foreground">
          {typeof title === 'string' ? t(title) : title}
        </h2>
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
