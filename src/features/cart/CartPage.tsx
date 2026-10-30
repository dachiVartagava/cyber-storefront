import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingBag, Trash2, ArrowRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Alert,
  Skeleton,
  QuantityStepper,
} from '../../shared/ui';
import { formatPrice } from '../../shared/lib/format';
import { ApiError } from '../../shared/api/client';
import { useCart } from './useCart';
import './Cart.css';

export const CartPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { cart, isLoading, updateItemQty, removeItem } = useCart();

  // Track which item is currently updating to prevent stepper race conditions (ADR-004)
  const [updatingItemId, setUpdatingItemId] = useState<string | null>(null);
  const [itemErrors, setItemErrors] = useState<Record<string, string>>({});

  if (isLoading) {
    return (
      <div className="container cart-page">
        <Skeleton height="2.5rem" width="200px" style={{ marginBottom: 'var(--space-6)' }} />
        <div className="cart-layout">
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Skeleton height="120px" />
            <Skeleton height="120px" />
          </div>
          <Skeleton height="240px" />
        </div>
      </div>
    );
  }

  const items = cart?.items ?? [];

  // FE-005 #4: Empty cart state -> "კალათა ცარიელია" + button "კატალოგში დაბრუნება"
  if (items.length === 0) {
    return (
      <div className="container cart-page">
        <h1 className="cart-page__title">{t('cart.title')}</h1>
        <div className="catalog-state-box">
          <ShoppingBag size={36} color="var(--color-text-muted)" />
          <h2>{t('cart.emptyTitle')}</h2>
          <p style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)' }}>
            {t('cart.emptySubtitle')}
          </p>
          <Link to="/catalog">
            <Button variant="primary">{t('cart.backToCatalog')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  // FE-005 #4: Check if any item's stock changed and is now less than qty in cart
  const hasStockExceededItem = items.some(
    (item) => !item.product.inStock || item.product.stock < item.qty
  );

  // NOTE: PATCH /cart/items/:id uses item.id (cart position id, NOT productId!)
  const handleQtyChange = async (itemId: string, newQty: number) => {
    setUpdatingItemId(itemId);
    setItemErrors((prev) => {
      const next = { ...prev };
      delete next[itemId];
      return next;
    });

    try {
      await updateItemQty.mutateAsync({ itemId, qty: newQty });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'INSUFFICIENT_STOCK') {
          setItemErrors((prev) => ({
            ...prev,
            [itemId]: t('cart.insufficientStock', { available: err.available ?? 0 }),
          }));
        } else {
          setItemErrors((prev) => ({ ...prev, [itemId]: err.message }));
        }
      }
    } finally {
      setUpdatingItemId(null);
    }
  };

  // DELETE /cart/items/:id uses item.id
  const handleRemoveItem = async (itemId: string) => {
    setUpdatingItemId(itemId);
    try {
      await removeItem.mutateAsync(itemId);
    } finally {
      setUpdatingItemId(null);
    }
  };

  return (
    <div className="container cart-page">
      <h1 className="cart-page__title">{t('cart.title')}</h1>

      {hasStockExceededItem && (
        <Alert variant="warning" className="mb-4">
          {t('cart.stockChangedWarning')}
        </Alert>
      )}

      <div className="cart-layout" style={{ marginTop: 'var(--space-4)' }}>
        <div className="cart-items-list">
          {items.map((item) => {
            const isBusy = updatingItemId === item.id;
            const stockInsufficient =
              !item.product.inStock || item.product.stock < item.qty;
            const lineError = itemErrors[item.id];

            return (
              <div key={item.id} className="cart-item-card">
                <Link to={`/product/${item.product.slug}`}>
                  <img
                    src={item.product.image}
                    alt={item.product.title}
                    className="cart-item-card__img"
                    loading="lazy"
                  />
                </Link>

                <div className="cart-item-card__info">
                  <span
                    style={{
                      fontSize: 'var(--font-size-xs)',
                      color: 'var(--color-text-muted)',
                      fontWeight: 'var(--font-weight-semibold)',
                    }}
                  >
                    {item.product.brand}
                  </span>
                  <Link
                    to={`/product/${item.product.slug}`}
                    className="cart-item-card__title"
                  >
                    {item.product.title}
                  </Link>
                  <div className="cart-item-card__unit-price">
                    {formatPrice(item.product.price, item.product.currency)}
                  </div>

                  {stockInsufficient && (
                    <div
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-error-text)',
                        fontWeight: 'var(--font-weight-semibold)',
                      }}
                      role="alert"
                    >
                      {!item.product.inStock
                        ? t('cart.outOfStock')
                        : t('cart.insufficientStock', { available: item.product.stock })}
                    </div>
                  )}

                  {lineError && (
                    <div
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-error-text)',
                        fontWeight: 'var(--font-weight-semibold)',
                      }}
                      role="alert"
                    >
                      {lineError}
                    </div>
                  )}
                </div>

                <div className="cart-item-card__controls">
                  <QuantityStepper
                    value={item.qty}
                    min={1}
                    max={Math.min(item.product.stock || 1, 99)}
                    disabled={isBusy}
                    onChange={(newQty) => handleQtyChange(item.id, newQty)}
                  />

                  {/* FE-005 #3: Display server-calculated lineTotal directly */}
                  <div className="cart-item-card__line-total">
                    {formatPrice(item.lineTotal, cart?.currency)}
                  </div>

                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={isBusy}
                    onClick={() => handleRemoveItem(item.id)}
                    aria-label={t('cart.removeItem')}
                    title={t('cart.removeItem')}
                  >
                    <Trash2 size={18} color="var(--color-error-text)" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Cart Summary Box (FE-005 #3: Server-calculated totalQty and subtotal) */}
        <aside className="cart-summary-card" aria-label={t('cart.summaryTitle')}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' }}>
            {t('cart.summaryTitle')}
          </h2>

          <div className="cart-summary-row">
            <span>{t('cart.itemsCount')}</span>
            <strong>{cart?.totalQty ?? 0}</strong>
          </div>

          <div className="cart-summary-row cart-summary-row--total">
            <span>{t('cart.subtotal')}</span>
            <span>{formatPrice(cart?.subtotal ?? 0, cart?.currency)}</span>
          </div>

          <Button
            variant="primary"
            size="lg"
            fullWidth
            disabled={hasStockExceededItem}
            onClick={() => navigate('/checkout')}
            rightIcon={<ArrowRight size={18} />}
          >
            {t('cart.proceedToCheckout')}
          </Button>
        </aside>
      </div>
    </div>
  );
};
