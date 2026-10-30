import React from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { ShoppingCart, User as UserIcon, LogOut, Package } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../../features/auth/AuthContext';
import { useCart } from '../../features/cart/useCart';
import { changeAppLanguage } from '../i18n';
import { Button } from './Button';
import './Layout.css';

export const Layout: React.FC = () => {
  const { t, i18n } = useTranslation();
  const { status, user, logout } = useAuth();
  const { cart } = useCart();
  const navigate = useNavigate();

  const currentLang = i18n.language?.startsWith('en') ? 'en' : 'ka';
  const totalQty = cart?.totalQty ?? 0;

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <>
      <header className="app-header">
        <div className="container app-header__inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-6)' }}>
            <Link to="/catalog" className="app-header__brand">
              {t('common.brand')}
            </Link>
            <nav className="app-header__nav" aria-label="Main navigation">
              <NavLink
                to="/catalog"
                className={({ isActive }) =>
                  `app-header__link ${isActive ? 'app-header__link--active' : ''}`
                }
              >
                {t('common.catalog')}
              </NavLink>
              {status === 'authenticated' && (
                <NavLink
                  to="/orders"
                  className={({ isActive }) =>
                    `app-header__link ${isActive ? 'app-header__link--active' : ''}`
                  }
                >
                  {t('common.orders')}
                </NavLink>
              )}
            </nav>
          </div>

          <div className="app-header__actions">
            {/* Language Switcher (FE-008) */}
            <div
              className="app-header__lang-switch"
              role="group"
              aria-label={t('common.language')}
            >
              <button
                type="button"
                className={`app-header__lang-btn ${
                  currentLang === 'ka' ? 'app-header__lang-btn--active' : ''
                }`}
                onClick={() => changeAppLanguage('ka')}
                aria-pressed={currentLang === 'ka'}
              >
                KA
              </button>
              <button
                type="button"
                className={`app-header__lang-btn ${
                  currentLang === 'en' ? 'app-header__lang-btn--active' : ''
                }`}
                onClick={() => changeAppLanguage('en')}
                aria-pressed={currentLang === 'en'}
              >
                EN
              </button>
            </div>

            {/* Cart Link + Badge (FE-005) */}
            <Link
              to="/cart"
              className="app-header__icon-link"
              aria-label={`${t('common.cart')} (${totalQty})`}
            >
              <ShoppingCart size={20} aria-hidden="true" />
              {totalQty > 0 && (
                <span className="app-header__cart-badge" data-testid="cart-badge">
                  {totalQty}
                </span>
              )}
            </Link>

            {status === 'authenticated' && user ? (
              <>
                <Link
                  to="/profile"
                  className="app-header__icon-link"
                  title={`${user.name} (${user.email})`}
                >
                  <UserIcon size={20} aria-hidden="true" />
                  <span className="app-header__user-name" data-testid="header-user-name">
                    {user.name}
                  </span>
                </Link>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleLogout}
                  aria-label={t('common.logout')}
                  title={t('common.logout')}
                >
                  <LogOut size={18} aria-hidden="true" />
                </Button>
              </>
            ) : status === 'unauthenticated' ? (
              <Link to="/login">
                <Button variant="primary" size="sm">
                  {t('common.login')}
                </Button>
              </Link>
            ) : null}
          </div>
        </div>
      </header>

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="app-footer">
        <div className="container app-footer__inner">
          <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
            <Package size={18} aria-hidden="true" />
            <strong style={{ color: 'var(--color-text-inverse)' }}>{t('common.brand')}</strong>
          </div>
          <div>© {new Date().getFullYear()} Cyber Storefront — FE-001 … FE-008</div>
        </div>
      </footer>
    </>
  );
};
