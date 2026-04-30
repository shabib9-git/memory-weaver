/**
 * Navbar.jsx — Fixed top navigation bar for MemoryWeaver.
 */

import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

const NAV_LINKS = [
  { path: '/gallery',  label: 'Gallery' },
  { path: '/record',   label: 'Record' },
  { path: '/journal',  label: 'Journal' },
  { path: '/database', label: 'Database' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  async function handleLogout() {
    await logout();
    navigate('/');
  }

  return (
    <nav style={styles.nav} aria-label="Main navigation">
      {/* Brand */}
      <NavLink to="/gallery" style={styles.brand} aria-label="MemoryWeaver home">
        <span style={styles.brandMark}>⬡</span>
        <span className="gradient-text" style={styles.brandText}>MemoryWeaver</span>
      </NavLink>

      {/* Nav links */}
      <div style={styles.linksRow} role="menubar">
        {NAV_LINKS.map((link) => (
          <NavLink
            key={link.path}
            to={link.path}
            title={link.label}
            role="menuitem"
            style={({ isActive }) => ({
              ...styles.navLink,
              ...(isActive ? styles.navLinkActive : {}),
            })}
          >
            {link.label}
          </NavLink>
        ))}
      </div>

      {/* User section */}
      {user && (
        <div style={styles.userSection}>
          {user.isDev && (
            <span style={styles.devBadge}>DEV</span>
          )}
          {user.picture && !user.isDev ? (
            <img
              src={user.picture}
              alt={user.name}
              style={styles.avatar}
              referrerPolicy="no-referrer"
            />
          ) : (
            <div style={styles.avatarFallback}>
              {(user.name || 'U').charAt(0).toUpperCase()}
            </div>
          )}
          <span style={styles.userName}>{user.isDev ? 'Dev User' : (user.name || user.email)}</span>
          <button onClick={handleLogout} style={styles.logoutBtn}>
            Sign out
          </button>
        </div>
      )}
    </nav>
  );
}

const styles = {
  nav: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    zIndex: 100,
    height: '52px',
    display: 'flex',
    alignItems: 'center',
    padding: '0 20px',
    gap: '16px',
    backgroundColor: 'rgba(255,255,255,0.88)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderBottom: '1px solid var(--color-border)',
    boxShadow: '0 1px 0 var(--color-border)',
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    textDecoration: 'none',
    flexShrink: 0,
  },
  brandMark: {
    fontSize: '18px',
    lineHeight: 1,
    color: 'var(--color-primary-light)',
  },
  brandText: {
    fontSize: '15px',
    fontWeight: 700,
    letterSpacing: '-0.03em',
  },
  linksRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '2px',
    flex: 1,
  },
  navLink: {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '5px 12px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: 'var(--color-text-muted)',
    textDecoration: 'none',
    transition: 'color 0.15s, background 0.15s',
    letterSpacing: '-0.01em',
  },
  navLinkActive: {
    color: 'var(--color-primary)',
    backgroundColor: 'rgba(109,99,255,0.08)',
  },
  userSection: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flexShrink: 0,
    marginLeft: 'auto',
  },
  avatar: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    objectFit: 'cover',
    border: '1.5px solid var(--color-border-strong)',
  },
  avatarFallback: {
    width: '28px',
    height: '28px',
    borderRadius: '50%',
    backgroundColor: 'var(--color-primary)',
    color: '#fff',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '0.75rem',
    fontWeight: 700,
    flexShrink: 0,
  },
  userName: {
    fontSize: '0.8125rem',
    fontWeight: 500,
    color: 'var(--color-text)',
    maxWidth: '140px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    letterSpacing: '-0.01em',
  },
  logoutBtn: {
    padding: '5px 12px',
    borderRadius: 'var(--radius-sm)',
    fontSize: '0.8125rem',
    fontWeight: 500,
    backgroundColor: 'transparent',
    border: '1px solid var(--color-border)',
    color: 'var(--color-text-muted)',
    cursor: 'pointer',
    transition: 'color 0.15s, border-color 0.15s, background 0.15s',
    letterSpacing: '-0.01em',
  },
  devBadge: {
    fontSize: '0.625rem',
    fontWeight: 800,
    letterSpacing: '0.1em',
    color: '#07070e',
    backgroundColor: '#fbbf24',
    borderRadius: '4px',
    padding: '2px 6px',
    flexShrink: 0,
  },
};
