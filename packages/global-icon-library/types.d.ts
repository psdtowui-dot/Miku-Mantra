import * as React from 'react';

export type IconSizePreset = 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
export type IconSize = number | IconSizePreset;
export type IconHoverEffect = 'none' | 'scale' | 'lift' | 'glow' | 'spin';

export interface IconProps extends React.SVGProps<SVGSVGElement> {
  size?: IconSize;
  color?: string;
  strokeWidth?: number;
  className?: string;
  ariaLabel?: string;
  hoverEffect?: IconHoverEffect;
  disabled?: boolean;
  themeAuto?: boolean;
}

export interface UniversalIconProps extends IconProps {
  name: string;
  fallback?: React.ReactNode;
}

export declare const Icon: React.ForwardRefExoticComponent<UniversalIconProps & React.RefAttributes<HTMLElement>>;
export declare const IconBase: React.ForwardRefExoticComponent<IconProps & { as?: React.ComponentType<any> } & React.RefAttributes<HTMLElement>>;
export declare function normalizeIconSize(size?: IconSize): number;

export declare const iconRegistry: Record<string, React.ComponentType<IconProps>>;
export declare function getIconComponent(name: string): React.ComponentType<IconProps> | null;
export declare function getAvailableIconNames(): string[];
export declare function getIconsByCategory(): Record<string, Array<{ name: string; component: React.ComponentType<IconProps> }>>;
export declare function registerIcon(name: string, component: React.ComponentType<IconProps>): void;

// Custom Icons
export declare const GoogleIcon: React.FC<IconProps>;
export declare const VerifiedBadgeIcon: React.FC<IconProps>;
export declare const BarcodeIcon: React.FC<IconProps>;
export declare const IndianRupeeIcon: React.FC<IconProps>;
