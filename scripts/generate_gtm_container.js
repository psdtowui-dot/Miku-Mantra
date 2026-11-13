/**
 * Generates an official, schema-compliant GTM Container Export JSON for GTM-5KLNQX63
 */

import fs from 'fs';
import path from 'path';

const GTM_CONTAINER_ID = 'GTM-5KLNQX63';
const GA4_MEASUREMENT_ID = 'G-ELMXNPCR2G';

let varIdCounter = 1;
let triggerIdCounter = 1;
let tagIdCounter = 1;
let fingerprintCounter = 1710000000000;

function nextFingerprint() {
  return String(fingerprintCounter++);
}

const variables = [];
const triggers = [];
const tags = [];

// Helper to add variables
function addConstant(name, value) {
  const id = String(varIdCounter++);
  variables.push({
    accountId: '0',
    containerId: '0',
    variableId: id,
    name,
    type: 'c',
    parameter: [{ type: 'TEMPLATE', key: 'value', value: String(value) }],
    fingerprint: nextFingerprint(),
  });
  return id;
}

function addDLV(name, dlvPath, defaultValue) {
  const id = String(varIdCounter++);
  const params = [
    { type: 'INTEGER', key: 'dataLayerVersion', value: '2' },
    { type: 'TEMPLATE', key: 'name', value: dlvPath },
  ];
  if (defaultValue !== undefined) {
    params.push({ type: 'BOOLEAN', key: 'setDefaultValue', value: 'true' });
    params.push({ type: 'TEMPLATE', key: 'defaultValue', value: String(defaultValue) });
  } else {
    params.push({ type: 'BOOLEAN', key: 'setDefaultValue', value: 'false' });
  }
  variables.push({
    accountId: '0',
    containerId: '0',
    variableId: id,
    name,
    type: 'v',
    parameter: params,
    fingerprint: nextFingerprint(),
  });
  return id;
}

// 1. Variables
addConstant('Const - GA4 Measurement ID', GA4_MEASUREMENT_ID);
addConstant('Const - Currency', 'INR');
addConstant('Const - Brand Name', 'MikuMantra Fine Jewellery');

addDLV('DLV - ecommerce', 'ecommerce');
addDLV('DLV - ecommerce.value', 'ecommerce.value', '0');
addDLV('DLV - ecommerce.currency', 'ecommerce.currency', 'INR');
addDLV('DLV - ecommerce.transaction_id', 'ecommerce.transaction_id');
addDLV('DLV - ecommerce.tax', 'ecommerce.tax', '0');
addDLV('DLV - ecommerce.shipping', 'ecommerce.shipping', '0');
addDLV('DLV - ecommerce.coupon', 'ecommerce.coupon');
addDLV('DLV - page_location', 'page_location');
addDLV('DLV - page_path', 'page_path');
addDLV('DLV - page_title', 'page_title');
addDLV('DLV - search_term', 'search_term');
addDLV('DLV - method', 'method');
addDLV('DLV - lead_type', 'lead_type', 'Newsletter');
addDLV('DLV - percent_scrolled', 'percent_scrolled', '90');
addDLV('DLV - link_url', 'link_url');
addDLV('DLV - link_text', 'link_text');
addDLV('DLV - outbound', 'outbound');

// Helper to add Custom Event triggers
function addCustomEventTrigger(name, eventName) {
  const id = String(triggerIdCounter++);
  triggers.push({
    accountId: '0',
    containerId: '0',
    triggerId: id,
    name,
    type: 'CUSTOM_EVENT',
    customEventFilter: [
      {
        type: 'EQUALS',
        parameter: [
          { type: 'TEMPLATE', key: 'arg0', value: '{{_event}}' },
          { type: 'TEMPLATE', key: 'arg1', value: eventName },
        ],
      },
    ],
    fingerprint: nextFingerprint(),
  });
  return id;
}

// 2. Triggers
// All Pages standard trigger (Trigger ID 1)
const triggerAllPagesId = String(triggerIdCounter++);
triggers.push({
  accountId: '0',
  containerId: '0',
  triggerId: triggerAllPagesId,
  name: 'All Pages',
  type: 'PAGEVIEW',
  fingerprint: nextFingerprint(),
});

const triggerPageView = addCustomEventTrigger('CE - page_view', 'page_view');
const triggerViewItemList = addCustomEventTrigger('CE - view_item_list', 'view_item_list');
const triggerSelectItem = addCustomEventTrigger('CE - select_item', 'select_item');
const triggerViewItem = addCustomEventTrigger('CE - view_item', 'view_item');
const triggerAddToCart = addCustomEventTrigger('CE - add_to_cart', 'add_to_cart');
const triggerRemoveFromCart = addCustomEventTrigger('CE - remove_from_cart', 'remove_from_cart');
const triggerViewCart = addCustomEventTrigger('CE - view_cart', 'view_cart');
const triggerBeginCheckout = addCustomEventTrigger('CE - begin_checkout', 'begin_checkout');
const triggerAddShippingInfo = addCustomEventTrigger('CE - add_shipping_info', 'add_shipping_info');
const triggerAddPaymentInfo = addCustomEventTrigger('CE - add_payment_info', 'add_payment_info');
const triggerPurchase = addCustomEventTrigger('CE - purchase', 'purchase');
const triggerRefund = addCustomEventTrigger('CE - refund', 'refund');
const triggerSearch = addCustomEventTrigger('CE - search', 'search');
const triggerSignUp = addCustomEventTrigger('CE - sign_up', 'sign_up');
const triggerLogin = addCustomEventTrigger('CE - login', 'login');
const triggerGenerateLead = addCustomEventTrigger('CE - generate_lead', 'generate_lead');
const triggerScroll = addCustomEventTrigger('CE - scroll', 'scroll');
const triggerClick = addCustomEventTrigger('CE - click', 'click');

// 3. Tags
// Tag 1: Conversion Linker
tags.push({
  accountId: '0',
  containerId: '0',
  tagId: String(tagIdCounter++),
  name: 'GAds - Conversion Linker',
  type: 'gclidw',
  firingTriggerId: [triggerAllPagesId],
  tagFiringOption: 'ONCE_PER_EVENT',
  consentSettings: { consentStatus: 'NOT_SET' },
  parameter: [
    { type: 'BOOLEAN', key: 'enableCrossDomain', value: 'false' },
    { type: 'BOOLEAN', key: 'enableUrlPassthrough', value: 'false' },
  ],
  fingerprint: nextFingerprint(),
});

// Tag 2: Google Tag (GA4 Config)
tags.push({
  accountId: '0',
  containerId: '0',
  tagId: String(tagIdCounter++),
  name: 'GA4 - Google Tag (Config)',
  type: 'googtag',
  firingTriggerId: [triggerAllPagesId],
  tagFiringOption: 'ONCE_PER_EVENT',
  consentSettings: { consentStatus: 'NOT_SET' },
  parameter: [
    { type: 'TEMPLATE', key: 'tagId', value: '{{Const - GA4 Measurement ID}}' },
    {
      type: 'LIST',
      key: 'configSettingsTable',
      list: [
        {
          type: 'MAP',
          map: [
            { type: 'TEMPLATE', key: 'parameter', value: 'send_page_view' },
            { type: 'TEMPLATE', key: 'parameterValue', value: 'false' },
          ],
        },
      ],
    },
  ],
  fingerprint: nextFingerprint(),
});

function addGa4EventTag(name, eventName, triggerId, extraParams = [], isEcommerce = false) {
  const params = [
    { type: 'TEMPLATE', key: 'measurementIdOverride', value: '{{Const - GA4 Measurement ID}}' },
    { type: 'TEMPLATE', key: 'eventName', value: eventName },
  ];

  if (isEcommerce) {
    params.push({ type: 'BOOLEAN', key: 'sendEcommerceData', value: 'true' });
    params.push({ type: 'TEMPLATE', key: 'getEcommerceDataFrom', value: 'dataLayer' });
  }

  if (extraParams.length > 0) {
    params.push({
      type: 'LIST',
      key: 'eventParameters',
      list: extraParams.map(([k, v]) => ({
        type: 'MAP',
        map: [
          { type: 'TEMPLATE', key: 'name', value: k },
          { type: 'TEMPLATE', key: 'value', value: v },
        ],
      })),
    });
  }

  tags.push({
    accountId: '0',
    containerId: '0',
    tagId: String(tagIdCounter++),
    name,
    type: 'gaawe',
    firingTriggerId: [triggerId],
    tagFiringOption: 'ONCE_PER_EVENT',
    consentSettings: { consentStatus: 'NOT_SET' },
    parameter: params,
    fingerprint: nextFingerprint(),
  });
}

// GA4 Events
addGa4EventTag('GA4 - Event - Page View', 'page_view', triggerPageView, [
  ['page_location', '{{DLV - page_location}}'],
  ['page_path', '{{DLV - page_path}}'],
  ['page_title', '{{DLV - page_title}}'],
]);

addGa4EventTag('GA4 - Event - View Item List', 'view_item_list', triggerViewItemList, [], true);
addGa4EventTag('GA4 - Event - Select Item', 'select_item', triggerSelectItem, [], true);
addGa4EventTag('GA4 - Event - View Item', 'view_item', triggerViewItem, [], true);
addGa4EventTag('GA4 - Event - Add To Cart', 'add_to_cart', triggerAddToCart, [], true);
addGa4EventTag('GA4 - Event - Remove From Cart', 'remove_from_cart', triggerRemoveFromCart, [], true);
addGa4EventTag('GA4 - Event - View Cart', 'view_cart', triggerViewCart, [], true);
addGa4EventTag('GA4 - Event - Begin Checkout', 'begin_checkout', triggerBeginCheckout, [], true);
addGa4EventTag('GA4 - Event - Add Shipping Info', 'add_shipping_info', triggerAddShippingInfo, [], true);
addGa4EventTag('GA4 - Event - Add Payment Info', 'add_payment_info', triggerAddPaymentInfo, [], true);
addGa4EventTag('GA4 - Event - Purchase', 'purchase', triggerPurchase, [], true);
addGa4EventTag('GA4 - Event - Refund', 'refund', triggerRefund, [], true);

addGa4EventTag('GA4 - Event - Search', 'search', triggerSearch, [
  ['search_term', '{{DLV - search_term}}'],
]);

addGa4EventTag('GA4 - Event - Login', 'login', triggerLogin, [
  ['method', '{{DLV - method}}'],
]);

addGa4EventTag('GA4 - Event - Sign Up', 'sign_up', triggerSignUp, [
  ['method', '{{DLV - method}}'],
]);

addGa4EventTag('GA4 - Event - Generate Lead', 'generate_lead', triggerGenerateLead, [
  ['lead_type', '{{DLV - lead_type}}'],
]);

addGa4EventTag('GA4 - Event - Scroll', 'scroll', triggerScroll, [
  ['percent_scrolled', '{{DLV - percent_scrolled}}'],
]);

addGa4EventTag('GA4 - Event - Click', 'click', triggerClick, [
  ['link_url', '{{DLV - link_url}}'],
]);

const containerExport = {
  exportFormatVersion: 2,
  exportTime: '2026-11-13 13:50:00',
  containerVersion: {
    path: 'accounts/0/containers/0/versions/0',
    accountId: '0',
    containerId: '0',
    containerVersionId: '0',
    container: {
      path: 'accounts/0/containers/0',
      accountId: '0',
      containerId: '0',
      name: 'MikuMantra Production Container',
      publicId: GTM_CONTAINER_ID,
      usageContext: ['WEB'],
      fingerprint: nextFingerprint(),
      features: {
        supportUserPermissions: true,
        supportEnvironments: true,
        supportWorkspaces: true,
        supportGtagConfigs: true,
        supportBuiltInVariables: true,
        supportClients: false,
        supportFolders: true,
        supportTags: true,
        supportTemplates: true,
        supportTriggers: true,
        supportVariables: true,
        supportVersions: true,
        supportZones: true,
      },
      tagIds: [GTM_CONTAINER_ID],
    },
    tag: tags,
    trigger: triggers,
    variable: variables,
  },
};

const outputDir = path.resolve('docs/gtm');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, `${GTM_CONTAINER_ID}_container_import.json`);
fs.writeFileSync(outputPath, JSON.stringify(containerExport, null, 2), 'utf-8');

console.log(`Generated official compliant GTM container export:`);
console.log(`- ${variables.length} Variables`);
console.log(`- ${triggers.length} Triggers`);
console.log(`- ${tags.length} Tags`);
console.log(`Saved to: ${outputPath}`);
