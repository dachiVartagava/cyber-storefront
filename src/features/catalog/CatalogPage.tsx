import React, { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { Search, X, RotateCcw } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../../shared/api/client';
import { APP_CONFIG } from '../../shared/config/constants';
import type { CategoryDetail, CategoryFilter, ProductsListResponse } from '../../shared/api/types';
import { Button, Input, Skeleton } from '../../shared/ui';
import { formatPrice } from '../../shared/lib/format';
import { ProductCard, ProductCardSkeleton } from './ProductCard';
import './Catalog.css';

const COLOR_HEX_MAP: Record<string, string> = {
  black: '#111111',
  white: '#ffffff',
  blue: '#2563eb',
  green: '#16a34a',
  pink: '#ec4899',
  gold: '#eab308',
  red: '#dc2626',
  silver: '#d4d4d8',
  gray: '#71717a',
};

const SORT_OPTIONS = [
  'newest',
  'oldest',
  'price-asc',
  'price-desc',
  'rating-desc',
  'popular',
  'title-asc',
] as const;

/**
 * FE-003 Recommendation: Single function converting URL SearchParams -> API query string
 */
function buildProductsQueryFromUrl(searchParams: URLSearchParams, categorySlug: string): string {
  const apiParams = new URLSearchParams();
  apiParams.set('category', categorySlug);
  apiParams.set('limit', String(APP_CONFIG.PRODUCTS_PER_PAGE));

  searchParams.forEach((value, key) => {
    if (key === 'category' || !value.trim()) return;
    apiParams.set(key, value.trim());
  });

  if (!apiParams.has('page')) {
    apiParams.set('page', '1');
  }
  if (!apiParams.has('sort')) {
    apiParams.set('sort', 'newest');
  }

  return apiParams.toString();
}

export const CatalogPage: React.FC = () => {
  const { t, i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const gridTopRef = useRef<HTMLDivElement>(null);

  const categorySlug = APP_CONFIG.DEFAULT_CATEGORY_SLUG;
  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'ka';

  // Local state for debounced search input & price range inputs synced with URL
  const urlSearchQuery = searchParams.get('q') || '';
  const [searchInput, setSearchInput] = useState(urlSearchQuery);

  useEffect(() => {
    setSearchInput(urlSearchQuery);
  }, [urlSearchQuery]);

  // Debounce search (350ms) -> update URL & reset page to 1 (FE-003 #6)
  useEffect(() => {
    const timer = setTimeout(() => {
      const currentQ = searchParams.get('q') || '';
      if (searchInput.trim() !== currentQ) {
        const next = new URLSearchParams(searchParams);
        if (searchInput.trim()) {
          next.set('q', searchInput.trim());
        } else {
          next.delete('q');
        }
        next.delete('page');
        setSearchParams(next);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchInput, searchParams, setSearchParams]);

  // 1. Fetch Category & dynamic filters once (FE-003 #2)
  const categoryQuery = useQuery<CategoryDetail>({
    queryKey: ['category', categorySlug],
    queryFn: ({ signal }) => api.get<CategoryDetail>(`/categories/${categorySlug}`, { signal }),
    staleTime: 5 * 60_000,
  });

  // 2. Fetch Products on every URL parameter change with AbortController signal (FE-003 #2 & #11)
  const apiQueryString = buildProductsQueryFromUrl(searchParams, categorySlug);

  const productsQuery = useQuery<ProductsListResponse>({
    queryKey: ['products', apiQueryString],
    queryFn: ({ signal }) => api.get<ProductsListResponse>(`/products?${apiQueryString}`, { signal }),
    placeholderData: keepPreviousData,
  });

  // Helper to toggle multi-value filters (checkbox / color) in URL (comma-separated = OR)
  const handleToggleMultiFilter = (key: string, optionValue: string) => {
    const next = new URLSearchParams(searchParams);
    const existing = next.get(key);
    const values = existing ? existing.split(',').filter(Boolean) : [];

    const idx = values.indexOf(optionValue);
    if (idx >= 0) {
      values.splice(idx, 1);
    } else {
      values.push(optionValue);
    }

    if (values.length > 0) {
      next.set(key, values.join(','));
    } else {
      next.delete(key);
    }
    next.delete('page'); // Reset page to 1
    setSearchParams(next);
  };

  // Helper for single-value radio filter
  const handleRadioFilter = (key: string, optionValue: string) => {
    const next = new URLSearchParams(searchParams);
    if (!optionValue || next.get(key) === optionValue) {
      next.delete(key);
    } else {
      next.set(key, optionValue);
    }
    next.delete('page');
    setSearchParams(next);
  };

  // Helper for sort change -> reset page to 1 (FE-003 #5)
  const handleSortChange = (newSort: string) => {
    const next = new URLSearchParams(searchParams);
    if (newSort === 'newest') {
      next.delete('sort');
    } else {
      next.set('sort', newSort);
    }
    next.delete('page');
    setSearchParams(next);
  };

  // Helper for page change -> scroll to top of list (FE-003 #7)
  const handlePageChange = (newPage: number) => {
    const next = new URLSearchParams(searchParams);
    if (newPage <= 1) {
      next.delete('page');
    } else {
      next.set('page', String(newPage));
    }
    setSearchParams(next);
    if (gridTopRef.current) {
      gridTopRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Clear all filters & search
  const handleClearAllFilters = () => {
    setSearchInput('');
    setSearchParams(new URLSearchParams());
  };

  const hasActiveFilters = Array.from(searchParams.keys()).some(
    (k) => k !== 'page' && k !== 'sort'
  );

  // Translate filter label when English is active (FE-008)
  const getFilterLabel = (filter: CategoryFilter) => {
    if (currentLang === 'en') {
      const translated = t(`catalog.filterKeys.${filter.key}`, { defaultValue: '' });
      if (translated) return translated;
    }
    return filter.label;
  };

  const getOptionLabel = (value: string, label: string) => {
    if (currentLang === 'en') {
      const translated = t(`catalog.filterValues.${value}`, { defaultValue: '' });
      if (translated) return translated;
    }
    return label;
  };

  const categoryTitle = categoryQuery.data
    ? currentLang === 'en' && categoryQuery.data.nameEn
      ? categoryQuery.data.nameEn
      : categoryQuery.data.name
    : t('catalog.title');

  const currentSort = searchParams.get('sort') || 'newest';
  const currentPage = Number(searchParams.get('page') || '1');
  const totalProducts = productsQuery.data?.total ?? 0;
  const totalPages = productsQuery.data?.totalPages ?? 1;
  const limit = productsQuery.data?.limit ?? APP_CONFIG.PRODUCTS_PER_PAGE;
  const rangeFrom = totalProducts === 0 ? 0 : (currentPage - 1) * limit + 1;
  const rangeTo = Math.min(currentPage * limit, totalProducts);

  return (
    <div className="container catalog-page" ref={gridTopRef}>
      <div className="catalog-header">
        <div>
          <h1 className="catalog-title">{categoryTitle}</h1>
          {categoryQuery.data && (
            <p className="catalog-subtitle">
              {t('catalog.productsCount', { count: totalProducts })}
            </p>
          )}
        </div>
      </div>

      {/* Search & Sort Toolbar */}
      <div className="catalog-toolbar">
        <div className="catalog-search">
          <Input
            type="search"
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            placeholder={t('catalog.searchPlaceholder')}
            aria-label={t('catalog.searchPlaceholder')}
            rightElement={
              searchInput ? (
                <button
                  type="button"
                  className="ui-input__toggle"
                  onClick={() => setSearchInput('')}
                  aria-label={t('common.clear')}
                >
                  <X size={16} />
                </button>
              ) : (
                <span className="ui-input__toggle" style={{ pointerEvents: 'none' }}>
                  <Search size={16} />
                </span>
              )
            }
          />
        </div>

        <div className="catalog-sort-row">
          <label
            htmlFor="catalog-sort"
            style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}
          >
            {t('catalog.sortBy')}
          </label>
          <select
            id="catalog-sort"
            className="catalog-select"
            value={currentSort}
            onChange={(e) => handleSortChange(e.target.value)}
          >
            {SORT_OPTIONS.map((opt) => (
              <option key={opt} value={opt}>
                {t(`catalog.sort.${opt}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="catalog-layout">
        {/* Dynamic Filters Panel built 100% from server response (FE-003 #3) */}
        <aside className="filters-panel" aria-label={t('catalog.filtersTitle')}>
          <div className="filters-panel__header">
            <h2 className="filters-panel__title">{t('catalog.filtersTitle')}</h2>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={handleClearAllFilters}>
                <RotateCcw size={14} />
                <span>{t('common.clear')}</span>
              </Button>
            )}
          </div>

          {categoryQuery.isLoading && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
              <Skeleton height="120px" />
              <Skeleton height="90px" />
              <Skeleton height="120px" />
            </div>
          )}

          {categoryQuery.data?.filters.map((filter) => {
            const label = getFilterLabel(filter);

            if (filter.type === 'checkbox' && filter.options) {
              const selected = (searchParams.get(filter.key) || '')
                .split(',')
                .filter(Boolean);

              return (
                <div key={filter.key} className="filter-group">
                  <div className="filter-group__label">{label}</div>
                  <div className="filter-options-list">
                    {filter.options.map((opt) => {
                      const isChecked = selected.includes(opt.value);
                      return (
                        <label key={opt.value} className="filter-checkbox-label">
                          <input
                            type="checkbox"
                            className="filter-checkbox-input"
                            checked={isChecked}
                            onChange={() => handleToggleMultiFilter(filter.key, opt.value)}
                          />
                          <span>{getOptionLabel(opt.value, opt.label)}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              );
            }

            if (filter.type === 'radio' && filter.options) {
              const selectedValue = searchParams.get(filter.key) || '';
              return (
                <div key={filter.key} className="filter-group">
                  <div className="filter-group__label">{label}</div>
                  <div className="filter-options-list">
                    <label className="filter-checkbox-label">
                      <input
                        type="radio"
                        name={`filter-${filter.key}`}
                        className="filter-checkbox-input"
                        checked={selectedValue === ''}
                        onChange={() => handleRadioFilter(filter.key, '')}
                      />
                      <span>{t('catalog.allOption')}</span>
                    </label>
                    {filter.options.map((opt) => (
                      <label key={opt.value} className="filter-checkbox-label">
                        <input
                          type="radio"
                          name={`filter-${filter.key}`}
                          className="filter-checkbox-input"
                          checked={selectedValue === opt.value}
                          onChange={() => handleRadioFilter(filter.key, opt.value)}
                        />
                        <span>{getOptionLabel(opt.value, opt.label)}</span>
                      </label>
                    ))}
                  </div>
                </div>
              );
            }

            if (filter.type === 'color' && filter.options) {
              const selected = (searchParams.get(filter.key) || '')
                .split(',')
                .filter(Boolean);

              return (
                <div key={filter.key} className="filter-group">
                  <div className="filter-group__label">{label}</div>
                  <div className="filter-colors-grid">
                    {filter.options.map((opt) => {
                      const isActive = selected.includes(opt.value);
                      const swatchHex = COLOR_HEX_MAP[opt.value.toLowerCase()] || opt.value;
                      return (
                        <button
                          key={opt.value}
                          type="button"
                          className={`filter-color-btn ${
                            isActive ? 'filter-color-btn--active' : ''
                          }`}
                          onClick={() => handleToggleMultiFilter(filter.key, opt.value)}
                          aria-pressed={isActive}
                        >
                          <span
                            className="filter-color-swatch"
                            style={{ backgroundColor: swatchHex }}
                          />
                          <span>{getOptionLabel(opt.value, opt.label)}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            }

            if (filter.type === 'range') {
              return (
                <PriceRangeFilter
                  key={filter.key}
                  label={label}
                  min={filter.min ?? 0}
                  max={filter.max ?? 5000}
                  searchParams={searchParams}
                  onApply={(minVal, maxVal) => {
                    const next = new URLSearchParams(searchParams);
                    if (minVal !== null && minVal > (filter.min ?? 0)) {
                      next.set('minPrice', String(minVal));
                    } else {
                      next.delete('minPrice');
                    }
                    if (maxVal !== null && maxVal < (filter.max ?? 5000)) {
                      next.set('maxPrice', String(maxVal));
                    } else {
                      next.delete('maxPrice');
                    }
                    next.delete('page');
                    setSearchParams(next);
                  }}
                />
              );
            }

            return null;
          })}
        </aside>

        {/* Main Products Grid Area */}
        <section aria-label={t('catalog.title')}>
          {/* Initial Loading State -> Skeletons (FE-003 #9) */}
          {productsQuery.isLoading && (
            <div className="product-grid">
              {Array.from({ length: 6 }).map((_, idx) => (
                <ProductCardSkeleton key={idx} />
              ))}
            </div>
          )}

          {/* Error State (FE-003 #9) */}
          {productsQuery.isError && !productsQuery.isLoading && (
            <div className="catalog-state-box" role="alert">
              <h3>{t('catalog.errorTitle')}</h3>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                {t('common.networkError')}
              </p>
              <Button variant="primary" onClick={() => productsQuery.refetch()}>
                {t('common.retry')}
              </Button>
            </div>
          )}

          {/* Empty State (FE-003 #6 & #9) */}
          {!productsQuery.isLoading &&
            !productsQuery.isError &&
            productsQuery.data?.items.length === 0 && (
              <div className="catalog-state-box">
                <h3>{t('catalog.emptyTitle')}</h3>
                <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                  {t('catalog.emptySubtitle')}
                </p>
                <Button variant="primary" onClick={handleClearAllFilters}>
                  {t('catalog.clearFilters')}
                </Button>
              </div>
            )}

          {/* Products Grid + semi-transparent overlay while fetching new filters (FE-003 #9) */}
          {!productsQuery.isLoading &&
            !productsQuery.isError &&
            productsQuery.data &&
            productsQuery.data.items.length > 0 && (
              <>
                <div
                  className={`catalog-grid-wrapper ${
                    productsQuery.isFetching ? 'catalog-grid-wrapper--fetching' : ''
                  }`}
                >
                  <div className="product-grid">
                    {productsQuery.data.items.map((product) => (
                      <ProductCard key={product.id} product={product} />
                    ))}
                  </div>
                </div>

                {/* Pagination (FE-003 #7) */}
                <div className="catalog-pagination">
                  <div className="catalog-pagination__info">
                    {t('catalog.showingRange', {
                      from: rangeFrom,
                      to: rangeTo,
                      total: totalProducts,
                    })}
                  </div>

                  {totalPages > 1 && (
                    <nav className="catalog-pagination__buttons" aria-label="Pagination">
                      <button
                        type="button"
                        className="catalog-page-btn"
                        disabled={currentPage <= 1}
                        onClick={() => handlePageChange(currentPage - 1)}
                      >
                        {t('catalog.prevPage')}
                      </button>

                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                        <button
                          key={pageNum}
                          type="button"
                          className={`catalog-page-btn ${
                            pageNum === currentPage ? 'catalog-page-btn--active' : ''
                          }`}
                          aria-current={pageNum === currentPage ? 'page' : undefined}
                          onClick={() => handlePageChange(pageNum)}
                        >
                          {pageNum}
                        </button>
                      ))}

                      <button
                        type="button"
                        className="catalog-page-btn"
                        disabled={currentPage >= totalPages}
                        onClick={() => handlePageChange(currentPage + 1)}
                      >
                        {t('catalog.nextPage')}
                      </button>
                    </nav>
                  )}
                </div>
              </>
            )}
        </section>
      </div>
    </div>
  );
};

interface PriceRangeFilterProps {
  label: string;
  min: number;
  max: number;
  searchParams: URLSearchParams;
  onApply: (minVal: number | null, maxVal: number | null) => void;
}

const PriceRangeFilter: React.FC<PriceRangeFilterProps> = ({
  label,
  min,
  max,
  searchParams,
  onApply,
}) => {
  const { t } = useTranslation();
  const urlMin = searchParams.get('minPrice');
  const urlMax = searchParams.get('maxPrice');

  const [localMin, setLocalMin] = useState<number>(urlMin ? Number(urlMin) : min);
  const [localMax, setLocalMax] = useState<number>(urlMax ? Number(urlMax) : max);

  useEffect(() => {
    setLocalMin(urlMin ? Number(urlMin) : min);
    setLocalMax(urlMax ? Number(urlMax) : max);
  }, [urlMin, urlMax, min, max]);

  return (
    <div className="filter-group">
      <div className="filter-group__label">
        {label} ({formatPrice(localMin)} – {formatPrice(localMax)})
      </div>
      <div className="filter-range">
        <input
          type="range"
          min={min}
          max={max}
          value={localMax}
          onChange={(e) => {
            const val = Math.max(Number(e.target.value), localMin);
            setLocalMax(val);
            onApply(localMin, val);
          }}
          className="filter-range__slider"
          aria-label={label}
        />
        <div className="filter-range__inputs">
          <Input
            type="number"
            min={min}
            max={localMax}
            value={localMin}
            onChange={(e) => setLocalMin(Number(e.target.value))}
            onBlur={() => onApply(localMin, localMax)}
            aria-label={t('catalog.priceFrom')}
          />
          <Input
            type="number"
            min={localMin}
            max={max}
            value={localMax}
            onChange={(e) => setLocalMax(Number(e.target.value))}
            onBlur={() => onApply(localMin, localMax)}
            aria-label={t('catalog.priceTo')}
          />
        </div>
      </div>
    </div>
  );
};
