"use client"

import { useEffect, useMemo, useState } from "react"
import { PackagePlus, Search } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { TablePaginationFooter } from "@/components/custom/dashboard/table-pagination-footer"
import { AddDiscountSheet } from "@/components/custom/product/add-discount-sheet"
import { AddProductSheet } from "@/components/custom/product/add-product-sheet"
import {
  productPageSize,
  sampleProducts,
  type Product,
} from "@/components/custom/product/product-data"
import { ProductTable } from "@/components/custom/product/product-table"
import { ViewProductSheet } from "@/components/custom/product/view-product-sheet"
import { createProduct, type NewProduct } from "@/lib/api/products"
import { supabase } from "@/lib/supabase"

type CatalogNameRecord = {
  name: string
  is_deleted: boolean | null
}

type CatalogResponse = {
  categories?: CatalogNameRecord[]
  brands?: CatalogNameRecord[]
  error?: string
}

export function ProductWorkspace() {
  const [products, setProducts] = useState<Product[]>(sampleProducts)
  const [productCategories, setProductCategories] = useState<string[]>([])
  const [productBrands, setProductBrands] = useState<string[]>([])
  const [catalogOptionsError, setCatalogOptionsError] = useState("")
  const [search, setSearch] = useState("")
  const [page, setPage] = useState(1)
  const [categoryFilter, setCategoryFilter] = useState("all")
  const [brandFilter, setBrandFilter] = useState("all")
  const [addProductOpen, setAddProductOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [detailsOpen, setDetailsOpen] = useState(false)
  const [discountOpen, setDiscountOpen] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function loadCatalogOptions() {
      try {
        const { data, error } = await supabase.auth.getSession()
        if (error || !data.session)
          throw new Error("Your session expired. Please sign in again.")

        const headers = { Authorization: `Bearer ${data.session.access_token}` }
        const [categoriesResponse, brandsResponse] = await Promise.all([
          fetch("/api/categories", { headers, cache: "no-store" }),
          fetch("/api/brands", { headers, cache: "no-store" }),
        ])
        const [categoriesResult, brandsResult] = await Promise.all([
          categoriesResponse.json() as Promise<CatalogResponse>,
          brandsResponse.json() as Promise<CatalogResponse>,
        ])

        if (!categoriesResponse.ok) {
          throw new Error(
            categoriesResult.error ?? "Could not load categories."
          )
        }
        if (!brandsResponse.ok) {
          throw new Error(brandsResult.error ?? "Could not load brands.")
        }
        if (cancelled) return

        setProductCategories(
          (categoriesResult.categories ?? [])
            .filter((category) => !category.is_deleted && category.name.trim())
            .map((category) => category.name)
            .sort((first, second) => first.localeCompare(second))
        )
        setProductBrands(
          (brandsResult.brands ?? [])
            .filter((brand) => !brand.is_deleted && brand.name.trim())
            .map((brand) => brand.name)
            .sort((first, second) => first.localeCompare(second))
        )
      } catch (error) {
        if (!cancelled) {
          setCatalogOptionsError(
            error instanceof Error
              ? error.message
              : "Could not load brands and categories."
          )
        }
      }
    }

    void loadCatalogOptions()
    return () => {
      cancelled = true
    }
  }, [])

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase()
    return products.filter((product) => {
      const matchesSearch =
        !query ||
        [product.name, product.sku, product.description].some((value) =>
          value.toLowerCase().includes(query)
        )
      return (
        matchesSearch &&
        (categoryFilter === "all" || product.category === categoryFilter) &&
        (brandFilter === "all" || product.brand === brandFilter)
      )
    })
  }, [products, search, categoryFilter, brandFilter])

  const pageCount = Math.max(
    1,
    Math.ceil(filteredProducts.length / productPageSize)
  )
  const visibleProducts = filteredProducts.slice(
    (page - 1) * productPageSize,
    page * productPageSize
  )

  async function handleAddProduct(input: NewProduct) {
    const created = await createProduct(input)
    const product: Product = {
      id: created.id,
      sku: created.sku,
      name: created.name,
      imageName: created.images[0]?.split("/").pop() ?? "",
      category: created.category,
      brand: created.brand,
      price: created.fixed_price ?? created.price_tiers[0]?.price ?? 0,
      stock: created.stock,
      description: created.description,
    }
    setProducts((current) => [product, ...current])
    setPage(1)
  }

  function openDetails(product: Product) {
    setSelectedProduct(product)
    setDetailsOpen(true)
  }

  function openDiscount(product: Product) {
    setSelectedProduct(product)
    setDiscountOpen(true)
  }

  function applyDiscount(product: Product, discountPercent: number) {
    setProducts((current) =>
      current.map((item) =>
        item.id === product.id ? { ...item, discountPercent } : item
      )
    )
  }

  function updateProduct(productId: Product["id"], updates: Partial<Product>) {
    setProducts((current) =>
      current.map((item) =>
        item.id === productId ? { ...item, ...updates } : item
      )
    )
    setSelectedProduct((current) =>
      current?.id === productId ? { ...current, ...updates } : current
    )
  }

  return (
    <section className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-6">
      <div className="sticky -top-6 z-20 -mx-5 -mt-5 flex flex-col gap-3 border-b border-slate-200 bg-background/95 px-5 py-3 backdrop-blur sm:-mx-8 sm:-mt-8 sm:px-8 sm:py-4">
        <p className="text-xs font-semibold text-slate-500 uppercase">
          iMobile workspace
        </p>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <label className="relative block w-full lg:max-w-sm">
            <Search
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
              aria-hidden="true"
            />
            <Input
              aria-label="Search products"
              className="h-10 rounded-md border-slate-200 bg-white pl-9 text-sm"
              onChange={(event) => {
                setSearch(event.target.value)
                setPage(1)
              }}
              placeholder="Search products or SKU"
              value={search}
            />
          </label>
          <div className="flex flex-wrap items-center gap-2.5">
            <Select
              value={categoryFilter}
              onValueChange={(value: string | null) => {
                setCategoryFilter(value ?? "all")
                setPage(1)
              }}
            >
              <SelectTrigger
                aria-label="Filter by category"
                className="h-9 w-36 min-w-0 text-sm"
              >
                <SelectValue>
                  {(value) => (value === "all" ? "All categories" : value)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {productCategories.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={brandFilter}
              onValueChange={(value: string | null) => {
                setBrandFilter(value ?? "all")
                setPage(1)
              }}
            >
              <SelectTrigger
                aria-label="Filter by brand"
                className="h-9 w-32 min-w-0 text-sm"
              >
                <SelectValue>
                  {(value) => (value === "all" ? "All brands" : value)}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All brands</SelectItem>
                {productBrands.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        {catalogOptionsError && (
          <p className="text-sm text-rose-700" role="alert">
            {catalogOptionsError}
          </p>
        )}
      </div>

      <ProductTable
        products={visibleProducts}
        onViewDetails={openDetails}
        onAddDiscount={openDiscount}
      />

      <TablePaginationFooter
        currentPage={page}
        pageSize={productPageSize}
        totalItems={filteredProducts.length}
        itemLabel="products"
        onPageChange={setPage}
      />

      <Button
        type="button"
        onClick={() => setAddProductOpen(true)}
        aria-label="Add product"
        title="Add product"
        className="fixed right-5 bottom-5 z-10 grid size-16 place-items-center rounded-md bg-[#ed1c2e] p-0 text-white shadow-lg shadow-red-900/20 transition-transform hover:scale-105 hover:bg-[#d91829] focus-visible:ring-2 focus-visible:ring-[#ed1c2e]/40 focus-visible:ring-offset-2 sm:right-8 sm:bottom-8 sm:size-[4.5rem]"
      >
        <PackagePlus className="size-7" aria-hidden="true" />
      </Button>

      <AddProductSheet
        open={addProductOpen}
        onOpenChange={setAddProductOpen}
        onAdd={handleAddProduct}
      />
      <ViewProductSheet
        product={selectedProduct}
        open={detailsOpen}
        onOpenChange={setDetailsOpen}
        onUpdate={updateProduct}
      />
      <AddDiscountSheet
        product={selectedProduct}
        open={discountOpen}
        onOpenChange={setDiscountOpen}
        onApply={applyDiscount}
      />
    </section>
  )
}
