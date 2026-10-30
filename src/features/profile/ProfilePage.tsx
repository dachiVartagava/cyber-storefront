import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, MapPin, Edit2, Trash2, CheckCircle } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import {
  Button,
  Input,
  PasswordInput,
  FormField,
  Alert,
  Badge,
  Skeleton,
} from '../../shared/ui';
import { api, ApiError } from '../../shared/api/client';
import type { User, Address, AddressInput } from '../../shared/api/types';
import { useAuth } from '../auth/AuthContext';
import './Profile.css';

export const ProfilePage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="container profile-page">
      <h1 className="profile-page__title">{t('profile.title')}</h1>

      <div className="profile-grid">
        <PersonalInfoForm />
        <AddressesSection />
      </div>
    </div>
  );
};

const PersonalInfoForm: React.FC = () => {
  const { t } = useTranslation();
  const { user, updateUser } = useAuth();
  const [bannerError, setBannerError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const profileSchema = z
    .object({
      name: z.string().trim().min(2, t('auth.validation.nameMin')),
      email: z
        .string()
        .trim()
        .min(1, t('auth.validation.emailRequired'))
        .email(t('auth.validation.emailInvalid')),
      newPassword: z
        .string()
        .optional()
        .refine(
          (val) => !val || /^(?=.*[A-Za-z])(?=.*\d).{8,}$/.test(val),
          t('auth.validation.passwordStrength')
        ),
      confirmNewPassword: z.string().optional(),
      currentPassword: z.string().min(1, t('profile.currentPasswordRequired')),
    })
    .refine(
      (data) => {
        if (!data.newPassword) return true;
        return data.newPassword === data.confirmNewPassword;
      },
      {
        message: t('auth.validation.passwordsMismatch'),
        path: ['confirmNewPassword'],
      }
    );

  type ProfileFormValues = z.infer<typeof profileSchema>;

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, dirtyFields, isSubmitting },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: {
      name: user?.name || '',
      email: user?.email || '',
      newPassword: '',
      confirmNewPassword: '',
      currentPassword: '',
    },
  });

  // Sync form when user loads
  useEffect(() => {
    if (user) {
      reset({
        name: user.name,
        email: user.email,
        newPassword: '',
        confirmNewPassword: '',
        currentPassword: '',
      });
    }
  }, [user, reset]);

  // FE-004 #6: "Save" button is disabled while nothing has changed (name, email, or newPassword)
  const hasProfileChanges = Boolean(
    dirtyFields.name || dirtyFields.email || dirtyFields.newPassword
  );

  const onSubmit = async (values: ProfileFormValues) => {
    setBannerError(null);
    setSuccessMsg(null);

    // FE-004 #6: Send ONLY changed fields + currentPassword (never send confirmNewPassword)
    const payload: Record<string, string> = {
      currentPassword: values.currentPassword,
    };

    if (dirtyFields.name && values.name.trim() !== user?.name) {
      payload.name = values.name.trim();
    }
    if (dirtyFields.email && values.email.trim() !== user?.email) {
      payload.email = values.email.trim();
    }
    if (dirtyFields.newPassword && values.newPassword) {
      payload.newPassword = values.newPassword;
    }

    if (Object.keys(payload).length <= 1) {
      setBannerError(t('profile.nothingToChange'));
      return;
    }

    try {
      const res = await api.patch<{ user: User }>('/auth/me', payload);
      // Update global user state immediately (updates Header name & email without reload!)
      updateUser(res.user);
      setSuccessMsg(t('profile.savedSuccess'));
      // Clear password fields, reset form with new user data
      reset({
        name: res.user.name,
        email: res.user.email,
        newPassword: '',
        confirmNewPassword: '',
        currentPassword: '',
      });
    } catch (err) {
      if (err instanceof ApiError) {
        // 400 INVALID_CURRENT_PASSWORD -> under currentPassword field, user stays logged in!
        if (err.code === 'INVALID_CURRENT_PASSWORD') {
          setError(
            'currentPassword',
            { type: 'server', message: t('auth.errors.INVALID_CURRENT_PASSWORD') },
            { shouldFocus: true }
          );
          return;
        }
        // 409 EMAIL_TAKEN -> under email field
        if (err.code === 'EMAIL_TAKEN') {
          setError(
            'email',
            { type: 'server', message: t('auth.errors.EMAIL_TAKEN') },
            { shouldFocus: true }
          );
          return;
        }
        // 422 VALIDATION_ERROR -> bind each field error, or errors._ to banner
        if (err.status === 422 && err.errors) {
          if (err.errors._) {
            setBannerError(t('profile.nothingToChange'));
          }
          Object.entries(err.errors).forEach(([field, msg]) => {
            if (
              field === 'name' ||
              field === 'email' ||
              field === 'newPassword' ||
              field === 'currentPassword'
            ) {
              setError(field, { type: 'server', message: msg }, { shouldFocus: true });
            }
          });
          return;
        }
        setBannerError(err.code === 'NETWORK_ERROR' ? t('common.networkError') : err.message);
      } else {
        setBannerError(t('common.networkError'));
      }
    }
  };

  return (
    <section className="profile-card" aria-label={t('profile.personalInfoTitle')}>
      <div className="profile-card__header">
        <h2 className="profile-card__title">{t('profile.personalInfoTitle')}</h2>
      </div>

      {successMsg && <Alert variant="success">{successMsg}</Alert>}
      {bannerError && <Alert variant="error">{bannerError}</Alert>}

      <form
        style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}
        onSubmit={handleSubmit(onSubmit)}
        noValidate
      >
        <FormField
          id="profile-name"
          label={t('profile.nameLabel')}
          error={errors.name?.message}
          required
        >
          <Input
            id="profile-name"
            type="text"
            autoComplete="name"
            hasError={!!errors.name}
            disabled={isSubmitting}
            {...register('name')}
          />
        </FormField>

        <FormField
          id="profile-email"
          label={t('profile.emailLabel')}
          error={errors.email?.message}
          required
        >
          <Input
            id="profile-email"
            type="email"
            autoComplete="email"
            hasError={!!errors.email}
            disabled={isSubmitting}
            {...register('email')}
          />
        </FormField>

        <FormField
          id="profile-new-password"
          label={t('profile.newPasswordLabel')}
          error={errors.newPassword?.message}
        >
          <PasswordInput
            id="profile-new-password"
            autoComplete="new-password"
            placeholder={t('profile.newPasswordPlaceholder')}
            hasError={!!errors.newPassword}
            disabled={isSubmitting}
            {...register('newPassword')}
          />
        </FormField>

        <FormField
          id="profile-confirm-new-password"
          label={t('profile.confirmNewPasswordLabel')}
          error={errors.confirmNewPassword?.message}
        >
          <PasswordInput
            id="profile-confirm-new-password"
            autoComplete="new-password"
            placeholder={t('auth.register.confirmPasswordPlaceholder')}
            hasError={!!errors.confirmNewPassword}
            disabled={isSubmitting}
            {...register('confirmNewPassword')}
          />
        </FormField>

        {/* Current password confirmation section at end of form (documented in ADR-003) */}
        <div className="profile-confirm-box">
          <div style={{ fontSize: 'var(--font-size-sm)', fontWeight: 'var(--font-weight-semibold)' }}>
            {t('profile.confirmSectionTitle')}
          </div>
          <FormField
            id="profile-current-password"
            label={t('profile.currentPasswordLabel')}
            hint={t('profile.currentPasswordHint')}
            error={errors.currentPassword?.message}
            required
          >
            <PasswordInput
              id="profile-current-password"
              autoComplete="current-password"
              hasError={!!errors.currentPassword}
              disabled={isSubmitting}
              {...register('currentPassword')}
            />
          </FormField>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          disabled={!hasProfileChanges}
          isLoading={isSubmitting}
        >
          {t('common.save')}
        </Button>
      </form>
    </section>
  );
};

const AddressesSection: React.FC = () => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [sectionError, setSectionError] = useState<string | null>(null);

  const addressesQuery = useQuery<{ items: Address[] }>({
    queryKey: ['addresses'],
    queryFn: () => api.get<{ items: Address[] }>('/addresses'),
  });

  const addresses = addressesQuery.data?.items ?? [];
  const isLimitReached = addresses.length >= 10;

  const setDefaultMutation = useMutation({
    mutationFn: (id: string) =>
      api.patch<{ address: Address }>(`/addresses/${id}`, { isDefault: true }),
    onSuccess: () => {
      // FE-004 #5: Changing default modifies other addresses too -> invalidate & refetch list
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 404) {
        queryClient.invalidateQueries({ queryKey: ['addresses'] });
      }
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/addresses/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['addresses'] });
    },
    onError: (err) => {
      if (err instanceof ApiError && err.status === 404) {
        // Already deleted in another tab -> refresh list
        queryClient.invalidateQueries({ queryKey: ['addresses'] });
      }
    },
  });

  const handleDelete = (addr: Address) => {
    const displayName = addr.label || addr.address;
    if (window.confirm(t('profile.confirmDeleteAddress', { name: displayName }))) {
      deleteMutation.mutate(addr.id);
    }
  };

  return (
    <section className="profile-card" aria-label={t('profile.addressesTitle')}>
      <div className="profile-card__header">
        <h2 className="profile-card__title">
          {t('profile.addressesTitle')} ({addresses.length}/10)
        </h2>
        {!isFormOpen && (
          <Button
            variant="primary"
            size="sm"
            disabled={isLimitReached}
            onClick={() => {
              setEditingAddress(null);
              setIsFormOpen(true);
            }}
            leftIcon={<Plus size={16} />}
          >
            {t('profile.addAddressBtn')}
          </Button>
        )}
      </div>

      {isLimitReached && (
        <Alert variant="warning">{t('profile.addressLimitReached')}</Alert>
      )}

      {sectionError && <Alert variant="error">{sectionError}</Alert>}

      {isFormOpen && (
        <AddressForm
          initialAddress={editingAddress}
          onClose={() => {
            setIsFormOpen(false);
            setEditingAddress(null);
          }}
          onSuccess={() => {
            setIsFormOpen(false);
            setEditingAddress(null);
            setSectionError(null);
            queryClient.invalidateQueries({ queryKey: ['addresses'] });
          }}
        />
      )}

      {addressesQuery.isLoading && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <Skeleton height="110px" />
          <Skeleton height="110px" />
        </div>
      )}

      {!addressesQuery.isLoading && addresses.length === 0 && !isFormOpen && (
        <div className="catalog-state-box">
          <MapPin size={28} color="var(--color-text-muted)" />
          <p style={{ fontWeight: 'var(--font-weight-medium)' }}>{t('profile.noAddresses')}</p>
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setEditingAddress(null);
              setIsFormOpen(true);
            }}
            leftIcon={<Plus size={16} />}
          >
            {t('profile.addAddressBtn')}
          </Button>
        </div>
      )}

      {addresses.length > 0 && (
        <div className="addresses-list">
          {addresses.map((addr) => (
            <div
              key={addr.id}
              className={`address-card ${addr.isDefault ? 'address-card--default' : ''}`}
            >
              <div className="address-card__top">
                <div className="address-card__title">
                  <MapPin size={16} aria-hidden="true" />
                  <span>{addr.label || addr.city}</span>
                </div>
                {addr.isDefault && (
                  <Badge variant="primary">{t('profile.defaultBadge')}</Badge>
                )}
              </div>

              <div className="address-card__details">
                <div>
                  <strong>{addr.fullName}</strong> · {addr.phone}
                </div>
                <div>
                  {addr.city}, {addr.address}
                </div>
              </div>

              <div className="address-card__actions">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingAddress(addr);
                    setIsFormOpen(true);
                  }}
                  leftIcon={<Edit2 size={14} />}
                >
                  {t('common.edit')}
                </Button>

                {!addr.isDefault && (
                  <Button
                    variant="secondary"
                    size="sm"
                    isLoading={setDefaultMutation.isPending}
                    onClick={() => setDefaultMutation.mutate(addr.id)}
                    leftIcon={<CheckCircle size={14} />}
                  >
                    {t('profile.setDefaultBtn')}
                  </Button>
                )}

                <Button
                  variant="danger"
                  size="sm"
                  isLoading={deleteMutation.isPending}
                  onClick={() => handleDelete(addr)}
                  leftIcon={<Trash2 size={14} />}
                >
                  {t('common.delete')}
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
};

interface AddressFormProps {
  initialAddress: Address | null;
  onClose: () => void;
  onSuccess: () => void;
}

const AddressForm: React.FC<AddressFormProps> = ({
  initialAddress,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [bannerError, setBannerError] = useState<string | null>(null);

  const addressSchema = z.object({
    label: z.string().max(30, t('profile.addressForm.labelMax')).optional(),
    fullName: z.string().trim().min(2, t('profile.addressForm.fullNameMin')),
    phone: z
      .string()
      .trim()
      .min(9, t('profile.addressForm.phoneInvalid'))
      .max(20, t('profile.addressForm.phoneInvalid')),
    city: z.string().trim().min(2, t('profile.addressForm.cityMin')),
    address: z.string().trim().min(5, t('profile.addressForm.addressMin')),
    isDefault: z.boolean().optional(),
  });

  type AddressFormValues = z.infer<typeof addressSchema>;

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AddressFormValues>({
    resolver: zodResolver(addressSchema),
    mode: 'onSubmit',
    reValidateMode: 'onChange',
    shouldFocusError: true,
    defaultValues: {
      label: initialAddress?.label || '',
      fullName: initialAddress?.fullName || '',
      phone: initialAddress?.phone || '',
      city: initialAddress?.city || '',
      address: initialAddress?.address || '',
      isDefault: initialAddress?.isDefault ?? false,
    },
  });

  const onSubmit = async (values: AddressFormValues) => {
    setBannerError(null);
    const payload: AddressInput = {
      label: values.label?.trim() || '',
      fullName: values.fullName.trim(),
      phone: values.phone.trim(),
      city: values.city.trim(),
      address: values.address.trim(),
    };

    // Never send isDefault: false on an already default address (causes 422 on server)
    if (values.isDefault) {
      payload.isDefault = true;
    }

    try {
      if (initialAddress) {
        await api.patch(`/addresses/${initialAddress.id}`, payload);
      } else {
        await api.post('/addresses', payload);
      }
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.code === 'ADDRESS_LIMIT_REACHED') {
          setBannerError(t('profile.addressLimitReached'));
          return;
        }
        if (err.status === 404) {
          onSuccess();
          return;
        }
        if (err.status === 422 && err.errors) {
          Object.entries(err.errors).forEach(([field, msg]) => {
            if (
              field === 'label' ||
              field === 'fullName' ||
              field === 'phone' ||
              field === 'city' ||
              field === 'address'
            ) {
              setError(field, { type: 'server', message: msg }, { shouldFocus: true });
            }
          });
          return;
        }
        setBannerError(err.message);
      } else {
        setBannerError(t('common.networkError'));
      }
    }
  };

  return (
    <form className="address-form-box" onSubmit={handleSubmit(onSubmit)} noValidate>
      <h3 style={{ fontSize: 'var(--font-size-md)', fontWeight: 'var(--font-weight-bold)' }}>
        {initialAddress ? t('profile.addressForm.editTitle') : t('profile.addressForm.addTitle')}
      </h3>

      {bannerError && <Alert variant="error">{bannerError}</Alert>}

      <FormField
        id="addr-label"
        label={t('profile.addressForm.label')}
        error={errors.label?.message}
      >
        <Input
          id="addr-label"
          placeholder={t('profile.addressForm.labelPlaceholder')}
          hasError={!!errors.label}
          disabled={isSubmitting}
          {...register('label')}
        />
      </FormField>

      <FormField
        id="addr-fullName"
        label={t('profile.addressForm.fullName')}
        error={errors.fullName?.message}
        required
      >
        <Input
          id="addr-fullName"
          hasError={!!errors.fullName}
          disabled={isSubmitting}
          {...register('fullName')}
        />
      </FormField>

      <FormField
        id="addr-phone"
        label={t('profile.addressForm.phone')}
        error={errors.phone?.message}
        required
      >
        <Input
          id="addr-phone"
          type="tel"
          placeholder={t('profile.addressForm.phonePlaceholder')}
          hasError={!!errors.phone}
          disabled={isSubmitting}
          {...register('phone')}
        />
      </FormField>

      <FormField
        id="addr-city"
        label={t('profile.addressForm.city')}
        error={errors.city?.message}
        required
      >
        <Input
          id="addr-city"
          placeholder={t('profile.addressForm.cityPlaceholder')}
          hasError={!!errors.city}
          disabled={isSubmitting}
          {...register('city')}
        />
      </FormField>

      <FormField
        id="addr-address"
        label={t('profile.addressForm.address')}
        error={errors.address?.message}
        required
      >
        <Input
          id="addr-address"
          placeholder={t('profile.addressForm.addressPlaceholder')}
          hasError={!!errors.address}
          disabled={isSubmitting}
          {...register('address')}
        />
      </FormField>

      {(!initialAddress || !initialAddress.isDefault) && (
        <label className="filter-checkbox-label">
          <input
            type="checkbox"
            className="filter-checkbox-input"
            disabled={isSubmitting}
            {...register('isDefault')}
          />
          <span>{t('profile.addressForm.isDefault')}</span>
        </label>
      )}

      <div style={{ display: 'flex', gap: 'var(--space-3)', marginTop: 'var(--space-2)' }}>
        <Button type="submit" variant="primary" isLoading={isSubmitting}>
          {t('common.save')}
        </Button>
        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
          {t('common.cancel')}
        </Button>
      </div>
    </form>
  );
};
