// Shared grocery subcategory definitions used in:
//  - GroceryStore page (for keyword-based product matching)
//  - Admin product form (subcategory dropdown)
//  - Vendor AddProduct / EditProduct forms

export interface GrocerySubcat {
  id: string;
  name: string;
  emoji: string;
  color: string;
  keywords: string[];
  /** Words that VETO a match even if a keyword matches (e.g. "ice cream" vetoes sugar) */
  excludes?: string[];
}

export const GROCERY_SUBCATS: GrocerySubcat[] = [
  {
    id: "rice",
    name: "Rice",
    emoji: "🍚",
    color: "hsl(35,85%,50%)",
    keywords: ["rice", "chawal", "basmati", "atap", "sella", "gobindo", "miniket", "kolam", "sona masoori", "chinigura"],
  },
  {
    id: "atta",
    name: "Atta & Flour",
    emoji: "🌾",
    color: "hsl(40,80%,48%)",
    keywords: ["atta", "flour", "maida", "suji", "semolina", "besan", "gram flour", "ragi", "bajra", "jowar"],
    excludes: ["kulfi", "ice cream", "khatta"],
  },
  {
    id: "dal",
    name: "Dal & Pulses",
    emoji: "🫘",
    color: "hsl(20,80%,50%)",
    keywords: ["masoor dal", "moong dal", "chana dal", "urad dal", "toor dal", "arhar dal", "rajma", "matar dal", "chhole", "chole", "chickpea", "lobiya", "black dal", "mix dal"],
  },
  {
    id: "oil",
    name: "Cooking Oil",
    emoji: "🫙",
    color: "hsl(50,90%,45%)",
    keywords: ["cooking oil", "mustard oil", "sunflower oil", "refined oil", "soyabean oil", "palm oil", "groundnut oil", "rice bran oil", "sarso tel", "sarisher tel", "vegetable oil"],
    excludes: ["hair oil", "almond oil", "coconut oil body", "crayon", "pastel"],
  },
  {
    id: "spices",
    name: "Spices & Masala",
    emoji: "🌶️",
    color: "hsl(5,90%,50%)",
    keywords: ["spice", "masala", "turmeric powder", "haldi", "jeera", "cumin", "coriander powder", "dhania", "black pepper", "garam masala", "chilli powder", "mirchi powder", "ajwain", "hing", "cardamom", "elaichi", "cloves", "bay leaf", "tejpatta", "cinnamon", "dalchini", "chaat masala", "kasuri methi"],
  },
  {
    id: "tea",
    name: "Tea & Coffee",
    emoji: "🍵",
    color: "hsl(30,70%,40%)",
    keywords: ["tea leaves", "green tea", "black tea", "red label", "tata tea", "wagh bakri", "brooke bond", "lipton tea", "taj mahal tea", "assam tea", "darjeeling tea", "nescafe", "bru coffee", "bru instant", "coffee powder", "filter coffee", "instant coffee"],
    excludes: ["brush", "toothbrush"],
  },
  {
    id: "sugar",
    name: "Sugar & Salt",
    emoji: "🧂",
    color: "hsl(200,60%,50%)",
    keywords: ["sugar", "chini", "jaggery", "nolen gur", "rock salt", "sendha namak", "iodised salt", "tata salt", "sea salt", "powdered sugar"],
    excludes: ["ice cream", "kulfi", "candy", "chocolate", "sweet", "mishti", "payesh"],
  },
  {
    id: "biscuits",
    name: "Biscuits & Cookies",
    emoji: "🍪",
    color: "hsl(30,75%,50%)",
    keywords: ["biscuit", "cookie", "marie biscuit", "parle", "bourbon", "glucose biscuit", "digestive", "hide & seek", "oreo", "good day", "little hearts", "jim jam", "krackjack", "dark fantasy", "cream biscuit"],
  },
  {
    id: "chocolates",
    name: "Chocolates & Candy",
    emoji: "🍫",
    color: "hsl(25,65%,35%)",
    keywords: ["chocolate", "kitkat", "dairy milk", "5 star chocolate", "gems chocolate", "cadbury", "ferrero", "silk chocolate", "snickers", "bounty", "eclairs", "munch", "perk chocolate", "milkybar", "candy", "toffee", "lollipop", "choco bar"],
  },
  {
    id: "drinks",
    name: "Drinks & Cold Drinks",
    emoji: "🥤",
    color: "hsl(210,75%,50%)",
    keywords: ["cold drink", "soft drink", "pepsi", "sprite", "coca cola", "coke", "limca", "thums up", "maaza", "frooti", "appy fizz", "slice", "sharbat", "squash", "nimbu pani", "lemon drink", "mango juice", "mixed fruit juice", "real juice"],
    excludes: ["health drink", "horlicks", "bournvita"],
  },
  {
    id: "health-drinks",
    name: "Health Drinks",
    emoji: "💪",
    color: "hsl(145,60%,38%)",
    keywords: ["horlicks", "bournvita", "complan", "protinex", "boost health", "ovaltine", "milo health", "glucon-d", "glucon d", "pedialyte", "electral", "protein powder", "whey protein", "energy drink"],
  },
  {
    id: "bread",
    name: "Bread & Bakery",
    emoji: "🍞",
    color: "hsl(35,80%,52%)",
    keywords: ["bread", "pav", "bun", "rusk", "toast bread", "sandwich bread", "brown bread", "white bread", "multigrain bread", "whole wheat bread"],
    excludes: ["breadwinner"],
  },
  {
    id: "noodles",
    name: "Noodles & Pasta",
    emoji: "🍜",
    color: "hsl(15,80%,50%)",
    keywords: ["noodles", "pasta", "maggi", "yippee", "hakka noodles", "macaroni", "vermicelli", "sewai", "semiya", "cup noodle", "instant noodle", "spaghetti"],
  },
  {
    id: "cereals",
    name: "Cereals & Chocos",
    emoji: "🥣",
    color: "hsl(40,85%,48%)",
    keywords: ["corn flakes", "cornflakes", "muesli", "oats", "oatmeal", "kellogg", "quaker oats", "chocos cereal", "upma mix", "poha"],
  },
  {
    id: "dry-fruits",
    name: "Dry Fruits & Nuts",
    emoji: "🥜",
    color: "hsl(30,65%,42%)",
    keywords: ["cashew", "kaju", "almond", "badam", "raisin", "kishmish", "pista", "pistachio", "walnut", "akhrot", "dates", "khajur", "anjeer", "fig", "apricot", "mixed nuts", "groundnut", "dry fruits"],
  },
  {
    id: "soap",
    name: "Soap & Body Wash",
    emoji: "🧼",
    color: "hsl(185,60%,45%)",
    keywords: ["bathing soap", "body wash", "handwash", "hand wash", "lifebuoy", "lux soap", "dove soap", "dettol soap", "pears soap", "savlon soap", "bath soap", "shower gel", "liquid soap"],
  },
  {
    id: "dental",
    name: "Toothpaste & Brush",
    emoji: "🪥",
    color: "hsl(170,60%,40%)",
    keywords: ["toothpaste", "toothbrush", "tooth paste", "tooth brush", "colgate", "sensodyne", "pepsodent", "close up toothpaste", "oral-b", "mouthwash", "tongue cleaner", "floss"],
  },
  {
    id: "snacks",
    name: "Snacks & Namkeen",
    emoji: "🍿",
    color: "hsl(45,90%,48%)",
    keywords: ["namkeen", "bhujia", "mixture", "popcorn", "lays", "pringles", "doritos", "chanachur", "puffed rice snack", "chivda", "murukku", "mathri", "fryums", "ratlami", "haldiram", "bikaji"],
    excludes: ["momo", "noodles", "pasta"],
  },
  {
    id: "dairy",
    name: "Dairy & Milk",
    emoji: "🥛",
    color: "hsl(200,70%,50%)",
    keywords: ["milk packet", "amul milk", "toned milk", "full cream milk", "curd", "dahi", "paneer", "butter", "cheese", "cream", "yogurt", "lassi", "ghee", "condensed milk", "khoa", "mawa"],
    excludes: ["ice cream", "kulfi"],
  },
  {
    id: "personal-care",
    name: "Personal Care",
    emoji: "🧴",
    color: "hsl(280,55%,55%)",
    keywords: ["shampoo", "hair conditioner", "lotion", "moisturiser", "face wash", "fairness cream", "sunscreen", "sunblock", "deodorant stick", "perfume", "hair oil", "aloe vera gel", "vaseline", "talcum powder", "face pack", "toner", "serum", "lip balm"],
    excludes: ["cable", "pen", "pencil", "crayon", "video", "audio"],
  },
  {
    id: "cleaning",
    name: "Cleaning & Household",
    emoji: "🏡",
    color: "hsl(220,60%,50%)",
    keywords: ["detergent", "washing powder", "surf excel", "tide detergent", "ariel", "vim", "phenyl", "lizol", "toilet cleaner", "floor cleaner", "dishwash", "scotch brite", "mop", "broom", "garbage bag"],
  },
  {
    id: "pooja",
    name: "Pooja & Spiritual",
    emoji: "🪔",
    color: "hsl(35,90%,50%)",
    keywords: ["agarbatti", "incense stick", "camphor", "kapoor", "diya", "sindoor", "kumkum", "dhoop", "pooja item", "cotton bati"],
  },
  {
    id: "frozen",
    name: "Frozen & Packaged",
    emoji: "🧊",
    color: "hsl(195,70%,50%)",
    keywords: ["frozen", "ready to cook", "tinned", "canned", "pickle", "achar", "jam", "jelly", "sauce", "ketchup", "mayonnaise", "vinegar", "peanut butter", "cheese spread"],
    excludes: ["biscuit", "chips", "chocolate", "candy"],
  },
];

/** Flat list of subcategory names for dropdowns (ordered) */
export const GROCERY_SUBCAT_OPTIONS = GROCERY_SUBCATS.map(sc => ({
  value: sc.id,
  label: `${sc.emoji} ${sc.name}`,
}));
