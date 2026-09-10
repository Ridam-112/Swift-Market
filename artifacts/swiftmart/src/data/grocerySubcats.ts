// Shared grocery subcategory definitions used in:
//  - GroceryStore page (for keyword-based product matching and subcategory navigation)
//  - Admin product form (subcategory dropdown)
//  - Vendor AddProduct / EditProduct forms

export interface GrocerySubcat {
  id: string;
  name: string;
  emoji: string;
  color: string;
  keywords: string[];
}

export const GROCERY_SUBCATS: GrocerySubcat[] = [
  {
    id: "vegetables",
    name: "Fresh Vegetables",
    emoji: "🥦",
    color: "hsl(140,65%,42%)",
    keywords: ["vegetables", "sabji", "potato", "onion", "tomato", "green chilli"],
  },
  {
    id: "fruits",
    name: "Fresh Fruits",
    emoji: "🍎",
    color: "hsl(10,80%,50%)",
    keywords: ["fruits", "apple", "banana", "orange", "mango", "pomegranate"],
  },
  {
    id: "rice",
    name: "Rice & Grains",
    emoji: "🍚",
    color: "hsl(35,85%,50%)",
    keywords: ["rice", "chawal", "basmati", "atap", "gobindo", "miniket", "poha", "muri", "sabudana"],
  },
  {
    id: "atta",
    name: "Atta & Flours",
    emoji: "🌾",
    color: "hsl(40,80%,48%)",
    keywords: ["atta", "flour", "maida", "suji", "sooji", "semolina", "besan", "sattu", "dalia"],
  },
  {
    id: "dal",
    name: "Dal & Pulses",
    emoji: "🫘",
    color: "hsl(20,80%,50%)",
    keywords: ["dal", "masoor", "moong", "chana", "urad", "toor", "arhar", "rajma", "chole", "soya chunks", "nutrela"],
  },
  {
    id: "oil",
    name: "Cooking Oil & Ghee",
    emoji: "🫙",
    color: "hsl(50,90%,45%)",
    keywords: ["mustard oil", "sunflower oil", "refined oil", "soyabean oil", "rice bran oil", "ghee"],
  },
  {
    id: "spices",
    name: "Spices & Masala",
    emoji: "🌶️",
    color: "hsl(5,90%,50%)",
    keywords: ["spice", "masala", "turmeric", "haldi", "jeera", "cumin", "dhania", "chilli", "mirchi", "hing", "elaichi", "clove", "cinnamon"],
  },
  {
    id: "tea",
    name: "Tea & Coffee",
    emoji: "🍵",
    color: "hsl(30,70%,40%)",
    keywords: ["tea", "chai", "coffee", "nescafe", "bru", "lipton", "tata tea", "red label", "taj mahal"],
  },
  {
    id: "sugar",
    name: "Sugar, Salt & Honey",
    emoji: "🧂",
    color: "hsl(200,60%,50%)",
    keywords: ["sugar", "chini", "jaggery", "gur", "salt", "namak", "tata salt", "honey"],
  },
  {
    id: "biscuits",
    name: "Biscuits & Cookies",
    emoji: "🍪",
    color: "hsl(30,75%,50%)",
    keywords: ["biscuit", "cookie", "marie", "parle", "bourbon", "digestive", "hide & seek", "oreo", "good day", "rusk"],
  },
  {
    id: "chocolates",
    name: "Chocolates & Sweets",
    emoji: "🍫",
    color: "hsl(25,65%,35%)",
    keywords: ["chocolate", "kitkat", "dairy milk", "5 star", "gems", "cadbury", "snickers", "candy", "toffee", "lollipop", "sweet"],
  },
  {
    id: "drinks",
    name: "Cold Drinks & Juices",
    emoji: "🥤",
    color: "hsl(210,75%,50%)",
    keywords: ["cold drink", "soft drink", "pepsi", "sprite", "coke", "thums up", "maaza", "frooti", "appy fizz", "juice", "soda"],
  },
  {
    id: "health-drinks",
    name: "Health Drinks",
    emoji: "💪",
    color: "hsl(145,60%,38%)",
    keywords: ["horlicks", "bournvita", "complan", "protinex", "boost", "glucon-d", "ensure", "pediasure", "protein powder"],
  },
  {
    id: "bread",
    name: "Bread & Bakery",
    emoji: "🍞",
    color: "hsl(35,80%,52%)",
    keywords: ["bread", "pav", "bun", "fruit cake", "bar cake", "muffin", "donut", "cake"],
  },
  {
    id: "noodles",
    name: "Noodles & Pasta",
    emoji: "🍜",
    color: "hsl(15,80%,50%)",
    keywords: ["noodles", "pasta", "maggi", "yippee", "hakka noodles", "macaroni", "vermicelli", "sewai", "soup"],
  },
  {
    id: "cereals",
    name: "Cereals & Oats",
    emoji: "🥣",
    color: "hsl(40,85%,48%)",
    keywords: ["corn flakes", "cornflakes", "muesli", "oats", "oatmeal", "kellogg", "quaker oats", "chocos"],
  },
  {
    id: "dry-fruits",
    name: "Dry Fruits & Nuts",
    emoji: "🥜",
    color: "hsl(30,65%,42%)",
    keywords: ["cashew", "kaju", "almond", "badam", "raisin", "kishmish", "pista", "walnut", "dates", "khajur", "khejur", "peanuts"],
  },
  {
    id: "soap",
    name: "Soap & Body Wash",
    emoji: "🧼",
    color: "hsl(185,60%,45%)",
    keywords: ["bathing soap", "body wash", "handwash", "hand wash", "lifebuoy", "lux", "dove bar", "pears", "dettol soap", "santoor", "shower gel"],
  },
  {
    id: "dental",
    name: "Toothpaste & Brush",
    emoji: "🪥",
    color: "hsl(170,60%,40%)",
    keywords: ["toothpaste", "toothbrush", "colgate", "sensodyne", "pepsodent", "close up", "dabur red", "oral-b", "mouthwash"],
  },
  {
    id: "snacks",
    name: "Snacks & Namkeen",
    emoji: "🍿",
    color: "hsl(45,90%,48%)",
    keywords: ["namkeen", "bhujia", "mixture", "popcorn", "lays", "pringles", "doritos", "chanachur", "uncle chips", "bingo"],
  },
  {
    id: "dairy",
    name: "Dairy, Milk & Butter",
    emoji: "🥛",
    color: "hsl(200,70%,50%)",
    keywords: ["milk", "amul milk", "toned milk", "curd", "dahi", "paneer", "butter", "cheese", "cream", "yogurt", "lassi", "dairy whitener"],
  },
  {
    id: "personal-care",
    name: "Personal & Hair Care",
    emoji: "🧴",
    color: "hsl(280,55%,55%)",
    keywords: ["shampoo", "hair conditioner", "hair oil", "lotion", "moisturiser", "face wash", "cream", "deodorant", "perfume", "vaseline", "talcum powder"],
  },
  {
    id: "baby-care",
    name: "Baby Care",
    emoji: "👶",
    color: "hsl(330,70%,55%)",
    keywords: ["baby diaper", "pampers", "huggies", "baby wipes", "cerelac", "baby lotion", "baby soap", "baby powder"],
  },
  {
    id: "cleaning",
    name: "Cleaning & Household",
    emoji: "🏡",
    color: "hsl(220,60%,50%)",
    keywords: ["detergent", "washing powder", "surf excel", "tide", "ariel", "vim", "phenyl", "lizol", "harpic", "dishwash", "floor cleaner"],
  },
  {
    id: "pooja",
    name: "Pooja & Agarbatti",
    emoji: "🪔",
    color: "hsl(35,90%,50%)",
    keywords: ["agarbatti", "incense", "camphor", "kapoor", "diya", "sindoor", "kumkum", "dhoop", "pooja item"],
  },
  {
    id: "frozen",
    name: "Sauces, Pickles & Frozen",
    emoji: "🧊",
    color: "hsl(195,70%,50%)",
    keywords: ["sauce", "ketchup", "jam", "pickle", "achar", "mayonnaise", "vinegar", "peanut butter", "frozen", "papad", "ice cream"],
  },
];

/** Flat list of subcategory names for dropdowns (ordered) */
export const GROCERY_SUBCAT_OPTIONS = GROCERY_SUBCATS.map(sc => ({
  value: sc.id,
  label: `${sc.emoji} ${sc.name}`,
}));

/**
 * Clean classifier function to determine product grocery subcategory strictly based on product attributes and name.
 */
export function classifyGroceryProduct(product: { name?: string; category?: string; subcategory?: string }): string | null {
  const name = (product.name || "").trim().toLowerCase();
  const cat = (product.category || "").trim().toLowerCase();
  const subcat = (product.subcategory || "").trim().toLowerCase();

  // If DB subcategory already directly matches a known subcat ID, use it
  const validIds = new Set(GROCERY_SUBCATS.map(s => s.id));
  if (subcat && validIds.has(subcat)) {
    return subcat;
  }

  // Definite Non-Grocery exclusions
  if (/pencil|pen ink|knox pen|clay|steel bottle|notebook|register|scissor|fevicol|geometry|flash drive|usb|charger|steam iron|bulb|led|briefs|panty|trunks|container|jar|straws|scale|eraser/i.test(name)) {
    return null;
  }

  // 1. FRESH VEGETABLES
  if (cat === "vegetables" || (cat === "fruits-vegetables" && (subcat.includes("veg") || /potato|onion|tomato|lemon/i.test(name))) ||
      /\b(potato|onion|tomato|ginger|garlic|adrak|lahsun|lemon|lebu|capsicum|cabbage|cauliflower|brinjal|baingan|potol|jhinga|korola|karela|lauki|bottle gourd|pumpkin|kaddu|cucumber|shosha|palak|spinach|carrot|gajar|beetroot|beet root|radish|mooli|pepe|papaya raw|bitter gourd|ridge gourd|pointed gourd|french beans|bhindi|lady finger|okra|sweet corn|mushroom|dhania leaves|coriander leaves|curry leaves|pudina|mint leaves)\b/i.test(name) && !/frozen|chips|sauce|paste|powder|soup/i.test(name)) {
    return "vegetables";
  }

  // 2. FRESH FRUITS
  if (cat === "fruits" || (cat === "fruits-vegetables" && (subcat.includes("fruit") || /apple|banana|orange|mango/i.test(name))) ||
      /\b(apple|seb|banana|kela|orange|santra|mosambi|pomegranate|anar|grapes|angur|mango|aam|watermelon|tarbuj|guava|peru|papaya ripe|pineapple|ananas|sweet lime|kiwi|dragon fruit)\b/i.test(name) && !/juice|drink|cake|jam|shake|biscuit|cream|facewash/i.test(name)) {
    return "fruits";
  }

  // 3. POOJA & SPIRITUAL
  if (/\b(agarbatti|incense|dhoop|camphor|kapoor|sambrani|hawan|diya|sindoor|kumkum|puja|pooja|champa|loban|mangaldeep|cycle pure|flute|matchbox|cotton bati)\b/i.test(name) || cat === "pooja" || subcat.includes("pooja")) {
    return "pooja";
  }

  // 4. CLEANING & HOUSEHOLD
  if (/\b(detergent|surf excel|ariel|tide|wheel|rin powder|rin bar|washing powder|dishwash|vim|pril|scotch brite|scrub pad|scrubz|floor cleaner|toilet cleaner|harpic|lizol|colin|drain cleaner|phenyl|mop|mopz|broom|garbage bag|odoz|good knight|all out|hit mosquito|mosquito repellent|liquid detergent|matic|comfort fabric|bleach|cleaner spray)\b/i.test(name) ||
      cat === "cleaning-essentials" || subcat.includes("detergent") || subcat.includes("dishwashing") || subcat.includes("laundry") || subcat.includes("repellent")) {
    return "cleaning";
  }

  // 5. DENTAL / ORAL CARE
  if (/\b(toothpaste|tooth paste|toothbrush|tooth brush|toothpowder|tooth powder|mouthwash|tongue cleaner|colgate|sensodyne|pepsodent|close up|dabur red|oral-b|meswak|vicco vajradanti|dental)\b/i.test(name) ||
      cat === "oral-care" || subcat.includes("oral") || subcat.includes("dental")) {
    return "dental";
  }

  // 6. BABY CARE
  if (/\b(baby diaper|diapers|pampers|huggies|mamy poko|baby wipes|wipes|cerelac|nestum|baby lotion|baby oil|baby powder|baby soap|baby wash|johnson's baby|johnson baby|sebamed baby)\b/i.test(name) ||
      cat === "baby-care" || subcat.includes("baby")) {
    return "baby-care";
  }

  // 7. SOAP & BODY WASH
  if (!/face wash|facewash|shampoo|conditioner|hair|lotion/i.test(name) &&
      (/\b(bathing soap|bath soap|bar soap|soap bar|body wash|shower gel|handwash|hand wash|liquid hand wash|lifebuoy|pears|santoor|medimix|cinthol|fiama|mysore sandal|godrej no\.?1)\b/i.test(name) ||
       /\b(dove bar|dove cream beauty|dettol soap|lux)\b/i.test(name) ||
       (name === "dettol" && /grocery|bath/i.test(cat)) ||
       (cat === "bath-body" && /soap|bathing bar|body wash|shower gel|hand wash/i.test(name)))) {
    return "soap";
  }

  // 8. PERSONAL CARE, SKINCARE & HAIRCARE
  if (/\b(shampoo|conditioner|hair oil|coconut hair oil|almond hair oil|amla hair oil|mustard hair oil|jasmine hair oil|face wash|facewash|face scrub|face pack|face cream|moisturiser|moisturizer|body lotion|skin cream|fairness cream|glow & lovely|glow&lovely|fair & lovely|vaseline|nivea body|nivea soft|nivea cream|ponds|lakme|garnier|clean & clear|mamaearth|deodorant|deo|body spray|perfume|talc|talcum powder|shaving cream|shaving gel|razor|blade|gillette|sanitary|whisper|stayfree|sofy|pad|lip balm|lip care|kajal|eyeliner|rose water|gulabari|boroplus|boroline|hair color|hair dye|godrej expert|streax|face gel|multivitamin serum|serum)\b/i.test(name) ||
      cat === "skincare" || cat === "haircare" || cat === "beauty-personal-care" || cat === "fragrance" || cat === "feminine-hygiene" || cat === "bath-body") {
    return "personal-care";
  }

  // 9. HEALTH DRINKS & SUPPLEMENTS
  if (/\b(horlicks|bournvita|complan|protinex|boost|ensure|pediasure|glucon-d|glucon d|glucose-d|glucose d|tangy orange glucose|electral|whey protein|protein powder|chyawanprash)\b/i.test(name) ||
      cat === "protein-nutrition" || subcat.includes("health-drink")) {
    return "health-drinks";
  }

  // 10. TEA & COFFEE
  if (/\b(tea|coffee|chai|nescafe|bru|lipton|taj mahal tea|tata tea|red label|wagh bakri|society tea|tetley|green tea|tea bags|instant coffee|filter coffee|cappuccino|latte)\b/i.test(name) ||
      cat === "tea-coffee" || subcat.includes("tea") || subcat.includes("coffee")) {
    return "tea";
  }

  // 11. COLD DRINKS, JUICES & BEVERAGES
  if (/\b(cold drink|cold drinks|soft drink|pepsi|coca cola|coca-cola|cocacola|coke|sprite|thums up|thumbs up|limca|fanta|mirinda|mountain dew|dew|7up|7 up|sting|red bull|monster|appie|appy fizz|frooti|maaza|mazza|slice|real juice|b natural|tropicana|paper boat|minute maid|sharbat|squash|rooh afza|syrup|soda water|kinley soda|jeera soda|campa cola|bisleri|mineral water|packaged drinking water|lemon drink|fruit juice|pomegranate juice|apple juice|mango juice|orange juice|flavoured milk|kool badam|milkshake)\b/i.test(name) ||
      cat === "cold-drinks" || (cat === "drinks" && !/roll|chop/i.test(name)) || subcat.includes("juice") || subcat.includes("cold drink") || subcat.includes("beverage")) {
    return "drinks";
  }

  // 12. BISCUITS & COOKIES
  if (/\b(biscuit|biscuits|cookie|cookies|rusk|toast|marie|parle-g|parle g|good day|goodday|oreo|bourbon|hide & seek|hide and seek|dark fantasy|krackjack|monaco|50-50|fifty fifty|little hearts|little heart|jim jam|jimjam|bounce|treat|tiger|britannia nutrichoice|nutrichoice|digestive|unibic|sobisco biscuit|bisk farm googly|bisk farm|potata|crackers|oatmeal cookies|oats cookies|digestive cookies)\b/i.test(name) ||
      cat === "biscuits-cookies" || subcat.includes("biscuit") || subcat.includes("cookie")) {
    return "biscuits";
  }

  // 13. NOODLES, PASTA & INSTANT FOOD
  if (/\b(maggi|maggie|yippee|wai wai|top ramen|hakka noodles|instant noodles|noodles|chowmin|macaroni|pasta|spaghetti|fusilli|penne|vermicelli|sewai|semiya|cup noodles|soup powder|knorr soup|ching's secret|chings)\b/i.test(name) ||
      cat === "instant-food" || (cat === "packaged-food" && /noodle|pasta|macaroni|soup|sewai|vermicelli/i.test(name))) {
    return "noodles";
  }

  // 14. CEREALS & BREAKFAST OATS
  if (/\b(corn flakes|cornflakes|cornflex|chocos|muesli|kellogg|kellogg's|oats|oatmeal|quaker oats|saffola oats|rolled oats|breakfast cereal)\b/i.test(name) ||
      (cat === "breakfast-sauces" && /cereal|oat|corn flake|chocos|muesli/i.test(name))) {
    return "cereals";
  }

  // 15. BREAD, BUNS & CAKES
  if (/\b(bread|brown bread|white bread|sandwich bread|pav|bun|buns|dry cake|fruit cake|bar cake|sponge cake|cupcake|muffin|plum cake|donut|doughnut|winkies|winkes|swiss roll|britannia cake|sobisco cake|kamals fruit cake|raja donut)\b/i.test(name) ||
      (cat === "bakery" && !/biscuit/i.test(name))) {
    return "bread";
  }

  // 16. CHOCOLATES, CANDIES & SWEETS
  if (/\b(chocolate|chocolates|cadbury|dairy milk|5 star|five star|kitkat|kit kat|munch|perk|silk|snickers|galaxy|ferrero|gems|milkybar|milky bar|kinder joy|kinderjoy|eclairs|melody|alpenliebe|kaccha aam|mentos|chupa chups|lollipop|candy|candies|toffee|toffees|choco|falooda|gulab jamun|rasgulla|rosogolla|rasbhari|sweet box|haldiram sweets|bikano sweets)\b/i.test(name) ||
      cat === "chocolates" || cat === "sweets" || subcat.includes("chocolate") || subcat.includes("candy") || subcat.includes("sweets")) {
    return "chocolates";
  }

  // 17. SNACKS, CHIPS & NAMKEEN
  if (/\b(chips|lays|kurkure|bingo|mad angles|tedhe medhe|tede mede|uncle chips|uncle chipps|pringles|doritos|corn chips|nachos|namkeen|bhujia|aloo bhujia|sev|chanachur|chana chur|jhal chanachur|sweet & sour chanachur|mixture|khatta meetha|all in one mixture|dal biji|dalmoth|chana bhaja|chana jor|salted badam|salted peanut|peanuts salted|popcorn|act ii|fryums|papad snack|puffed rice snack|murmura namkeen|salted refill)\b/i.test(name) ||
      cat === "snacks" || cat === "snacks-drinks" || subcat.includes("chips") || subcat.includes("namkeen")) {
    return "snacks";
  }

  // 18. DRY FRUITS & NUTS
  if (/\b(kaju|cashew|cashews|badam|almond|almonds|pista|pistachio|pistachios|kishmish|raisin|raisins|kismis|akhrot|walnut|walnuts|khajur|khejur|dates|anjeer|fig|figs|dry fruits|dry fruit|peanuts|raw peanuts|organic peanuts|makhana|fox nuts|apricot|prunes)\b/i.test(name) && !/badam milk|kool badam|kaju katli|almond hair oil|badam oil|ice cream|kulfi|shake/i.test(name)) {
    return "dry-fruits";
  }

  // 19. DAIRY, MILK, PANEER, BUTTER & CURD
  if (/\b(milk|toned milk|full cream milk|cow milk|dairy whitener|everyday milk|everyday dairy whitener|amulspray|amul milk|amul gold|amul taza|mother dairy milk|curd|dahi|doi|tok doi|mishti doi|mishti dai|yogurt|paneer|butter|amul butter|cheese|cheese cubes|cheese slice|cheese slices|cheese spread|fresh cream|whipping cream|lassi|chaas|buttermilk|condensed milk|milkmaid|khoa|mawa)\b/i.test(name) ||
      ((cat === "dairy" || cat === "dairy-bread-eggs") && !/body milk|hair|shampoo|soap|detergent|biscuit/i.test(name))) {
    return "dairy";
  }

  // 20. COOKING OIL & GHEE
  if (/\b(mustard oil|sunflower oil|refined oil|soyabean oil|soybean oil|rice bran oil|groundnut oil|sesame oil|til oil|olive oil|cooking oil|edible oil|vegetable oil|vanaspati|dalda|ghee|pure ghee|desi ghee|cow ghee|amul ghee|jharna ghee)\b/i.test(name) ||
      (/\b(oil|ghee)\b/i.test(name) && /fortune|dhara|doctor choice|emami healthy|engine|saloni|saffola|patanjali ghee|amul ghee|mother dairy ghee/i.test(name) && !/hair|body|massage|baby/i.test(name))) {
    return "oil";
  }

  // 21. ATTA, MAIDA, SOOJI & FLOURS
  if (/\b(atta|chakki fresh atta|whole wheat atta|wheat flour|maida|sooji|suji|semolina|rava|besan|gram flour|sattu|sattoo|chana sattu|chaatu|dosa mix|idli mix|ragi flour|bajra flour|jowar flour|rice flour|makki atta|corn flour|baking soda|dalia|wheat dalia)\b/i.test(name) ||
      (cat === "grocery" && /atta|maida|sooji|suji|besan|flour|dalia|chaatu|sattoo/i.test(name))) {
    return "atta";
  }

  // 22. DAL & PULSES
  if (/\b(masoor dal|moong dal|mung dal|chana dal|toor dal|tur dal|arhar dal|urad dal|urad gota|urad chilka|gota urad|whole urad|whole moong|whole masoor|malka masoor|masoor malka|rajma|chole|kabuli chana|desi chana|black chana|matar dal|yellow peas|green peas dal|dry white peas|white peas|white vatana|vatana|barbati|moth bean|khichadi mix|tadka mix|lobiya|lobia|kulthi|horsegram|mix dal|panchratna dal|soya chunks|soya wadi|soya bean|soyabean chunks|nutrela|soya mini chunks)\b/i.test(name) ||
      (/\b(dal|pulse|pulses|rajma|chana|chole|urad|moong|masoor)\b/i.test(name) && !/dal biji|dalchini|chanachur|chana bhaja|dalda|khatta/i.test(name))) {
    return "dal";
  }

  // 23. RICE & GRAINS
  if (/\b(rice|basmati|chawal|miniket|sona masoori|gobindobhog|gobindo bhog|atap|kolam|banskathi|dudheshwar|parboiled rice|raw rice|brown rice|red rice|biryani kit|kodo millet|millet|poha|chiwda|flattened rice|muri|puffed rice|sabudana|sago|barley)\b/i.test(name) && !/face wash|facewash|cream|lotion|crispy rice|papad/i.test(name)) {
    return "rice";
  }

  // 24. SUGAR, JAGGERY & SALT
  if (/\b(sugar|chini|suger|refined sugar|white sugar|brown sugar|sugar free|sugarfree|jaggery|gur|guda|nolen gur|patali gur|honey|dabur honey|patanjali honey|saffola active honey|salt|namak|tata salt|rock salt|sendha namak|black salt|kala namak|iodised salt)\b/i.test(name) && !/juice|badam|salted|chanachur|biscuit|chips|doi/i.test(name)) {
    return "sugar";
  }

  // 25. SPICES & MASALA
  if (/\b(spice|spices|masala|turmeric|haldi|jeera|cumin|dhania|coriander|mirch|mirchi|chilli|red chilli|chilli powder|black pepper|gol marich|kali mirch|garam masala|chicken masala|meat masala|fish masala|biryani masala|sabji masala|paneer masala|chaat masala|chana masala|sambhar masala|kasuri methi|methi|fenugreek|ajwain|carom|hing|asafoetida|cardamom|elaichi|chhoti elaichi|badi elaichi|clove|cloves|laung|cinnamon|dalchini|bay leaf|bay leaves|tejpatta|tej patta|nutmeg|jaiphal|mace|javitri|mustard seeds|sarson|rai|panch phoron|panchphoron|posto|poppy seeds|kasundi|tamarind|imli|powder)\b/i.test(name) ||
      cat === "spices-dryfruits" || subcat.includes("spice") || subcat.includes("masala")) {
    return "spices";
  }

  // 26. FROZEN, SAUCES, SPREADS, PICKLES & ICE CREAM
  if (/\b(sauce|ketchup|tomato ketchup|chilli sauce|green chilli sauce|red chilli sauce|soya sauce|vinegar|mayonnaise|mayo|jam|kissan jam|fruit jam|mixed fruit jam|pickle|achar|mango pickle|lemon pickle|mixed pickle|peanut butter|spread|schezwan sauce|pasta sauce|pizza sauce|papad|appalam|frozen|green peas frozen|french fries|mccain|ice cream|kulfi|cornetto|cassata|frozen dessert)\b/i.test(name) ||
      cat === "breakfast-sauces" || cat === "frozen-foods" || subcat.includes("sauce") || subcat.includes("pickle") || subcat.includes("spread") || subcat.includes("frozen")) {
    return "frozen";
  }

  return null;
}

