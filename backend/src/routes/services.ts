import { Router, Request, Response } from 'express';
import { PutObjectCommand, DeleteObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { query } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { validationResult, body } from 'express-validator';

const router = Router();
const SERVICE_TYPES = ['repair', 'pc-build', 'assembly', 'upgrade', 'software', 'rental', 'delivery', 'support', 'sell'] as const;
const CUSTOMER_STATUSES = new Set(['quote-approved', 'approved', 'accepted', 'rejected', 'cancelled', 'paid']);
const ALLOWED_IMAGE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);
const EXTENSIONS: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' };
const imageBucket = process.env.PRODUCT_IMAGE_BUCKET || '';
const imageCdnUrl = (process.env.PRODUCT_IMAGE_CDN_URL || '').replace(/\/$/, '');
const s3 = new S3Client({ region: process.env.AWS_REGION || 'ap-south-1' });

function money(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function serviceToResponse(s: any) {
  const deviceInfo = s.device_info || {};
  const attachments = Array.isArray(deviceInfo.attachments) ? deviceInfo.attachments : [];
  return {
    id: s.id,
    serviceNumber: s.service_number,
    customerId: s.user_id,
    serviceType: s.service_type,
    status: s.status,
    title: s.title,
    description: s.description,
    deviceInfo,
    attachments,
    customerName: s.customer_name || deviceInfo.customerName || deviceInfo.name || null,
    customerEmail: s.customer_email || deviceInfo.customerEmail || deviceInfo.email || null,
    customerPhone: s.customer_phone || deviceInfo.customerPhone || deviceInfo.phone || deviceInfo.contact || null,
    estimatedCost: money(s.estimated_cost),
    finalCost: money(s.final_cost),
    quotationItems: deviceInfo.quotationItems || [],
    quotationNote: deviceInfo.quotationNote || null,
    technicianId: s.technician_id,
    createdAt: s.created_at,
    updatedAt: s.updated_at,
  };
}

async function findService(identifier: string) {
  const result = await query(
    `SELECT s.*, u.first_name || COALESCE(' ' || u.last_name, '') AS customer_name,
            u.email AS customer_email, u.phone AS customer_phone
     FROM services s LEFT JOIN users u ON u.id = s.user_id
     WHERE s.id::text = $1 OR s.service_number = $1 LIMIT 1`,
    [identifier]
  );
  return result.rows[0] || null;
}

function canReadService(req: AuthRequest, row: any) {
  return req.user!.role === 'admin' || req.user!.role === 'staff' || row.user_id === req.user!.id;
}

router.post('/quick-enquiry',
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name is required'),
    body('contact').trim().isLength({ min: 5 }).withMessage('Phone or email is required'),
    body('serviceNeeded').trim().isLength({ min: 2 }).withMessage('Service needed is required'),
    body('requirements').optional().isString(),
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const name = String(req.body.name || '').trim();
      const contact = String(req.body.contact || '').trim();
      const serviceNeeded = String(req.body.serviceNeeded || '').trim();
      const requirements = String(req.body.requirements || '').trim();
      const serviceNumber = `ENQ-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const hasEmail = contact.includes('@');
      const deviceInfo = {
        source: 'homepage-quick-enquiry', customerName: name, contact,
        customerEmail: hasEmail ? contact : undefined,
        customerPhone: hasEmail ? undefined : contact,
        serviceNeeded,
      };
      const result = await query(
        `INSERT INTO services (service_number, user_id, service_type, status, title, description, device_info)
         VALUES ($1, NULL, 'support', 'submitted', $2, $3, $4) RETURNING *`,
        [serviceNumber, `Quick Enquiry: ${serviceNeeded}`, requirements || serviceNeeded, deviceInfo]
      );
      res.status(201).json(serviceToResponse(result.rows[0]));
    } catch (error) {
      console.error('Quick enquiry error:', error);
      res.status(500).json({ error: 'Failed to submit enquiry' });
    }
  }
);

router.get('/my', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 50, status, serviceType } = req.query;
    const params: any[] = [req.user!.id];
    const conditions = ['s.user_id = $1'];
    if (status) { params.push(String(status)); conditions.push(`s.status = $${params.length}`); }
    if (serviceType) { params.push(String(serviceType)); conditions.push(`s.service_type = $${params.length}`); }
    const offset = (Number(page) - 1) * Number(limit);
    const where = `WHERE ${conditions.join(' AND ')}`;
    const rows = await query(
      `SELECT s.*, u.first_name || COALESCE(' ' || u.last_name, '') AS customer_name,
              u.email AS customer_email, u.phone AS customer_phone
       FROM services s LEFT JOIN users u ON u.id = s.user_id ${where}
       ORDER BY s.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, Number(limit), offset]
    );
    const count = await query(`SELECT COUNT(*) FROM services s ${where}`, params);
    res.json({
      services: rows.rows.map(serviceToResponse),
      pagination: { page: Number(page), limit: Number(limit), total: Number(count.rows[0].count), totalPages: Math.ceil(Number(count.rows[0].count) / Number(limit)) },
    });
  } catch (error) {
    console.error('Get my services error:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

router.get('/', authenticate, authorize('admin', 'staff'), async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 100, status, serviceType, technicianId } = req.query;
    const params: any[] = [];
    const conditions: string[] = [];
    if (status) { params.push(String(status)); conditions.push(`s.status = $${params.length}`); }
    if (serviceType) { params.push(String(serviceType)); conditions.push(`s.service_type = $${params.length}`); }
    if (technicianId) { params.push(String(technicianId)); conditions.push(`s.technician_id::text = $${params.length}`); }
    const where = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
    const offset = (Number(page) - 1) * Number(limit);
    const rows = await query(
      `SELECT s.*, u.first_name || COALESCE(' ' || u.last_name, '') AS customer_name,
              u.email AS customer_email, u.phone AS customer_phone
       FROM services s LEFT JOIN users u ON u.id = s.user_id ${where}
       ORDER BY s.created_at DESC LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, Number(limit), offset]
    );
    const count = await query(`SELECT COUNT(*) FROM services s ${where}`, params);
    res.json({
      services: rows.rows.map(serviceToResponse),
      pagination: { page: Number(page), limit: Number(limit), total: Number(count.rows[0].count), totalPages: Math.ceil(Number(count.rows[0].count) / Number(limit)) },
    });
  } catch (error) {
    console.error('Get all services error:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

router.get('/technicians/list', authenticate, authorize('admin', 'staff'), async (_req: AuthRequest, res: Response) => {
  try {
    const result = await query(
      `SELECT u.id, u.email, u.phone, u.first_name, u.last_name,
              COALESCE(sp.department, 'General') AS department, u.status, u.created_at
       FROM users u LEFT JOIN staff_profiles sp ON sp.user_id = u.id
       WHERE u.role = 'staff' AND u.status = 'active' ORDER BY u.first_name, u.last_name`
    );
    res.json({ technicians: result.rows.map(row => ({
      id: row.id,
      email: row.email,
      phone: row.phone,
      name: [row.first_name, row.last_name].filter(Boolean).join(' ') || row.email,
      department: row.department,
      status: row.status,
      createdAt: row.created_at,
    })) });
  } catch (error) {
    console.error('Get technicians error:', error);
    res.status(500).json({ error: 'Failed to fetch technicians' });
  }
});

router.get('/:identifier', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const row = await findService(String(req.params.identifier));
    if (!row || !canReadService(req, row)) return res.status(404).json({ error: 'Service not found' });
    res.json(serviceToResponse(row));
  } catch (error) {
    console.error('Get service error:', error);
    res.status(500).json({ error: 'Failed to fetch service' });
  }
});

router.post('/', authenticate,
  [
    body('serviceType').isIn([...SERVICE_TYPES]).withMessage('Invalid service type'),
    body('title').trim().notEmpty().withMessage('Title is required'),
    body('description').optional().isString(),
    body('deviceInfo').optional().isObject(),
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
      const { serviceType, title, description, deviceInfo = {} } = req.body;
      const prefix = serviceType === 'delivery' ? 'DLV' : serviceType === 'pc-build' ? 'PCB' : 'SRV';
      const serviceNumber = `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const result = await query(
        `INSERT INTO services (service_number, user_id, service_type, status, title, description, device_info)
         VALUES ($1, $2, $3, 'submitted', $4, $5, $6) RETURNING *`,
        [serviceNumber, req.user!.id, serviceType, title, description || null, deviceInfo]
      );
      res.status(201).json(serviceToResponse(result.rows[0]));
    } catch (error) {
      console.error('Create service error:', error);
      res.status(500).json({ error: 'Failed to create service' });
    }
  }
);

router.patch('/:identifier', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const current = await findService(String(req.params.identifier));
    if (!current) return res.status(404).json({ error: 'Service not found' });
    const isOperator = req.user!.role === 'admin' || req.user!.role === 'staff';
    const owns = current.user_id === req.user!.id;
    const requestedStatus = req.body.status === undefined ? current.status : String(req.body.status);
    if (!isOperator && (!owns || !CUSTOMER_STATUSES.has(requestedStatus))) {
      return res.status(403).json({ error: 'Customers may only approve, accept, reject, pay, or cancel their own service request' });
    }
    const devicePatch = req.body.deviceInfo && typeof req.body.deviceInfo === 'object' ? req.body.deviceInfo : {};
    const estimatedCost = req.body.estimatedCost === undefined ? current.estimated_cost : money(req.body.estimatedCost);
    const finalCost = req.body.finalCost === undefined ? current.final_cost : money(req.body.finalCost);
    const technicianId = isOperator && req.body.technicianId !== undefined ? (req.body.technicianId || null) : current.technician_id;
    const result = await query(
      `UPDATE services SET status = $1, estimated_cost = $2, final_cost = $3, technician_id = $4,
              device_info = COALESCE(device_info, '{}'::jsonb) || $5::jsonb, updated_at = NOW()
       WHERE id = $6 RETURNING *`,
      [requestedStatus, estimatedCost, finalCost, technicianId, JSON.stringify(devicePatch), current.id]
    );
    const updated = result.rows[0];
    if (updated.service_type === 'delivery') {
      const orderNumber = updated.device_info?.orderNumber;
      const orderStatus = requestedStatus === 'delivered' ? 'delivered' : requestedStatus === 'dispatched' ? 'shipped' : null;
      if (orderNumber && orderStatus) await query('UPDATE orders SET status = $1, updated_at = NOW() WHERE order_number = $2', [orderStatus, orderNumber]);
    }
    res.json(serviceToResponse(await findService(updated.service_number)));
  } catch (error) {
    console.error('Update service error:', error);
    res.status(500).json({ error: 'Failed to update service' });
  }
});

router.post('/:identifier/attachments/upload-url', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    if (!imageBucket || !imageCdnUrl) return res.status(503).json({ error: 'Service attachment upload is not configured' });
    const row = await findService(String(req.params.identifier));
    if (!row || !canReadService(req, row)) return res.status(404).json({ error: 'Service not found' });
    const contentType = String(req.body.contentType || '');
    if (!ALLOWED_IMAGE_TYPES.has(contentType)) return res.status(400).json({ error: 'Only JPG, PNG, and WEBP images are allowed' });
    const existing = Array.isArray(row.device_info?.attachments) ? row.device_info.attachments : [];
    if (existing.length >= 8) return res.status(400).json({ error: 'A service request can have a maximum of 8 attachments' });
    const safe = String(req.body.fileName || 'attachment').replace(/\.[^.]+$/, '').replace(/[^a-z0-9-]+/gi, '-').replace(/(^-|-$)/g, '').toLowerCase() || 'attachment';
    const objectKey = `products/service-attachments/${row.user_id || 'public'}/${row.id}/${Date.now()}-${safe}.${EXTENSIONS[contentType]}`;
    const uploadUrl = await getSignedUrl(s3, new PutObjectCommand({ Bucket: imageBucket, Key: objectKey, ContentType: contentType }), { expiresIn: 900 });
    res.json({ uploadUrl, objectKey, expiresIn: 900 });
  } catch (error) {
    console.error('Create service attachment URL error:', error);
    res.status(500).json({ error: 'Failed to create attachment upload URL' });
  }
});

router.post('/:identifier/attachments/complete', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const row = await findService(String(req.params.identifier));
    if (!row || !canReadService(req, row)) return res.status(404).json({ error: 'Service not found' });
    const objectKey = String(req.body.objectKey || '');
    const prefix = `products/service-attachments/${row.user_id || 'public'}/${row.id}/`;
    if (!objectKey.startsWith(prefix)) return res.status(400).json({ error: 'Invalid attachment key' });
    const attachments = Array.isArray(row.device_info?.attachments) ? [...row.device_info.attachments] : [];
    if (!attachments.some((item: any) => item.objectKey === objectKey)) {
      attachments.push({ objectKey, url: `${imageCdnUrl}/${objectKey}`, fileName: String(req.body.fileName || 'attachment'), contentType: String(req.body.contentType || '') });
    }
    await query(
      `UPDATE services SET device_info = COALESCE(device_info, '{}'::jsonb) || $1::jsonb, updated_at = NOW() WHERE id = $2`,
      [JSON.stringify({ attachments }), row.id]
    );
    res.json(serviceToResponse(await findService(row.service_number)));
  } catch (error) {
    console.error('Complete service attachment error:', error);
    res.status(500).json({ error: 'Failed to attach upload' });
  }
});

router.delete('/:identifier', authenticate, authorize('admin'), async (req: AuthRequest, res: Response) => {
  try {
    const row = await findService(String(req.params.identifier));
    if (!row) return res.status(404).json({ error: 'Service not found' });
    const attachments = Array.isArray(row.device_info?.attachments) ? row.device_info.attachments : [];
    await query('DELETE FROM services WHERE id = $1', [row.id]);
    if (imageBucket) {
      await Promise.all(attachments.map((item: any) => item.objectKey ? s3.send(new DeleteObjectCommand({ Bucket: imageBucket, Key: item.objectKey })).catch(() => {}) : Promise.resolve()));
    }
    res.json({ success: true, serviceNumber: row.service_number });
  } catch (error) {
    console.error('Delete service error:', error);
    res.status(500).json({ error: 'Failed to delete service' });
  }
});

export default router;
