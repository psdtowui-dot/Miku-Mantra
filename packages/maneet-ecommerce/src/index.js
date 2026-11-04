export * from './auth/index.js';
export * from './products/index.js';
export * from './cart/index.js';
export * from './wishlist/index.js';
export * from './orders/index.js';
export * from './checkout/index.js';
export * from './admin/index.js';

import * as AuthModule from './auth/index.js';
import * as ProductsModule from './products/index.js';
import * as CartModule from './cart/index.js';
import * as WishlistModule from './wishlist/index.js';
import * as OrdersModule from './orders/index.js';
import * as CheckoutModule from './checkout/index.js';
import * as AdminModule from './admin/index.js';

export {
  AuthModule,
  ProductsModule,
  CartModule,
  WishlistModule,
  OrdersModule,
  CheckoutModule,
  AdminModule,
};
