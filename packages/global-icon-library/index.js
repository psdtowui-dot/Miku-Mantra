'use client';

// Styles
import './styles/icon.css';

// Primitives
export { Icon } from './components/Icon.jsx';
export { IconBase, normalizeIconSize } from './components/IconBase.jsx';

// Registry
export {
  iconRegistry,
  getIconComponent,
  getAvailableIconNames,
  getIconsByCategory,
  registerIcon
} from './registry/iconRegistry.js';

// Categorized Icon components (Direct tree-shakable exports)
export * from './icons/navigation/index.jsx';
export * from './icons/ecommerce/index.jsx';
export * from './icons/payment/index.jsx';
export * from './icons/account/index.jsx';
export * from './icons/admin/index.jsx';
export * from './icons/social/index.jsx';
export * from './icons/status/index.jsx';
export * from './icons/actions/index.jsx';
export * from './icons/custom/index.jsx';

// Namespaces
export * as NavigationIcons from './icons/navigation/index.jsx';
export * as EcommerceIcons from './icons/ecommerce/index.jsx';
export * as PaymentIcons from './icons/payment/index.jsx';
export * as AccountIcons from './icons/account/index.jsx';
export * as AdminIcons from './icons/admin/index.jsx';
export * as SocialIcons from './icons/social/index.jsx';
export * as StatusIcons from './icons/status/index.jsx';
export * as ActionIcons from './icons/actions/index.jsx';
export * as CustomIcons from './icons/custom/index.jsx';
