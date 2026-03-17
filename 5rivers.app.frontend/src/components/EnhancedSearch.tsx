import React, { useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Search, Filter, SlidersHorizontal, X, Clock, Check, User, DollarSign } from "lucide-react"

export interface EnhancedSearchFilters {
  [key: string]: any
}

export interface FilterOption {
  key: string
  label: string
  type: 'select' | 'date' | 'boolean' | 'number' | 'text'
  options?: { value: string; label: string }[]
  placeholder?: string
}

export interface QuickFilterButton {
  label: string
  icon: React.ComponentType<{ className?: string }>
  filterKey: string
  filterValue: any
  variant?: 'default' | 'outline'
}

interface EnhancedSearchProps<T> {
  searchTerm: string
  onSearchChange: (term: string) => void
  filters: EnhancedSearchFilters
  onFiltersChange: (filters: EnhancedSearchFilters) => void
  data: T[]
  filterConfig: FilterOption[]
  quickFilters?: QuickFilterButton[]
  searchPlaceholder?: string
  searchFields: (item: T) => string[]
  className?: string
}

export function EnhancedSearch<T>({
  searchTerm,
  onSearchChange,
  filters,
  onFiltersChange,
  data,
  filterConfig,
  quickFilters = [],
  searchPlaceholder = "Search... Use & for multiple terms (e.g. 'term1 & term2')",
  searchFields,
  className = ""
}: EnhancedSearchProps<T>) {
  const [showFilters, setShowFilters] = useState(false)

  // Generate dynamic options for select filters based on data
  const getSelectOptions = (filterKey: string): { value: string; label: string }[] => {
    try {
      const config = filterConfig.find(f => f.key === filterKey)
      if (config?.options) {
        return config.options
      }

      // For auto-generation, return empty array to avoid complex processing
      // This should be handled by the specific page implementation
      return []
    } catch (error) {
      console.error('Error getting select options for:', filterKey, error)
      return []
    }
  }

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

  const updateFilter = (key: string, value: any) => {
    onFiltersChange({
      ...filters,
      [key]: value || undefined
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
            {filterConfig.length === 0 ? (
              <p className="text-sm text-muted-foreground">No filters available.</p>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {filterConfig.map((config) => {
                  try {
                    return (
                      <div key={config.key} className="space-y-2">
                        <label className="text-sm font-medium">{config.label}</label>
                        {config.type === 'select' && (
                          <Select
                            value={filters[config.key] || ""}
                            onValueChange={(value) => updateFilter(config.key, value)}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={config.placeholder || `Select ${config.label.toLowerCase()}`} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">All {config.label}</SelectItem>
                              {getSelectOptions(config.key).slice(0, 20).map((option) => (
                                <SelectItem key={option.value} value={option.value}>
                                  {option.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                        {config.type === 'date' && (
                          <Input
                            type="date"
                            value={filters[config.key] || ""}
                            onChange={(e) => updateFilter(config.key, e.target.value)}
                          />
                        )}
                        {config.type === 'number' && (
                          <Input
                            type="number"
                            value={filters[config.key] || ""}
                            onChange={(e) => updateFilter(config.key, e.target.value)}
                            placeholder={config.placeholder}
                          />
                        )}
                        {config.type === 'text' && (
                          <Input
                            type="text"
                            value={filters[config.key] || ""}
                            onChange={(e) => updateFilter(config.key, e.target.value)}
                            placeholder={config.placeholder}
                          />
                        )}
                        {config.type === 'boolean' && (
                          <Select
                            value={filters[config.key] === undefined ? "" : filters[config.key].toString()}
                            onValueChange={(value) => updateFilter(config.key, value === "" ? undefined : value === "true")}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder={config.placeholder || "All"} />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="">All</SelectItem>
                              <SelectItem value="true">Yes</SelectItem>
                              <SelectItem value="false">No</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                        {!['select', 'date', 'number', 'text', 'boolean'].includes(config.type) && (
                          <div className="text-xs text-red-500">Unknown filter type: {config.type}</div>
                        )}
                      </div>
                    )
                  } catch (error) {
                    console.error('Error rendering filter:', config.key, error)
                    return (
                      <div key={config.key} className="space-y-2">
                        <label className="text-sm font-medium text-red-500">{config.label} (Error)</label>
                        <div className="text-xs text-red-500">Failed to render filter</div>
                      </div>
                    )
                  }
                })}
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// Enhanced search hook for filtering data
export function useEnhancedSearch<T>(
  data: T[],
  searchTerm: string,
  filters: EnhancedSearchFilters,
  searchFields: (item: T) => string[],
  customFilters?: (item: T, filters: EnhancedSearchFilters) => boolean
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