// modules/ui/icons/index.js
// Centralized Icon re-export supporting both internal modules and the Global Icon Library

export * from './IconBase.jsx';
export * from './custom-svgs.jsx';
export * from './ecommerce.jsx';
export * from './navigation.jsx';
export * from './feedback.jsx';
export * from './admin.jsx';
export * from './social.jsx';

// Re-export Universal Icon, Registry & categorized icons from Global Icon Library
export { Icon } from '../../../packages/global-icon-library/components/Icon.jsx';
export {
  iconRegistry,
  getIconComponent,
  getAvailableIconNames,
  getIconsByCategory,
  registerIcon
} from '../../../packages/global-icon-library/registry/iconRegistry.js';

import * as CustomIcons from './custom-svgs.jsx';
import * as EcommerceIcons from './ecommerce.jsx';
import * as NavigationIcons from './navigation.jsx';
import * as FeedbackIcons from './feedback.jsx';
import * as AdminIcons from './admin.jsx';
import * as SocialIcons from './social.jsx';

export {
  CustomIcons,
  EcommerceIcons,
  NavigationIcons,
  FeedbackIcons,
  AdminIcons,
  SocialIcons,
};
