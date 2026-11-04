/**
 * CMS navigation model (architecture §7.1 functional areas + §11.2 admin
 * endpoint groups). Phase 1/2 renders the full IA; most destinations are
 * placeholders that name the phase delivering them. `feature` gates an item on
 * the client's enabled features (e.g. the Temple group).
 */
import type { IconName } from './components/Icon.js';

export interface NavItem {
  label: string;
  path: string;
  icon: IconName;
  /** Phase in which this screen becomes functional. */
  phase: number;
  /** Set once the screen is actually implemented (hides the "coming" badge). */
  ready?: boolean;
  /** When set, only shown if this public feature flag is enabled. */
  feature?: string;
}

export interface NavGroup {
  title: string;
  items: NavItem[];
}

export const NAV: NavGroup[] = [
  {
    title: 'Overview',
    items: [{ label: 'Dashboard', path: '/', icon: 'dashboard', phase: 1 }],
  },
  {
    title: 'Catalog',
    items: [
      { label: 'Products', path: '/products', icon: 'box', phase: 3, ready: true },
      { label: 'Categories', path: '/categories', icon: 'tag', phase: 3, ready: true },
      { label: 'Inventory', path: '/inventory', icon: 'layers', phase: 3 },
    ],
  },
  {
    title: 'Sales',
    items: [
      { label: 'Orders', path: '/orders', icon: 'cart', phase: 3, ready: true },
      { label: 'Customers', path: '/customers', icon: 'users', phase: 4 },
    ],
  },
  {
    title: 'Content',
    items: [
      { label: 'Pages', path: '/pages', icon: 'file', phase: 5 },
      { label: 'Media', path: '/media', icon: 'image', phase: 4 },
      { label: 'Themes', path: '/themes', icon: 'palette', phase: 4 },
    ],
  },
  {
    title: 'Temple',
    items: [
      { label: 'Pooja Services', path: '/pooja-services', icon: 'flame', phase: 6, feature: 'poojaBooking' },
      { label: 'Pooja Bookings', path: '/pooja-bookings', icon: 'calendar', phase: 6, feature: 'poojaBooking' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { label: 'Users & Roles', path: '/users', icon: 'shield', phase: 2 },
      { label: 'Settings', path: '/settings', icon: 'settings', phase: 4 },
    ],
  },
];
