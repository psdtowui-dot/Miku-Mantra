# @maneet/icons — Global Icon Library

A centralized, reusable, tree-shakable icon system extracted from MikuMantra. Built for Next.js, React, and future e-commerce projects.

## Features

- **145+ Categorized Icons**: Navigation, E-Commerce, Payment, Account, Admin, Social, Status, Actions, Custom SVGs.
- **Universal `<Icon />` API**: Use named icons or import individual tree-shakable components.
- **Smart Registry**: Case-insensitive lookup, kebab-case, PascalCase, and developer aliases (`cart`, `spinner`, `close`, `rupee`, `google`).
- **Interactive Animations**: Micro-interactions for `hoverEffect="scale" | "lift" | "glow" | "spin"`.
- **Accessibility Ready**: Automatically assigns `role="img"` with `aria-label` or `aria-hidden="true"`.
- **Theme-aware**: Automatic dark/light theme adaptation with `themeAuto={true}`.

## Installation (Local Workspace)

In `package.json`:
```json
{
  "dependencies": {
    "@maneet/icons": "file:./packages/global-icon-library"
  }
}
```

## Quickstart

### 1. Universal Named Icon Component
```jsx
import { Icon } from '@maneet/icons';

export default function MyNavbar() {
  return (
    <nav className="flex items-center gap-4">
      {/* Basic usage */}
      <Icon name="shopping-bag" size={24} />
      
      {/* Custom color & hover effect */}
      <Icon name="heart" size={20} color="#D4AF37" hoverEffect="scale" />
      
      {/* With custom classes and accessibility label */}
      <Icon name="user" size="lg" className="text-gray-700" ariaLabel="Customer Profile" />
    </nav>
  );
}
```

### 2. Direct Tree-shakable Component Import
```jsx
import { ShoppingBagIcon, HeartIcon, IndianRupeeIcon } from '@maneet/icons';

export function PriceBadge({ price }) {
  return (
    <div className="flex items-center text-gold-600 font-bold">
      <IndianRupeeIcon size={18} strokeWidth={2.5} />
      <span>{price}</span>
    </div>
  );
}
```

## Props Reference

| Prop | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `name` | `string` | required | Icon registry key (e.g. `"shopping-bag"`, `"cart"`, `"heart"`) |
| `size` | `number \| "xs" \| "sm" \| "md" \| "lg" \| "xl" \| "2xl" \| "3xl"` | `20` | Icon dimensions |
| `color` | `string` | `"currentColor"` | Stroke or fill color |
| `strokeWidth` | `number` | `2` | SVG stroke thickness |
| `hoverEffect` | `"none" \| "scale" \| "lift" \| "glow" \| "spin"` | `"none"` | CSS micro-interaction preset |
| `ariaLabel` | `string` | `undefined` | Accessible screen-reader label |
| `disabled` | `boolean` | `false` | Reduces opacity and disables pointer events |
| `themeAuto` | `boolean` | `false` | Auto-adjusts icon color in dark mode |
| `className` | `string` | `""` | Additional Tailwind or CSS classes |

## Adding New Icons

Register custom SVGs dynamically:
```javascript
import { registerIcon } from '@maneet/icons';

registerIcon('brand-logo', CustomLogoComponent);
```
