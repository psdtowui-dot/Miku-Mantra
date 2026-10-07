# MIKUMANTRA ANDROID APPLICATION — GOOGLE PLAY STORE METADATA & DEPLOYMENT SPECIFICATION

## 1. APPLICATION IDENTITY & STORE DETAILS

* **Application Name:** MikuMantra
* **Package Name / Application ID:** `com.mikumantra.app`
* **Category:** Shopping / E-commerce (Fine Jewellery & Luxury Gifting)
* **Default Language:** English (en-IN) / Global English
* **Content Rating:** Everyone (PEGI 3 / ESRB Everyone)
* **Target Audience:** Age 18+ (Luxury fine jewellery buyers, bridal shoppers, gift seekers)
* **Contains Ads:** No
* **In-App Purchases:** No (Standard e-commerce physical goods checkout)

---

## 2. STORE LISTING TEXT

### Short Description (Max 80 Characters)
> Handcrafted 22K gold, certified diamond & luxury bridal jewellery by MikuMantra.

*(Character count: 79)*

### Full Description (Max 4000 Characters)
```text
Welcome to MikuMantra — The House of Fine Jewellery.

Discover timeless elegance and master craftsmanship with MikuMantra, Jaipur’s premier destination for handcrafted 22K gold, certified natural diamonds, and regal bridal jewellery. 

Whether you are curating your dream bridal trousseau, celebrating an anniversary milestone, or looking for everyday fine jewellery, MikuMantra delivers authentic, certified luxury directly to your doorstep with guaranteed purity and complete peace of mind.

WHY CHOOSE MIKUMANTRA?

• 100% Certified & BIS Hallmarked: Every gold jewel is 100% BIS hallmarked. All diamond pieces are accompanied by authentic laboratory certifications (GIA / SGL / IGI).
• Artisanal Jaipuri Craftsmanship: Meticulously designed and hand-finished by master karigars in Jaipur, carrying forward centuries of jewellery-making heritage.
• Seamless Multi-Platform Synchronization: Your shopping bag, saved addresses, wishlist, and past orders remain seamlessly synchronized between the MikuMantra Android application and our official website (https://mikumantra.vercel.app).
• Secure & Flexible Payment Options: Choose from multiple trusted payment methods including Razorpay (UPI, Credit/Debit Cards, Net Banking) or convenient Cash on Delivery (COD).
• Live Order & Courier Tracking: Track your shipment in real time from confirmation, dispatch via premium courier partners (Blue Dart, Delhivery), to doorstep delivery.
• AI Jewellery Styling Concierge: Chat with our intelligent jewellery assistant to find the ideal piece matching your neckline, occasion, budget, or outfit.
• Free & Insured Express Shipping: Enjoy complimentary insured doorstep shipping across India with tamper-evident luxury unboxing packaging.

EXPLORE OUR CURATED COLLECTIONS:

• The Bridal Ensemble: Handcrafted Kundan, uncut Polki chokers, layered haars, jhumkas, and maang tikkas designed to make you unforgettable.
• Certified Diamond Solitaires: Exquisite engagement rings, tennis bracelets, eternity bands, and pendants set with brilliant-cut diamonds.
• 22K Heritage Gold: Timeless gold chains, bangles, kadas, and temple jewellery crafted in pure 22-karat yellow and rose gold.
• Everyday Luxury & Layering: Feather-light studs, huggie earrings, dainty diamond pendants, and minimalist bands designed for daily wear.
• Men’s Regal Edit: Bold kada bracelets, signet rings, and cufflinks crafted for distinguished style.

APP FEATURES:

✓ High-Definition Jewellery Viewer: Multi-angle photos, zoom, and authentic video previews.
✓ Smart Pincode Checker: Instant delivery date estimator for your pincode.
✓ One-Tap Wishlist: Save your favorite pieces and receive alerts on restocking or offers.
✓ Easy Returns & Hassle-Free Cancellations: Manage cancellations and request return pickups right from the app.
✓ Direct WhatsApp Concierge: Instant support and styling advice from our master jewelers.

Download the MikuMantra app today and carry the grace of fine jewellery wherever you go.
```

---

## 3. DATA SAFETY & PRIVACY DISCLOSURE

### Data Collected:
1. **Name & Contact Info (Email, Phone, Shipping Address):**
   * *Purpose:* App functionality, user account management, order shipping, invoice generation, and customer support.
   * *Encrypted in Transit:* Yes (HTTPS / TLS 1.3).
   * *User Can Request Deletion:* Yes (via account settings or concierge email).
2. **Device Identifier & Push Tokens (FCM):**
   * *Purpose:* Push notifications for order dispatch, shipping tracking, and security alerts.
3. **Financial / Payment Information:**
   * *Note:* MikuMantra never stores credit/debit card numbers or CVVs. All online payment data is encrypted and handled directly by PCI-DSS Level 1 certified gateways (Razorpay).

### Privacy Policy URL:
`https://mikumantra.vercel.app/policies/privacy`

---

## 4. ANDROID APP BUNDLE (.AAB) BUILD & SIGNING INSTRUCTIONS

### Step 1: Generate Release Keystore
Run in PowerShell (within a JDK bin directory or terminal):
```powershell
keytool -genkey -v -keystore mikumantra-release-key.jks -keyalg RSA -keysize 2048 -validity 10000 -alias mikumantra -storepass YourSecurePassword -keypass YourSecurePassword -dname "CN=MikuMantra, OU=Mobile, O=MikuMantra Fine Jewellery, L=Jaipur, ST=Rajasthan, C=IN"
```

### Step 2: Configure Signing in `android/app/build.gradle`
```groovy
android {
    ...
    signingConfigs {
        release {
            storeFile file('mikumantra-release-key.jks')
            storePassword System.getenv("KEYSTORE_PASSWORD") ?: "YourSecurePassword"
            keyAlias 'mikumantra'
            keyPassword System.getenv("KEY_PASSWORD") ?: "YourSecurePassword"
        }
    }
    buildTypes {
        release {
            signingConfig signingConfigs.release
            minifyEnabled true
            shrinkResources true
            proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Step 3: Build Production Android App Bundle (.aab)
Run in `c:\Users\Dell Pc\Desktop\mikuapp\android`:
```powershell
./gradlew bundleRelease
```
The output `.aab` file will be generated at:
`android/app/build/outputs/bundle/release/app-release.aab`
Ready to upload to Google Play Console!
