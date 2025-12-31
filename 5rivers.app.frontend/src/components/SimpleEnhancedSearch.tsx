import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Search, Filter, SlidersHorizontal, X } from "lucide-react"

export interface SimpleFilters {
  [key: string]: any
}

export interface QuickFilter {
  label: string
  icon: React.ComponentType<{ className?: string }>
  filterKey: string
  filterValue: any
}

interface SimpleEnhancedSearchProps<T> {
  searchTerm: string
  onSearchChange: (term: string) => void
  filters: SimpleFilters
  onFiltersChange: (filters: SimpleFilters) => void
  quickFilters?: QuickFilter[]
  searchPlaceholder?: string
  className?: string
  children?: React.ReactNode // Allow custom filter content
}

export function SimpleEnhancedSearch<T>({
  searchTerm,
  onSearchChange,
  filters,
  onFiltersChange,
  quickFilters = [],
  searchPlaceholder = "Search... Use & for multiple terms",
  className = "",
  children
}: SimpleEnhancedSearchProps<T>) {
  const [showFilters, setShowFilters] = useState(false)

  const hasActiveFilters = Object.keys(filters).some(key => filters[key] != null && filters[key] !== '')
  const activeFilterCount = Object.keys(filters).filter(key => filters[key] != null && filters[key] !== '').length

  const clearAllFilters = () => {
    onFiltersChange({})
  }

  const toggleQuickFilter = (filterKey: string, value: any) => {
    onFiltersChange({
      ...filters,
      [filterKey]: filters[filterKey] === value ? undefined : value
    })
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex items-center space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={searchPlaceholder}
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="pl-8"
          />
        </div>
        <Button
          variant={showFilters ? "default" : "outline"}
          onClick={() => setShowFilters(!showFilters)}
          className="flex items-center gap-2"
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {hasActiveFilters && (
            <Badge variant="secondary" className="ml-1">
              {activeFilterCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Quick Filter Buttons */}
      {quickFilters.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          {quickFilters.map((quickFilter) => (
            <Button
              key={quickFilter.label}
              size="sm"
              variant={filters[quickFilter.filterKey] === quickFilter.filterValue ? "default" : "outline"}
              onClick={() => toggleQuickFilter(quickFilter.filterKey, quickFilter.filterValue)}
              className="flex items-center gap-1"
            >
              <quickFilter.icon className="h-3 w-3" />
              {quickFilter.label}
            </Button>
          ))}
          {hasActiveFilters && (
            <Button
              size="sm"
              variant="ghost"
              onClick={clearAllFilters}
              className="flex items-center gap-1"
            >
              <X className="h-3 w-3" />
              Clear All
            </Button>
          )}
        </div>
      )}

      {/* Advanced Filters Panel */}
      {showFilters && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <Filter className="h-5 w-5" />
              Advanced Filters
            </CardTitle>
            <CardDescription>
              Filter by specific criteria. All filters work together.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {children || (
              <div className="p-4 text-center text-muted-foreground">
                No advanced filters configured.
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Enhanced search hook for filtering data
export function useSimpleEnhancedSearch<T>(
  data: T[],
  searchTerm: string,
  filters: SimpleFilters,
  searchFields: (item: T) => string[],
  customFilters?: (item: T, filters: SimpleFilters) => boolean
) {
  const filteredData = data.filter((item) => {
    // Apply custom filters first if provided
    if (customFilters && !customFilters(item, filters)) {
      return false
    }

    // Apply search term filtering
    if (!searchTerm.trim()) return true

    // Split search terms by & for AND operation
    const searchTerms = searchTerm.toLowerCase().split('&').map(term => term.trim()).filter(term => term.length > 0)

    // For each search term, check if it exists in any field
    return searchTerms.every(term => {
      const searchableFields = searchFields(item)

      // Filter out null/undefined values and convert to lowercase
      const searchContent = searchableFields
        .filter(field => field != null)
        .map(field => field.toString().toLowerCase())
        .join(' ')

      return searchContent.includes(term)
    })
  })

  return filteredData
}