"use client"

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react"
import { ImagePlus, Plus, Search, Shapes, Tags, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"
import { Tabs, TabsList, TabsPanel, TabsTab } from "@/components/ui/tabs"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { TablePaginationFooter } from "@/components/custom/dashboard/table-pagination-footer"
import { ListPageSkeleton } from "@/components/custom/dashboard/list-page-skeleton"
import { RestrictedAction } from "@/components/custom/dashboard/restricted-action"
import { supabase } from "@/lib/supabase"

type CatalogTab = "categories" | "brands"

type CatalogEntry = {
  id: number | string
  name: string
  imageName: string
  imageUrl: string | null
  description: string
  createdAt: string
  isDeleted?: boolean
}

const emptyEntries: Record<CatalogTab, CatalogEntry[]> = {
  categories: [],
  brands: [],
}

const pageSize = 5

type CatalogApiRecord = {
  id: string
  name: string
  description: string | null
  image_url: string | null
  created_at: string | null
  is_deleted: boolean | null
}

async function getAccessToken() {
  const { data, error } = await supabase.auth.getSession()
  if (error || !data.session) throw new Error("Your session expired. Please sign in again.")
  return data.session.access_token
}

function mapCatalogRecord(row: CatalogApiRecord): CatalogEntry {
  return {
    id: row.id,
    name: row.name,
    imageName: row.image_url?.split("/").pop() ?? "",
    imageUrl: row.image_url,
    description: row.description ?? "",
    isDeleted: Boolean(row.is_deleted),
    createdAt: row.created_at
      ? new Date(row.created_at).toLocaleDateString("en-LK", { year: "numeric", month: "short", day: "2-digit" })
      : "—",
  }
}

type CategoryTextField = "name" | "description"
type CategoryUpdateField = CategoryTextField | "image" | "is_deleted"

const tabDetails: Record<CatalogTab, { title: string; singular: string; icon: typeof Shapes }> = {
  categories: { title: "Categories", singular: "category", icon: Shapes },
  brands: { title: "Brands", singular: "brand", icon: Tags },
}

function CatalogFields({
  tab,
  disabled,
  name,
  image,
  description,
  onNameChange,
  onImageChange,
  onDescriptionChange,
}: {
  tab: CatalogTab
  disabled: boolean
  name: string
  image: File | null
  description: string
  onNameChange: (value: string) => void
  onImageChange: (value: File | null) => void
  onDescriptionChange: (value: string) => void
}) {
  const { singular } = tabDetails[tab]
  const fileInputId = `catalog-image-${tab}`

  return (
    <div className="space-y-5 pt-5">
      <div className="space-y-2">
        <label htmlFor={`catalog-name-${tab}`} className="text-xs font-medium text-slate-800">
          {tab === "categories" ? "Category name" : "Brand name"}
        </label>
        <Input
          id={`catalog-name-${tab}`}
          autoComplete="off"
          disabled={disabled}
          maxLength={80}
          onChange={(event) => onNameChange(event.target.value)}
          placeholder={`Enter ${singular} name`}
          required
          value={name}
          className="h-10 rounded-md border-slate-200 px-3 text-xs focus-visible:border-[#ed1c2e] focus-visible:ring-[#ed1c2e]/20"
        />
      </div>

      <div className="space-y-2">
        <label htmlFor={fileInputId} className="text-xs font-medium text-slate-800">
          Image
        </label>
        <label
          htmlFor={fileInputId}
          className={`flex min-h-16 cursor-pointer items-center gap-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 transition-colors hover:border-[#ed1c2e]/50 hover:bg-rose-50/40 ${disabled ? "pointer-events-none opacity-50" : ""}`}
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-md bg-white text-slate-500 shadow-sm">
            <ImagePlus className="size-4" aria-hidden="true" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-xs font-medium text-slate-700">
              {image?.name ?? "Choose an image"}
            </span>
            <span className="mt-0.5 block text-xs text-slate-500">PNG, JPG or WEBP</span>
          </span>
          <Input
            id={fileInputId}
            accept="image/png,image/jpeg,image/webp"
            className="sr-only"
            disabled={disabled}
            onChange={(event) => onImageChange(event.target.files?.[0] ?? null)}
            required
            type="file"
          />
        </label>
      </div>

      <div className="space-y-2">
        <label htmlFor={`catalog-description-${tab}`} className="text-xs font-medium text-slate-800">
          Description
        </label>
        <textarea
          id={`catalog-description-${tab}`}
          className="min-h-28 w-full resize-y rounded-md border border-slate-200 bg-white px-3 py-2.5 text-xs text-slate-800 outline-none placeholder:text-slate-400 focus-visible:ring-2 focus-visible:ring-[#ed1c2e]/30 disabled:bg-slate-50 disabled:opacity-50"
          disabled={disabled}
          maxLength={500}
          onChange={(event) => onDescriptionChange(event.target.value)}
          placeholder={`Describe this ${singular}`}
          required
          value={description}
        />
      </div>
    </div>
  )
}

export function CatalogWorkspace({ initialTab }: { initialTab: CatalogTab }) {
  const [activeTab, setActiveTab] = useState<CatalogTab>(initialTab)
  const [sheetTab, setSheetTab] = useState<CatalogTab>(initialTab)
  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [image, setImage] = useState<File | null>(null)
  const [description, setDescription] = useState("")
  const [entries, setEntries] = useState<Record<CatalogTab, CatalogEntry[]>>(emptyEntries)
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(true)
  const [catalogLoadError, setCatalogLoadError] = useState("")
  const [formError, setFormError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [page, setPage] = useState(1)
  const [search, setSearch] = useState("")
  const currentEntries = entries[activeTab]
  const filteredEntries = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return currentEntries
    return currentEntries.filter((entry) =>
      [entry.name, entry.description].some((value) => value.toLowerCase().includes(query))
    )
  }, [currentEntries, search])
  const visibleEntries = filteredEntries.slice((page - 1) * pageSize, page * pageSize)

  useEffect(() => {
    let cancelled = false

    async function loadCatalog() {
      setIsLoadingCatalog(true)
      setCatalogLoadError("")
      if (cancelled) return

      try {
        const accessToken = await getAccessToken()
        const response = await fetch(`/api/${activeTab}`, {
          headers: { Authorization: `Bearer ${accessToken}` },
          cache: "no-store",
        })
        const result = await response.json() as { categories?: CatalogApiRecord[]; brands?: CatalogApiRecord[]; error?: string }
        if (!response.ok) throw new Error(result.error ?? `Could not load ${tabDetails[activeTab].title.toLowerCase()}.`)
        if (cancelled) return

        setEntries((current) => ({
          ...current,
          [activeTab]: (result[activeTab] ?? []).map(mapCatalogRecord),
        }))
      } catch (error) {
        if (!cancelled) {
          setCatalogLoadError(error instanceof Error ? error.message : `Could not load ${tabDetails[activeTab].title.toLowerCase()}.`)
        }
      } finally {
        if (!cancelled) setIsLoadingCatalog(false)
      }
    }

    void loadCatalog()
    return () => {
      cancelled = true
    }
  }, [activeTab])

  function openAddSheet() {
    setSheetTab(activeTab)
    setName("")
    setImage(null)
    setDescription("")
    setFormError("")
    setOpen(true)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!image) return

    setIsSubmitting(true)
    setFormError("")

    try {
      const accessToken = await getAccessToken()
      const formData = new FormData()
      formData.set("name", name.trim())
      formData.set("description", description.trim())
      formData.set("image", image)

      const response = await fetch(`/api/${sheetTab}`, {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}` },
        body: formData,
      })
      const result = await response.json() as { category?: CatalogApiRecord; brand?: CatalogApiRecord; error?: string }
      const createdEntry = sheetTab === "categories" ? result.category : result.brand
      if (!response.ok || !createdEntry) throw new Error(result.error ?? `Could not save the ${tabDetails[sheetTab].singular}.`)

      setEntries((current) => ({
        ...current,
        [sheetTab]: [mapCatalogRecord(createdEntry), ...current[sheetTab]],
      }))

      setPage(1)
      setOpen(false)
    } catch (error) {
      setFormError(error instanceof Error ? error.message : "Could not save this catalog item.")
    } finally {
      setIsSubmitting(false)
    }
  }

  async function updateCatalogEntry(tab: CatalogTab, id: CatalogEntry["id"], field: CategoryUpdateField, value: string | File) {
    const accessToken = await getAccessToken()
    const formData = new FormData()
    formData.set(field, value)

    const response = await fetch(`/api/${tab}?id=${encodeURIComponent(String(id))}`, {
      method: "PATCH",
      headers: { Authorization: `Bearer ${accessToken}` },
      body: formData,
    })
    const result = await response.json() as { category?: CatalogApiRecord; brand?: CatalogApiRecord; error?: string }
    const updatedRecord = tab === "categories" ? result.category : result.brand
    if (!response.ok || !updatedRecord) throw new Error(result.error ?? `Could not update the ${tabDetails[tab].singular}.`)

    const updatedEntry = mapCatalogRecord(updatedRecord)
    setEntries((current) => ({
      ...current,
      [tab]: current[tab].map((entry) => entry.id === id ? updatedEntry : entry),
    }))
  }

  return (
    <section className="mx-auto flex min-h-full w-full max-w-7xl flex-col gap-6">
      <Tabs value={activeTab} onValueChange={(value) => {
        setActiveTab(value as CatalogTab)
        setPage(1)
      }}>
        <div className="sticky -top-5 z-10 -mx-5 -mt-5 flex flex-col gap-4 border-b border-slate-200 bg-background/95 px-5 py-4 backdrop-blur sm:-mx-8 sm:-mt-8 sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0 md:hidden">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">iMobile workspace</p>
              <h1 className="mt-0.5 truncate text-lg font-semibold tracking-tight text-slate-900">{tabDetails[activeTab].title}</h1>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">
                {activeTab === "categories"
                  ? "Organize products into clear, easy-to-browse categories."
                  : "Manage the brands available across your product catalog."}
              </p>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <div className="flex items-center gap-2 sm:gap-3">
              <label className="relative block min-w-0 flex-1 sm:max-w-sm">
                <Search className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400" aria-hidden="true" />
                <Input
                  aria-label={`Search ${tabDetails[activeTab].title.toLowerCase()}`}
                  className="h-9 rounded-sm border-slate-200 bg-white pl-9 pr-10 text-[11px] focus-visible:border-[#ed1c2e] focus-visible:ring-[#ed1c2e]/20"
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setPage(1)
                  }}
                  placeholder={`Search ${tabDetails[activeTab].title.toLowerCase()} by name or description`}
                  value={search}
                />
                {search && (
                  <button
                    type="button"
                    aria-label="Clear search"
                    className="absolute top-1/2 right-2 grid size-7 -translate-y-1/2 place-items-center rounded-sm text-slate-500 hover:bg-slate-100 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-[#ed1c2e]"
                    onClick={() => {
                      setSearch("")
                      setPage(1)
                    }}
                  >
                    <X className="size-4" aria-hidden="true" />
                  </button>
                )}
              </label>
              <RestrictedAction action={activeTab === "categories" ? "addCategory" : "addBrands"}>
                <Button
                  type="button"
                  onClick={openAddSheet}
                  className="h-9 shrink-0 gap-2 bg-[#ed1c2e] px-3 text-xs text-white hover:bg-[#d91829] md:ml-auto"
                >
                  <Plus className="size-4" aria-hidden="true" />
                  <span className="hidden sm:inline">Add {tabDetails[activeTab].singular}</span>
                  <span className="sm:hidden">Add</span>
                </Button>
              </RestrictedAction>
            </div>
            <span className="whitespace-nowrap text-xs tabular-nums text-slate-500 sm:hidden">{filteredEntries.length} items</span>
          </div>
        </div>

        <div className="mt-5">
          <TabsPanel value="categories">
            <CatalogList
              tab="categories"
              entries={visibleEntries}
              searchTerm={search}
              onUpdateEntry={(id, field, value) => updateCatalogEntry("categories", id, field, value)}
              isLoading={isLoadingCatalog}
              error={catalogLoadError}
            />
          </TabsPanel>
          <TabsPanel value="brands">
            <CatalogList
              tab="brands"
              entries={visibleEntries}
              searchTerm={search}
              onUpdateEntry={(id, field, value) => updateCatalogEntry("brands", id, field, value)}
              isLoading={isLoadingCatalog}
              error={catalogLoadError}
            />
          </TabsPanel>
        </div>
      </Tabs>

      <TablePaginationFooter
        currentPage={page}
        pageSize={pageSize}
        totalItems={filteredEntries.length}
        itemLabel={tabDetails[activeTab].title.toLowerCase()}
        onPageChange={setPage}
      />

      <Sheet open={open} onOpenChange={setOpen}>
        <SheetContent side="right" className="w-full gap-0 overflow-hidden p-0 sm:max-w-sm">
          <Tabs
            value={sheetTab}
            onValueChange={(value) => {
              setSheetTab(value as CatalogTab)
              setName("")
              setImage(null)
              setDescription("")
              setFormError("")
            }}
            className="flex min-h-0 flex-1 flex-col"
          >
            <SheetHeader className="border-b border-slate-200 px-5 py-5 sm:px-6">
              <SheetTitle className="text-sm">Add to catalog</SheetTitle>
              <SheetDescription>Choose a catalog type, then enter its details.</SheetDescription>
              <TabsList className="mt-4 w-full text-xs">
                <TabsTab value="categories" className="flex-1 text-xs">Categories</TabsTab>
                <TabsTab value="brands" className="flex-1 text-xs">Brands</TabsTab>
              </TabsList>
            </SheetHeader>

            <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
              <div className="flex-1 overflow-y-auto px-5 pb-6 sm:px-6">
                {formError && (
                  <p className="mt-5 rounded-sm border border-rose-200 bg-rose-50 px-3 py-2 text-xs leading-5 text-rose-700" role="alert">
                    {formError}
                  </p>
                )}
                <TabsPanel value="categories">
                  <CatalogFields
                    tab="categories"
                    disabled={sheetTab !== "categories"}
                    name={name}
                    image={image}
                    description={description}
                    onNameChange={setName}
                    onImageChange={setImage}
                    onDescriptionChange={setDescription}
                  />
                </TabsPanel>
                <TabsPanel value="brands">
                  <CatalogFields
                    tab="brands"
                    disabled={sheetTab !== "brands"}
                    name={name}
                    image={image}
                    description={description}
                    onNameChange={setName}
                    onImageChange={setImage}
                    onDescriptionChange={setDescription}
                  />
                </TabsPanel>
              </div>
              <SheetFooter className="flex-row justify-end border-t border-slate-200 bg-white px-5 py-4 sm:px-6">
                <Button type="button" variant="outline" onClick={() => setOpen(false)} className="text-xs">
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="gap-2 bg-[#ed1c2e] text-xs text-white hover:bg-[#d91829]">
                  <Plus className="size-4" aria-hidden="true" />
                  {isSubmitting ? "Saving..." : `Add ${tabDetails[sheetTab].singular}`}
                </Button>
              </SheetFooter>
            </form>
          </Tabs>
        </SheetContent>
      </Sheet>
    </section>
  )
}

function CatalogList({
  tab,
  entries,
  searchTerm,
  onUpdateEntry,
  isLoading = false,
  error = "",
}: {
  tab: CatalogTab
  entries: CatalogEntry[]
  searchTerm: string
  onUpdateEntry?: (id: CatalogEntry["id"], field: CategoryUpdateField, value: string | File) => Promise<void>
  isLoading?: boolean
  error?: string
}) {
  const { title, singular, icon: Icon } = tabDetails[tab]

  if (isLoading) {
    return <ListPageSkeleton page="catalog" contentOnly />
  }

  return (
    <section aria-label={title} className="overflow-hidden rounded-md border border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03]">
      <div className="hidden md:block">
      <Table className="text-xs">
        <TableHeader className="bg-slate-50">
          <TableRow className="hover:bg-transparent">
            <TableHead className="min-w-48 pl-5 text-xs font-semibold text-slate-500">Name</TableHead>
            <TableHead className="min-w-24 text-xs font-semibold text-slate-500">Image</TableHead>
            <TableHead className="min-w-64 text-xs font-semibold text-slate-500">Description</TableHead>
            <TableHead className="min-w-32 text-xs font-semibold text-slate-500">Created</TableHead>
            <TableHead className="min-w-32 text-xs font-semibold text-slate-500">Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {error ? (
            <TableRow><TableCell colSpan={5} className="h-24 text-center text-xs text-rose-700">Could not load {title.toLowerCase()}: {error}</TableCell></TableRow>
          ) : entries.map((entry) => (
            <TableRow key={entry.id} className="group">
              <CatalogEntryCells entry={entry} onUpdateCategory={onUpdateEntry} />
              <TableCell className="whitespace-nowrap text-slate-600">{entry.createdAt}</TableCell>
              <CatalogStatusCell entry={entry} onUpdateCategory={onUpdateEntry} />
            </TableRow>
          ))}
          {!error && entries.length === 0 && (
            <TableRow>
              <TableCell colSpan={5} className="h-28 text-center">
                <p className="text-xs font-medium text-slate-700">
                  {searchTerm.trim() ? `No ${title.toLowerCase()} match “${searchTerm.trim()}”` : `No ${singular}s found`}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {searchTerm.trim() ? "Try a different search." : `Add your first ${singular} to get started.`}
                </p>
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      </div>
      <div className="space-y-2 p-2 md:hidden">
        {error ? (
          <p role="alert" className="px-3 py-8 text-center text-xs text-rose-700">
            Could not load {title.toLowerCase()}: {error}
          </p>
        ) : entries.length === 0 ? (
          <div className="px-3 py-8 text-center">
            <p className="text-xs font-medium text-slate-700">
              {searchTerm.trim() ? `No ${title.toLowerCase()} match “${searchTerm.trim()}”` : `No ${singular}s found`}
            </p>
            <p className="mt-1 text-xs text-slate-500">
              {searchTerm.trim() ? "Try a different search." : `Add your first ${singular} to get started.`}
            </p>
          </div>
        ) : entries.map((entry) => (
          <article key={entry.id} className="flex min-w-0 items-start gap-3 rounded-md border border-slate-200 bg-white p-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            {entry.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={entry.imageUrl}
                alt={`${entry.name} ${singular}`}
                loading="lazy"
                className="size-14 shrink-0 rounded-md border border-slate-200 bg-slate-50 object-cover"
              />
            ) : (
              <span className="grid size-14 shrink-0 place-items-center rounded-md border border-slate-200 bg-slate-50 text-slate-400">
                <Icon className="size-5" aria-hidden="true" />
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex min-w-0 items-start justify-between gap-2">
                <h2 className="min-w-0 truncate text-xs font-semibold text-slate-900">{entry.name}</h2>
                <CatalogMobileStatus entry={entry} onUpdateCategory={onUpdateEntry} />
              </div>
              <p className="mt-1 line-clamp-2 whitespace-pre-wrap break-words text-[11px] leading-4 text-slate-600">
                {entry.description || "No description provided."}
              </p>
              <p className="mt-2 text-[10px] text-slate-400">Created {entry.createdAt}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

function CatalogEntryCells({
  entry,
  onUpdateCategory,
}: {
  entry: CatalogEntry
  onUpdateCategory?: (id: CatalogEntry["id"], field: CategoryUpdateField, value: string | File) => Promise<void>
}) {
  const [editingField, setEditingField] = useState<CategoryTextField | null>(null)
  const [draft, setDraft] = useState("")
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const cancelBlurRef = useRef(false)
  const isEditable = Boolean(onUpdateCategory)

  function beginEditing(field: CategoryTextField, value: string) {
    if (!isEditable || isSaving) return
    setEditingField(field)
    setDraft(value)
    setError("")
  }

  async function saveField() {
    if (cancelBlurRef.current) {
      cancelBlurRef.current = false
      return
    }
    if (!editingField || !onUpdateCategory || isSaving) return
    const field = editingField
    const value = field === "name" ? draft.trim() : draft
    const originalValue = field === "name" ? entry.name : entry.description

    if (!value.trim() && field === "name") {
      setError("Name cannot be empty.")
      return
    }
    if (value === originalValue) {
      setEditingField(null)
      return
    }

    setIsSaving(true)
    setError("")
    try {
      await onUpdateCategory(entry.id, field, value)
      setEditingField(null)
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update this category.")
    } finally {
      setIsSaving(false)
    }
  }

  async function saveImage(file: File | undefined) {
    if (!file || !onUpdateCategory) return
    setError("")
    setIsSaving(true)
    try {
      await onUpdateCategory(entry.id, "image", file)
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update this category image.")
    } finally {
      setIsSaving(false)
    }
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (event.key === "Escape") {
      cancelBlurRef.current = true
      setEditingField(null)
      setDraft("")
      setError("")
      event.currentTarget.blur()
    }
    if (event.key === "Enter" && editingField === "name") {
      event.preventDefault()
      event.currentTarget.blur()
    }
  }

  return (
    <>
      <TableCell className="pl-5 font-medium text-slate-800">
        {editingField === "name" ? (
          <Input
            autoFocus
            aria-label={`Edit ${entry.name} name`}
            className="h-9 min-w-32 rounded-sm border-slate-300 text-xs"
            disabled={isSaving}
            maxLength={80}
            onBlur={() => void saveField()}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            value={draft}
          />
        ) : (
          isEditable ? (
            <button type="button" className="max-w-full cursor-text text-left" onClick={() => beginEditing("name", entry.name)}>
              {entry.name}
            </button>
          ) : entry.name
        )}
      </TableCell>
      <TableCell>
        <label className={`inline-flex cursor-pointer ${isSaving ? "pointer-events-none opacity-60" : ""}`}>
          <input
            accept="image/png,image/jpeg,image/webp"
            aria-label={`Change ${entry.name} image`}
            className="sr-only"
            disabled={!isEditable || isSaving}
            onChange={(event) => {
              void saveImage(event.target.files?.[0])
              event.target.value = ""
            }}
            type="file"
          />
          {entry.imageUrl ? (
            <img
              src={entry.imageUrl}
              alt={`${entry.name} category`}
              loading="lazy"
              className="size-11 rounded-md border border-slate-200 object-cover"
            />
          ) : (
            <span className="grid size-11 place-items-center rounded-md border border-slate-200 bg-slate-50 text-slate-500">
              <ImagePlus className="size-4" aria-hidden="true" />
            </span>
          )}
        </label>
      </TableCell>
      <TableCell className="max-w-80 text-slate-600">
        {editingField === "description" ? (
          <textarea
            autoFocus
            aria-label={`Edit ${entry.name} description`}
            className="min-h-20 w-full min-w-48 resize-y rounded-sm border border-slate-300 bg-white px-2.5 py-2 text-xs text-slate-800 outline-none focus-visible:ring-2 focus-visible:ring-[#ed1c2e]/30 disabled:bg-slate-50"
            disabled={isSaving}
            maxLength={500}
            onBlur={() => void saveField()}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={handleKeyDown}
            value={draft}
          />
        ) : (
          isEditable ? (
            <button type="button" className="max-w-80 cursor-text truncate text-left" onClick={() => beginEditing("description", entry.description)}>
              {entry.description || "Add description"}
            </button>
          ) : entry.description
        )}
        {error && <p className="mt-1 max-w-64 text-xs text-rose-700" role="alert">{error}</p>}
      </TableCell>
    </>
  )
}

function CatalogStatusCell({
  entry,
  onUpdateCategory,
}: {
  entry: CatalogEntry
  onUpdateCategory?: (id: CatalogEntry["id"], field: CategoryUpdateField, value: string | File) => Promise<void>
}) {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const isEditable = Boolean(onUpdateCategory)
  const isDeleted = Boolean(entry.isDeleted)

  async function updateStatus(value: string) {
    if (!onUpdateCategory) return
    setIsSaving(true)
    setError("")
    try {
      await onUpdateCategory(entry.id, "is_deleted", value)
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update category status.")
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <TableCell>
      {isEditable ? (
        <select
          aria-label={`${entry.name} status`}
          className="h-9 rounded-sm border border-slate-200 bg-white px-2 text-xs text-slate-700 outline-none focus-visible:ring-2 focus-visible:ring-[#ed1c2e]/30 disabled:opacity-60"
          disabled={isSaving}
          onChange={(event) => void updateStatus(event.target.value)}
          value={isDeleted ? "true" : "false"}
        >
          <option value="false">Active</option>
          <option value="true">Deactive</option>
        </select>
      ) : (
        <Badge variant="outline" className="border-emerald-200 bg-emerald-50 text-emerald-700">Active</Badge>
      )}
      {error && <p className="mt-1 max-w-40 text-xs text-rose-700" role="alert">{error}</p>}
    </TableCell>
  )
}

function CatalogMobileStatus({
  entry,
  onUpdateCategory,
}: {
  entry: CatalogEntry
  onUpdateCategory?: (id: CatalogEntry["id"], field: CategoryUpdateField, value: string | File) => Promise<void>
}) {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState("")
  const isDeleted = Boolean(entry.isDeleted)

  async function updateStatus(value: string) {
    if (!onUpdateCategory || value === String(isDeleted)) return
    setIsSaving(true)
    setError("")
    try {
      await onUpdateCategory(entry.id, "is_deleted", value)
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Could not update status.")
    } finally {
      setIsSaving(false)
    }
  }

  if (!onUpdateCategory) {
    return (
      <Badge
        variant="outline"
        className={`shrink-0 ${isDeleted
          ? "border-slate-200 bg-slate-50 text-slate-600"
          : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
      >
        {isDeleted ? "Deactive" : "Active"}
      </Badge>
    )
  }

  return (
    <div className="shrink-0">
      <Select
        value={isDeleted ? "true" : "false"}
        onValueChange={(value) => {
          if (value) void updateStatus(value)
        }}
        disabled={isSaving}
      >
        <SelectTrigger
          aria-label={`${entry.name} status`}
          className={`h-6 min-w-0 gap-1 rounded-full px-2 text-[10px] font-medium shadow-none ${isDeleted
            ? "border-slate-200 bg-slate-50 text-slate-600"
            : "border-emerald-200 bg-emerald-50 text-emerald-700"}`}
        >
          <SelectValue>{(value) => value === "true" ? "Deactive" : "Active"}</SelectValue>
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="false" className="text-xs">Active</SelectItem>
          <SelectItem value="true" className="text-xs">Deactive</SelectItem>
        </SelectContent>
      </Select>
      {error && <p role="alert" className="mt-1 max-w-24 text-right text-[10px] text-rose-700">{error}</p>}
    </div>
  )
}