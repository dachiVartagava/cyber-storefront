import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Star, ShoppingCart, Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import type { Product } from '../../shared/api/types';
import { formatPrice } from '../../shared/lib/format';
import { Button, Badge, Skeleton } from '../../shared/ui';
import { useAuth } from '../auth/AuthContext';
import { useCart } from '../cart/useCart';
import { ApiError } from '../../shared/api/client';

export interface ProductCardProps {
  product: Product;
}

export const ProductCard: React.FC<ProductCardProps> = ({ product }) => {
  const { t } = useTranslation();
  const { status } = useAuth();
  const { addItem } = useCart();
  const navigate = useNavigate();
  const location = useLocation();

  const [justAdded, setJustAdded] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleAddToCart = async () => {
    setErrorMsg(null);
    if (status !== 'authenticated') {
      navigate('/login', {
        state: { from: location.pathname + location.search },
      });
      return;
    }

    try {
      await addItem.mutateAsync({ productId: product.id, qty: 1 });
      setJustAdded(true);
      setTimeout(() => setJustAdded(false), 2000);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'INSUFFICIENT_STOCK') {
          setErrorMsg(t('cart.insufficientStock', { available: err.available ?? 0 }));
        } else if (err.code === 'OUT_OF_STOCK') {
          setErrorMsg(t('cart.outOfStock'));
        } else if (err.code === 'PRODUCT_NOT_FOUND') {
          setErrorMsg(t('cart.productNotFound'));
        } else {
          setErrorMsg(err.message);
        }
      }
    }
  };

  return (
    <article className="product-card">
      <Link to={`/product/${product.slug}`} className="product-card__image-link">
        <img
          src={product.image}
          alt={product.title}
          loading="lazy"
          className="product-card__image"
        />
        <div className="product-card__badges">
          {product.discountPercent && product.discountPercent > 0 && (
            <Badge variant="error">-{product.discountPercent}%</Badge>
          )}
          {!product.inStock ? (
            <Badge variant="warning">{t('catalog.outOfStock')}</Badge>
          ) : product.stock <= 5 ? (
            <Badge variant="warning">{t('catalog.lowStock', { count: product.stock })}</Badge>
          ) : (
            <Badge variant="success">{t('catalog.inStock')}</Badge>
          )}
        </div>
      </Link>

      <div className="product-card__body">
        <div className="product-card__meta">
          <span className="product-card__brand">{product.brand}</span>
          <span className="product-card__rating">
            <Star size={14} fill="#f59e0b" color="#f59e0b" aria-hidden="true" />
            <span>{product.rating.toFixed(1)}</span>
            <span>{t('catalog.reviewsCount', { count: product.reviewsCount })}</span>
          </span>
        </div>

        <Link to={`/product/${product.slug}`} className="product-card__title">
          {product.title}
        </Link>
      </div>

      <div className="product-card__footer">
        <div className="product-card__price-row">
          <span className="product-card__price">
            {formatPrice(product.price, product.currency)}
          </span>
          {product.oldPrice && (
            <span className="product-card__old-price">
              {formatPrice(product.oldPrice, product.currency)}
            </span>
          )}
        </div>

        {errorMsg && (
          <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-error-text)' }} role="alert">
            {errorMsg}
          </div>
        )}

        <Button
          variant={justAdded ? 'secondary' : 'primary'}
          size="sm"
          fullWidth
          disabled={!product.inStock}
          isLoading={addItem.isPending}
          onClick={handleAddToCart}
          leftIcon={
            justAdded ? (
              <Check size={16} aria-hidden="true" />
            ) : (
              <ShoppingCart size={16} aria-hidden="true" />
            )
          }
        >
          {!product.inStock
            ? t('catalog.outOfStock')
            : justAdded
            ? t('catalog.addedToCart')
            : t('catalog.addToCart')}
        </Button>
      </div>
    </article>
  );
};

export const ProductCardSkeleton: React.FC = () => {
  return (
    <div className="product-card" aria-hidden="true">
      <Skeleton style={{ aspectRatio: '1 / 1', width: '100%' }} />
      <Skeleton height="0.875rem" width="50%" />
      <Skeleton height="1.25rem" width="90%" />
      <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
        <Skeleton height="1.5rem" width="40%" />
        <Skeleton height="2.25rem" width="100%" />
      </div>
    </div>
  );
};
