export type Product = {
  id: number | string
  sku: string
  name: string
  imageName: string
  images?: string[]
  category: string
  brand: string
  price: number
  modelNumber?: string
  model?: string | null
  specifications?: string[]
  pricingType?: "fixed" | "bulk"
  fixedPrice?: number | null
  priceTiers?: { startQty: number; endQty: number | null; price: number }[]
  manufacturedYear?: number | null
  colors?: string[]
  createdAt?: string
  discountPercent?: number
  stock: number
  description: string
}

export const productCategories = [
  "Accessories",
  "Electronics",
  "Home appliances",
  "Mobile phones",
]
export const productBrands = ["Apple", "iMobile", "Samsung", "Xiaomi"]
export const productPageSize = 6

export const sampleProducts: Product[] = [
  {
    id: 1,
    sku: "IM-MOB-001",
    name: "iPhone 15 Pro 256GB",
    imageName: "iphone-15-pro.webp",
    category: "Mobile phones",
    brand: "Apple",
    price: 389900,
    stock: 12,
    description: "Titanium finish, unlocked",
  },
  {
    id: 2,
    sku: "IM-MOB-002",
    name: "Galaxy S24 Ultra 256GB",
    imageName: "galaxy-s24-ultra.webp",
    category: "Mobile phones",
    brand: "Samsung",
    price: 354500,
    stock: 7,
    description: "AI smartphone with S Pen",
  },
  {
    id: 3,
    sku: "IM-ACC-014",
    name: "USB-C Fast Charger 45W",
    imageName: "usb-c-charger.webp",
    category: "Accessories",
    brand: "Samsung",
    price: 12900,
    stock: 24,
    description: "Compact wall charger, cable included",
  },
  {
    id: 4,
    sku: "IM-ACC-021",
    name: "MagSafe Clear Case",
    imageName: "magsafe-case.webp",
    category: "Accessories",
    brand: "Apple",
    price: 18500,
    stock: 3,
    description: "Protective case with MagSafe support",
  },
  {
    id: 5,
    sku: "IM-MOB-008",
    name: "Redmi Note 13 Pro 5G",
    imageName: "redmi-note-13.webp",
    category: "Mobile phones",
    brand: "Xiaomi",
    price: 112900,
    stock: 0,
    description: "8GB RAM, 256GB storage",
  },
  {
    id: 6,
    sku: "IM-HOM-004",
    name: "Smart LED Bulb A60",
    imageName: "smart-led-a60.webp",
    category: "Home appliances",
    brand: "iMobile",
    price: 4900,
    stock: 31,
    description: "Wi-Fi enabled, warm to cool white",
  },
  {
    id: 7,
    sku: "IM-ACC-029",
    name: "Wireless Earbuds Pro",
    imageName: "wireless-earbuds.webp",
    category: "Accessories",
    brand: "iMobile",
    price: 24750,
    stock: 9,
    description: "Active noise cancellation, 30-hour case",
  },
  {
    id: 8,
    sku: "IM-HOM-011",
    name: "Portable Power Bank 20000mAh",
    imageName: "power-bank-20k.webp",
    category: "Electronics",
    brand: "Xiaomi",
    price: 16900,
    stock: 5,
    description: "22.5W fast charging with dual USB output",
  },
]
