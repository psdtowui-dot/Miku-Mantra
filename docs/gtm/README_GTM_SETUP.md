# MikuMantra Fine Jewellery — GTM Container Import & Setup Guide

**Container ID:** `GTM-5KLNQX63`  
**GA4 Measurement ID:** `G-ELMXNPCR2G`  
**Ready-to-Import JSON:** `GTM-5KLNQX63_container_import.json`  

---

## 1-Click Container Import Instructions

Instead of spending hours manually creating 20 tags, 19 triggers, and 20 variables, you can import the pre-configured, tested JSON container file directly into Google Tag Manager.

### Step 1: Open Google Tag Manager
1. Go to [https://tagmanager.google.com/](https://tagmanager.google.com/).
2. Select your Account and the Container **`GTM-5KLNQX63`**.

### Step 2: Navigate to Import Container
1. Click on the **Admin** tab at the top.
2. Under the **Container** column (right side), click **Import Container**.

### Step 3: Upload the JSON File
1. Click **Choose container file** and select:
   `docs/gtm/GTM-5KLNQX63_container_import.json`
2. Under **Choose workspace**, select:
   - **Existing** > Choose **Default Workspace** (or your active workspace).
3. Under **Choose an import option**:
   - Select **Merge** > **Rename conflicting tags, triggers, and variables** (or **Overwrite** if this container is dedicated solely to MikuMantra).
4. Review the preview summary:
   - **20 Tags** to be added/updated
   - **19 Triggers** to be added/updated
   - **20 Variables** to be added/updated
5. Click **Confirm**.

---

## What the Imported Container Configures

### 1. Variables
- `Const - GA4 Measurement ID`: `G-ELMXNPCR2G`
- `Const - Currency`: `INR`
- `Const - Brand Name`: `MikuMantra Fine Jewellery`
- `DLV - ecommerce`: Reads dataLayer e-commerce object
- `DLV - ecommerce.value`: Order / cart monetary amount
- `DLV - ecommerce.currency`: Fallback currency
- `DLV - ecommerce.transaction_id`: Order transaction ID
- `DLV - ecommerce.tax`: Order tax
- `DLV - ecommerce.shipping`: Order shipping fee
- `DLV - ecommerce.coupon`: Coupon / discount code
- `DLV - page_location`: Clean page URL
- `DLV - page_path`: Virtual page path
- `DLV - page_title`: Document title
- `DLV - search_term`: Search query
- `DLV - method`: Authentication method (Email/Google)
- `DLV - lead_type`: Lead source (Newsletter VIP Circle)
- `DLV - percent_scrolled`: 90% scroll depth
- `DLV - link_url`: Outbound click URL

### 2. Triggers
- `Init - All Pages`: Container initialization
- `CE - page_view`: SPA route transitions
- `CE - view_item_list`: Collection/category view
- `CE - select_item`: Product click
- `CE - view_item`: Product detail view
- `CE - add_to_cart`: Add to cart
- `CE - remove_from_cart`: Remove from cart
- `CE - view_cart`: View shopping cart
- `CE - begin_checkout`: Initiate checkout
- `CE - add_shipping_info`: Submit shipping details
- `CE - add_payment_info`: Select payment option
- `CE - purchase`: Confirmed purchase milestone
- `CE - refund`: Confirmed refund
- `CE - search`: Search execution
- `CE - sign_up`: Account registration
- `CE - login`: Account login
- `CE - generate_lead`: Newsletter VIP subscription
- `CE - scroll`: 90% scroll depth
- `CE - click`: Outbound CTA / WhatsApp link click

### 3. Tags & Priority Hierarchy
- **Priority 110:** `GAds - Conversion Linker`
- **Priority 100:** `GA4 - Google Tag (Config)` (`send_page_view: false`)
- **Priority 90:** `GA4 - Event - Page View`
- **Priority 50:** 11 GA4 E-Commerce Event Tags (with `sendEcommerceData: true` and source: `dataLayer`)
- **Priority 50:** Interaction Tags (`search`, `login`, `sign_up`, `generate_lead`, `scroll`, `click`)

---

## Testing & Publishing

1. In GTM, click **Preview** in the top right.
2. Enter your store URL (e.g. `https://miku-mantra.vercel.app/` or `http://localhost:3000`).
3. Connect Tag Assistant and verify that events fire in real time as you navigate the store.
4. Once verified, click **Submit** > name the version **`v1.0 - Complete GA4 E-Commerce & Consent Mode v2`** > click **Publish**.
