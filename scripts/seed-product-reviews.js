/**
 * scripts/seed-product-reviews.js
 *
 * Generates realistic DEMO/SEED review data for fine jewellery products in MongoDB.
 *
 * Features:
 * - Processes ALL products in the database.
 * - Assigns a random number of reviews between 6 and 22 per product.
 * - Product-specific relevant review content (rings, earrings, bracelets, chokers, chains, mangalsutra, pendants, sets).
 * - Varied star ratings (mostly 4-5 stars, some 3 stars, rare 1-2 stars).
 * - Varied review lengths (short, medium, long).
 * - Fictional demo reviewer names (no repeats on the same product).
 * - Realistic date spread over the past 150 days.
 * - Guaranteed uniqueness: no two reviews share the same text across the entire database.
 * - Sets `isDemo: true` on all generated reviews for easy identification and safe cleanup.
 * - Recalculates and updates product rating and review count in `products` collection.
 * - Supports `--clean` flag to remove ONLY demo reviews and restore genuine stats.
 *
 * Usage:
 *   node scripts/seed-product-reviews.js          # Seeds demo reviews
 *   node scripts/seed-product-reviews.js --clean  # Removes only demo reviews
 */

const { MongoClient } = require('mongodb');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

// Auto-load .env if present
const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, 'utf8');
  for (const line of envContent.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, '');
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const FIRST_NAMES_FEMALE = [
  'Ananya', 'Radhika', 'Meera', 'Shreya', 'Tanvi', 'Kavya', 'Sneha', 'Pooja', 'Divya', 'Aditi',
  'Ritu', 'Nandini', 'Pallavi', 'Riya', 'Neha', 'Isha', 'Simran', 'Bhavna', 'Sonali', 'Shruti',
  'Tanya', 'Deepika', 'Natasha', 'Sunita', 'Preeti', 'Swati', 'Malini', 'Trisha', 'Alisha', 'Avantika',
  'Charu', 'Garima', 'Geetika', 'Ishita', 'Juhi', 'Kritika', 'Lavanya', 'Mahima', 'Nupur', 'Prachi',
  'Rachna', 'Rupal', 'Sakshi', 'Sanyukta', 'Shalini', 'Shivani', 'Smriti', 'Sonal', 'Suhani', 'Tarini',
  'Urvi', 'Vaishali', 'Vandana', 'Varsha', 'Vidhi', 'Yamini', 'Zoya', 'Aashi', 'Damini', 'Esha'
];

const FIRST_NAMES_MALE = [
  'Rohan', 'Vikram', 'Siddharth', 'Arjun', 'Aditya', 'Kunal', 'Sameer', 'Rahul', 'Varun', 'Nikhil',
  'Amit', 'Gaurav', 'Kartik', 'Prateek', 'Mohit', 'Ankit', 'Harsh', 'Tushar', 'Saurabh', 'Akshay',
  'Dev', 'Rajat', 'Kabir', 'Aman', 'Ayush', 'Chirag', 'Deepak', 'Himanshu', 'Ishaan', 'Jatin',
  'Manish', 'Naveen', 'Parth', 'Rishi', 'Sachin', 'Tanmay', 'Udit', 'Vivek', 'Yash', 'Zeeshan'
];

const SURNAMES = [
  'Sharma', 'Verma', 'Kapoor', 'Singhania', 'Mehta', 'Rao', 'Iyer', 'Nair', 'Deshmukh', 'Kulkarni',
  'Banerjee', 'Chatterjee', 'Sen', 'Joshi', 'Agarwal', 'Gupta', 'Patel', 'Reddy', 'Choudhury', 'Bhattacharya',
  'Saxena', 'Malhotra', 'Oberoi', 'Trivedi', 'Nambiar', 'Menon', 'Bhatia', 'Chopra', 'Dixit', 'Garg',
  'Hegde', 'Jain', 'Kashyap', 'Lal', 'Mishra', 'Pandey', 'Rathore', 'Seth', 'Thakur', 'Upadhyay'
];

function detectProductType(p) {
  const text = `${p.name || ''} ${p.slug || ''} ${p.category || ''}`.toLowerCase();
  if (text.includes('mangalsutra')) return 'mangalsutra';
  if (text.includes('choker')) return 'choker';
  if (text.includes('pendant')) return 'pendant';
  if (text.includes('chain')) return 'chain';
  if (text.includes('set') || text.includes('haar')) return 'necklace_set';
  if (text.includes('huggie') || text.includes('dangler') || text.includes('earring') || text.includes('jhumka') || text.includes('stud')) return 'earrings';
  if (text.includes('kada') || text.includes('bangle') || text.includes('bracelet') || text.includes('tennis')) return 'bracelet';
  if (text.includes('ring') || text.includes('solitaire') || text.includes('signet') || text.includes('band')) return 'ring';
  return 'general';
}

// Category-specific templates structured by star rating and length
const REVIEW_TEMPLATES = {
  ring: {
    5: [
      // Short
      { t: "Stunning brilliance", c: "Absolutely breathtaking fire and clarity in the diamond, looks even better in person." },
      { t: "Perfect engagement choice", c: "Fits true to size and the setting feels remarkably sturdy and secure." },
      { t: "Exquisite craftsmanship", c: "The metal finish is buttery smooth and comfortable enough for daily wear." },
      { t: "Pure luxury", c: "The diamond catches every ray of ambient light. Top-tier craftsmanship." },
      { t: "Loved the unboxing", c: "The luxury packaging, velvet box, and certificate were very impressive." },
      // Medium
      { t: "A timeless masterpiece", c: "Ordered this for our wedding anniversary. The prong setting is flawless and the platinum polish has an unforgettable gleam." },
      { t: "Unbelievable sparkle", c: "I was skeptical about buying fine jewellery online, but this surpassed my expectations. The brilliance under evening lighting is unmatched." },
      { t: "Solid gold presence", c: "The ring has a reassuring, weighty feel without being heavy. The stone sits perfectly flush and doesn't snag on clothing." },
      { t: "Ideal everyday solitaire", c: "I haven't taken it off since the day it arrived. Comfortable, exceptionally well crafted, and receives endless compliments." },
      // Long
      { t: "Exceeded all expectations", c: "We spent weeks comparing solitaire rings across boutique stores in Delhi before purchasing here. The cathedral setting elevates the stone beautifully, and the included authenticity card gave us complete peace of mind. Truly a treasured heirloom." },
      { t: "Remarkable quality and service", c: "Bought this as a milestone birthday gift for my partner. The packaging arrived sealed and insured, the sizing was spot on, and the inner band contour is ergonomic for all-day comfort. The sparkle in natural sunlight is mesmerizing." }
    ],
    4: [
      // Short
      { t: "Very elegant ring", c: "Delicate design and great diamond luster. Very happy with the purchase." },
      { t: "Beautiful finish", c: "The band is comfortable and the stone setting is cleanly done." },
      // Medium
      { t: "Great value and shine", c: "The ring is stunning in natural daylight. Sizing ran slightly snug, but it settled comfortably after a few days of wear." },
      { t: "Classy and refined", c: "A lovely everyday piece with a subtle shimmer. Delivery was slightly delayed by a day, but the ring itself is pristine." },
      // Long
      { t: "Beautiful design with subtle luxury", c: "The diamond clarity and cut quality are definitely top notch. I took off one star only because the delivery tracking updates were slightly slow to refresh, but the piece arrived in impeccable condition." }
    ],
    3: [
      { t: "Decent piece, sizing runs snug", c: "The ring is pretty and the diamond is lively, but the band felt a bit tighter than standard ring gauge sizes. Recommend sizing up half a size." },
      { t: "Looks nice on the hand", c: "Good shine and finish. The band is a bit more slender in person than it appeared in the high-res studio photographs, but still looks delicate." },
      { t: "Average experience", c: "The piece is authentic and certified. However, the outer package had a small dent upon delivery, though the inner velvet jewellery box was completely fine." }
    ],
    2: [
      { t: "Band is quite slender", c: "The design is delicate, but the metal shank felt a bit lightweight for the price point. Expected a slightly more substantial feel on the finger." }
    ],
    1: [
      { t: "Courier delay caused an issue", c: "The ring itself is well made, but the courier took 5 extra days to deliver and missed our anniversary date completely. Disappointed with the logistics." }
    ]
  },

  earrings: {
    5: [
      // Short
      { t: "Incredibly lightweight", c: "So comfortable on the earlobes, you forget you are wearing fine jewellery." },
      { t: "Sparkles with every turn", c: "The delicate jaali work catches the light with every slight movement." },
      { t: "Secure clasp closure", c: "The clasp clicks firmly into place with zero pinching. Perfect daily huggies." },
      { t: "Gorgeous festive danglers", c: "Wore them all evening to a wedding reception without any ear fatigue." },
      { t: "Subtle elegance", c: "The gold tone is warm and radiant, not overly brassy. Highly recommend." },
      // Medium
      { t: "My new everyday staple", c: "I have sensitive ears that react to most alloys, but these caused zero redness. The craftsmanship is clean and refined." },
      { t: "Flawless jaali craftsmanship", c: "The hand-etched detailing on these danglers is breathtaking. They frame the face gracefully and feel almost weightless." },
      { t: "Perfect proportions", c: "Just the right size for boardroom to dinner transitions. The diamonds offer an understated, sophisticated shimmer." },
      // Long
      { t: "Exceptional comfort and beauty", c: "Finding earrings that combine traditional Indian jaali work with modern feather-light comfort is very rare. The posts are smooth, the backings fit tightly, and I wore them through an 8-hour family sangeet without needing to take them off once." },
      { t: "A truly wonderful purchase", c: "Purchased these as a bridal shower gift. The recipient was thrilled with the diamond clarity and secure hinge snap. The presentation box, certificate, and pouch made it feel like a luxury boutique purchase." }
    ],
    4: [
      // Short
      { t: "Very pretty on the ears", c: "Lovely craftsmanship and the stones have good fire in ambient light." },
      { t: "Comfortable and chic", c: "Good daily wear earrings with a secure clasp mechanism." },
      // Medium
      { t: "Lovely sparkle and design", c: "The earrings look gorgeous on. They are slightly smaller than they appeared on the model, but the craftsmanship is undeniable." },
      { t: "Fine etching and warm tone", c: "The gold hue is rich and warm. The post was a tiny bit stiff initially, but eased up after wearing twice." },
      // Long
      { t: "Elegant daily wear huggies", c: "I wear these to office every day. They never snag on scarves or masks, and the diamond setting is smooth to touch. Giving 4 stars only because I wish an extra pair of backings was included." }
    ],
    3: [
      { t: "Delicate and subtle", c: "The design is attractive, but the posts feel rather slender. Requires gentle handling when putting on and taking off." },
      { t: "Pretty, but smaller than expected", c: "Good shine and authentic hallmark, but the dimensions are quite petite. Best suited for secondary piercings or minimal styling." },
      { t: "Decent pair", c: "Looks nice once worn, but the clasp needed a small manual alignment to click into the latch securely." }
    ],
    2: [
      { t: "Slightly tight diameter", c: "The inner huggie diameter is a little compact for thicker earlobes. Beautiful gold finish, but fit was slightly constrictive." }
    ],
    1: [
      { t: "One clasp was loose", c: "One of the earrings had a loose latch out of the box and wouldn't stay clicked shut. Had to contact support for assistance." }
    ]
  },

  bracelet: {
    5: [
      // Short
      { t: "Substantial gold feel", c: "Great weight, smooth inner contours, and sits comfortably on the wrist." },
      { t: "Flawless tennis setting", c: "Every diamond is uniformly cut and aligned. The sparkle is relentless." },
      { t: "Reassuring double clasp", c: "The safety catch clicks firmly and gives complete confidence wearing it out." },
      { t: "Quiet luxury statement", c: "Understated, heavy, and meticulously polished. An instant classic." },
      { t: "Silky smooth edges", c: "Doesn't catch on silk shirts or scratch laptop surfaces while typing." },
      // Medium
      { t: "Worth every single rupee", c: "The kada has that authentic weighty luxury that you only find in royal ateliers. The satin finish against bevelled edges is masterclass work." },
      { t: "The river of light bracelet", c: "The 18K white gold tennis bracelet drapes like liquid around the wrist. The links articulate naturally without flipping or twisting." },
      { t: "Modern yet regal", c: "Purchased this rose gold bangle for our anniversary. The subtle blush tone complements Indian skin tones gorgeously." },
      // Long
      { t: "Top-tier craftsmanship on this kada", c: "I was looking for a men's kada that possessed genuine presence without looking gaudy. The weight is substantial, the inner surface is polished mirror-smooth, and the hallmarking is clear. It feels like an heirloom that will last generations." },
      { t: "Exquisite diamond tennis bracelet", c: "I have worn this tennis bracelet daily for over two months. The double side latches ensure it never accidentally unclasps, and each diamond has uniform F-VS brilliance. Completely unmatched quality at this price point." }
    ],
    4: [
      // Short
      { t: "Very sleek and modern", c: "Looks sophisticated on the wrist and pairs easily with a watch." },
      { t: "Solid construction", c: "Good weight and shine. Clasp requires two hands to latch easily." },
      // Medium
      { t: "Great lustre and feel", c: "The bangle is beautifully shaped. The 2.4 sizing was a bit snug over the knuckles, but once slipped on, it rests wonderfully." },
      { t: "Sparkles immensely", c: "The diamond line shines brightly under indoor lighting. The safety catch was slightly stiff at first, but loosened up." },
      // Long
      { t: "Impressive quality and weight", c: "The gold tone is rich and the craftsmanship is solid throughout. It looks very premium with formal blazers and kurtas. A minor shipping delay of two days, but the piece itself is delightful." }
    ],
    3: [
      { t: "Check wrist sizing carefully", c: "The bracelet is handsome, but sits a little looser than expected on a slender wrist. Be sure to measure according to their guide." },
      { t: "Nice finish, stiff clasp", c: "The metal and stone quality are good. However, opening the side safety latch took a few tries before getting the hang of it." },
      { t: "Decent weight", c: "Looks good once on, but the finish is slightly more satin than the high-gloss look in the product preview pictures." }
    ],
    2: [
      { t: "Sizing was smaller than expected", c: "The bracelet circumference ran slightly tight. The metalwork is good, but double-check your sizing before ordering." }
    ],
    1: [
      { t: "Damaged outer carton", c: "The outer delivery box arrived battered and wet from the courier. Fortunately the inside case was intact, but shipping handling was poor." }
    ]
  },

  choker: {
    5: [
      // Short
      { t: "Absolute bridal perfection", c: "The centerpiece of my wedding day. Received compliments all night long." },
      { t: "Heirloom in the making", c: "The uncut polki work and lustrous pearl drops are museum quality." },
      { t: "Comfortable back dori", c: "The silk dori adjusts effortlessly to sit perfectly along the collarbone." },
      { t: "Royal Jaipur craftsmanship", c: "Feels like something crafted for royalty. Pure artistry in 22K gold." },
      // Medium
      { t: "My dream wedding choker", c: "I searched through dozens of jewellery houses before ordering this choker. The uncut polki foil has a breathtaking antique glow and the pearls are uniformly matched." },
      { t: "No neck fatigue at all", c: "Wore this piece for over 10 hours during my reception rituals. It sits flat, doesn't pinch the skin, and photographs like pure royalty." },
      // Long
      { t: "A family heirloom we will treasure forever", c: "Ordering bridal jewellery online was a leap of faith for my parents, but MikuMantra delivered pure excellence. The choker arrived in a heavy wooden keepsake box with full hallmark documents. The weight, the meenakari on the reverse side, and the lustrous pearls exceeded every expectation." }
    ],
    4: [
      { t: "Stunning bridal ensemble", c: "The choker looks magnificent in wedding photography. Took a minute to adjust the dori evenly, but looked regal once set." },
      { t: "Exquisite uncut stones", c: "The polki luster is warm and vintage. Slightly weighty for very casual wear, but ideal for grand celebrations." },
      { t: "Regal presence", c: "Beautifully handcrafted choker with very crisp finishing. Delivered on the promised date in tamper-proof security packaging." }
    ],
    3: [
      { t: "Beautiful piece, takes patience to adjust", c: "The choker is heavy and ornate, but you definitely need someone's help to tie the back dori evenly so it sits centered." },
      { t: "Traditional antique look", c: "The polki has a more antique golden tint than the ultra-bright studio images, which gives it a vintage character." }
    ],
    2: [
      { t: "Quite heavy on the neck", c: "The choker is undeniably beautiful, but the weight became noticeable after 4-5 hours. Best for short ceremonies." }
    ],
    1: [
      { t: "Delivery stress before event", c: "The choker is stunning, but dispatch was delayed by 4 days, causing immense anxiety right before our family sangeet." }
    ]
  },

  mangalsutra: {
    5: [
      // Short
      { t: "Modern and sacred", c: "The perfect modern mangalsutra for the contemporary working woman." },
      { t: "Subtle and chic", c: "Pairs effortlessly with western blazers, t-shirts, and ethnic sarees alike." },
      { t: "Exquisite diamond pendant", c: "The diamonds sparkle brightly against the delicate black bead chain." },
      { t: "Silky chain drape", c: "Never kinks or tangles during sleep or showers. Absolute daily perfection." },
      // Medium
      { t: "Exactly what I dreamed of", c: "I didn't want a heavy traditional design that stays locked in a locker. This piece honors tradition while looking effortlessly modern." },
      { t: "Dainty yet durable", c: "Worn it daily for four months straight. The black bead stringing is tight and secure, and the diamond centerpiece is dazzling." },
      // Long
      { t: "A refreshingly modern take on tradition", c: "My husband surprised me with this modern mangalsutra for our first anniversary. The 22K gold has an authentic warm sheen, the black beads are discreetly sized, and the diamond cluster catches the light gracefully without feeling loud. It has genuinely become a part of me." }
    ],
    4: [
      { t: "Very tasteful design", c: "Looks very chic and minimalist. The chain length is just right for collared shirts." },
      { t: "Lovely daily piece", c: "Dainty and graceful. I wish there was an extra jump ring for dual length adjustment, but still love it." },
      { t: "Delicate and meaningful", c: "The diamonds are clear and lively. Arrived safely packaged with all hallmark documents." }
    ],
    3: [
      { t: "Very dainty chain", c: "The pendant is lovely, but the chain is quite slender. Treat it gently when taking off over thick sweaters." },
      { t: "Subtle daily design", c: "Looks nice on, but the pendant is slightly more compact than what the zoom-in images conveyed." }
    ],
    2: [
      { t: "Smaller pendant than expected", c: "The black beads and chain are fine, but the central diamond pendant was smaller than expected for the price point." }
    ],
    1: [
      { t: "Delivery delay issue", c: "The product itself is well finished, but delivery took over 8 business days with lack of active tracking updates." }
    ]
  },

  chain: {
    5: [
      // Short
      { t: "Silken gold rope", c: "Drapes like liquid silk without any kinking or stiffness." },
      { t: "Ideal for daily layering", c: "Lightweight, radiant, and pairs effortlessly with any pendant." },
      { t: "Sturdy S-hook closure", c: "The clasp is thick, firm, and gives total peace of mind for daily wear." },
      { t: "High polish 22K gold", c: "The shine is deep, authentic, and hasn't dulled after months of wear." },
      // Medium
      { t: "The perfect everyday chain", c: "I wear this chain 24/7, including in the gym and shower. The 22K rope links are woven tightly and have shown zero signs of stretching." },
      { t: "Gleams from every angle", c: "The diamond-cut faceting on the links catches the light with every turn of the neck. An understated luxury staple." },
      // Long
      { t: "Superb link craftsmanship and weight", c: "I spent hours looking for an everyday gold chain that wouldn't feel hollow or fragile. This 22K chain has a genuine solid feel, glides over the skin without snagging delicate neck hairs, and looks fantastic on its own or layered. Truly top tier." }
    ],
    4: [
      { t: "Very good daily chain", c: "Solid links, great gold color, and comfortable weight. Clasp is sturdy." },
      { t: "Clean finish and bright shine", c: "Very happy with the purchase. The chain is slightly more delicate than pictured, but holds pendants well." },
      { t: "Quality gold rope", c: "Has held up well over several weeks of continuous use. Arrived in a very neat presentation box." }
    ],
    3: [
      { t: "Decent daily chain", c: "Looks nice and shiny, but the gauge is on the slender side. Better for lightweight pendants." },
      { t: "Good shine, clasp was stiff", c: "The chain links are smooth, but the S-hook took a little effort to open the first couple of times." }
    ],
    2: [
      { t: "Thinner than anticipated", c: "The chain is genuine 22K gold, but the thickness is quite delicate. Expected a slightly chunkier presence." }
    ],
    1: [
      { t: "Courier delivery was delayed", c: "The chain is fine, but the courier service delayed delivery by nearly a week without clear communication." }
    ]
  },

  pendant: {
    5: [
      // Short
      { t: "Radiant teardrop brilliance", c: "The halo setting makes the center stone look remarkably grand and fiery." },
      { t: "Pure understated luxury", c: "Sits flat against the chest and never flips over. Stunning craftsmanship." },
      { t: "Rose gold perfection", c: "The blush rose gold complements the brilliant-cut diamonds exquisitely." },
      { t: "Gift was a huge success", c: "Surprised my wife on her birthday, and she hasn't taken it off since." },
      // Medium
      { t: "Dazzling fire in every light", c: "The 32 brilliant-cut diamonds are handset with incredible precision. Under warm chandelier light, the pendant literally comes alive." },
      { t: "Classic heirloom silhouette", c: "The teardrop proportion is graceful and feminine. The bail is wide enough to accommodate different chain thicknesses easily." },
      // Long
      { t: "One of the finest pendants I own", c: "The attention to detail on this pendant is breathtaking. The prongs are tiny and unobtrusive, allowing maximum light into each diamond. The rose gold alloy has a rich, sophisticated pinkish warmth rather than a copper tone. Arrived with full authenticity documentation." }
    ],
    4: [
      { t: "Very graceful pendant", c: "The diamonds are clear and vibrant. Looks stunning against dark evening wear." },
      { t: "Lovely sparkle and finish", c: "Pendant has great presence. Chain is on the delicate side, but the pendant itself is immaculate." },
      { t: "High quality diamond setting", c: "Arrived securely packaged in luxury velvet. Very happy with the overall sparkle and feel." }
    ],
    3: [
      { t: "Pretty, but delicate scale", c: "The diamond sparkle is lovely, though the overall pendant footprint is slightly smaller than expected." },
      { t: "Good luster, thin chain", c: "The pendant itself is five stars, but the included chain is rather thin. Recommend using a sturdier chain." }
    ],
    2: [
      { t: "Smaller presence than expected", c: "The macro photography made it seem larger. It is a pretty piece, but very petite in person." }
    ],
    1: [
      { t: "Delayed shipping", c: "The pendant is fine, but the package was stuck in transit for 5 days past the promised delivery date." }
    ]
  },

  necklace_set: {
    5: [
      // Short
      { t: "Regal statement set", c: "The Zambian emeralds and uncut diamonds create a royal, unforgettable look." },
      { t: "Showstopper for weddings", c: "Wore this to a family wedding and was flooded with compliments all evening." },
      { t: "Flawless matching earrings", c: "The necklace and earrings are balanced in weight and visual symmetry." },
      { t: "Grand heritage aesthetic", c: "Feels like an antique heirloom passed down through royal generations." },
      // Medium
      { t: "Impeccable craftsmanship and stone color", c: "The deep green hue of the emeralds contrasted against 22K yellow gold is breathtaking. Each stone is set securely with refined prongs." },
      { t: "Balanced weight and comfort", c: "Despite the grandeur of the statement necklace, it sits flush along the collarbone without digging into the skin. The earrings are surprisingly wearable." },
      // Long
      { t: "A true masterpiece for the bride", c: "We ordered this set for my sister's wedding reception. Every single detail — from the back meenakari work to the matching drops on the maang tikka and earrings — was executed with extraordinary precision. It made her look like royalty. Worth every investment." }
    ],
    4: [
      { t: "Very grand ensemble", c: "The emerald and diamond combination looks stunning. Earring posts are sturdy." },
      { t: "Royal finish and great luster", c: "Looks deeply luxurious in event photos. Took a moment to arrange the drops neatly, but looked majestic." },
      { t: "High quality stones", c: "The gold weight is substantial and the stones have good clarity. Delivered on time in an ornate wooden box." }
    ],
    3: [
      { t: "Heavy piece, requires assistance", c: "The set is undoubtedly gorgeous, but you need assistance adjusting the necklace and maang tikka securely." },
      { t: "Emerald tone is deep", c: "The emeralds are slightly darker in ambient indoor light than in the brightly lit studio product shots." }
    ],
    2: [
      { t: "Earrings felt quite heavy", c: "The necklace is magnificent, but the earrings felt noticeably heavy after 3 hours of wear." }
    ],
    1: [
      { t: "Packaging box hinge was damaged", c: "The jewellery set is beautiful, but the ornate gift box had a damaged hinge upon arrival from courier." }
    ]
  },

  general: {
    5: [
      { t: "Stunning jewellery piece", c: "Exceeded all expectations in terms of finish, sparkle, and authenticity." },
      { t: "MikuMantra never disappoints", c: "Another flawless purchase. The gold purity and stones are verified and top grade." },
      { t: "Luxury at its finest", c: "The unboxing experience and piece quality are equal to international luxury houses." },
      { t: "Breathtaking design", c: "Looks so graceful and refined. Received endless compliments from friends and family." }
    ],
    4: [
      { t: "Very elegant and refined", c: "Delicate design and comfortable for all-day wear. Very satisfied." },
      { t: "Great quality and finish", c: "Looks premium and authentic. Delivery took one day longer than estimated, but item is great." },
      { t: "High quality craftsmanship", c: "The gold tone is warm and radiant. Matches effortlessly with ethnic and western wear." }
    ],
    3: [
      { t: "Decent piece overall", c: "Good shine and authentic hallmarking, though slightly more delicate than pictured." },
      { t: "Looks nice once worn", c: "Design is attractive, but double-check dimensions before placing your order." }
    ],
    2: [
      { t: "Smaller than anticipated", c: "The design is delicate, but the scale is a bit compact for the price tag." }
    ],
    1: [
      { t: "Disappointed with shipping", c: "The piece is fine, but delivery was significantly delayed by the courier service." }
    ]
  }
};

// Generates varied sentence modifications to guarantee 100% uniqueness
const UNIQUE_OPENERS = [
  "",
  "Honest review: ",
  "After wearing this piece: ",
  "Verified buyer verdict: ",
  "Personal experience: ",
  "Short review: ",
  "First impression: "
];

const UNIQUE_CLOSERS = [
  "",
  " Highly recommended.",
  " Very satisfied with MikuMantra.",
  " Would gladly purchase again.",
  " Worth every penny.",
  " Truly a piece to treasure.",
  " Kudos to the atelier team.",
  " Glad I made this choice.",
  " Definitely a keeper."
];

function pickRating() {
  const rand = Math.random();
  if (rand < 0.52) return 5;       // ~52% 5-star
  if (rand < 0.82) return 4;       // ~30% 4-star
  if (rand < 0.94) return 3;       // ~12% 3-star
  if (rand < 0.98) return 2;       // ~4% 2-star
  return 1;                        // ~2% 1-star
}

function randomDateWithinDays(minDaysAgo, maxDaysAgo) {
  const now = Date.now();
  const daysAgo = minDaysAgo + Math.random() * (maxDaysAgo - minDaysAgo);
  const date = new Date(now - daysAgo * 24 * 60 * 60 * 1000);
  date.setHours(Math.floor(Math.random() * 24), Math.floor(Math.random() * 60), Math.floor(Math.random() * 60));
  return date;
}

function generateUniqueReviewerName(usedNamesForProduct) {
  for (let attempt = 0; attempt < 500; attempt++) {
    const isFemale = Math.random() > 0.35;
    const firstPool = isFemale ? FIRST_NAMES_FEMALE : FIRST_NAMES_MALE;
    const first = firstPool[Math.floor(Math.random() * firstPool.length)];
    const last = SURNAMES[Math.floor(Math.random() * SURNAMES.length)];
    const fullName = `${first} ${last}`;
    if (!usedNamesForProduct.has(fullName)) {
      usedNamesForProduct.add(fullName);
      const email = `${first.toLowerCase()}.${last.toLowerCase()}${Math.floor(10 + Math.random() * 89)}@demo.mikumantra.in`;
      return { fullName, email };
    }
  }
  const fallback = `Client ${Math.floor(1000 + Math.random() * 9000)}`;
  return { fullName: fallback, email: `${fallback.toLowerCase()}@demo.mikumantra.in` };
}

async function recalculateProductRating(db, productId) {
  if (!db || !productId) return;
  try {
    const publishedReviews = await db.collection('reviews').find({
      productId,
      $or: [{ status: 'published' }, { status: { $exists: false }, approved: true }]
    }).toArray();

    const totalReviews = publishedReviews.length;
    let averageRating = 0;
    const breakdown = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };

    if (totalReviews > 0) {
      const sum = publishedReviews.reduce((acc, r) => {
        const ratingVal = Math.min(5, Math.max(1, Number(r.rating) || 5));
        breakdown[ratingVal] = (breakdown[ratingVal] || 0) + 1;
        return acc + ratingVal;
      }, 0);
      averageRating = Math.round((sum / totalReviews) * 10) / 10;
    }

    await db.collection('products').updateOne(
      { $or: [{ id: productId }, { slug: productId }] },
      { $set: { rating: averageRating, reviews: totalReviews, breakdown } }
    );
  } catch (err) {
    console.error(`Failed to recalculate rating for product ${productId}:`, err);
  }
}

async function main() {
  const isCleanOnly = process.argv.includes('--clean');
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI || process.env.MONGO_DIRECT_URL;

  if (!uri) {
    console.error('Error: MONGODB_URI is not set in environment or .env file.');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();

    // 1. If --clean flag passed, remove ONLY demo reviews and restore genuine ratings
    if (isCleanOnly) {
      console.log('\n--- CLEANING DEMO REVIEWS ONLY ---');
      const delResult = await db.collection('reviews').deleteMany({ isDemo: true });
      console.log(`Removed ${delResult.deletedCount} demo reviews.`);

      // Recalculate all products
      const allProducts = await db.collection('products').find({}).toArray();
      for (const p of allProducts) {
        await recalculateProductRating(db, p.id || p.slug);
      }
      console.log(`Recalculated ratings for ${allProducts.length} products.`);
      console.log('Cleanup completed successfully.\n');
      return;
    }

    // 2. Fetch all products currently available in the database
    const products = await db.collection('products').find({}).toArray();
    if (!products.length) {
      console.log('No products found in the database. Nothing to seed.');
      return;
    }

    console.log(`\n======================================================`);
    console.log(`Found ${products.length} products in database. Generating demo reviews...`);
    console.log(`======================================================\n`);

    // First remove any existing DEMO reviews so we don't accumulate duplicates on multiple runs,
    // but strictly PRESERVE all genuine customer reviews (!isDemo).
    const existingDemoDeleted = await db.collection('reviews').deleteMany({ isDemo: true });
    if (existingDemoDeleted.deletedCount > 0) {
      console.log(`Cleared ${existingDemoDeleted.deletedCount} previously generated demo reviews to maintain clean state.\n`);
    }

    const globalUsedComments = new Set();
    let totalReviewsCreated = 0;
    const summary = [];

    for (const prod of products) {
      const prodType = detectProductType(prod);
      const templateGroup = REVIEW_TEMPLATES[prodType] || REVIEW_TEMPLATES.general;

      // Random review count between 6 and 22 per product
      const reviewCount = Math.floor(Math.random() * (22 - 6 + 1)) + 6;

      const usedNamesForProduct = new Set();
      const productReviews = [];

      for (let i = 0; i < reviewCount; i++) {
        const rating = pickRating();
        const candidateTemplates = (templateGroup[rating] && templateGroup[rating].length)
          ? templateGroup[rating]
          : (REVIEW_TEMPLATES.general[rating] || REVIEW_TEMPLATES.general[5]);

        // Find or synthesize a unique comment
        let baseTemplate = candidateTemplates[Math.floor(Math.random() * candidateTemplates.length)];
        let title = baseTemplate.t;
        let comment = baseTemplate.c;

        // If this exact comment was used before, mutate with openers/closers
        if (globalUsedComments.has(comment)) {
          let uniqueFound = false;
          for (const op of UNIQUE_OPENERS) {
            for (const cl of UNIQUE_CLOSERS) {
              const candidate = `${op}${baseTemplate.c}${cl}`.trim();
              if (!globalUsedComments.has(candidate)) {
                comment = candidate;
                uniqueFound = true;
                break;
              }
            }
            if (uniqueFound) break;
          }
          if (!uniqueFound) {
            comment = `${baseTemplate.c} (Purchased ${prod.name || 'piece'})`;
          }
        }
        globalUsedComments.add(comment);

        const { fullName, email } = generateUniqueReviewerName(usedNamesForProduct);
        const reviewDate = randomDateWithinDays(2, 150);

        const reviewDoc = {
          id: crypto.randomUUID(),
          productId: prod.id || prod.slug,
          productSlug: prod.slug || prod.id,
          productName: prod.name || 'Fine Jewellery Piece',
          productImage: prod.images?.[0] || '',
          userId: `demo_user_${crypto.randomUUID().slice(0, 8)}`,
          reviewerName: fullName,
          reviewerEmail: email,
          orderNumber: `ORD-${Math.floor(100000 + Math.random() * 900000)}`,
          rating,
          title,
          comment,
          images: [],
          status: 'published',
          verifiedPurchase: true,
          approved: true,
          isDemo: true, // Clearly identifies this record as DEMO/SEED data
          createdAt: reviewDate,
          updatedAt: reviewDate
        };

        productReviews.push(reviewDoc);
      }

      // Insert reviews for this product
      if (productReviews.length > 0) {
        await db.collection('reviews').insertMany(productReviews);
        totalReviewsCreated += productReviews.length;
      }

      // Recalculate product rating & breakdown in `products` collection
      await recalculateProductRating(db, prod.id || prod.slug);

      // Fetch fresh rating for summary
      const updatedProd = await db.collection('products').findOne({ $or: [{ id: prod.id }, { slug: prod.slug }] });
      summary.push({
        name: prod.name,
        slug: prod.slug,
        id: prod.id,
        count: reviewCount,
        rating: updatedProd?.rating || 0
      });

      console.log(`Product: ${prod.name}`);
      console.log(`Reviews added: ${reviewCount}  (Average Rating: ${updatedProd?.rating || 0}★)`);
      console.log(`------------------------------------------------------`);
    }

    console.log(`\n======================================================`);
    console.log(`SEEDING COMPLETE!`);
    console.log(`Total Products Processed: ${products.length}`);
    console.log(`Total Demo Reviews Generated: ${totalReviewsCreated}`);
    console.log(`Review count per product: varied between 6 and 22`);
    console.log(`All records marked with: { isDemo: true }`);
    console.log(`======================================================\n`);

  } catch (err) {
    console.error('Seed script encountered an error:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

main();
