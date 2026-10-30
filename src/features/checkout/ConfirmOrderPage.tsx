import React, { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { ArrowLeft, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button, Input, FormField, Alert } from '../../shared/ui';
import { api, ApiError } from '../../shared/api/client';
import type { Order } from '../../shared/api/types';
import { useAuth } from '../auth/AuthContext';
import { useCart } from '../cart/useCart';
import '../auth/Auth.css';

export const ConfirmOrderPage: React.FC = () => {
  // FE-006 #2: orderId stored in URL so F5 preserves state! (ADR-005)
  const { orderId = '' } = useParams<{ orderId: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { clearCartCache } = useCart();

  // 30-second countdown timer for resend button (FE-006 #4)
  const [resendSeconds, setResendSeconds] = useState(30);
  const [isResending, setIsResending] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [resentMessage, setResentMessage] = useState<string | null>(null);
  const [tooManyAttempts, setTooManyAttempts] = useState(false);
  const [insufficientItems, setInsufficientItems] = useState<
    Array<{ productId: string; title: string; slug: string; requested: number; available: number }>
  >([]);

  useEffect(() => {
    if (resendSeconds <= 0) return;
    const timer = setInterval(() => {
      setResendSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [resendSeconds]);

  const codeSchema = z.object({
    code: z.string().regex(/^\d{6}$/, t('auth.validation.codeInvalid')),
  });

  type CodeFormValues = z.infer<typeof codeSchema>;

  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<CodeFormValues>({
    resolver: zodResolver(codeSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: { code: '' },
  });

  // POST /orders/:id/confirm (FE-006 #4)
  const onSubmit = async (values: CodeFormValues) => {
    setBannerError(null);
    setResentMessage(null);
    setInsufficientItems([]);

    try {
      await api.post<{ order: Order }>(`/orders/${orderId}/confirm`, {
        code: values.code.trim(),
      });
      // Clear frontend cart badge & cache (FE-006 #4)
      clearCartCache();
      navigate(`/orders/${orderId}`, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'INVALID_PAYMENT_CODE') {
          setError(
            'code',
            { type: 'server', message: t('checkout.confirm.invalidCode') },
            { shouldFocus: true }
          );
          return;
        }
        if (err.code === 'TOO_MANY_ATTEMPTS' || err.status === 429) {
          setTooManyAttempts(true);
          setBannerError(t('checkout.confirm.tooManyAttempts'));
          return;
        }
        if (err.code === 'ORDER_ALREADY_PAID') {
          clearCartCache();
          navigate(`/orders/${orderId}`, { replace: true });
          return;
        }
        if (err.code === 'INSUFFICIENT_STOCK') {
          if (err.items && err.items.length > 0) {
            setInsufficientItems(err.items);
          } else {
            setBannerError(t('checkout.insufficientStockTitle'));
          }
          return;
        }
        if (err.status === 422 && err.errors?.code) {
          setError(
            'code',
            { type: 'server', message: err.errors.code },
            { shouldFocus: true }
          );
          return;
        }
        setBannerError(err.code === 'NETWORK_ERROR' ? t('common.networkError') : err.message);
      } else {
        setBannerError(t('common.networkError'));
      }
    }
  };

  // POST /orders/:id/resend-code (FE-006 #4)
  const handleResendCode = async () => {
    setBannerError(null);
    setResentMessage(null);
    setIsResending(true);

    try {
      await api.post(`/orders/${orderId}/resend-code`);
      setTooManyAttempts(false);
      reset({ code: '' });
      setResendSeconds(30);
      setResentMessage(t('checkout.confirm.codeResent'));
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'RESEND_TOO_SOON' || err.status === 429) {
          setResendSeconds(err.retryAfterSeconds ?? 30);
          return;
        }
        if (err.code === 'ORDER_ALREADY_PAID') {
          clearCartCache();
          navigate(`/orders/${orderId}`, { replace: true });
          return;
        }
        setBannerError(err.message);
      } else {
        setBannerError(t('common.networkError'));
      }
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__header">
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 'var(--space-2)' }}>
            <ShieldCheck size={36} color="var(--color-brand-accent)" />
          </div>
          <h1 className="auth-card__title">{t('checkout.confirm.title')}</h1>
          <p className="auth-card__subtitle">
            {t('checkout.confirm.subtitle', { email: user?.email || '' })}
          </p>
        </div>

        <Alert variant="info">{t('auth.forgot.devHint')}</Alert>

        {resentMessage && <Alert variant="success">{resentMessage}</Alert>}

        {bannerError && (
          <Alert
            variant="error"
            action={
              tooManyAttempts ? (
                <Button
                  variant="outline"
                  size="sm"
                  disabled={resendSeconds > 0 || isResending}
                  onClick={handleResendCode}
                >
                  {resendSeconds > 0
                    ? t('checkout.confirm.resendTimer', { seconds: resendSeconds })
                    : t('auth.forgot.requestNewCodeBtn')}
                </Button>
              ) : undefined
            }
          >
            {bannerError}
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

        <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <FormField
            id="payment-code"
            label={t('checkout.confirm.codeLabel')}
            error={errors.code?.message}
            required
          >
            <Input
              id="payment-code"
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              hasError={!!errors.code}
              disabled={isSubmitting}
              {...register('code')}
            />
          </FormField>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isSubmitting}
          >
            {t('checkout.confirm.confirmBtn')}
          </Button>

          <Button
            type="button"
            variant="outline"
            size="md"
            fullWidth
            disabled={resendSeconds > 0 || isResending}
            isLoading={isResending}
            onClick={handleResendCode}
          >
            {resendSeconds > 0
              ? t('checkout.confirm.resendTimer', { seconds: resendSeconds })
              : t('checkout.confirm.resendBtn')}
          </Button>
        </form>

        <div className="auth-card__footer">
          <Link
            to="/checkout"
            className="auth-link"
            style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}
          >
            <ArrowLeft size={16} />
            <span>{t('checkout.confirm.backToCheckout')}</span>
          </Link>
        </div>
      </div>
    </div>
  );
};
