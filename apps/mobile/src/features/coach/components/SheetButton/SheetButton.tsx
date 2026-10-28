import type { ButtonHTMLAttributes, ReactNode } from 'react';
import './SheetButton.css';

interface SheetButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary = ink, soft = the grey tile, danger = Cherry (ending something the trainee feels). */
  variant?: 'primary' | 'soft' | 'danger';
  icon?: ReactNode;
  children: ReactNode;
}

/** The sheets' wide pill buttons, two to a row inside SheetButtonRow ("ביטול" / "שליחה"). */
export function SheetButton({ variant = 'soft', icon, className, children, type = 'button', ...rest }: SheetButtonProps) {
  return (
    <button type={type} className={`ch-sheet-button ch-sheet-button-${variant}` + (className ? ` ${className}` : '')} {...rest}>
      {icon}
      {children}
    </button>
  );
}

export function SheetButtonRow({ children }: { children: ReactNode }) {
  return <div className="ch-sheet-buttons">{children}</div>;
}
