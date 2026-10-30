import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery } from '@tanstack/react-query';
import { MapPin, CreditCard, Lock } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Input,
  FormField,
  Alert,
  Badge,
  Skeleton,
} from '../../shared/ui';
import { api, ApiError } from '../../shared/api/client';
import type { CheckoutSummary, CreateOrderResponse, Address } from '../../shared/api/types';
import { formatPrice } from '../../shared/lib/format';
import {
  isValidLuhn,
  formatCardNumber,
  formatCardExpiry,
  isValidFutureExpiry,
} from './cardUtils';
import '../cart/Cart.css';
import './Checkout.css';

export const CheckoutPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [cardDeclinedError, setCardDeclinedError] = useState<string | null>(null);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [insufficientItems, setInsufficientItems] = useState<
    Array<{ productId: string; title: string; slug: string; requested: number; available: number }>
  >([]);

  const checkoutQuery = useQuery<CheckoutSummary>({
    queryKey: ['checkout'],
    queryFn: () => api.get<CheckoutSummary>('/checkout'),
    refetchOnMount: 'always',
  });

  const checkoutData = checkoutQuery.data;

  // FE-006 #2: If cart is empty (items: []), redirect to /cart
  useEffect(() => {
    if (checkoutData && checkoutData.items.length === 0) {
      navigate('/cart', { replace: true });
    }
  }, [checkoutData, navigate]);

  const checkoutSchema = z.object({
    shipping: z.object({
      fullName: z.string().trim().min(2, t('profile.addressForm.fullNameMin')),
      phone: z
        .string()
        .trim()
        .min(9, t('profile.addressForm.phoneInvalid'))
        .max(20, t('profile.addressForm.phoneInvalid')),
      city: z.string().trim().min(2, t('profile.addressForm.cityMin')),
      address: z.string().trim().min(5, t('profile.addressForm.addressMin')),
    }),
    card: z.object({
      number: z
        .string()
        .refine((val) => isValidLuhn(val), t('checkout.cardNumberInvalid')),
      holder: z.string().trim().min(2, t('checkout.cardHolderInvalid')),
      expiry: z
        .string()
        .refine((val) => isValidFutureExpiry(val), t('checkout.cardExpiryInvalid')),
      cvc: z.string().regex(/^\d{3,4}$/, t('checkout.cardCvcInvalid')),
    }),
  });

  type CheckoutFormValues = z.infer<typeof checkoutSchema>;

  const {
    register,
    handleSubmit,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<CheckoutFormValues>({
    resolver: zodResolver(checkoutSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: {
      shipping: {
        fullName: '',
        phone: '',
        city: '',
        address: '',
      },
      card: {
        number: '',
        holder: '',
        expiry: '',
        cvc: '',
      },
    },
  });

  // Pre-fill shipping with default address from GET /checkout (FE-006 #3)
  useEffect(() => {
    if (checkoutData?.shipping) {
      setValue('shipping.fullName', checkoutData.shipping.fullName || '');
      setValue('shipping.phone', checkoutData.shipping.phone || '');
      setValue('shipping.city', checkoutData.shipping.city || '');
      setValue('shipping.address', checkoutData.shipping.address || '');

      const defaultAddr = checkoutData.addresses?.find((a) => a.isDefault);
      if (defaultAddr) {
        setSelectedAddressId(defaultAddr.id);
      }
    }
  }, [checkoutData, setValue]);

  const handleSelectSavedAddress = (addr: Address) => {
    setSelectedAddressId(addr.id);
    setValue('shipping.fullName', addr.fullName, { shouldValidate: true });
    setValue('shipping.phone', addr.phone, { shouldValidate: true });
    setValue('shipping.city', addr.city, { shouldValidate: true });
    setValue('shipping.address', addr.address, { shouldValidate: true });
  };

  const clearCardFields = () => {
    setValue('card.number', '');
    setValue('card.holder', '');
    setValue('card.expiry', '');
    setValue('card.cvc', '');
  };

  // FE-006 #4 & #5: Submit POST /orders -> NEVER log or store card data!
  const onSubmit = async (values: CheckoutFormValues) => {
    setCardDeclinedError(null);
    setGeneralError(null);
    setInsufficientItems([]);

    try {
      const res = await api.post<CreateOrderResponse>('/orders', {
        shipping: {
          fullName: values.shipping.fullName.trim(),
          phone: values.shipping.phone.trim(),
          city: values.shipping.city.trim(),
          address: values.shipping.address.trim(),
        },
        card: {
          number: values.card.number.trim(),
          holder: values.card.holder.trim(),
          expiry: values.card.expiry.trim(),
          cvc: values.card.cvc.trim(),
        },
      });

      // Clear card fields immediately after sending (FE-006 #5)
      clearCardFields();

      // Store orderId in URL parameter (ADR-005)
      navigate(`/checkout/confirm/${res.orderId}`);
    } catch (err) {
      if (err instanceof ApiError) {
        // 409 CART_EMPTY -> redirect to /cart
        if (err.code === 'CART_EMPTY') {
          navigate('/cart', { replace: true });
          return;
        }

        // 402 CARD_DECLINED -> banner inside card section, shipping address stays intact!
        if (err.code === 'CARD_DECLINED' || err.status === 402) {
          setCardDeclinedError(t('checkout.cardDeclined'));
          return;
        }

        // 409 INSUFFICIENT_STOCK -> list of items + link to cart
        if (err.code === 'INSUFFICIENT_STOCK') {
          if (err.items && err.items.length > 0) {
            setInsufficientItems(err.items);
          } else {
            setGeneralError(t('checkout.insufficientStockTitle'));
          }
          return;
        }

        // 422 VALIDATION_ERROR -> nested field names like "card.number", "shipping.phone"
        if (err.status === 422 && err.errors) {
          Object.entries(err.errors).forEach(([fieldPath, msg]) => {
            setError(
              fieldPath as keyof CheckoutFormValues,
              { type: 'server', message: msg },
              { shouldFocus: true }
            );
          });
          return;
        }

        setGeneralError(err.code === 'NETWORK_ERROR' ? t('common.networkError') : err.message);
      } else {
        setGeneralError(t('common.networkError'));
      }
    }
  };

  if (checkoutQuery.isLoading) {
    return (
      <div className="container checkout-page">
        <Skeleton height="2.5rem" width="240px" style={{ marginBottom: 'var(--space-6)' }} />
        <div className="checkout-layout">
          <div>
            <Skeleton height="320px" style={{ marginBottom: 'var(--space-6)' }} />
            <Skeleton height="280px" />
          </div>
          <Skeleton height="360px" />
        </div>
      </div>
    );
  }

  if (!checkoutData || checkoutData.items.length === 0) {
    return null;
  }

  const remainingForFreeShipping = Math.max(
    0,
    checkoutData.freeShippingFrom - checkoutData.subtotal
  );

  const cardNumberReg = register('card.number');
  const cardExpiryReg = register('card.expiry');
  const cardCvcReg = register('card.cvc');

  return (
    <div className="container checkout-page">
      <h1 className="checkout-page__title">{t('checkout.title')}</h1>

      {generalError && (
        <Alert variant="error" className="mb-4">
          {generalError}
        </Alert>
      )}

      {insufficientItems.length > 0 && (
        <Alert
          variant="error"
          title={t('checkout.insufficientStockTitle')}
          action={
            <Link to="/cart">
              <Button variant="outline" size="sm">
                {t('checkout.returnToCart')}
              </Button>
            </Link>
          }
        >
          <ul style={{ paddingLeft: 'var(--space-5)', marginTop: 'var(--space-2)' }}>
            {insufficientItems.map((it) => (
              <li key={it.productId}>
                {it.title} — {t('cart.insufficientStock', { available: it.available })}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      <form
        className="checkout-layout"
        style={{ marginTop: 'var(--space-4)' }}
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <div>
          {/* 1. Shipping Section */}
          <section className="checkout-section-card" aria-label={t('checkout.shippingTitle')}>
            <h2 className="checkout-section-title">
              <MapPin size={20} aria-hidden="true" />
              <span>{t('checkout.shippingTitle')}</span>
            </h2>

            {/* Saved addresses selector if addresses.length > 1 (FE-006 #3) */}
            {checkoutData.addresses && checkoutData.addresses.length > 1 && (
              <div>
                <div
                  style={{
                    fontSize: 'var(--font-size-sm)',
                    fontWeight: 'var(--font-weight-semibold)',
                    marginBottom: 'var(--space-2)',
                  }}
                >
                  {t('checkout.savedAddressesTitle')}
                </div>
                <div className="saved-addresses-selector">
                  {checkoutData.addresses.map((addr) => {
                    const isSelected = selectedAddressId === addr.id;
                    return (
                      <label
                        key={addr.id}
                        className={`saved-address-radio ${
                          isSelected ? 'saved-address-radio--selected' : ''
                        }`}
                      >
                        <input
                          type="radio"
                          name="savedAddress"
                          checked={isSelected}
                          onChange={() => handleSelectSavedAddress(addr)}
                          style={{ marginTop: '4px', accentColor: 'var(--color-brand-primary)' }}
                        />
                        <div style={{ fontSize: 'var(--font-size-xs)' }}>
                          <div style={{ fontWeight: 'var(--font-weight-bold)', display: 'flex', gap: '6px', alignItems: 'center' }}>
                            <span>{addr.label || addr.city}</span>
                            {addr.isDefault && (
                              <Badge variant="primary">{t('profile.defaultBadge')}</Badge>
                            )}
                          </div>
                          <div>{addr.fullName}</div>
                          <div style={{ color: 'var(--color-text-secondary)' }}>
                            {addr.city}, {addr.address}
                          </div>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            <FormField
              id="ship-fullName"
              label={t('profile.addressForm.fullName')}
              error={errors.shipping?.fullName?.message}
              required
            >
              <Input
                id="ship-fullName"
                autoComplete="name"
                hasError={!!errors.shipping?.fullName}
                disabled={isSubmitting}
                {...register('shipping.fullName')}
              />
            </FormField>

            <FormField
              id="ship-phone"
              label={t('profile.addressForm.phone')}
              error={errors.shipping?.phone?.message}
              required
            >
              <Input
                id="ship-phone"
                type="tel"
                autoComplete="tel"
                placeholder={t('profile.addressForm.phonePlaceholder')}
                hasError={!!errors.shipping?.phone}
                disabled={isSubmitting}
                {...register('shipping.phone')}
              />
            </FormField>

            <FormField
              id="ship-city"
              label={t('profile.addressForm.city')}
              error={errors.shipping?.city?.message}
              required
            >
              <Input
                id="ship-city"
                autoComplete="address-level2"
                placeholder={t('profile.addressForm.cityPlaceholder')}
                hasError={!!errors.shipping?.city}
                disabled={isSubmitting}
                {...register('shipping.city')}
              />
            </FormField>

            <FormField
              id="ship-address"
              label={t('profile.addressForm.address')}
              error={errors.shipping?.address?.message}
              required
            >
              <Input
                id="ship-address"
                autoComplete="street-address"
                placeholder={t('profile.addressForm.addressPlaceholder')}
                hasError={!!errors.shipping?.address}
                disabled={isSubmitting}
                {...register('shipping.address')}
              />
            </FormField>
          </section>

          {/* 2. Card Payment Section */}
          <section className="checkout-section-card" aria-label={t('checkout.paymentTitle')}>
            <h2 className="checkout-section-title">
              <CreditCard size={20} aria-hidden="true" />
              <span>{t('checkout.paymentTitle')}</span>
            </h2>

            {/* 402 CARD_DECLINED banner inside card section (FE-006 #4) */}
            {cardDeclinedError && <Alert variant="error">{cardDeclinedError}</Alert>}

            <div className="test-cards-hint">
              <strong>{t('checkout.testCardsTitle')}</strong>
              <span>• 4242 4242 4242 4242 — {t('checkout.testCardSuccess')}</span>
              <span>• 4000 0000 0000 0002 — {t('checkout.testCardDeclined')} (402)</span>
            </div>

            <FormField
              id="card-number"
              label={t('checkout.cardNumber')}
              error={errors.card?.number?.message}
              required
            >
              <Input
                id="card-number"
                type="text"
                inputMode="numeric"
                autoComplete="cc-number"
                placeholder="4242 4242 4242 4242"
                hasError={!!errors.card?.number}
                disabled={isSubmitting}
                {...cardNumberReg}
                onChange={(e) => {
                  e.target.value = formatCardNumber(e.target.value);
                  cardNumberReg.onChange(e);
                }}
              />
            </FormField>

            <FormField
              id="card-holder"
              label={t('checkout.cardHolder')}
              error={errors.card?.holder?.message}
              required
            >
              <Input
                id="card-holder"
                type="text"
                autoComplete="cc-name"
                placeholder="NINO BERIDZE"
                hasError={!!errors.card?.holder}
                disabled={isSubmitting}
                {...register('card.holder')}
              />
            </FormField>

            <div className="card-grid-row">
              <FormField
                id="card-expiry"
                label={t('checkout.cardExpiry')}
                error={errors.card?.expiry?.message}
                required
              >
                <Input
                  id="card-expiry"
                  type="text"
                  inputMode="numeric"
                  autoComplete="cc-exp"
                  placeholder="12/29"
                  maxLength={5}
                  hasError={!!errors.card?.expiry}
                  disabled={isSubmitting}
                  {...cardExpiryReg}
                  onChange={(e) => {
                    e.target.value = formatCardExpiry(e.target.value);
                    cardExpiryReg.onChange(e);
                  }}
                />
              </FormField>

              <FormField
                id="card-cvc"
                label={t('checkout.cardCvc')}
                error={errors.card?.cvc?.message}
                required
              >
                <Input
                  id="card-cvc"
                  type="password"
                  inputMode="numeric"
                  autoComplete="cc-csc"
                  placeholder="•••"
                  maxLength={4}
                  hasError={!!errors.card?.cvc}
                  disabled={isSubmitting}
                  {...cardCvcReg}
                  onChange={(e) => {
                    e.target.value = e.target.value.replace(/\D/g, '').slice(0, 4);
                    cardCvcReg.onChange(e);
                  }}
                />
              </FormField>
            </div>
          </section>
        </div>

        {/* 3. Order Summary Sidebar */}
        <aside className="cart-summary-card" aria-label={t('cart.summaryTitle')}>
          <h2 style={{ fontSize: 'var(--font-size-lg)', fontWeight: 'var(--font-weight-bold)' }}>
            {t('cart.summaryTitle')}
          </h2>

          <div className="checkout-summary-items">
            {checkoutData.items.map((item) => (
              <div key={item.id} className="checkout-summary-item">
                <div className="checkout-summary-item__left">
                  <img
                    src={item.product.image}
                    alt={item.product.title}
                    className="checkout-summary-item__img"
                  />
                  <div>
                    <div style={{ fontWeight: 'var(--font-weight-medium)' }}>
                      {item.product.title}
                    </div>
                    <div style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
                      {item.qty} × {formatPrice(item.product.price, checkoutData.currency)}
                    </div>
                  </div>
                </div>
                <strong>{formatPrice(item.lineTotal, checkoutData.currency)}</strong>
              </div>
            ))}
          </div>

          <div className="cart-summary-row">
            <span>{t('cart.subtotal')}</span>
            <span>{formatPrice(checkoutData.subtotal, checkoutData.currency)}</span>
          </div>

          <div className="cart-summary-row">
            <span>{t('checkout.shippingFee')}</span>
            <span>
              {checkoutData.shippingFee === 0
                ? t('checkout.freeShipping')
                : formatPrice(checkoutData.shippingFee, checkoutData.currency)}
            </span>
          </div>

          {remainingForFreeShipping > 0 && (
            <Alert variant="info">
              {t('checkout.freeShippingHint', {
                amount: formatPrice(remainingForFreeShipping, checkoutData.currency),
              })}
            </Alert>
          )}

          <div className="cart-summary-row cart-summary-row--total">
            <span>{t('checkout.total')}</span>
            <span>{formatPrice(checkoutData.total, checkoutData.currency)}</span>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isSubmitting}
            leftIcon={<Lock size={16} />}
          >
            {t('checkout.payButton')}
          </Button>
        </aside>
      </form>
    </div>
  );
};
