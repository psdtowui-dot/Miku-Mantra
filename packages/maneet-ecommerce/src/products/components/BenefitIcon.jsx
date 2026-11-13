'use client';
import React from 'react';
import {
  ShieldCheck,
  Award,
  Truck,
  RefreshCw,
  Sparkles,
  Heart,
  Gem,
  Gift,
  BadgeCheck,
  CheckCircle2,
  Lock,
  Scale,
  Scissors,
  Clock,
  Zap,
  Hammer,
  Flame,
  Eye,
  Star,
  Check,
  Crown,
  PackageCheck,
  RotateCcw,
  Shield,
} from 'lucide-react';

export const BENEFIT_ICON_MAP = {
  ShieldCheck,
  Award,
  Truck,
  RefreshCw,
  Sparkles,
  Heart,
  Gem,
  Gift,
  BadgeCheck,
  CheckCircle2,
  Lock,
  Scale,
  Scissors,
  Clock,
  Zap,
  Hammer,
  Flame,
  Eye,
  Star,
  Check,
  Crown,
  PackageCheck,
  RotateCcw,
  Shield,
};

export const PRESET_BENEFIT_ICONS = [
  { id: 'ShieldCheck', name: 'Shield / Hallmark', icon: ShieldCheck },
  { id: 'Award', name: 'Award / Certificate', icon: Award },
  { id: 'Truck', name: 'Truck / Delivery', icon: Truck },
  { id: 'RefreshCw', name: 'Refresh / Returns', icon: RefreshCw },
  { id: 'Sparkles', name: 'Sparkles / Cleaning', icon: Sparkles },
  { id: 'Heart', name: 'Heart / Buyback', icon: Heart },
  { id: 'Gem', name: 'Gem / Solitaire', icon: Gem },
  { id: 'Gift', name: 'Gift / Packaging', icon: Gift },
  { id: 'BadgeCheck', name: 'Badge / Verified', icon: BadgeCheck },
  { id: 'CheckCircle2', name: 'Checkmark', icon: CheckCircle2 },
  { id: 'Crown', name: 'Crown / Luxury', icon: Crown },
  { id: 'Lock', name: 'Lock / Insured', icon: Lock },
  { id: 'Scale', name: 'Scale / Weight', icon: Scale },
  { id: 'Scissors', name: 'Scissors / Customization', icon: Scissors },
  { id: 'Clock', name: 'Clock / Express', icon: Clock },
  { id: 'Zap', name: 'Zap / Fast', icon: Zap },
  { id: 'Hammer', name: 'Hammer / Handcrafted', icon: Hammer },
  { id: 'PackageCheck', name: 'Package / Tamper-proof', icon: PackageCheck },
];

/**
 * Basic SVG Sanitizer to strip scripts, event handlers, and dangerous tags
 */
function sanitizeSvg(rawSvg) {
  if (!rawSvg || typeof rawSvg !== 'string') return '';
  
  // Strip dangerous tags like <script>, <object>, <embed>, <iframe>, <foreignObject>, <animate>, <set>, <link>, <meta>
  let clean = rawSvg
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<foreignObject\b[^<]*(?:(?!<\/foreignObject>)<[^<]*)*<\/foreignObject>/gi, '')
    .replace(/<animate\b[^<]*(?:(?!<\/animate>)<[^<]*)*<\/animate>/gi, '')
    .replace(/<set\b[^<]*(?:(?!<\/set>)<[^<]*)*<\/set>/gi, '')
    .replace(/<link\b[^>]*>/gi, '')
    .replace(/<meta\b[^>]*>/gi, '');

  // Strip all on* event attributes (onload, onerror, onclick, onmouseover, onbegin, etc.)
  clean = clean.replace(/\s+on[a-z0-9_-]+\s*=\s*(['"]).*?\1/gi, '');
  clean = clean.replace(/\s+on[a-z0-9_-]+\s*=\s*[^\s>]+/gi, '');

  // Strip javascript:, data: (except safe image data URIs), and vbscript: URIs in attributes
  clean = clean.replace(/href\s*=\s*(['"])\s*(javascript|vbscript):.*?\1/gi, 'href="#"');
  clean = clean.replace(/xlink:href\s*=\s*(['"])\s*(javascript|vbscript):.*?\1/gi, 'xlink:href="#"');

  return clean;
}

export default function BenefitIcon({ icon, size = 16, className = '', alt = 'Benefit icon' }) {
  const iconStr = (icon || '').trim();

  // 1. Check if it's a known Lucide component name
  if (BENEFIT_ICON_MAP[iconStr]) {
    const IconComponent = BENEFIT_ICON_MAP[iconStr];
    return <IconComponent size={size} className={className} />;
  }

  // 2. Check if it's an inline SVG string
  if (iconStr.startsWith('<svg') || iconStr.includes('</svg>')) {
    const sanitized = sanitizeSvg(iconStr);
    return (
      <span
        className={`inline-flex items-center justify-center [&>svg]:w-full [&>svg]:h-full ${className}`}
        style={{ width: size, height: size }}
        dangerouslySetInnerHTML={{ __html: sanitized }}
      />
    );
  }

  // 3. Check if it's an image/SVG URL or file path (e.g. /api/uploads/..., https://..., /uploads/...)
  if (
    iconStr.startsWith('/') ||
    iconStr.startsWith('http://') ||
    iconStr.startsWith('https://') ||
    iconStr.startsWith('data:image/')
  ) {
    return (
      <img
        src={iconStr}
        alt={alt}
        className={`object-contain ${className}`}
        style={{ width: size, height: size }}
        loading="lazy"
        onError={(e) => {
          // If image fails, fallback
          e.currentTarget.style.display = 'none';
        }}
      />
    );
  }

  // 4. Fallback to Sparkles
  return <Sparkles size={size} className={className} />;
}
