import { v4 as uuidv4 } from 'uuid';

// Standard granular permissions catalog
export const PERMISSIONS = [
  // Dashboard
  { id: 'perm_dashboard_view', key: 'dashboard.view', label: 'View Dashboard', group: 'Dashboard', description: 'Access dashboard metrics and summary overview' },

  // Products
  { id: 'perm_products_view', key: 'products.view', label: 'View Products', group: 'Products', description: 'View product catalog, details, and categories' },
  { id: 'perm_products_create', key: 'products.create', label: 'Create Products', group: 'Products', description: 'Create and publish new products' },
  { id: 'perm_products_edit', key: 'products.edit', label: 'Edit Products', group: 'Products', description: 'Modify existing product specifications, pricing, and images' },
  { id: 'perm_products_delete', key: 'products.delete', label: 'Delete Products', group: 'Products', description: 'Remove products from the catalog' },

  // Orders
  { id: 'perm_orders_view', key: 'orders.view', label: 'View Orders', group: 'Orders', description: 'View customer orders and shipment status' },
  { id: 'perm_orders_create', key: 'orders.create', label: 'Create Orders', group: 'Orders', description: 'Create manual or replacement orders' },
  { id: 'perm_orders_update', key: 'orders.update', label: 'Update Orders', group: 'Orders', description: 'Update order status, shipping details, and tracking' },
  { id: 'perm_orders_cancel', key: 'orders.cancel', label: 'Cancel Orders', group: 'Orders', description: 'Cancel existing customer orders' },
  { id: 'perm_orders_delete', key: 'orders.delete', label: 'Delete Orders', group: 'Orders', description: 'Permanently remove order records' },

  // Customers
  { id: 'perm_customers_view', key: 'customers.view', label: 'View Customers', group: 'Customers', description: 'View customer accounts and profiles' },
  { id: 'perm_customers_edit', key: 'customers.edit', label: 'Edit Customers', group: 'Customers', description: 'Modify customer details and addresses' },
  { id: 'perm_customers_delete', key: 'customers.delete', label: 'Delete Customers', group: 'Customers', description: 'Remove customer accounts' },

  // Payments
  { id: 'perm_payments_view', key: 'payments.view', label: 'View Payments', group: 'Payments', description: 'View payment transactions and gateway logs' },
  { id: 'perm_payments_refund', key: 'payments.refund', label: 'Process Refunds', group: 'Payments', description: 'Initiate and retry payment refunds' },

  // Reports
  { id: 'perm_reports_view', key: 'reports.view', label: 'View Reports', group: 'Reports', description: 'View sales, revenue, and inventory reports' },
  { id: 'perm_reports_export', key: 'reports.export', label: 'Export Reports', group: 'Reports', description: 'Export business reports and audit datasets' },

  // Admin Management
  { id: 'perm_admins_view', key: 'admins.view', label: 'View Admins', group: 'Admin', description: 'View list of administrators and their status' },
  { id: 'perm_admins_create', key: 'admins.create', label: 'Create Admins', group: 'Admin', description: 'Create new administrator accounts' },
  { id: 'perm_admins_edit', key: 'admins.edit', label: 'Edit Admins', group: 'Admin', description: 'Modify administrator details and roles' },
  { id: 'perm_admins_delete', key: 'admins.delete', label: 'Delete Admins', group: 'Admin', description: 'Delete administrator accounts' },
  { id: 'perm_admins_disable', key: 'admins.disable', label: 'Enable/Disable Admins', group: 'Admin', description: 'Toggle administrator active or disabled status' },
  { id: 'perm_admins_permissions', key: 'admins.permissions', label: 'Manage Admin Permissions', group: 'Admin', description: 'Assign custom permissions to administrators' },

  // Role Management
  { id: 'perm_roles_view', key: 'roles.view', label: 'View Roles', group: 'Roles', description: 'View system and custom administrative roles' },
  { id: 'perm_roles_create', key: 'roles.create', label: 'Create Roles', group: 'Roles', description: 'Create new custom administrative roles' },
  { id: 'perm_roles_edit', key: 'roles.edit', label: 'Edit Roles', group: 'Roles', description: 'Modify permissions for custom roles' },
  { id: 'perm_roles_delete', key: 'roles.delete', label: 'Delete Roles', group: 'Roles', description: 'Delete custom roles that are not in use' },

  // Activity Logs
  { id: 'perm_activity_logs_view', key: 'activity_logs.view', label: 'View Activity Logs', group: 'Activity', description: 'Audit administrative actions and security logs' },

  // Settings
  { id: 'perm_settings_view', key: 'settings.view', label: 'View Settings', group: 'Settings', description: 'View site settings, SEO, and store configuration' },
  { id: 'perm_settings_edit', key: 'settings.edit', label: 'Edit Settings', group: 'Settings', description: 'Modify site settings, SEO, banners, and layouts' },
];

export const ALL_PERMISSION_KEYS = PERMISSIONS.map(p => p.key);

// Default Built-in Roles
export const DEFAULT_ROLES = [
  {
    id: 'role_super_admin',
    key: 'SUPER_ADMIN',
    name: 'Super Admin',
    description: 'Full access to all system resources, administrative operations, and security controls.',
    permissions: ['*'],
    isSystem: true,
  },
  {
    id: 'role_admin',
    key: 'ADMIN',
    name: 'Administrator',
    description: 'Comprehensive access to store operations, catalog, orders, and customer management.',
    permissions: [
      'dashboard.view',
      'products.view', 'products.create', 'products.edit', 'products.delete',
      'orders.view', 'orders.create', 'orders.update', 'orders.cancel',
      'customers.view', 'customers.edit',
      'payments.view',
      'reports.view', 'reports.export',
      'admins.view',
      'roles.view',
      'activity_logs.view',
      'settings.view', 'settings.edit'
    ],
    isSystem: true,
  },
  {
    id: 'role_product_manager',
    key: 'PRODUCT_MANAGER',
    name: 'Product Manager',
    description: 'Manage product catalog, categories, collections, pricing, and filters.',
    permissions: [
      'dashboard.view',
      'products.view', 'products.create', 'products.edit', 'products.delete'
    ],
    isSystem: true,
  },
  {
    id: 'role_order_manager',
    key: 'ORDER_MANAGER',
    name: 'Order Manager',
    description: 'Process customer orders, shipments, returns, and fulfillment tracking.',
    permissions: [
      'dashboard.view',
      'orders.view', 'orders.create', 'orders.update', 'orders.cancel', 'orders.delete'
    ],
    isSystem: true,
  },
  {
    id: 'role_customer_support',
    key: 'CUSTOMER_SUPPORT',
    name: 'Customer Support',
    description: 'View customer accounts, verify contact details, and inspect order histories.',
    permissions: [
      'dashboard.view',
      'customers.view', 'customers.edit',
      'orders.view'
    ],
    isSystem: true,
  },
  {
    id: 'role_finance_manager',
    key: 'FINANCE_MANAGER',
    name: 'Finance Manager',
    description: 'Inspect transactions, reconcile payment statuses, initiate refunds, and export financial reports.',
    permissions: [
      'dashboard.view',
      'orders.view',
      'payments.view', 'payments.refund',
      'reports.view', 'reports.export'
    ],
    isSystem: true,
  }
];

/**
 * Idempotent RBAC database seeder & migration
 * Pre-populates permissions, default roles, and ensures existing admins have full access.
 */
export async function seedRbacIfEmpty(db) {
  if (!db) return;
  try {
    const now = new Date();

    // 1. Seed or sync permissions collection
    const permCount = await db.collection('permissions').countDocuments();
    if (permCount === 0) {
      await db.collection('permissions').insertMany(
        PERMISSIONS.map(p => ({ ...p, createdAt: now, updatedAt: now }))
      );
    } else {
      // Upsert any missing permissions
      for (const p of PERMISSIONS) {
        await db.collection('permissions').updateOne(
          { key: p.key },
          { $set: { id: p.id, label: p.label, group: p.group, description: p.description, updatedAt: now }, $setOnInsert: { createdAt: now } },
          { upsert: true }
        );
      }
    }

    // 2. Seed or sync default roles collection
    const roleCount = await db.collection('roles').countDocuments();
    if (roleCount === 0) {
      await db.collection('roles').insertMany(
        DEFAULT_ROLES.map(r => ({ ...r, createdAt: now, updatedAt: now }))
      );
    } else {
      for (const r of DEFAULT_ROLES) {
        const existingRole = await db.collection('roles').findOne({ key: r.key });
        if (!existingRole) {
          await db.collection('roles').insertOne({ ...r, createdAt: now, updatedAt: now });
        }
      }
    }

    // 3. Safe backward-compatible migration for existing administrators:
    // Any user with role === 'admin' who lacks roleKey or status will be assigned SUPER_ADMIN and active
    const superAdminRole = await db.collection('roles').findOne({ key: 'SUPER_ADMIN' });
    const superAdminRoleId = superAdminRole ? superAdminRole.id : 'role_super_admin';

    await db.collection('users').updateMany(
      { role: 'admin', roleKey: { $exists: false } },
      {
        $set: {
          roleKey: 'SUPER_ADMIN',
          roleId: superAdminRoleId,
          status: 'active',
          updatedAt: now
        }
      }
    );

    // Also ensure any admin with status undefined has status: 'active'
    await db.collection('users').updateMany(
      { role: 'admin', status: { $exists: false } },
      { $set: { status: 'active', updatedAt: now } }
    );

  } catch (err) {
    console.error('RBAC Seeding / Migration error:', err);
  }
}

/**
 * Resolves all effective permissions for an admin user.
 * Guarantees backward compatibility: if role is admin and no roleKey exists, grants full access.
 */
export async function resolveUserPermissions(db, user) {
  if (!user) return [];
  if (user.role !== 'admin') return [];

  // Super Admin has wildcard full access
  if (user.roleKey === 'SUPER_ADMIN') {
    return ['*'];
  }

  // If user has direct roleKey or roleId, fetch role document
  let role = null;
  if (db) {
    if (user.roleId) {
      role = await db.collection('roles').findOne({ id: user.roleId });
    }
    if (!role && user.roleKey) {
      role = await db.collection('roles').findOne({ key: user.roleKey });
    }
  }

  // If no role found in DB, check fallback in DEFAULT_ROLES
  if (!role && user.roleKey) {
    role = DEFAULT_ROLES.find(r => r.key === user.roleKey);
  }

  // If still no role found but user has role: 'admin', grant all permissions to prevent lockout
  if (!role) {
    return ['*'];
  }

  const rolePerms = Array.isArray(role.permissions) ? role.permissions : [];
  if (rolePerms.includes('*')) {
    return ['*'];
  }

  // Include any custom direct user permissions overrides if configured
  const userPerms = Array.isArray(user.customPermissions) ? user.customPermissions : [];
  return Array.from(new Set([...rolePerms, ...userPerms]));
}

/**
 * Checks if an administrator has a specific permission.
 * Returns true if the user is Super Admin or possesses wildcard or specific permission.
 */
export function hasPermission(adminUser, permissionKey) {
  if (!adminUser || adminUser.role !== 'admin') return false;
  if (adminUser.status === 'disabled') return false;

  // Super Admin or wildcard check
  if (adminUser.roleKey === 'SUPER_ADMIN') return true;

  const permissions = adminUser.permissions || [];
  if (permissions.includes('*')) return true;

  return permissions.includes(permissionKey);
}

/**
 * Centralized audit logger for administrative actions.
 * Logs to admin_activity_logs collection. Strips sensitive fields (passwords, salts).
 */
export async function logAdminActivity(db, { admin, action, module, targetId, targetName, metadata, request }) {
  if (!db) return;
  try {
    const cleanMeta = { ...(metadata || {}) };
    delete cleanMeta.password;
    delete cleanMeta.confirmPassword;
    delete cleanMeta.passwordSalt;
    delete cleanMeta.passwordHash;

    let ipAddress = 'unknown';
    if (request && request.headers) {
      ipAddress = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
                  request.headers.get('x-real-ip') || 'unknown';
    }

    await db.collection('admin_activity_logs').insertOne({
      id: uuidv4(),
      adminId: admin?.id || 'system',
      adminEmail: admin?.email || 'system',
      adminName: admin?.name || 'System',
      action,
      module,
      targetId: targetId || null,
      targetName: targetName || null,
      metadata: cleanMeta,
      ipAddress,
      createdAt: new Date()
    });
  } catch (err) {
    console.error('Failed to log admin activity:', err);
  }
}

/**
 * Enforces server-side privilege escalation protections.
 * Returns null if allowed, or an error string if prohibited.
 */
export async function validatePrivilegeEscalation(db, callerAdmin, targetUserId, newRoleKey, newStatus) {
  const isCallerSuperAdmin = callerAdmin?.roleKey === 'SUPER_ADMIN';

  // 1. Non-Super Admin cannot assign or modify to SUPER_ADMIN
  if (newRoleKey === 'SUPER_ADMIN' && !isCallerSuperAdmin) {
    return 'Only a Super Administrator can assign the Super Admin role.';
  }

  // 2. If target is an existing user:
  if (targetUserId) {
    const target = await db.collection('users').findOne({ id: targetUserId });
    if (target) {
      const isTargetSuperAdmin = target.roleKey === 'SUPER_ADMIN';

      // Non-Super Admin cannot modify a Super Admin
      if (isTargetSuperAdmin && !isCallerSuperAdmin) {
        return 'Only a Super Administrator can modify another Super Administrator account.';
      }

      // Check if disabling or deleting or demoting the last active Super Admin
      const willNoLongerBeSuperAdmin = newRoleKey && newRoleKey !== 'SUPER_ADMIN';
      const willBeDisabled = newStatus === 'disabled';

      if (isTargetSuperAdmin && (willNoLongerBeSuperAdmin || willBeDisabled)) {
        const activeSuperAdminCount = await db.collection('users').countDocuments({
          role: 'admin',
          roleKey: 'SUPER_ADMIN',
          status: { $ne: 'disabled' }
        });

        if (activeSuperAdminCount <= 1) {
          return 'Operation prohibited: The system must have at least one active Super Administrator.';
        }
      }

      // Admin cannot disable or delete themselves
      if (target.id === callerAdmin.id && willBeDisabled) {
        return 'Administrators cannot disable their own active account.';
      }
    }
  }

  return null;
}
