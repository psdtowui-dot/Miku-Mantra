import * as React from 'react';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | 'sm' | 'md' | 'lg' | 'xl';
  color?: string;
  strokeWidth?: number;
  className?: string;
  ariaLabel?: string;
}

export declare const IconBase: React.ForwardRefExoticComponent<IconProps & { as?: any }>;
export declare const GoogleIcon: React.ForwardRefExoticComponent<IconProps>;
export declare const VerifiedBadgeIcon: React.ForwardRefExoticComponent<IconProps>;
export declare const BarcodeIcon: React.ForwardRefExoticComponent<IconProps>;

export declare const colors: {
  luxe: {
    primary: string;
    primaryHover: string;
    gold: string;
    accent: string;
    dark: string;
    surface: string;
    border: string;
    text: string;
  }
};

export declare function createTheme(overrides?: any): any;
export declare const defaultTheme: any;

export declare const fadeIn: any;
export declare const slideUp: any;
export declare const scaleUp: any;
export declare function staggerContainer(stagger?: number, delay?: number): any;
export declare function usePrefersReducedMotion(): boolean;

export declare const Spinner: React.FC<{ size?: string | number; variant?: string; label?: string; center?: boolean; className?: string }>;
export declare const ModalBackdrop: React.FC<{ isOpen: boolean; onClose?: () => void; children: React.ReactNode; zIndex?: number; className?: string }>;
export declare const StatusBadge: React.FC<{ status: string; label?: string; size?: string; className?: string }>;
export declare const notify: {
  success: (msg: string, opt?: any) => string;
  error: (msg: string, opt?: any) => string;
  info: (msg: string, opt?: any) => string;
  warning: (msg: string, opt?: any) => string;
};
