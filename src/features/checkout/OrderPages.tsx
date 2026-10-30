import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { CheckCircle2, Clock, CreditCard, MapPin, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Badge, Skeleton } from '../../shared/ui';
import { api, ApiError } from '../../shared/api/client';
import type { Order } from '../../shared/api/types';
import { formatPrice, formatDate } from '../../shared/lib/format';
import '../cart/Cart.css';
import './Checkout.css';

export const OrderDetailPage: React.FC = () => {
  const { id = '' } = useParams<{ id: string }>();
  const { t } = useTranslation();

  // FE-006 #4: Fetched from GET /orders/:id so F5 works reliably!
  const orderQuery = useQuery<{ order: Order }, ApiError>({
    queryKey: ['order', id],
    queryFn: () => api.get<{ order: Order }>(`/orders/${id}`),
  });

  if (orderQuery.isLoading) {
    return (
      <div className="container checkout-page">
        <Skeleton height="2.5rem" width="320px" style={{ marginBottom: 'var(--space-6)' }} />
        <Skeleton height="380px" />
      </div>
    );
  }

  if (orderQuery.isError || !orderQuery.data?.order) {
    return (
      <div className="container checkout-page">
        <div className="catalog-state-box" role="alert">
          <h2>{t('catalog.errorTitle')}</h2>
          <Link to="/catalog">
            <Button variant="primary">{t('cart.backToCatalog')}</Button>
          </Link>
        </div>
      </div>
    );
  }

  const { order } = orderQuery.data;
  const isPaid = order.status === 'paid';
  const shortId = order.id.slice(-8).toUpperCase();

  return (
    <div className="container checkout-page">
      <div className="order-card">
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: 'var(--space-4)',
            paddingBottom: 'var(--space-4)',
            borderBottom: '1px solid var(--color-border-subtle)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            {isPaid ? (
              <CheckCircle2 size={32} color="var(--color-success-text)" />
            ) : (
              <Clock size={32} color="var(--color-warning-text)" />
            )}
            <div>
              <h1 style={{ fontSize: 'var(--font-size-xl)', fontWeight: 'var(--font-weight-bold)' }}>
                {isPaid
                  ? t('checkout.order.thankYouTitle', { id: shortId })
                  : t('checkout.order.pendingTitle', { id: shortId })}
              </h1>
              <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                {t('checkout.order.dateLabel')}: {formatDate(order.createdAt)}
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <Badge variant={isPaid ? 'success' : 'warning'}>
              {isPaid ? t('checkout.order.statusPaid') : t('checkout.order.statusPending')}
            </Badge>

            {!isPaid && (
              <Link to={`/checkout/confirm/${order.id}`}>
                <Button variant="primary" size="sm">
                  {t('checkout.order.completePaymentBtn')}
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Shipping & Masked Payment Info (payment.brand + •••• last4) */}
        <div className="order-meta-grid">
          <div className="order-meta-block">
            <span className="order-meta-block__label">
              <MapPin size={12} style={{ display: 'inline', marginRight: '4px' }} />
              {t('checkout.order.shippingAddress')}
            </span>
            <strong>{order.shipping.fullName}</strong>
            <span>{order.shipping.phone}</span>
            <span>
              {order.shipping.city}, {order.shipping.address}
            </span>
          </div>

          <div className="order-meta-block">
            <span className="order-meta-block__label">
              <CreditCard size={12} style={{ display: 'inline', marginRight: '4px' }} />
              {t('checkout.order.paymentMethod')}
            </span>
            <strong style={{ textTransform: 'uppercase' }}>
              {order.payment.brand} •••• {order.payment.last4}
            </strong>
          </div>

          <div className="order-meta-block">
            <span className="order-meta-block__label">{t('checkout.total')}</span>
            <strong style={{ fontSize: 'var(--font-size-lg)' }}>
              {formatPrice(order.total, order.currency)}
            </strong>
            <span style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-secondary)' }}>
              {t('cart.subtotal')}: {formatPrice(order.subtotal, order.currency)} ·{' '}
              {t('checkout.shippingFee')}:{' '}
              {order.shippingFee === 0
                ? t('checkout.freeShipping')
                : formatPrice(order.shippingFee, order.currency)}
            </span>
          </div>
        </div>

        {/* Ordered Items List */}
        <div>
          <h2
            style={{
              fontSize: 'var(--font-size-md)',
              fontWeight: 'var(--font-weight-bold)',
              marginBottom: 'var(--space-3)',
            }}
          >
            {t('checkout.order.itemsTitle')}
          </h2>
          <div className="cart-items-list">
            {order.items.map((item, idx) => (
              <div key={`${item.slug}-${idx}`} className="cart-item-card">
                <img
                  src={item.image}
                  alt={item.title}
                  className="cart-item-card__img"
                />
                <div className="cart-item-card__info">
                  <Link to={`/product/${item.slug}`} className="cart-item-card__title">
                    {item.title}
                  </Link>
                  <div className="cart-item-card__unit-price">
                    {item.qty} × {formatPrice(item.price, order.currency)}
                  </div>
                </div>
                <div className="cart-item-card__line-total">
                  {formatPrice(item.lineTotal, order.currency)}
                </div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', flexWrap: 'wrap' }}>
          <Link to="/catalog">
            <Button variant="primary">{t('cart.backToCatalog')}</Button>
          </Link>
          <Link to="/orders">
            <Button variant="outline">{t('common.orders')}</Button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export const OrdersListPage: React.FC = () => {
  const { t } = useTranslation();

  const ordersQuery = useQuery<{ items: Order[] }>({
    queryKey: ['orders'],
    queryFn: () => api.get<{ items: Order[] }>('/orders'),
  });

  if (ordersQuery.isLoading) {
    return (
      <div className="container checkout-page">
        <Skeleton height="2.5rem" width="240px" style={{ marginBottom: 'var(--space-6)' }} />
        <Skeleton height="120px" style={{ marginBottom: 'var(--space-4)' }} />
        <Skeleton height="120px" />
      </div>
    );
  }

  const orders = ordersQuery.data?.items ?? [];

  return (
    <div className="container checkout-page">
      <h1 className="checkout-page__title">{t('checkout.order.historyTitle')}</h1>

      {orders.length === 0 ? (
        <div className="catalog-state-box">
          <Package size={36} color="var(--color-text-muted)" />
          <p>{t('checkout.order.noOrders')}</p>
          <Link to="/catalog">
            <Button variant="primary">{t('cart.backToCatalog')}</Button>
          </Link>
        </div>
      ) : (
        <div className="cart-items-list">
          {orders.map((ord) => {
            const isPaid = ord.status === 'paid';
            return (
              <div
                key={ord.id}
                className="order-card"
                style={{ padding: 'var(--space-4) var(--space-5)', gap: 'var(--space-3)' }}
              >
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: 'var(--space-3)',
                  }}
                >
                  <div>
                    <strong>#{ord.id.slice(-8).toUpperCase()}</strong>
                    <div
                      style={{
                        fontSize: 'var(--font-size-xs)',
                        color: 'var(--color-text-muted)',
                      }}
                    >
                      {formatDate(ord.createdAt)}
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
                    <Badge variant={isPaid ? 'success' : 'warning'}>
                      {isPaid ? t('checkout.order.statusPaid') : t('checkout.order.statusPending')}
                    </Badge>
                    <strong>{formatPrice(ord.total, ord.currency)}</strong>
                    <Link to={`/orders/${ord.id}`}>
                      <Button variant="outline" size="sm">
                        {t('checkout.order.viewOrder')}
                      </Button>
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
