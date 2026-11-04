# @maneet/ecommerce

Reusable e-commerce domain modules, hooks, pricing engines, order management dialogues, and admin abstractions extracted from the MikuMantra Luxury platform.

## Modules

- `@maneet/ecommerce/orders`: `OrderDetailModal`, `ShipmentModal`, `ShippingSlip`, and carrier tracking generators.
- `@maneet/ecommerce/products`: `ProductCard`, `ProductImageZoom`, `BenefitsBuilder`, `SpecificationsBuilder`, `useCompare`, and `useRecentlyViewed`.
- `@maneet/ecommerce/auth`: `AuthModal`, `useAuth`, and authentication token services.
- `@maneet/ecommerce/cart`: `useCart` hook and pure mathematical pricing calculation engine.
- `@maneet/ecommerce/wishlist`: `useWishlist` persistent state hook.
- `@maneet/ecommerce/checkout`: Razorpay payment verification and gateway order creators.
- `@maneet/ecommerce/admin`: `ProductJsonImporter`, `AdminCrudPage`, and RBAC role permission guards.

## Installation (Internal Workspace)

```json
{
  "dependencies": {
    "@maneet/ui": "workspace:*",
    "@maneet/ecommerce": "workspace:*"
  }
}
```
