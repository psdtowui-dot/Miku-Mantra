export const DEFAULT_FOOTER = {
  company: {
    name: 'MikuMantra Fine Jewellery',
    logo: '/logo.png',
    description: 'Handcrafted jewelry & gifts, made with pastel hues and a lot of patience — one order at a time.',
    email: 'concierge@mikumantra.jewels',
    phone: '+91 98100 00000',
    address: 'MikuMantra Atelier, MG Road, Jaipur 302001'
  },
  sections: [
    {
      title: 'Shop',
      links: [
        { label: 'Trending', url: '/shop?category=gold', isActive: true },
        { label: 'New Arrivals', url: '/shop?category=diamond', isActive: true },
        { label: 'Wedding', url: '/shop?category=wedding', isActive: true },
        { label: 'Daily Wear', url: '/shop?category=daily-wear', isActive: true },
        { label: 'Men', url: '/shop?gender=men', isActive: true }
      ]
    },
    {
      title: 'Company',
      links: [
        { label: 'Our Story', url: '#', isActive: true },
        { label: 'Craftsmanship', url: '#', isActive: true },
        { label: 'Journal', url: '#', isActive: true },
        { label: 'Careers', url: '#', isActive: true },
        { label: 'Press', url: '#', isActive: true }
      ]
    },
    {
      title: 'Support',
      links: [
        { label: 'Track Order', url: '#', isActive: true },
        { label: 'Shipping', url: '#', isActive: true },
        { label: 'Returns', url: '#', isActive: true },
        { label: 'Care Guide', url: '#', isActive: true },
        { label: 'Contact', url: '#', isActive: true }
      ]
    }
  ],
  socialLinks: [
    { platform: 'Instagram', url: '#', icon: 'Instagram', isActive: true },
    { platform: 'Facebook', url: '#', icon: 'Facebook', isActive: true },
    { platform: 'Linkedin', url: '#', icon: 'LinkedinIcon', isActive: true },
    { platform: 'Youtube', url: '#', icon: 'Youtube', isActive: true }
  ],
  policies: [
    { label: 'Privacy', url: '#', isActive: true },
    { label: 'Terms', url: '#', isActive: true },
    { label: 'Sitemap', url: '#', isActive: true }
  ],
  newsletter: {
    title: 'Subscribe to Our Newsletter',
    description: 'Receive updates, access to exclusive deals, and more.',
    isActive: false
  },
  copyright: 'MikuMantra Fine Jewellery. All rights reserved.'
};

export const DEFAULT_HEADER = {
  id: 'default',
  logo: {
    image: '/logo.png',
    alt: 'MikuMantra Fine Jewellery',
    url: '/'
  },
  navigation: [
    {
      id: 'nav-gold',
      label: 'GOLD',
      url: '/shop?category=gold',
      hasDropdown: true,
      dropdownType: 'mega-menu',
      isActive: true,
      order: 1,
      dropdown: {
        sections: [
          {
            id: 'sec-shop-gold',
            title: 'SHOP GOLD',
            order: 1,
            items: [
              { id: 'item-all-gold', label: 'All Gold', url: '/shop?category=gold', isActive: true, order: 1 },
              { id: 'item-gold-women', label: 'For Women', url: '/shop?category=gold&gender=women', isActive: true, order: 2 },
              { id: 'item-gold-men', label: 'For Men', url: '/shop?category=gold&gender=men', isActive: true, order: 3 },
              { id: 'item-gold-new', label: 'New Arrivals', url: '/shop?collection=new-arrival&category=gold', isActive: true, order: 4 }
            ]
          },
          {
            id: 'sec-collections-gold',
            title: 'COLLECTIONS',
            order: 2,
            items: [
              { id: 'item-trending-gold', label: 'Trending', url: '/shop?collection=trending', isActive: true, order: 1 },
              { id: 'item-bestseller-gold', label: 'Best Sellers', url: '/shop?collection=bestseller', isActive: true, order: 2 },
              { id: 'item-new-arrival-gold', label: 'New Arrival', url: '/shop?collection=new-arrival', isActive: true, order: 3 },
              { id: 'item-editors-choice-gold', label: 'Editor\'s Choice', url: '/shop?collection=editors-choice', isActive: true, order: 4 }
            ]
          }
        ],
        featured: {
          image: 'https://images.unsplash.com/photo-1543294001-f7cd5d7fb516?crop=entropy&cs=srgb&fm=jpg&q=85',
          title: 'EXPLORE GOLD',
          url: '/shop?category=gold',
          alt: 'Explore Gold',
          isActive: true
        }
      }
    },
    {
      id: 'nav-diamond',
      label: 'DIAMOND',
      url: '/shop?category=diamond',
      hasDropdown: true,
      dropdownType: 'mega-menu',
      isActive: true,
      order: 2,
      dropdown: {
        sections: [
          {
            id: 'sec-shop-diamond',
            title: 'SHOP DIAMOND',
            order: 1,
            items: [
              { id: 'item-all-diamond', label: 'All Diamond', url: '/shop?category=diamond', isActive: true, order: 1 },
              { id: 'item-diamond-women', label: 'For Women', url: '/shop?category=diamond&gender=women', isActive: true, order: 2 },
              { id: 'item-diamond-men', label: 'For Men', url: '/shop?category=diamond&gender=men', isActive: true, order: 3 },
              { id: 'item-diamond-new', label: 'New Arrivals', url: '/shop?collection=new-arrival&category=diamond', isActive: true, order: 4 }
            ]
          },
          {
            id: 'sec-collections-diamond',
            title: 'COLLECTIONS',
            order: 2,
            items: [
              { id: 'item-trending-diamond', label: 'Trending', url: '/shop?collection=trending', isActive: true, order: 1 },
              { id: 'item-bestseller-diamond', label: 'Best Sellers', url: '/shop?collection=bestseller', isActive: true, order: 2 },
              { id: 'item-new-arrival-diamond', label: 'New Arrival', url: '/shop?collection=new-arrival', isActive: true, order: 3 }
            ]
          }
        ],
        featured: {
          image: 'https://images.unsplash.com/photo-1685970731194-e27b477e87ba?crop=entropy&cs=srgb&fm=jpg&q=85',
          title: 'EXPLORE DIAMOND',
          url: '/shop?category=diamond',
          alt: 'Explore Diamond',
          isActive: true
        }
      }
    },
    {
      id: 'nav-wedding',
      label: 'WEDDING',
      url: '/shop?category=wedding',
      hasDropdown: true,
      dropdownType: 'mega-menu',
      isActive: true,
      order: 3,
      dropdown: {
        sections: [
          {
            id: 'sec-shop-wedding',
            title: 'SHOP WEDDING',
            order: 1,
            items: [
              { id: 'item-all-wedding', label: 'All Wedding', url: '/shop?category=wedding', isActive: true, order: 1 },
              { id: 'item-wedding-sets', label: 'Bridal Sets', url: '/shop?category=wedding&collection=bridal-sets', isActive: true, order: 2 },
              { id: 'item-wedding-sangeet', label: 'Sangeet Wear', url: '/shop?category=wedding&collection=sangeet', isActive: true, order: 3 }
            ]
          },
          {
            id: 'sec-collections-wedding',
            title: 'COLLECTIONS',
            order: 2,
            items: [
              { id: 'item-trending-wedding', label: 'Trending', url: '/shop?collection=trending', isActive: true, order: 1 },
              { id: 'item-wedding-royal', label: 'Royal Heritage', url: '/shop?collection=royal-heritage', isActive: true, order: 2 }
            ]
          }
        ],
        featured: {
          image: 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?crop=entropy&cs=srgb&fm=jpg&q=85',
          title: 'EXPLORE WEDDING',
          url: '/shop?category=wedding',
          alt: 'Explore Wedding',
          isActive: true
        }
      }
    },
    {
      id: 'nav-daily-wear',
      label: 'DAILY WEAR',
      url: '/shop?category=daily-wear',
      hasDropdown: true,
      dropdownType: 'mega-menu',
      isActive: true,
      order: 4,
      dropdown: {
        sections: [
          {
            id: 'sec-shop-daily',
            title: 'DAILY WEAR',
            order: 1,
            items: [
              { id: 'item-all-daily', label: 'All Daily Wear', url: '/shop?category=daily-wear', isActive: true, order: 1 },
              { id: 'item-daily-chains', label: 'Chains & Necklaces', url: '/shop?category=daily-wear&type=chain', isActive: true, order: 2 },
              { id: 'item-daily-rings', label: 'Rings & Studs', url: '/shop?category=daily-wear&type=ring', isActive: true, order: 3 }
            ]
          }
        ],
        featured: {
          image: 'https://images.unsplash.com/photo-1693213085235-ea6deadf8cee?crop=entropy&cs=srgb&fm=jpg&q=85',
          title: 'EXPLORE DAILY WEAR',
          url: '/shop?category=daily-wear',
          alt: 'Explore Daily Wear',
          isActive: true
        }
      }
    },
    {
      id: 'nav-men',
      label: 'MEN',
      url: '/shop?gender=men',
      hasDropdown: false,
      isActive: true,
      order: 5
    },
    {
      id: 'nav-women',
      label: 'WOMEN',
      url: '/shop?gender=women',
      hasDropdown: false,
      isActive: true,
      order: 6
    }
  ],
  settings: {
    searchEnabled: true,
    wishlistEnabled: true,
    accountEnabled: true,
    cartEnabled: true
  },
  announcement: {
    announcementText: 'Complimentary Shipping Available on Eligible Orders',
    isEnabled: true,
    isSliding: true,
    backgroundColor: '#1A1A1A',
    textColor: '#FFFFFF',
    updatedAt: new Date()
  },
  isActive: true
};

export const DEFAULT_SITE_SETTINGS = {
  siteName: 'MikuMantra Fine Jewellery',
  seoTitle: 'MikuMantra — House of Fine Jewellery',
  titleTemplate: '%s | MikuMantra',
  seoDescription: 'Discover handcrafted 22K gold, diamond & bridal jewellery. BIS hallmarked. SGL certified. Timeless heirlooms designed in Jaipur, worn across the world.',
  keywords: ['jewellery', 'gold', 'diamond', 'bridal', 'wedding', 'solitaire', '22K', 'India', 'MikuMantra', 'fine jewellery'],
  shareTitle: 'MikuMantra — House of Fine Jewellery',
  shareDescription: 'Handcrafted 22K gold, diamond & bridal jewellery. Certified. Hallmarked. Timeless.',
  shareBanner: 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?crop=entropy&cs=srgb&fm=jpg&q=85',
  ogImage: 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?crop=entropy&cs=srgb&fm=jpg&q=85',
  twitterImage: 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?crop=entropy&cs=srgb&fm=jpg&q=85',
  siteUrl: 'https://mikumantra.vercel.app',
  favicon: '/favicon.ico',
  logo: '/logo.png',
  shipping: {
    freeShippingEnabled: true,
    freeShippingThreshold: 2000,
    standardShippingCharge: 500
  },
  couponHelperText: 'Try MIKUMANTRA10 or WELCOME2000',
  paymentSettings: {
    razorpay: {
      enabled: true,
      testMode: true,
      keyId: '',
      keySecret: '',
      webhookSecret: '',
      businessName: 'MikuMantra Fine Jewellery',
      themeColor: '#9C6B30'
    },
    cod: {
      enabled: true
    }
  },
  returnWindow: {
    enabled: true,
    duration: 30,
    unit: 'minutes'
  },
  customerReviewsEnabled: true,
  zoomSettings: {
    enabled: true,
    mode: 'side-by-side',
    zoomLevel: 2.5,
    showCrosshair: true,
    lensSize: 160,
    lensBorderColor: '#D4AF37',
    allowCustomerToggle: true,
    modalZoomEnabled: true,
    desktop: {
      enabled: true,
      mode: 'side-by-side',
      zoomLevel: 2.5,
      showCrosshair: true,
      lensSize: 160,
      lensBorderColor: '#D4AF37',
      allowCustomerToggle: true,
      modalZoomEnabled: true
    },
    tablet: {
      enabled: true,
      mode: 'inner',
      zoomLevel: 2.0,
      pinchToZoom: true,
      doubleTapZoom: true,
      showGestureHint: true,
      modalZoomEnabled: true,
      allowCustomerToggle: false
    },
    mobile: {
      enabled: true,
      mode: 'pinch',
      zoomLevel: 2.0,
      pinchToZoom: true,
      doubleTapZoom: true,
      showGestureHint: true,
      modalZoomEnabled: true,
      allowCustomerToggle: false
    }
  },
  homepagePromotions: [
    {
      id: 'promo_1',
      enabled: true,
      img: 'https://images.unsplash.com/photo-1600685890506-593fdf55949b?crop=entropy&cs=srgb&fm=jpg&q=85',
      eyebrow: 'Limited Time',
      title: 'The Wedding Trunk',
      subtitle: 'Up to 15% off on making charges',
      ctaText: 'Shop the Offer',
      ctaUrl: '/shop?category=wedding',
      order: 1
    },
    {
      id: 'promo_2',
      enabled: true,
      img: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?crop=entropy&cs=srgb&fm=jpg&q=85',
      eyebrow: 'Limited Time',
      title: 'Solitaires under ₹1.5L',
      subtitle: 'GIA certified. Made to promise.',
      ctaText: 'Shop the Offer',
      ctaUrl: '/shop?category=diamond',
      order: 2
    }
  ],
  assuranceSection: {
    enabled: true,
    eyebrow: 'Our Promise',
    title: 'The MikuMantra Assurance',
    description: 'Six generations of craftsmanship, ten values that never change.'
  },
  assuranceCards: [
    { id: 'assur_1', icon: 'ShieldCheck', title: 'BIS Hallmarked', description: 'Every piece government certified.', enabled: true, order: 1 },
    { id: 'assur_2', icon: 'Award', title: 'SGL & GIA Certified', description: 'Independently graded diamonds.', enabled: true, order: 2 },
    { id: 'assur_3', icon: 'Truck', title: 'Complimentary Shipping', description: 'Insured, tracked, delivered.', enabled: true, order: 3 },
    { id: 'assur_4', icon: 'RefreshCw', title: '15-Day Easy Returns', description: 'Full refund, no questions.', enabled: true, order: 4 },
    { id: 'assur_5', icon: 'Sparkles', title: 'Lifetime Care', description: 'Free cleaning & polishing.', enabled: true, order: 5 },
    { id: 'assur_6', icon: 'Heart', title: 'Lifetime Buyback', description: '100% gold value assured.', enabled: true, order: 6 }
  ]
};

export const FALLBACK_HERO = [
  {
    title: 'The Bridal Edit',
    kicker: 'Wedding Collection',
    copy: 'Heirloom polki chokers, uncut diamond haars & maang tikkas — handcrafted over 120+ hours.',
    cta: 'Discover the Edit',
    href: '/shop?category=wedding',
    img: '/api/uploads/36bd7ee8-7bb1-4584-9900-7336e2396647-0e0f1045-51aa-4451-847b-b610eab258c4-wmremove-transformed.png'
  }
];

export const DEFAULT_SOCIAL_MEDIA_SETTINGS = {
  showSection: true,
  eyebrow: '@mikumantra.jewels',
  title: 'Follow Our World',
  subtitle: 'Real stories, real sparkle — tagged on Instagram.',
  maxVisible: 6,
  hoverAnimation: true,
  hoverScale: 1.10
};

export const DEFAULT_SOCIAL_MEDIA_ITEMS = [
  {
    id: 'soc_1',
    platform: 'Instagram',
    url: 'https://www.instagram.com/p/C-example1/',
    thumbnailUrl: 'https://images.unsplash.com/photo-1651160670627-2896ddf7822f?crop=entropy&cs=srgb&fm=jpg&q=85',
    title: 'Bridal Solitaire Rings',
    displayOrder: 1,
    isActive: true,
    openInNewTab: true,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'soc_2',
    platform: 'Instagram',
    url: 'https://www.instagram.com/p/C-example2/',
    thumbnailUrl: 'https://images.unsplash.com/photo-1685970731194-e27b477e87ba?crop=entropy&cs=srgb&fm=jpg&q=85',
    title: 'Heritage Polki Haar',
    displayOrder: 2,
    isActive: true,
    openInNewTab: true,
    createdAt: '2026-01-02T00:00:00.000Z',
    updatedAt: '2026-01-02T00:00:00.000Z'
  },
  {
    id: 'soc_3',
    platform: 'Instagram',
    url: 'https://www.instagram.com/p/C-example3/',
    thumbnailUrl: 'https://images.unsplash.com/photo-1622398925373-3f91b1e275f5?crop=entropy&cs=srgb&fm=jpg&q=85',
    title: 'Handcrafted in Jaipur',
    displayOrder: 3,
    isActive: true,
    openInNewTab: true,
    createdAt: '2026-01-03T00:00:00.000Z',
    updatedAt: '2026-01-03T00:00:00.000Z'
  },
  {
    id: 'soc_4',
    platform: 'Instagram',
    url: 'https://www.instagram.com/p/C-example4/',
    thumbnailUrl: 'https://images.unsplash.com/photo-1585960622850-ed33c41d6418?crop=entropy&cs=srgb&fm=jpg&q=85',
    title: 'Emerald & Diamond Earrings',
    displayOrder: 4,
    isActive: true,
    openInNewTab: true,
    createdAt: '2026-01-04T00:00:00.000Z',
    updatedAt: '2026-01-04T00:00:00.000Z'
  },
  {
    id: 'soc_5',
    platform: 'Instagram',
    url: 'https://www.instagram.com/p/C-example5/',
    thumbnailUrl: 'https://images.unsplash.com/photo-1610173827043-9db50e0d8ef9?crop=entropy&cs=srgb&fm=jpg&q=85',
    title: '22K Gold Bangles',
    displayOrder: 5,
    isActive: true,
    openInNewTab: true,
    createdAt: '2026-01-05T00:00:00.000Z',
    updatedAt: '2026-01-05T00:00:00.000Z'
  },
  {
    id: 'soc_6',
    platform: 'Instagram',
    url: 'https://www.instagram.com/p/C-example6/',
    thumbnailUrl: 'https://images.unsplash.com/photo-1600685890506-593fdf55949b?crop=entropy&cs=srgb&fm=jpg&q=85',
    title: 'Contemporary Solitaires',
    displayOrder: 6,
    isActive: true,
    openInNewTab: true,
    createdAt: '2026-01-06T00:00:00.000Z',
    updatedAt: '2026-01-06T00:00:00.000Z'
  }
];

export const DEFAULT_CATEGORY_SHOWCASE_SETTINGS = {
  sectionEnabled: true,
  eyebrow: 'Curated Categories',
  title: 'Shop by Category',
  subtitle: 'From everyday layering to once-in-a-lifetime heirlooms.',
  buttonText: 'SHOP NOW',
  hoverEnabled: true,
  hoverScale: 1.10,
  otherItemsScale: 0.95,
  transitionDuration: 300,
  hoverOpacity: 1.0,
  imageHoverEffect: 'zoom', // 'none' | 'zoom' | 'scale' | 'brightness' | 'overlay'
  hoverBorder: true,
  hoverBorderWidth: 1,
  hoverShadow: true,
  desktopItems: 6,
  tabletItems: 4,
  mobileItems: 2,
  circleSize: 170,
  gap: 24
};
