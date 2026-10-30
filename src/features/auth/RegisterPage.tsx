import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Button, Input, PasswordInput, FormField, Alert } from '../../shared/ui';
import { api, ApiError } from '../../shared/api/client';
import type { AuthResponse } from '../../shared/api/types';
import { useAuth } from './AuthContext';
import './Auth.css';

export const RegisterPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setAuthSuccess } = useAuth();
  const [bannerError, setBannerError] = useState<string | null>(null);

  // FE-001 & FE-002: Register validation: name min 2, email valid, password min 8 with >=1 letter and >=1 digit, confirm must match
  const registerSchema = z
    .object({
      name: z.string().trim().min(2, t('auth.validation.nameMin')),
      email: z
        .string()
        .min(1, t('auth.validation.emailRequired'))
        .email(t('auth.validation.emailInvalid')),
      password: z
        .string()
        .min(8, t('auth.validation.passwordStrength'))
        .regex(/^(?=.*[A-Za-z])(?=.*\d).{8,}$/, t('auth.validation.passwordStrength')),
      confirmPassword: z.string().min(1, t('auth.validation.passwordRequired')),
    })
    .refine((data) => data.password === data.confirmPassword, {
      message: t('auth.validation.passwordsMismatch'),
      path: ['confirmPassword'],
    });

  type RegisterFormValues = z.infer<typeof registerSchema>;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: {
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: RegisterFormValues) => {
    setBannerError(null);

    try {
      const data = await api.post<AuthResponse>(
        '/auth/register',
        {
          name: values.name.trim(),
          email: values.email.trim(),
          password: values.password,
        },
        { skipAuthRedirect: true }
      );
      setAuthSuccess(data);
      navigate('/catalog', { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'EMAIL_TAKEN') {
          setError(
            'email',
            { type: 'server', message: t('auth.errors.EMAIL_TAKEN') },
            { shouldFocus: true }
          );
          return;
        }
        if (err.status === 422 && err.errors) {
          Object.entries(err.errors).forEach(([field, msg]) => {
            if (field === 'name' || field === 'email' || field === 'password') {
              setError(field, { type: 'server', message: msg }, { shouldFocus: true });
            }
          });
          return;
        }
        setBannerError(
          err.code === 'NETWORK_ERROR' ? t('common.networkError') : err.message
        );
      } else {
        setBannerError(t('common.networkError'));
      }
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__header">
          <h1 className="auth-card__title">{t('auth.register.title')}</h1>
          <p className="auth-card__subtitle">{t('auth.register.subtitle')}</p>
        </div>

        {bannerError && <Alert variant="error">{bannerError}</Alert>}

        <form className="auth-form" onSubmit={handleSubmit(onSubmit)} noValidate>
          <FormField
            id="reg-name"
            label={t('auth.register.nameLabel')}
            error={errors.name?.message}
            required
          >
            <Input
              id="reg-name"
              type="text"
              autoComplete="name"
              placeholder={t('auth.register.namePlaceholder')}
              hasError={!!errors.name}
              disabled={isSubmitting}
              {...register('name')}
            />
          </FormField>

          <FormField
            id="reg-email"
            label={t('auth.register.emailLabel')}
            error={errors.email?.message}
            required
          >
            <Input
              id="reg-email"
              type="email"
              autoComplete="email"
              placeholder={t('auth.register.emailPlaceholder')}
              hasError={!!errors.email}
              disabled={isSubmitting}
              {...register('email')}
            />
          </FormField>

          <FormField
            id="reg-password"
            label={t('auth.register.passwordLabel')}
            error={errors.password?.message}
            required
          >
            <PasswordInput
              id="reg-password"
              autoComplete="new-password"
              placeholder={t('auth.register.passwordPlaceholder')}
              hasError={!!errors.password}
              disabled={isSubmitting}
              {...register('password')}
            />
          </FormField>

          <FormField
            id="reg-confirm-password"
            label={t('auth.register.confirmPasswordLabel')}
            error={errors.confirmPassword?.message}
            required
          >
            <PasswordInput
              id="reg-confirm-password"
              autoComplete="new-password"
              placeholder={t('auth.register.confirmPasswordPlaceholder')}
              hasError={!!errors.confirmPassword}
              disabled={isSubmitting}
              {...register('confirmPassword')}
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
            {t('auth.register.submit')}
          </Button>
        </form>

        <div className="auth-card__footer">
          <span>{t('auth.register.hasAccount')}</span>
          <Link to="/login" className="auth-link">
            {t('auth.register.loginLink')}
          </Link>
        </div>
      </div>
    </div>
  );
};
