import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Button, Input, PasswordInput, FormField, Alert } from '../../shared/ui';
import { api, ApiError } from '../../shared/api/client';
import type { AuthResponse } from '../../shared/api/types';
import { useAuth } from './AuthContext';
import './Auth.css';

export const LoginPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { setAuthSuccess, sessionExpiredMessage, clearSessionExpiredMessage } = useAuth();
  const [bannerError, setBannerError] = useState<string | null>(null);

  // FE-001 & FE-002: Login checks email required + format, password required only (NO strength check!)
  const loginSchema = z.object({
    email: z
      .string()
      .min(1, t('auth.validation.emailRequired'))
      .email(t('auth.validation.emailInvalid')),
    password: z.string().min(1, t('auth.validation.passwordRequired')),
  });

  type LoginFormValues = z.infer<typeof loginSchema>;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const fromPath = (location.state as { from?: string } | null)?.from || '/catalog';

  const onSubmit = async (values: LoginFormValues) => {
    setBannerError(null);
    clearSessionExpiredMessage();

    try {
      const data = await api.post<AuthResponse>('/auth/login', values, {
        skipAuthRedirect: true,
      });
      setAuthSuccess(data);
      navigate(fromPath, { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 422 && err.errors) {
          Object.entries(err.errors).forEach(([field, msg]) => {
            if (field === 'email' || field === 'password') {
              setError(field, { type: 'server', message: msg });
            }
          });
          return;
        }
        if (err.code === 'INVALID_CREDENTIALS') {
          setBannerError(t('auth.errors.INVALID_CREDENTIALS'));
          return;
        }
        if (err.code === 'NETWORK_ERROR') {
          setBannerError(t('common.networkError'));
          return;
        }
        setBannerError(err.message);
      } else {
        setBannerError(t('common.networkError'));
      }
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__header">
          <h1 className="auth-card__title">{t('auth.login.title')}</h1>
          <p className="auth-card__subtitle">{t('auth.login.subtitle')}</p>
        </div>

        {sessionExpiredMessage && !bannerError && (
          <Alert variant="warning">{t('common.sessionExpired')}</Alert>
        )}

        {bannerError && <Alert variant="error">{bannerError}</Alert>}

        <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <FormField
            id="login-email"
            label={t('auth.login.emailLabel')}
            error={errors.email?.message}
            required
          >
            <Input
              id="login-email"
              type="email"
              autoComplete="email"
              placeholder={t('auth.login.emailPlaceholder')}
              hasError={!!errors.email}
              disabled={isSubmitting}
              {...register('email')}
            />
          </FormField>

          <FormField
            id="login-password"
            label={t('auth.login.passwordLabel')}
            error={errors.password?.message}
            required
            rightLabelElement={
              <Link to="/forgot-password" className="auth-link--subtle">
                {t('auth.login.forgotPasswordLink')}
              </Link>
            }
          >
            <PasswordInput
              id="login-password"
              autoComplete="current-password"
              placeholder={t('auth.login.passwordPlaceholder')}
              hasError={!!errors.password}
              disabled={isSubmitting}
              {...register('password')}
            />
          </FormField>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            isLoading={isSubmitting}
            style={{ marginTop: 'var(--space-2)' }}
          >
            {t('auth.login.submit')}
          </Button>
        </form>

        <div className="auth-card__footer">
          <span>{t('auth.login.noAccount')}</span>
          <Link to="/register" className="auth-link">
            {t('auth.login.createAccountLink')}
          </Link>
        </div>
      </div>
    </div>
  );
};
