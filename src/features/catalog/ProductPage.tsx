import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate, useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ChevronRight,
  ChevronLeft,
  Star,
  ShieldCheck,
  ShoppingCart,
  Check,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api, ApiError } from '../../shared/api/client';
import type { ProductDetail } from '../../shared/api/types';
import { formatPrice } from '../../shared/lib/format';
import {
  Button,
  Badge,
  Alert,
  Skeleton,
  QuantityStepper,
} from '../../shared/ui';
import { useAuth } from '../auth/AuthContext';
import { useCart } from '../cart/useCart';
import { ProductCard } from './ProductCard';
import './Catalog.css';
import './ProductPage.css';

export const ProductPage: React.FC = () => {
  const { slug = '' } = useParams<{ slug: string }>();

  // FE-007 #6: Reset component state & scroll to top on slug change using key={slug}
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, [slug]);

  return <ProductPageInner key={slug} slug={slug} />;
};

const ProductPageInner: React.FC<{ slug: string }> = ({ slug }) => {
  const { t, i18n } = useTranslation();
  const { status } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [activeIndex, setActiveIndex] = useState(0);
  const [qty, setQty] = useState(1);
  const [addedSuccess, setAddedSuccess] = useState(false);
  const [cartError, setCartError] = useState<string | null>(null);

  const productQuery = useQuery<ProductDetail, ApiError>({
    queryKey: ['product', slug],
    queryFn: ({ signal }) => api.get<ProductDetail>(`/products/${slug}`, { signal }),
    retry: (failureCount, error) => {
      if (error.status === 404) return false;
      return failureCount < 1;
    },
  });

  const product = productQuery.data;

  // FE-007 #6: Update document.title with product name
  useEffect(() => {
    if (product?.title) {
      document.title = `${product.title} — Cyber`;
    } else {
      document.title = 'Cyber';
    }
    return () => {
      document.title = 'Cyber';
    };
  }, [product?.title]);

  if (productQuery.isLoading) {
    return (
      <div className="container product-page">
        <Skeleton height="1.25rem" width="260px" style={{ marginBottom: 'var(--space-6)' }} />
        <div className="product-detail-grid">
          <Skeleton style={{ aspectRatio: '1 / 1', width: '100%' }} />
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Skeleton height="1rem" width="100px" />
            <Skeleton height="2.5rem" width="80%" />
            <Skeleton height="1.5rem" width="180px" />
            <Skeleton height="3rem" width="40%" />
            <Skeleton height="6rem" width="100%" />
            <Skeleton height="3rem" width="100%" />
          </div>
        </div>
      </div>
    );
  }

  if (productQuery.isError) {
    const isNotFound = productQuery.error?.status === 404 || productQuery.error?.code === 'PRODUCT_NOT_FOUND';
    return (
      <div className="container product-page">
        <div className="catalog-state-box" role="alert">
          <h2>{isNotFound ? t('product.notFoundTitle') : t('catalog.errorTitle')}</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            {isNotFound ? t('product.notFoundSubtitle') : t('common.networkError')}
          </p>
          {isNotFound ? (
            <Link to="/catalog">
              <Button variant="primary">{t('product.backToCatalog')}</Button>
            </Link>
          ) : (
            <Button variant="primary" onClick={() => productQuery.refetch()}>
              {t('common.retry')}
            </Button>
          )}
        </div>
      </div>
    );
  }

  if (!product) return null;

  const images = product.images?.length > 0 ? product.images : [product.image];
  const safeIndex = Math.min(activeIndex, images.length - 1);
  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'ka';

  const handleAddToCart = async () => {
    setCartError(null);
    setAddedSuccess(false);

    if (status !== 'authenticated') {
      navigate('/login', {
        state: { from: location.pathname + location.search },
      });
      return;
    }

    try {
      await addItem.mutateAsync({ productId: product.id, qty });
      setAddedSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'INSUFFICIENT_STOCK') {
          setCartError(t('cart.insufficientStock', { available: err.available ?? 0 }));
        } else if (err.code === 'OUT_OF_STOCK') {
          setCartError(t('cart.outOfStock'));
        } else if (err.code === 'PRODUCT_NOT_FOUND') {
          setCartError(t('cart.productNotFound'));
        } else {
          setCartError(err.message);
        }
      } else {
        setCartError(t('common.networkError'));
      }
    }
  };

  const translateSpecKey = (key: string) => {
    if (currentLang === 'en') {
      return t(`product.specKeys.${key}`, { defaultValue: key });
    }
    return key;
  };

  return (
    <div className="container product-page">
      {/* Breadcrumbs (FE-007 #4) */}
      <nav className="breadcrumbs" aria-label="Breadcrumb">
        <Link to="/catalog" className="breadcrumbs__link">
          {t('common.home')}
        </Link>
        <ChevronRight size={14} aria-hidden="true" />
        <Link to="/catalog" className="breadcrumbs__link">
          {product.category?.name || t('common.catalog')}
        </Link>
        <ChevronRight size={14} aria-hidden="true" />
        <span className="breadcrumbs__current">{product.title}</span>
      </nav>

      <div className="product-detail-grid">
        {/* Gallery (FE-007 #4: Dynamic images.length, hide thumbs if 1 image, accessible alt) */}
        <div
          className="product-gallery"
          onKeyDown={(e) => {
            if (e.key === 'ArrowLeft') {
              setActiveIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1));
            } else if (e.key === 'ArrowRight') {
              setActiveIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0));
            }
          }}
        >
          <div className="product-gallery__main">
            <img
              src={images[safeIndex]}
              alt={t('product.imageAlt', {
                title: product.title,
                index: safeIndex + 1,
                total: images.length,
              })}
              className="product-gallery__main-img"
            />

            {images.length > 1 && (
              <>
                <button
                  type="button"
                  className="product-gallery__arrow product-gallery__arrow--prev"
                  onClick={() =>
                    setActiveIndex((prev) => (prev > 0 ? prev - 1 : images.length - 1))
                  }
                  aria-label={t('product.prevImage')}
                >
                  <ChevronLeft size={20} />
                </button>
                <button
                  type="button"
                  className="product-gallery__arrow product-gallery__arrow--next"
                  onClick={() =>
                    setActiveIndex((prev) => (prev < images.length - 1 ? prev + 1 : 0))
                  }
                  aria-label={t('product.nextImage')}
                >
                  <ChevronRight size={20} />
                </button>
              </>
            )}
          </div>

          {images.length > 1 && (
            <div className="product-gallery__thumbs" role="group" aria-label="Product thumbnails">
              {images.map((imgUrl, idx) => (
                <button
                  key={`${imgUrl}-${idx}`}
                  type="button"
                  className={`product-gallery__thumb-btn ${
                    idx === safeIndex ? 'product-gallery__thumb-btn--active' : ''
                  }`}
                  onClick={() => setActiveIndex(idx)}
                  aria-label={t('product.imageAlt', {
                    title: product.title,
                    index: idx + 1,
                    total: images.length,
                  })}
                  aria-pressed={idx === safeIndex}
                >
                  <img
                    src={imgUrl}
                    alt={t('product.imageAlt', {
                      title: product.title,
                      index: idx + 1,
                      total: images.length,
                    })}
                    className="product-gallery__thumb-img"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Main Product Information */}
        <div className="product-info">
          <div>
            <div className="product-info__brand">{product.brand}</div>
            <h1 className="product-info__title">{product.title}</h1>
          </div>

          <div className="product-info__rating-row">
            <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
              {Array.from({ length: 5 }).map((_, i) => (
                <Star
                  key={i}
                  size={16}
                  fill={i < Math.round(product.rating) ? '#f59e0b' : 'none'}
                  color="#f59e0b"
                  aria-hidden="true"
                />
              ))}
              <strong style={{ marginLeft: '4px' }}>{product.rating.toFixed(1)}</strong>
              <span style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
                {t('catalog.reviewsCount', { count: product.reviewsCount })}
              </span>
            </div>

            {!product.inStock ? (
              <Badge variant="error">{t('catalog.outOfStock')}</Badge>
            ) : product.stock <= 5 ? (
              <Badge variant="warning">{t('catalog.lowStock', { count: product.stock })}</Badge>
            ) : (
              <Badge variant="success">{t('catalog.inStock')}</Badge>
            )}
          </div>

          <div className="product-info__price-block">
            <span className="product-info__price">
              {formatPrice(product.price, product.currency)}
            </span>
            {product.oldPrice && (
              <>
                <span className="product-info__old-price">
                  {formatPrice(product.oldPrice, product.currency)}
                </span>
                {product.discountPercent && (
                  <Badge variant="error">-{product.discountPercent}%</Badge>
                )}
              </>
            )}
          </div>

          {/* Description */}
          <div>
            <h2
              style={{
                fontSize: 'var(--font-size-sm)',
                fontWeight: 'var(--font-weight-semibold)',
                marginBottom: 'var(--space-1)',
              }}
            >
              {t('product.descriptionTitle')}
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
              {product.description}
            </p>
          </div>

          {/* Warranty Pill */}
          {product.warrantyMonths > 0 && (
            <div className="product-info__meta-cards">
              <div className="product-info__meta-pill">
                <ShieldCheck size={18} color="var(--color-brand-accent)" aria-hidden="true" />
                <span>{t('product.warranty', { months: product.warrantyMonths })}</span>
              </div>
            </div>
          )}

          {cartError && <Alert variant="error">{cartError}</Alert>}

          {addedSuccess && (
            <Alert
              variant="success"
              action={
                <Link to="/cart">
                  <Button variant="outline" size="sm">
                    {t('catalog.viewCart')}
                  </Button>
                </Link>
              }
            >
              {t('catalog.addedToCart')}
            </Alert>
          )}

          {/* Quantity & Add to Cart */}
          <div className="product-info__actions">
            <QuantityStepper
              value={qty}
              min={1}
              max={Math.min(product.stock || 1, 99)}
              disabled={!product.inStock || addItem.isPending}
              onChange={setQty}
            />

            <Button
              variant="primary"
              size="lg"
              disabled={!product.inStock}
              isLoading={addItem.isPending}
              onClick={handleAddToCart}
              leftIcon={
                addedSuccess ? <Check size={18} /> : <ShoppingCart size={18} />
              }
              style={{ flex: 1, minWidth: '200px' }}
            >
              {!product.inStock ? t('catalog.outOfStock') : t('catalog.addToCart')}
            </Button>
          </div>
        </div>
      </div>

      {/* Dynamic Specifications Table (FE-003 #10 & FE-007 #4: Object.entries(specs)) */}
      {product.specs && Object.keys(product.specs).length > 0 && (
        <section className="product-specs-section" aria-label={t('product.specsTitle')}>
          <h2 className="product-section-title">{t('product.specsTitle')}</h2>
          <table className="specs-table">
            <tbody>
              {Object.entries(product.specs).map(([key, value]) => (
                <tr key={key} className="specs-table__row">
                  <th scope="row" className="specs-table__key">
                    {translateSpecKey(key)}
                  </th>
                  <td className="specs-table__val">{value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      )}

      {/* Related Products (8 items, reusing exact same ProductCard component! FE-007 #4) */}
      {product.related && product.related.length > 0 && (
        <section aria-label={t('product.relatedTitle')}>
          <h2 className="product-section-title" style={{ marginBottom: 'var(--space-5)' }}>
            {t('product.relatedTitle')}
          </h2>
          <div className="product-grid product-grid--4col">
            {product.related.map((relProduct) => (
              <ProductCard key={relProduct.id} product={relProduct} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};
