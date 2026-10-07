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
        { label: 'Track Order', url: '/track-order', isActive: true },
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
  customerReviewsEnabled: true,
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
    img: 'https://images.unsplash.com/photo-1601121141461-9d6647bca1ed?crop=entropy&cs=srgb&fm=jpg&q=85'
  }
];
