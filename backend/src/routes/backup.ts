import { Router, Response } from 'express';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { getClient, query } from '../config/database';

const router = Router();

const BACKUP_TABLES = [
  'users',
  'staff_profiles',
  'categories',
  'brands',
  'products',
  'orders',
  'order_items',
  'services',
  'pc_builds',
  'reviews',
  'wishlists',
  'refresh_tokens',
  'audit_logs'
] as const;

type BackupTable = typeof BACKUP_TABLES[number];

const DEMO_PASSWORD_HASH = '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/X4.FQgM3iKnDqNq3m';

function quoteIdentifier(identifier: string): string {
  return `"${identifier.replace(/"/g, '""')}"`;
}

async function listColumns(tableName: BackupTable): Promise<string[]> {
  const result = await query(
    `SELECT column_name
     FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1
     ORDER BY ordinal_position`,
    [tableName]
  );

  return result.rows.map(row => row.column_name);
}

function backupRecord(row: any) {
  return {
    id: row.id,
    backupName: row.backup_name,
    backupType: row.backup_type,
    fileSize: row.file_size ? Number(row.file_size) : null,
    fileUrl: row.file_url,
    status: row.status,
    createdAt: row.created_at
  };
}

router.get('/backup-records', authenticate, authorize('admin'), async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT id, backup_name, backup_type, file_size, file_url, status, created_at
       FROM backup_records
       ORDER BY created_at DESC
       LIMIT 100`
    );

    res.json({ backupRecords: result.rows.map(backupRecord) });
  } catch (error) {
    console.error('Get backup records error:', error);
    res.status(500).json({ error: 'Failed to fetch backup records' });
  }
});

router.get('/backup/export', authenticate, authorize('admin'), async (_req: AuthRequest, res: Response) => {
  try {
    const tables: Record<string, any[]> = {};

    for (const table of BACKUP_TABLES) {
      const result = await query(`SELECT * FROM ${quoteIdentifier(table)} ORDER BY 1`);
      tables[table] = result.rows;
    }

    const payload = {
      version: 1,
      backupType: 'full',
      exportedAt: new Date().toISOString(),
      tables
    };
    const serialized = JSON.stringify(payload, null, 2);
    const fileSize = Buffer.byteLength(serialized);
    const backupName = `deskto-full-backup-${Date.now()}.json`;

    await query(
      `INSERT INTO backup_records (backup_name, backup_type, file_size, file_url, status)
       VALUES ($1, 'full', $2, $3, 'completed')`,
      [backupName, fileSize, `/api/backup/export`]
    );

    res.setHeader('Content-Type', 'application/json');
    res.setHeader('Content-Disposition', `attachment; filename="${backupName}"`);
    res.send(serialized);
  } catch (error) {
    console.error('Export backup error:', error);
    res.status(500).json({ error: 'Failed to export backup' });
  }
});

router.post('/backup/restore', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  const backup = req.body;

  if (!backup || backup.version !== 1 || !backup.tables || typeof backup.tables !== 'object') {
    res.status(400).json({ error: 'Invalid backup file format' });
    return;
  }

  const client = await getClient();

  try {
    await client.query('BEGIN');
    await client.query(`TRUNCATE ${BACKUP_TABLES.map(quoteIdentifier).join(', ')} RESTART IDENTITY CASCADE`);

    for (const table of BACKUP_TABLES) {
      const rows = backup.tables[table];
      if (rows === undefined) continue;

      if (!Array.isArray(rows)) {
        throw new Error(`Invalid rows for ${table}`);
      }

      const allowedColumns = await listColumns(table);

      for (const row of rows) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
          throw new Error(`Invalid row in ${table}`);
        }

        const columns = Object.keys(row).filter(column => allowedColumns.includes(column));
        if (columns.length === 0) continue;

        const placeholders = columns.map((_, index) => `$${index + 1}`).join(', ');
        const values = columns.map(column => row[column]);

        await client.query(
          `INSERT INTO ${quoteIdentifier(table)} (${columns.map(quoteIdentifier).join(', ')})
           VALUES (${placeholders})`,
          values
        );
      }
    }

    const fileSize = Buffer.byteLength(JSON.stringify(backup));
    await client.query(
      `INSERT INTO backup_records (backup_name, backup_type, file_size, file_url, status)
       VALUES ($1, 'full', $2, NULL, 'completed')`,
      [`restored-backup-${Date.now()}.json`, fileSize]
    );

    await client.query('COMMIT');
    res.json({ message: 'Backup restored successfully' });
  } catch (error: any) {
    await client.query('ROLLBACK');
    console.error('Restore backup error:', error);
    res.status(400).json({ error: error?.message || 'Failed to restore backup' });
  } finally {
    client.release();
  }
});

router.post('/backup/reset-demo', authenticate, authorize('admin'), async (_req: AuthRequest, res: Response) => {
  const client = await getClient();

  try {
    await client.query('BEGIN');
    await client.query(`TRUNCATE ${BACKUP_TABLES.map(quoteIdentifier).join(', ')} RESTART IDENTITY CASCADE`);

    await client.query(
      `INSERT INTO users (email, phone, password_hash, first_name, last_name, role, status, email_verified)
       VALUES
        ('admin@deskto.com', '+91-9876543210', $1, 'Admin', 'User', 'admin', 'active', TRUE),
        ('sales@deskto.com', '+91-9876543211', $1, 'Rahul', 'Sharma', 'staff', 'active', TRUE),
        ('tech@deskto.com', '+91-9876543212', $1, 'Priya', 'Patel', 'staff', 'active', TRUE),
        ('demo@deskto.in', '+91-9876543215', $1, 'Demo', 'Customer', 'customer', 'active', TRUE)`,
      [DEMO_PASSWORD_HASH]
    );

    await client.query(
      `INSERT INTO staff_profiles (user_id, department, employee_id, hire_date, is_active)
       SELECT id, 'Sales', 'EMP001', CURRENT_DATE, TRUE FROM users WHERE email = 'sales@deskto.com'
       UNION ALL
       SELECT id, 'Technical', 'EMP002', CURRENT_DATE, TRUE FROM users WHERE email = 'tech@deskto.com'`
    );

    await client.query(
      `INSERT INTO categories (name, slug, description, sort_order)
       VALUES
        ('Gaming PC', 'gaming-pc', 'Prebuilt and custom gaming systems', 1),
        ('Desktop PC', 'desktop-pc', 'Workstation and office desktop computers', 2),
        ('Components', 'components', 'PC parts and upgrades', 3)`
    );

    await client.query(
      `INSERT INTO brands (name, slug, description)
       VALUES
        ('DESKTO', 'deskto', 'DESKTO configured systems'),
        ('NVIDIA', 'nvidia', 'Graphics and creator hardware'),
        ('Intel', 'intel', 'Processors and platform components')`
    );

    await client.query(
      `INSERT INTO products
       (sku, name, slug, description, price, compare_price, category, brand, stock_quantity, image_url, market_tag, is_featured)
       VALUES
        ('GPU-001', 'NVIDIA RTX 4090 Gaming PC', 'nvidia-rtx-4090-gaming-pc',
         'High-end gaming desktop with RTX 4090 class graphics.', 249999.00, 279999.00,
         'Gaming PC', 'DESKTO', 5, NULL, 'Flagship', TRUE),
        ('CPU-001', 'Intel Core i7 Workstation', 'intel-core-i7-workstation',
         'Reliable workstation desktop for productivity and content work.', 79999.00, 89999.00,
         'Desktop PC', 'DESKTO', 12, NULL, 'Popular', TRUE),
        ('ACC-001', 'DESKTO Upgrade Kit', 'deskto-upgrade-kit',
         'Curated upgrade bundle for memory, storage, and maintenance.', 14999.00, NULL,
         'Components', 'DESKTO', 24, NULL, 'Value', FALSE)`
    );

    await client.query(
      `INSERT INTO orders
       (order_number, user_id, status, subtotal, tax_amount, shipping_amount, total_amount, payment_status, shipping_address)
       VALUES
        ('ORD-DEMO-001', (SELECT id FROM users WHERE email = 'demo@deskto.in'), 'delivered',
         79999.00, 14399.82, 0.00, 94398.82, 'paid',
         '{"line1":"Demo Street 1","city":"Mumbai","state":"MH","postalCode":"400001","country":"India"}'::jsonb)`
    );

    await client.query(
      `INSERT INTO services
       (service_number, user_id, service_type, status, title, description, estimated_cost)
       VALUES
        ('SRV-DEMO-001', (SELECT id FROM users WHERE email = 'demo@deskto.in'), 'repair', 'diagnosing',
         'Gaming PC thermal check', 'Demo service request for admin workflow validation.', 1499.00)`
    );

    await client.query(
      `INSERT INTO pc_builds
       (build_number, user_id, status, title, use_case, budget_range, components, total_price)
       VALUES
        ('BLD-DEMO-001', (SELECT id FROM users WHERE email = 'demo@deskto.in'), 'submitted',
         'Demo Streaming Build', 'Gaming and streaming', '150000-200000',
         '{"cpu":"Intel Core i7","gpu":"NVIDIA RTX 4070","ram":"32GB DDR5"}'::jsonb, 175000.00)`
    );

    await client.query(
      `INSERT INTO backup_records (backup_name, backup_type, file_size, file_url, status)
       VALUES ($1, 'full', NULL, NULL, 'completed')`,
      [`demo-reset-${Date.now()}`]
    );

    await client.query('COMMIT');
    res.json({ message: 'Demo data reset successfully' });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Reset demo data error:', error);
    res.status(500).json({ error: 'Failed to reset demo data' });
  } finally {
    client.release();
  }
});

export default router;
