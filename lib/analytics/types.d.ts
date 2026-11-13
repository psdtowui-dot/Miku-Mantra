/**
 * Google Analytics 4 (GA4) & Google Tag Manager (GTM) TypeScript Definitions
 * Standardized for MikuMantra Fine Jewellery E-commerce
 */

export interface GA4Item {
  item_id: string;
  item_name: string;
  affiliation?: string;
  coupon?: string;
  currency?: string;
  discount?: number;
  index?: number;
  item_brand?: string;
  item_category?: string;
  item_category2?: string;
  item_category3?: string;
  item_category4?: string;
  item_category5?: string;
  item_list_id?: string;
  item_list_name?: string;
  item_variant?: string;
  location_id?: string;
  price?: number;
  quantity?: number;
}

export interface GA4EcommercePayload {
  currency?: 'INR' | string;
  value?: number;
  coupon?: string;
  shipping?: number;
  tax?: number;
  transaction_id?: string;
  item_list_id?: string;
  item_list_name?: string;
  payment_type?: string;
  shipping_tier?: string;
  search_term?: string;
  items?: GA4Item[];
  [key: string]: any;
}

export type ConsentStatus = 'granted' | 'denied';

export interface ConsentPreferences {
  necessary: boolean;
  analytics: boolean;
  marketing: boolean;
  timestamp?: number;
  version?: string;
}

export interface GoogleConsentModeV2State {
  ad_storage: ConsentStatus;
  ad_user_data: ConsentStatus;
  ad_personalization: ConsentStatus;
  analytics_storage: ConsentStatus;
  personalization_storage?: ConsentStatus;
  functionality_storage?: ConsentStatus;
  security_storage?: ConsentStatus;
}

export type GA4EventName =
  | 'page_view'
  | 'view_item'
  | 'view_item_list'
  | 'select_item'
  | 'add_to_cart'
  | 'remove_from_cart'
  | 'view_cart'
  | 'add_to_wishlist'
  | 'begin_checkout'
  | 'add_shipping_info'
  | 'add_payment_info'
  | 'purchase'
  | 'refund'
  | 'search';

export interface DataLayerEvent {
  event: GA4EventName | string;
  ecommerce?: GA4EcommercePayload | null;
  [key: string]: any;
}
