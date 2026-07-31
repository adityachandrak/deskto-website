import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { query } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';

const router = Router();
const slugify = (value: unknown) => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

router.get('/admin/overview', authenticate, authorize('admin', 'staff'), async (_req, res) => {
  try {
    const [summaryResult, weeklyResult, categoryResult, serviceResult, pipelineResult] = await Promise.all([
      query(`SELECT
      (SELECT COUNT(*)::int FROM products) AS products,
      (SELECT COUNT(*)::int FROM products WHERE COALESCE(status, 'published') = 'published' AND is_active = TRUE) AS published_products,
      (SELECT COUNT(*)::int FROM products WHERE stock_quantity <= low_stock_threshold) AS low_stock,
      (SELECT COUNT(*)::int FROM orders) AS orders,
      (SELECT COUNT(*)::int FROM orders WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date AND status NOT IN ('cancelled','refunded')) AS orders_today,
      (SELECT COALESCE(SUM(total_amount),0)::float FROM orders WHERE (created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = (NOW() AT TIME ZONE 'Asia/Kolkata')::date AND status NOT IN ('cancelled','refunded')) AS sales_today,
      (SELECT COALESCE(SUM(total_amount),0)::float FROM orders WHERE status='delivered') AS delivered_revenue,
      (SELECT COUNT(*)::int FROM services WHERE service_type='repair' AND status NOT IN ('completed','delivered','closed','cancelled','rejected','refunded')) AS open_repairs,
      (SELECT COUNT(*)::int FROM services WHERE service_type='pc-build' AND status NOT IN ('completed','delivered','closed','cancelled','rejected','refunded')) AS active_pc_builds,
      (SELECT COUNT(*)::int FROM services WHERE service_type NOT IN ('repair','pc-build','delivery') AND status NOT IN ('completed','delivered','closed','cancelled','rejected','refunded','returned','inventory-added')) AS open_services,
      (SELECT COUNT(*)::int FROM services WHERE service_type='delivery' AND status NOT IN ('completed','delivered','closed','cancelled','rejected','refunded','returned')) AS pending_deliveries,
      (SELECT COUNT(*)::int FROM services) AS services,
      (SELECT COUNT(*)::int FROM users WHERE role = 'customer') AS customers,
      (SELECT COUNT(*)::int FROM users WHERE role = 'staff' AND status='active') AS staff,
      (SELECT COUNT(*)::int FROM crm_notes) AS crm_notes`),
      query(`WITH days AS (
        SELECT generate_series((NOW() AT TIME ZONE 'Asia/Kolkata')::date - 6, (NOW() AT TIME ZONE 'Asia/Kolkata')::date, interval '1 day')::date AS day
      ) SELECT TO_CHAR(days.day, 'MM-DD') AS date,
        COALESCE(SUM(o.total_amount) FILTER (WHERE o.status NOT IN ('cancelled','refunded')),0)::float AS revenue
        FROM days LEFT JOIN orders o ON (o.created_at AT TIME ZONE 'UTC' AT TIME ZONE 'Asia/Kolkata')::date = days.day
        GROUP BY days.day ORDER BY days.day`),
      query(`SELECT COALESCE(NULLIF(p.category,''), 'others') AS name,
        COALESCE(SUM(COALESCE(NULLIF(item->>'totalPrice','')::numeric,
          COALESCE(NULLIF(item->>'unitPrice','')::numeric,0) * COALESCE(NULLIF(item->>'quantity','')::numeric,0))),0)::float AS value
        FROM orders o CROSS JOIN LATERAL jsonb_array_elements(COALESCE(o.items,'[]'::jsonb)) item
        LEFT JOIN products p ON p.id::text = item->>'productId'
        WHERE o.status NOT IN ('cancelled','refunded')
        GROUP BY COALESCE(NULLIF(p.category,''), 'others') ORDER BY value DESC`),
      query(`SELECT service_type AS name,
        COALESCE(SUM(COALESCE(final_cost,estimated_cost,0)),0)::float AS value,
        COUNT(*)::int AS count
        FROM services
        WHERE status IN ('paid','completed','delivered','closed','returned','inventory-added')
          AND COALESCE(final_cost,estimated_cost,0) > 0
        GROUP BY service_type ORDER BY value DESC`),
      query(`SELECT status AS name, COUNT(*)::int AS value FROM orders GROUP BY status ORDER BY status`),
    ]);
    const summary = summaryResult.rows[0];
    res.set('Cache-Control', 'no-store').json({
      ...summary,
      weeklyRevenue: weeklyResult.rows,
      salesByCategory: categoryResult.rows,
      salesByService: serviceResult.rows,
      orderPipeline: pipelineResult.rows,
      generatedAt: new Date().toISOString(),
      timezone: 'Asia/Kolkata',
    });
  } catch (error) {
    console.error('Admin overview error:', error);
    res.status(500).json({ error: 'Failed to load overview' });
  }
});

router.get('/admin/categories', authenticate, authorize('admin', 'staff'), async (_req, res) => {
  const result = await query(`SELECT c.id, c.name, c.slug, c.description, c.icon, c.icon_color AS "color",
    c.is_active AS "isActive", c.sort_order AS "sortOrder", COUNT(p.id)::int AS count
    FROM categories c LEFT JOIN products p ON LOWER(p.category) = LOWER(c.name)
    GROUP BY c.id ORDER BY c.sort_order, c.name`);
  res.set('Cache-Control', 'no-store').json({ categories: result.rows });
});

router.post('/admin/categories', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Category name is required' });
  try {
    const result = await query(`INSERT INTO categories (name, slug, description, icon, icon_color, sort_order, is_active)
      VALUES ($1,$2,$3,$4,$5,$6,TRUE) RETURNING id, name, slug, description, icon, icon_color AS "color", is_active AS "isActive", sort_order AS "sortOrder"`,
      [name, slugify(req.body.slug || name), req.body.description || null, req.body.icon || null, req.body.color || null, Number(req.body.sortOrder || 0)]);
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(error.code === '23505' ? 409 : 500).json({ error: error.code === '23505' ? 'Category already exists' : 'Failed to create category' });
  }
});

router.put('/admin/categories/:id', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Category name is required' });
  try {
    const result = await query(`UPDATE categories SET name=$1, slug=$2, description=$3, icon=$4, icon_color=$5,
      sort_order=$6, is_active=COALESCE($7,is_active), updated_at=NOW() WHERE id=$8
      RETURNING id, name, slug, description, icon, icon_color AS "color", is_active AS "isActive", sort_order AS "sortOrder"`,
      [name, slugify(req.body.slug || name), req.body.description || null, req.body.icon || null, req.body.color || null, Number(req.body.sortOrder || 0), req.body.isActive, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Category not found' });
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(error.code === '23505' ? 409 : 500).json({ error: error.code === '23505' ? 'Category already exists' : 'Failed to update category' });
  }
});

router.delete('/admin/categories/:id', authenticate, authorize('admin'), async (req, res) => {
  if (req.query.hard === 'true') {
    const removed = await query("DELETE FROM categories WHERE id=$1 AND slug LIKE 'e2e-%' RETURNING id", [req.params.id]);
    if (!removed.rows.length) return res.status(400).json({ error: 'Only E2E categories may be permanently cleaned up' });
    return res.json({ id: removed.rows[0].id, deleted: true });
  }
  const result = await query('UPDATE categories SET is_active=FALSE, updated_at=NOW() WHERE id=$1 RETURNING id', [req.params.id]);
  if (!result.rows.length) return res.status(404).json({ error: 'Category not found' });
  res.json({ id: result.rows[0].id, archived: true });
});

router.get('/admin/brands', authenticate, authorize('admin', 'staff'), async (_req, res) => {
  const result = await query(`SELECT b.id, b.name, b.slug, b.logo_url AS "logoUrl", b.description, b.website,
    b.is_active AS "isActive", COUNT(p.id)::int AS count FROM brands b
    LEFT JOIN products p ON LOWER(p.brand) = LOWER(b.name) GROUP BY b.id ORDER BY b.name`);
  res.set('Cache-Control', 'no-store').json({ brands: result.rows });
});

router.post('/admin/brands', authenticate, authorize('admin'), async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Brand name is required' });
  try {
    const result = await query(`INSERT INTO brands (name,slug,logo_url,description,website,is_active) VALUES ($1,$2,$3,$4,$5,TRUE)
      RETURNING id,name,slug,logo_url AS "logoUrl",description,website,is_active AS "isActive"`,
      [name, slugify(req.body.slug || name), req.body.logoUrl || null, req.body.description || null, req.body.website || null]);
    res.status(201).json(result.rows[0]);
  } catch (error: any) {
    res.status(error.code === '23505' ? 409 : 500).json({ error: error.code === '23505' ? 'Brand already exists' : 'Failed to create brand' });
  }
});

router.put('/admin/brands/:id', authenticate, authorize('admin'), async (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'Brand name is required' });
  try {
    const result = await query(`UPDATE brands SET name=$1,slug=$2,logo_url=$3,description=$4,website=$5,
      is_active=COALESCE($6,is_active),updated_at=NOW() WHERE id=$7
      RETURNING id,name,slug,logo_url AS "logoUrl",description,website,is_active AS "isActive"`,
      [name, slugify(req.body.slug || name), req.body.logoUrl || null, req.body.description || null, req.body.website || null, req.body.isActive, req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Brand not found' });
    res.json(result.rows[0]);
  } catch (error: any) {
    res.status(error.code === '23505' ? 409 : 500).json({ error: error.code === '23505' ? 'Brand already exists' : 'Failed to update brand' });
  }
});

router.delete('/admin/brands/:id', authenticate, authorize('admin'), async (req, res) => {
  if (req.query.hard === 'true') {
    const removed = await query("DELETE FROM brands WHERE id=$1 AND slug LIKE 'e2e-%' RETURNING id", [req.params.id]);
    if (!removed.rows.length) return res.status(400).json({ error: 'Only E2E brands may be permanently cleaned up' });
    return res.json({ id: removed.rows[0].id, deleted: true });
  }
  const result = await query('UPDATE brands SET is_active=FALSE,updated_at=NOW() WHERE id=$1 RETURNING id', [req.params.id]);
  if (!result.rows.length) return res.status(404).json({ error: 'Brand not found' });
  res.json({ id: result.rows[0].id, archived: true });
});

router.get('/admin/users', authenticate, authorize('admin', 'staff'), async (req, res) => {
  const params: any[] = [];
  const where = req.query.role ? 'WHERE u.role=$1' : '';
  if (req.query.role) params.push(req.query.role);
  const result = await query(`SELECT u.id,u.email,u.phone,u.first_name AS "firstName",u.last_name AS "lastName",u.role,u.status,
    u.is_verified AS "isVerified",u.created_at AS "createdAt",sp.department,sp.employee_id AS "employeeId",sp.specialization,
    (SELECT COUNT(*)::int FROM orders o WHERE o.user_id=u.id) AS "orderCount",
    (SELECT COUNT(*)::int FROM services s WHERE s.user_id=u.id) AS "serviceCount"
    FROM users u LEFT JOIN staff_profiles sp ON sp.user_id=u.id ${where} ORDER BY u.created_at DESC`, params);
  res.set('Cache-Control', 'no-store').json({ users: result.rows });
});

router.patch('/admin/users/:id', authenticate, authorize('admin'), async (req, res) => {
  const allowed = new Set(['active','inactive','suspended','locked']);
  if (req.body.status !== undefined && !allowed.has(req.body.status)) return res.status(400).json({ error: 'Invalid account status' });
  const result = await query(`UPDATE users SET status=COALESCE($1,status),is_verified=COALESCE($2,is_verified),updated_at=NOW()
    WHERE id=$3 RETURNING id,email,role,status,is_verified AS "isVerified"`, [req.body.status, req.body.isVerified, req.params.id]);
  if (!result.rows.length) return res.status(404).json({ error: 'User not found' });
  res.json(result.rows[0]);
});

router.delete('/admin/users/:id', authenticate, authorize('admin'), async (req, res) => {
  if (req.query.hard !== 'true') return res.status(400).json({ error: 'Explicit hard cleanup flag is required' });
  const result = await query("DELETE FROM users WHERE id=$1 AND email LIKE 'e2e-%' RETURNING id,email", [req.params.id]);
  if (!result.rows.length) return res.status(400).json({ error: 'Only E2E users may be permanently cleaned up' });
  res.json({ ...result.rows[0], deleted: true });
});

router.post('/admin/staff', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const firstName = String(req.body.firstName || req.body.name || '').trim();
  const password = String(req.body.password || 'ChangeMe123!');
  if (!email || !firstName) return res.status(400).json({ error: 'Name and email are required' });
  try {
    const requestedDepartment = String(req.body.department || 'Support');
    const department = ['Sales','Technical','Assembly','Support','Admin','Delivery'].includes(requestedDepartment)
      ? requestedDepartment
      : requestedDepartment.toLowerCase().includes('deliver') ? 'Delivery'
      : requestedDepartment.toLowerCase().includes('assembl') ? 'Assembly'
      : requestedDepartment.toLowerCase().includes('repair') || requestedDepartment.toLowerCase().includes('tech') ? 'Technical'
      : 'Support';
    const passwordHash = await bcrypt.hash(password, 12);
    const user = await query(`INSERT INTO users (email,phone,password_hash,first_name,last_name,role,status,is_verified)
      VALUES ($1,$2,$3,$4,$5,'staff','active',TRUE) RETURNING id,email,phone,first_name AS "firstName",last_name AS "lastName",role,status,created_at AS "createdAt"`,
      [email, req.body.phone || null, passwordHash, firstName, req.body.lastName || null]);
    const profile = await query(`INSERT INTO staff_profiles (user_id,department,employee_id,hire_date,specialization,is_active)
      VALUES ($1,$2,$3,CURRENT_DATE,$4,TRUE) RETURNING department,employee_id AS "employeeId",specialization`,
      [user.rows[0].id, department, req.body.employeeId || `STF-${Date.now()}`, req.body.specialization || null]);
    res.status(201).json({ ...user.rows[0], ...profile.rows[0] });
  } catch (error: any) {
    res.status(error.code === '23505' ? 409 : 500).json({ error: error.code === '23505' ? 'Email, phone, or employee ID already exists' : 'Failed to create staff account' });
  }
});

// There is currently no email/SMS service wired up (see the audit), so a
// self-service "forgot password" flow that emails or texts a reset link
// isn't possible yet. Until that exists, support fields this by phone: an
// admin or staff member verifies the customer's identity on the call, then
// uses this to issue a fresh temporary password. Staff may only reset
// customer passwords — not other staff or admin accounts — to avoid a
// compromised staff account being able to take over higher-privileged
// accounts.
router.post('/admin/users/:id/reset-password', authenticate, authorize('admin', 'staff'), async (req: AuthRequest, res: Response) => {
  try {
    const target = await query('SELECT id, email, role FROM users WHERE id = $1', [req.params.id]);
    if (!target.rows.length) return res.status(404).json({ error: 'User not found' });

    const targetRole = target.rows[0].role;
    if (req.user!.role === 'staff' && targetRole !== 'customer') {
      return res.status(403).json({ error: 'Staff may only reset customer passwords' });
    }

    const temporaryPassword = `Dk${Math.random().toString(36).slice(2, 8)}${Math.floor(Math.random() * 90 + 10)}!`;
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);

    await query(
      `UPDATE users SET password_hash = $1, failed_login_attempts = 0, locked_until = NULL,
              status = CASE WHEN status = 'locked' THEN 'active' ELSE status END, updated_at = NOW()
        WHERE id = $2`,
      [passwordHash, req.params.id]
    );
    // Force re-login everywhere — a password reset should invalidate any
    // session that might belong to someone who is no longer the account
    // owner.
    await query('UPDATE refresh_tokens SET revoked = TRUE WHERE user_id = $1', [req.params.id]);

    res.json({ email: target.rows[0].email, temporaryPassword });
  } catch (error) {
    console.error('Admin reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

router.get('/admin/crm-notes', authenticate, authorize('admin', 'staff'), async (req, res) => {
  const params: any[] = [];
  const where = req.query.customerId ? 'WHERE n.customer_id=$1' : '';
  if (req.query.customerId) params.push(req.query.customerId);
  const result = await query(`SELECT n.id,n.customer_id AS "customerId",n.note,n.note_type AS "noteType",n.created_at AS "createdAt",
    CONCAT_WS(' ',creator.first_name,creator.last_name) AS "createdByName"
    FROM crm_notes n LEFT JOIN users creator ON creator.id=n.created_by ${where} ORDER BY n.created_at DESC`, params);
  res.set('Cache-Control', 'no-store').json({ notes: result.rows });
});

router.post('/admin/crm-notes', authenticate, authorize('admin', 'staff'), async (req: AuthRequest, res: Response) => {
  const note = String(req.body.note || '').trim();
  if (!req.body.customerId || !note) return res.status(400).json({ error: 'Customer and note are required' });
  const result = await query(`INSERT INTO crm_notes (customer_id,created_by,note_type,note,is_private) VALUES ($1,$2,$3,$4,$5)
    RETURNING id,customer_id AS "customerId",note,note_type AS "noteType",created_at AS "createdAt"`,
    [req.body.customerId, req.user!.id, req.body.noteType || 'general', note, Boolean(req.body.isPrivate)]);
  res.status(201).json(result.rows[0]);
});

router.delete('/admin/crm-notes/:id', authenticate, authorize('admin'), async (req, res) => {
  const result = await query("DELETE FROM crm_notes WHERE id=$1 AND note LIKE 'E2E:%' RETURNING id", [req.params.id]);
  if (!result.rows.length) return res.status(400).json({ error: 'Only E2E CRM notes may be cleaned up through this endpoint' });
  res.json({ id: result.rows[0].id, deleted: true });
});

router.get('/admin/custom-builder', authenticate, authorize('admin', 'staff'), async (_req, res) => {
  const result = await query(`SELECT config_key AS "key",draft_data AS "draftData",published_data AS "publishedData",status,version,
    published_at AS "publishedAt",updated_at AS "updatedAt" FROM admin_configs WHERE config_key='custom-builder'`);
  res.set('Cache-Control', 'no-store').json(result.rows[0] || null);
});

router.put('/admin/custom-builder', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  const data = req.body.data;
  if (!data || typeof data !== 'object') return res.status(400).json({ error: 'Builder configuration is required' });
  const result = await query(`INSERT INTO admin_configs (config_key,draft_data,status,version,modified_by) VALUES ('custom-builder',$1,'draft',1,$2)
    ON CONFLICT (config_key) DO UPDATE SET draft_data=$1,status='draft',version=admin_configs.version+1,modified_by=$2,updated_at=NOW()
    RETURNING draft_data AS "draftData",status,version,published_at AS "publishedAt",updated_at AS "updatedAt"`, [JSON.stringify(data), req.user!.id]);
  res.json(result.rows[0]);
});

router.post('/admin/custom-builder/publish', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  const data = req.body.data;
  if (!data || typeof data !== 'object') return res.status(400).json({ error: 'Builder configuration is required' });
  const result = await query(`INSERT INTO admin_configs (config_key,draft_data,published_data,status,version,modified_by,published_at)
    VALUES ('custom-builder',$1,$1,'published',1,$2,NOW()) ON CONFLICT (config_key) DO UPDATE SET
    draft_data=$1,published_data=$1,status='published',version=admin_configs.version+1,modified_by=$2,published_at=NOW(),updated_at=NOW()
    RETURNING published_data AS data,status,version,published_at AS "publishedAt",updated_at AS "updatedAt"`, [JSON.stringify(data), req.user!.id]);
  res.json(result.rows[0]);
});

router.get('/public/custom-builder', async (_req, res) => {
  const result = await query(`SELECT published_data AS data,version,published_at AS "publishedAt" FROM admin_configs
    WHERE config_key='custom-builder' AND status='published' AND published_data IS NOT NULL`);
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate').json(result.rows[0] || null);
});

export default router;
