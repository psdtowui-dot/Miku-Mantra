/**
 * Generates an official GTM Container Export JSON for GTM-5KLNQX63
 */

import fs from 'fs';
import path from 'path';

const GTM_CONTAINER_ID = 'GTM-5KLNQX63';
const GA4_MEASUREMENT_ID = 'G-ELMXNPCR2G';

let varIdCounter = 1;
let triggerIdCounter = 1;
let tagIdCounter = 1;

const variables = [];
const triggers = [];
const tags = [];

// Helper to add variables
function addConstant(name, value) {
  const id = String(varIdCounter++);
  variables.push({
    accountId: '1000',
    containerId: '1001',
    variableId: id,
    name,
    type: 'c',
    parameter: [{ type: 'TEMPLATE', key: 'value', value: String(value) }],
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
    accountId: '1000',
    containerId: '1001',
    variableId: id,
    name,
    type: 'v',
    parameter: params,
  });
  return id;
}

// 1. Create Variables
const constGa4Id = addConstant('Const - GA4 Measurement ID', GA4_MEASUREMENT_ID);
const constCurrency = addConstant('Const - Currency', 'INR');
const constBrand = addConstant('Const - Brand Name', 'MikuMantra Fine Jewellery');

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
    accountId: '1000',
    containerId: '1001',
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
  });
  return id;
}

// 2. Create Triggers
// Initialization - All Pages Trigger
const triggerInitAllPagesId = String(triggerIdCounter++);
triggers.push({
  accountId: '1000',
  containerId: '1001',
  triggerId: triggerInitAllPagesId,
  name: 'Init - All Pages',
  type: 'INIT',
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

// 3. Create Tags

// Tag 1: Conversion Linker
tags.push({
  accountId: '1000',
  containerId: '1001',
  tagId: String(tagIdCounter++),
  name: 'GAds - Conversion Linker',
  type: 'gclidw',
  firingTriggerId: [triggerInitAllPagesId],
  priority: { type: 'TEMPLATE', value: '110' },
  parameter: [
    { type: 'BOOLEAN', key: 'enableCrossDomain', value: 'false' },
    { type: 'BOOLEAN', key: 'enableUrlPassthrough', value: 'false' },
  ],
});

// Tag 2: Google Tag (GA4 Config)
tags.push({
  accountId: '1000',
  containerId: '1001',
  tagId: String(tagIdCounter++),
  name: 'GA4 - Google Tag (Config)',
  type: 'googtag',
  firingTriggerId: [triggerInitAllPagesId],
  priority: { type: 'TEMPLATE', value: '100' },
  parameter: [
    { type: 'TEMPLATE', key: 'tagId', value: '{{Const - GA4 Measurement ID}}' },
    {
      type: 'LIST',
      key: 'configSettings',
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
});

// Helper for GA4 Event tags
function addGa4EventTag(name, eventName, triggerId, priority = 50, extraParams = [], isEcommerce = false) {
  const params = [
    { type: 'TEMPLATE', key: 'measurementId', value: '{{Const - GA4 Measurement ID}}' },
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
    accountId: '1000',
    containerId: '1001',
    tagId: String(tagIdCounter++),
    name,
    type: 'gaawe',
    firingTriggerId: [triggerId],
    priority: { type: 'TEMPLATE', value: String(priority) },
    parameter: params,
  });
}

// GA4 Events
addGa4EventTag('GA4 - Event - Page View', 'page_view', triggerPageView, 90, [
  ['page_location', '{{DLV - page_location}}'],
  ['page_path', '{{DLV - page_path}}'],
  ['page_title', '{{DLV - page_title}}'],
]);

addGa4EventTag('GA4 - Event - View Item List', 'view_item_list', triggerViewItemList, 50, [], true);
addGa4EventTag('GA4 - Event - Select Item', 'select_item', triggerSelectItem, 50, [], true);
addGa4EventTag('GA4 - Event - View Item', 'view_item', triggerViewItem, 50, [], true);
addGa4EventTag('GA4 - Event - Add To Cart', 'add_to_cart', triggerAddToCart, 50, [], true);
addGa4EventTag('GA4 - Event - Remove From Cart', 'remove_from_cart', triggerRemoveFromCart, 50, [], true);
addGa4EventTag('GA4 - Event - View Cart', 'view_cart', triggerViewCart, 50, [], true);
addGa4EventTag('GA4 - Event - Begin Checkout', 'begin_checkout', triggerBeginCheckout, 50, [], true);
addGa4EventTag('GA4 - Event - Add Shipping Info', 'add_shipping_info', triggerAddShippingInfo, 50, [], true);
addGa4EventTag('GA4 - Event - Add Payment Info', 'add_payment_info', triggerAddPaymentInfo, 50, [], true);
addGa4EventTag('GA4 - Event - Purchase', 'purchase', triggerPurchase, 50, [], true);
addGa4EventTag('GA4 - Event - Refund', 'refund', triggerRefund, 50, [], true);

addGa4EventTag('GA4 - Event - Search', 'search', triggerSearch, 50, [
  ['search_term', '{{DLV - search_term}}'],
]);

addGa4EventTag('GA4 - Event - Login', 'login', triggerLogin, 50, [
  ['method', '{{DLV - method}}'],
]);

addGa4EventTag('GA4 - Event - Sign Up', 'sign_up', triggerSignUp, 50, [
  ['method', '{{DLV - method}}'],
]);

addGa4EventTag('GA4 - Event - Generate Lead', 'generate_lead', triggerGenerateLead, 50, [
  ['lead_type', '{{DLV - lead_type}}'],
]);

addGa4EventTag('GA4 - Event - Scroll', 'scroll', triggerScroll, 50, [
  ['percent_scrolled', '{{DLV - percent_scrolled}}'],
]);

addGa4EventTag('GA4 - Event - Click', 'click', triggerClick, 50, [
  ['link_url', '{{DLV - link_url}}'],
]);

const containerExport = {
  exportFormatVersion: 2,
  exportTime: new Date().toISOString(),
  containerVersion: {
    path: 'accounts/1000/containers/1001/versions/0',
    accountId: '1000',
    containerId: '1001',
    containerVersionId: '0',
    container: {
      path: 'accounts/1000/containers/1001',
      accountId: '1000',
      containerId: '1001',
      name: 'MikuMantra Production Container',
      publicId: GTM_CONTAINER_ID,
      usageContext: ['WEB'],
    },
    tag: tags,
    trigger: triggers,
    variable: variables,
    builtInVariable: [
      {
        accountId: '1000',
        containerId: '1001',
        type: 'EVENT_NAME',
        name: '_event',
      },
    ],
  },
};

const outputDir = path.resolve('docs/gtm');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const outputPath = path.join(outputDir, `${GTM_CONTAINER_ID}_container_import.json`);
fs.writeFileSync(outputPath, JSON.stringify(containerExport, null, 2), 'utf-8');

console.log(`Generated GTM container export with:`);
console.log(`- ${variables.length} Variables`);
console.log(`- ${triggers.length} Triggers`);
console.log(`- ${tags.length} Tags`);
console.log(`Saved to: ${outputPath}`);
