import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { Button, Input, PasswordInput, FormField, Alert } from '../../shared/ui';
import { api, ApiError } from '../../shared/api/client';
import './Auth.css';

type ResetStep = 1 | 2 | 3 | 'done';

export const ForgotPasswordPage: React.FC = () => {
  const { t } = useTranslation();

  // FE-002: 3 steps on one screen; resetToken stored in component state (NEVER localStorage), devCode NEVER auto-filled
  const [step, setStep] = useState<ResetStep>(1);
  const [email, setEmail] = useState('');
  const [resetToken, setResetToken] = useState<string | null>(null);
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [tooManyAttempts, setTooManyAttempts] = useState(false);

  // Step 1 form: Email
  const emailSchema = z.object({
    email: z
      .string()
      .min(1, t('auth.validation.emailRequired'))
      .email(t('auth.validation.emailInvalid')),
  });

  const step1Form = useForm<z.infer<typeof emailSchema>>({
    resolver: zodResolver(emailSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: { email: '' },
  });

  // Step 2 form: 6-digit code
  const codeSchema = z.object({
    code: z.string().regex(/^\d{6}$/, t('auth.validation.codeInvalid')),
  });

  const step2Form = useForm<z.infer<typeof codeSchema>>({
    resolver: zodResolver(codeSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: { code: '' },
  });

  // Step 3 form: New password + confirm
  const passwordSchema = z
    .object({
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

  const step3Form = useForm<z.infer<typeof passwordSchema>>({
    resolver: zodResolver(passwordSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: { password: '', confirmPassword: '' },
  });

  // Step 1 handler: POST /auth/forgot-password
  const handleSendCode = async (values: z.infer<typeof emailSchema>) => {
    setBannerError(null);
    setTooManyAttempts(false);

    try {
      await api.post(
        '/auth/forgot-password',
        { email: values.email.trim() },
        { skipAuthRedirect: true }
      );
      setEmail(values.email.trim());
      step2Form.reset({ code: '' });
      setStep(2);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 422 && err.errors?.email) {
          step1Form.setError(
            'email',
            { type: 'server', message: err.errors.email },
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

  // Step 2 handler: POST /auth/verify-reset-code
  const handleVerifyCode = async (values: z.infer<typeof codeSchema>) => {
    setBannerError(null);
    setTooManyAttempts(false);

    try {
      const res = await api.post<{ resetToken: string }>(
        '/auth/verify-reset-code',
        { email, code: values.code.trim() },
        { skipAuthRedirect: true }
      );
      setResetToken(res.resetToken);
      step3Form.reset({ password: '', confirmPassword: '' });
      setStep(3);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'INVALID_RESET_CODE') {
          step2Form.setError(
            'code',
            { type: 'server', message: t('auth.errors.INVALID_RESET_CODE') },
            { shouldFocus: true }
          );
          return;
        }
        if (err.code === 'TOO_MANY_ATTEMPTS' || err.status === 429) {
          setTooManyAttempts(true);
          setBannerError(t('auth.errors.TOO_MANY_ATTEMPTS'));
          return;
        }
        if (err.status === 422 && err.errors?.code) {
          step2Form.setError(
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

  // Step 3 handler: POST /auth/reset-password
  const handleResetPassword = async (values: z.infer<typeof passwordSchema>) => {
    setBannerError(null);
    if (!resetToken) {
      setStep(1);
      return;
    }

    try {
      await api.post(
        '/auth/reset-password',
        { resetToken, password: values.password },
        { skipAuthRedirect: true }
      );
      setResetToken(null);
      setStep('done');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 422 && err.errors?.password) {
          step3Form.setError(
            'password',
            { type: 'server', message: err.errors.password },
            { shouldFocus: true }
          );
          return;
        }
        if (err.code === 'RESET_TOKEN_USED' || err.status === 400) {
          setBannerError(t('auth.errors.RESET_TOKEN_USED'));
          return;
        }
        setBannerError(err.code === 'NETWORK_ERROR' ? t('common.networkError') : err.message);
      } else {
        setBannerError(t('common.networkError'));
      }
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-card__header">
          <h1 className="auth-card__title">{t('auth.forgot.title')}</h1>
          {step === 1 && <p className="auth-card__subtitle">{t('auth.forgot.step1Subtitle')}</p>}
          {step === 2 && <p className="auth-card__subtitle">{t('auth.forgot.step2Subtitle')}</p>}
          {step === 3 && <p className="auth-card__subtitle">{t('auth.forgot.step3Subtitle')}</p>}
        </div>

        {bannerError && (
          <Alert
            variant="error"
            action={
              tooManyAttempts ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setBannerError(null);
                    setTooManyAttempts(false);
                    setStep(1);
                  }}
                >
                  {t('auth.forgot.requestNewCodeBtn')}
                </Button>
              ) : undefined
            }
          >
            {bannerError}
          </Alert>
        )}

        {step === 1 && (
          <form
            className="auth-form"
            onSubmit={step1Form.handleSubmit(handleSendCode)}
            noValidate
          >
            <FormField
              id="forgot-email"
              label={t('auth.forgot.emailLabel')}
              error={step1Form.formState.errors.email?.message}
              required
            >
              <Input
                id="forgot-email"
                type="email"
                autoComplete="email"
                placeholder={t('auth.forgot.emailPlaceholder')}
                hasError={!!step1Form.formState.errors.email}
                disabled={step1Form.formState.isSubmitting}
                {...step1Form.register('email')}
              />
            </FormField>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={step1Form.formState.isSubmitting}
            >
              {t('auth.forgot.sendCodeBtn')}
            </Button>
          </form>
        )}

        {step === 2 && (
          <form
            className="auth-form"
            onSubmit={step2Form.handleSubmit(handleVerifyCode)}
            noValidate
          >
            <Alert variant="info">{t('auth.forgot.devHint')}</Alert>

            <FormField
              id="forgot-code"
              label={t('auth.forgot.codeLabel')}
              error={step2Form.formState.errors.code?.message}
              required
            >
              <Input
                id="forgot-code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                maxLength={6}
                placeholder={t('auth.forgot.codePlaceholder')}
                hasError={!!step2Form.formState.errors.code}
                disabled={step2Form.formState.isSubmitting}
                {...step2Form.register('code')}
              />
            </FormField>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={step2Form.formState.isSubmitting}
            >
              {t('auth.forgot.verifyCodeBtn')}
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="sm"
              fullWidth
              onClick={() => {
                setBannerError(null);
                setTooManyAttempts(false);
                setStep(1);
              }}
            >
              {t('auth.forgot.requestNewCodeBtn')}
            </Button>
          </form>
        )}

        {step === 3 && (
          <form
            className="auth-form"
            onSubmit={step3Form.handleSubmit(handleResetPassword)}
            noValidate
          >
            <FormField
              id="forgot-new-password"
              label={t('auth.forgot.newPasswordLabel')}
              error={step3Form.formState.errors.password?.message}
              required
            >
              <PasswordInput
                id="forgot-new-password"
                autoComplete="new-password"
                placeholder={t('auth.register.passwordPlaceholder')}
                hasError={!!step3Form.formState.errors.password}
                disabled={step3Form.formState.isSubmitting}
                {...step3Form.register('password')}
              />
            </FormField>

            <FormField
              id="forgot-confirm-password"
              label={t('auth.forgot.confirmPasswordLabel')}
              error={step3Form.formState.errors.confirmPassword?.message}
              required
            >
              <PasswordInput
                id="forgot-confirm-password"
                autoComplete="new-password"
                placeholder={t('auth.register.confirmPasswordPlaceholder')}
                hasError={!!step3Form.formState.errors.confirmPassword}
                disabled={step3Form.formState.isSubmitting}
                {...step3Form.register('confirmPassword')}
              />
            </FormField>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              fullWidth
              isLoading={step3Form.formState.isSubmitting}
            >
              {t('auth.forgot.resetPasswordBtn')}
            </Button>
          </form>
        )}

        {step === 'done' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <Alert variant="success" title={t('auth.forgot.successTitle')}>
              {t('auth.forgot.successMessage')}
            </Alert>
            <Link to="/login">
              <Button variant="primary" size="lg" fullWidth>
                {t('auth.forgot.backToLogin')}
              </Button>
            </Link>
          </div>
        )}

        {step !== 'done' && (
          <div className="auth-card__footer">
            <Link
              to="/login"
              className="auth-link"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 'var(--space-1)' }}
            >
              <ArrowLeft size={16} aria-hidden="true" />
              <span>{t('auth.forgot.backToLogin')}</span>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
};
