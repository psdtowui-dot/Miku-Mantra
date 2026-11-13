import * as React from 'react';

export declare const OrderDetailModal: React.FC<any>;
export declare const ShipmentModal: React.FC<any>;
export declare const ShippingSlip: React.FC<any>;
export declare function generateTrackingUrl(carrier: string, trackingNumber: string): string;

export declare const ProductCard: React.FC<any>;
export declare const ProductImageZoom: React.FC<any>;
export declare const BenefitsBuilder: React.FC<any>;
export declare const SpecificationsBuilder: React.FC<any>;
export declare const BenefitIcon: React.FC<any>;
export declare function useCompare(): any;
export declare function useRecentlyViewed(): any;

export declare const AuthModal: React.FC<any>;
export declare function useAuth(): any;

export declare function useCart(): any;
export declare function useWishlist(): any;

export declare function calculateCartPricing(items: any[], couponCode?: string, pincode?: string, db?: any): Promise<any>;
export declare function validateCouponRules(coupon: any, subtotal: number): any;

export declare const ProductJsonImporter: React.FC<any>;
export declare const AdminCrudPage: React.FC<any>;
