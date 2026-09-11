/**
 * lib/spacesEconomy.ts
 * ─────────────────────────────────────────────────────
 * Virtual Paper Money & Social Party Economy Core
 * - Wallet Balance & Currency System (💵 Echo Cash)
 * - Catering Menu: Butter Naan, Pasta, Cake, Champagne, Chinese, Chills
 * - Friend Gifting Catalog: Roses, Crowns, Bears, Chocolates
 * - Wardrobe Boutique Outfits
 * - Table Dish & Seating State
 */

export interface CateringItem {
  id: string;
  name: string;
  category: "food" | "drink" | "dessert" | "snacks";
  icon: string;
  price: number; // in Echo Cash 💵
  description: string;
  servings: number;
  tableSprite: string;
}

export interface GiftItem {
  id: string;
  name: string;
  icon: string;
  price: number;
  description: string;
  sparkleColor: string;
}

export interface BoutiqueOutfit {
  id: string;
  name: string;
  icon: string;
  price: number;
  description: string;
  outfitType: "hoodie" | "suit" | "dress" | "tuxedo" | "bomber" | "robe";
  color: string;
  accessory?: "none" | "glasses" | "headphones" | "crown" | "shades";
}

export interface TableDish {
  id: string;
  itemId: string;
  name: string;
  icon: string;
  x: number;
  y: number;
  orderedBy: string;
  orderedAt: number;
  bitesLeft: number;
}

export interface ChairReservation {
  chairIndex: number;
  x: number;
  y: number;
  seatLabel: string; // e.g., "Host Head", "Left Flank 1"
  reservedForHandle?: string;
  reservedForUid?: string;
}

// ── CATERING CATALOG ──
export const CATERING_MENU: CateringItem[] = [
  {
    id: "butter_naan_feast",
    name: "Butter Naan & Dal Makhani Feast",
    category: "food",
    icon: "🫓",
    price: 40,
    description: "Crispy tandoori garlic butter naan with rich creamy black lentil dal and paneer tikka.",
    servings: 6,
    tableSprite: "🫓🍲",
  },
  {
    id: "creamy_pasta",
    name: "Truffle Alfredo Italian Pasta",
    category: "food",
    icon: "🍝",
    price: 35,
    description: "Fresh handmade fettuccine tossed in parmesan cream sauce with wild forest mushrooms.",
    servings: 4,
    tableSprite: "🍝",
  },
  {
    id: "chinese_hakka",
    name: "Chilli Paneer & Hakka Noodles",
    category: "food",
    icon: "🥡",
    price: 35,
    description: "Sizzling wok-tossed noodles with spicy Indo-Chinese chilli paneer and spring onions.",
    servings: 4,
    tableSprite: "🥡🥢",
  },
  {
    id: "chills_nachos",
    name: "Chills & Spicy Nacho Platter",
    category: "snacks",
    icon: "🌶️",
    price: 25,
    description: "Loaded crispy corn tortilla chips with molten cheddar, jalapeño slices, and guacamole.",
    servings: 6,
    tableSprite: "🧀🌶️",
  },
  {
    id: "champagne_vintage",
    name: "Vintage French Champagne",
    category: "drink",
    icon: "🍾",
    price: 75,
    description: "Sparkling bubbly brut champagne on ice with crystal flute glasses for a celebratory toast.",
    servings: 6,
    tableSprite: "🍾🥂",
  },
  {
    id: "birthday_cake",
    name: "Belgian Chocolate Birthday Cake",
    category: "dessert",
    icon: "🎂",
    price: 50,
    description: "Decadent multi-layered dark chocolate truffle cake with glowing candle sparklers.",
    servings: 8,
    tableSprite: "🎂✨",
  },
  {
    id: "masala_chai",
    name: "Cutting Chai & Samosa Set",
    category: "drink",
    icon: "☕",
    price: 15,
    description: "Steaming aromatic ginger cardamom masala tea with hot crispy spiced potato samosas.",
    servings: 4,
    tableSprite: "☕🥟",
  },
];

// ── VIRTUAL GIFTS CATALOG ──
export const GIFTS_CATALOG: GiftItem[] = [
  {
    id: "rose_bouquet",
    name: "Velvet Red Rose Bouquet",
    icon: "💐",
    price: 30,
    description: "A dozen fresh crimson roses tied with silk ribbon to show affection and warmth.",
    sparkleColor: "#f43f5e",
  },
  {
    id: "teddy_bear",
    name: "Giant Cuddle Teddy Bear",
    icon: "🧸",
    price: 45,
    description: "An adorable, huggable plush brown teddy bear for your favorite companion.",
    sparkleColor: "#d97706",
  },
  {
    id: "gold_crown",
    name: "Imperial Golden Crown",
    icon: "👑",
    price: 100,
    description: "Jeweled royalty crown that sparkles above your friend's avatar in the metaverse.",
    sparkleColor: "#fbbf24",
  },
  {
    id: "chocolates",
    name: "Artisan Belgian Chocolate Box",
    icon: "🍫",
    price: 25,
    description: "Handcrafted assortment of praline, hazelnut, and salted caramel truffles.",
    sparkleColor: "#78350f",
  },
  {
    id: "mystery_box",
    name: "Party Mystery Gift Box",
    icon: "🎁",
    price: 60,
    description: "A surprise festive parcel filled with confetti, sparkle emotes, and bonus aura!",
    sparkleColor: "#a855f7",
  },
];

// ── BOUTIQUE WARDROBE OUTFITS ──
export const BOUTIQUE_OUTFITS: BoutiqueOutfit[] = [
  {
    id: "outfit_gala_tux",
    name: "Royal Gala Tuxedo / Evening Gown",
    icon: "🤵",
    price: 120,
    description: "Midnight black silk lapel dinner jacket or elegant flowing gala gown.",
    outfitType: "tuxedo",
    color: "#0f172a",
    accessory: "crown",
  },
  {
    id: "outfit_club_rave",
    name: "Neon Cyberpunk Rave Fit",
    icon: "🪩",
    price: 110,
    description: "Luminescent iridescent jacket with pulsing RGB LED collar trim.",
    outfitType: "bomber",
    color: "#ec4899",
    accessory: "shades",
  },
  {
    id: "outfit_lofi_cozy",
    name: "Oversized Pastel Cloud Hoodie",
    icon: "🎧",
    price: 75,
    description: "Super soft pastel heavyweight fleece hoodie with noise-cancelling studio headphones.",
    outfitType: "hoodie",
    color: "#38bdf8",
    accessory: "headphones",
  },
  {
    id: "outfit_gold_shades",
    name: "24k Gold Aviator Sunglasses",
    icon: "🕶️",
    price: 60,
    description: "Reflective mirror gold sunglasses for true high-roller metaverse VIPs.",
    outfitType: "suit",
    color: "#eab308",
    accessory: "shades",
  },
];

// ── WALLET & PERSISTENCE ──
const WALLET_STORAGE_KEY = "echo_paper_cash_wallet_v1";
const DEFAULT_INITIAL_CASH = 500;

export interface WalletState {
  balance: number;
  cash: number;
  lastDailyClaim: number;
  transactions: Array<{
    id: string;
    amount: number;
    type: "deposit" | "withdrawal";
    reason: string;
    time: number;
  }>;
}

export function getWalletState(): WalletState {
  if (typeof window === "undefined") {
    return { balance: DEFAULT_INITIAL_CASH, cash: DEFAULT_INITIAL_CASH, lastDailyClaim: 0, transactions: [] };
  }
  try {
    const raw = localStorage.getItem(WALLET_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...parsed,
        cash: parsed.cash ?? parsed.balance ?? DEFAULT_INITIAL_CASH,
        balance: parsed.balance ?? parsed.cash ?? DEFAULT_INITIAL_CASH,
      };
    }
  } catch {}

  // Initialize new wallet with $500 starting cash
  const initial: WalletState = {
    balance: DEFAULT_INITIAL_CASH,
    cash: DEFAULT_INITIAL_CASH,
    lastDailyClaim: Date.now(),
    transactions: [
      {
        id: "init_bonus",
        amount: DEFAULT_INITIAL_CASH,
        type: "deposit",
        reason: "Welcome to Echo Spaces! Initial Cash",
        time: Date.now(),
      },
    ],
  };
  saveWalletState(initial);
  return initial;
}

export function saveWalletState(state: WalletState) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

export function addCash(amount: number, reason: string): number {
  const state = getWalletState();
  state.balance += Math.max(0, amount);
  state.cash = state.balance;
  state.transactions.unshift({
    id: `tx_${Date.now()}`,
    amount,
    type: "deposit",
    reason,
    time: Date.now(),
  });
  state.transactions = state.transactions.slice(0, 20);
  saveWalletState(state);
  return state.balance;
}

export function spendCash(amount: number, reason: string): boolean {
  const state = getWalletState();
  if (state.balance < amount) return false;
  state.balance -= amount;
  state.cash = state.balance;
  state.transactions.unshift({
    id: `tx_${Date.now()}`,
    amount,
    type: "withdrawal",
    reason,
    time: Date.now(),
  });
  state.transactions = state.transactions.slice(0, 20);
  saveWalletState(state);
  return true;
}

export function canClaimDailyReward(): boolean {
  const state = getWalletState();
  const ONE_DAY_MS = 24 * 60 * 60 * 1000;
  return Date.now() - state.lastDailyClaim > ONE_DAY_MS;
}

export function claimDailyReward(): { success: boolean; amount: number; balance: number } {
  if (!canClaimDailyReward()) {
    return { success: false, amount: 0, balance: getWalletState().balance };
  }
  const reward = 100;
  const state = getWalletState();
  state.balance += reward;
  state.lastDailyClaim = Date.now();
  state.transactions.unshift({
    id: `daily_${Date.now()}`,
    amount: reward,
    type: "deposit",
    reason: "Daily Metaverse Allowance 💵",
    time: Date.now(),
  });
  saveWalletState(state);
  return { success: true, amount: reward, balance: state.balance };
}
