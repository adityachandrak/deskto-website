import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { validationResult, body, param } from 'express-validator';

const router = Router();

function serviceToResponse(s: any) {
  const deviceInfo = s.device_info || {};
  return {
    id: s.id,
    serviceNumber: s.service_number,
    serviceType: s.service_type,
    status: s.status,
    title: s.title,
    description: s.description,
    deviceInfo,
    customerName: s.customer_name || deviceInfo.customerName || deviceInfo.name || null,
    customerEmail: s.customer_email || deviceInfo.customerEmail || deviceInfo.email || null,
    customerPhone: s.customer_phone || deviceInfo.customerPhone || deviceInfo.phone || deviceInfo.contact || null,
    estimatedCost: s.estimated_cost ? parseFloat(s.estimated_cost) : null,
    finalCost: s.final_cost ? parseFloat(s.final_cost) : null,
    technicianId: s.technician_id,
    createdAt: s.created_at,
    updatedAt: s.updated_at
  };
}

// Public quick enquiry from homepage contact form. This intentionally does not
// require authentication because first-time visitors use it before signing in.
router.post('/quick-enquiry',
  [
    body('name').trim().isLength({ min: 2 }).withMessage('Name is required'),
    body('contact').trim().isLength({ min: 5 }).withMessage('Phone or email is required'),
    body('serviceNeeded').trim().isLength({ min: 2 }).withMessage('Service needed is required'),
    body('requirements').optional().isString()
  ],
  async (req: Request, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const name = String(req.body.name || '').trim();
      const contact = String(req.body.contact || '').trim();
      const serviceNeeded = String(req.body.serviceNeeded || '').trim();
      const requirements = String(req.body.requirements || '').trim();
      const serviceNumber = `ENQ-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
      const hasEmail = contact.includes('@');
      const deviceInfo = {
        source: 'homepage-quick-enquiry',
        customerName: name,
        contact,
        customerEmail: hasEmail ? contact : undefined,
        customerPhone: hasEmail ? undefined : contact,
        serviceNeeded
      };

      const result = await query(
        `INSERT INTO services
         (service_number, user_id, service_type, status, title, description, device_info)
         VALUES ($1, NULL, 'support', 'submitted', $2, $3, $4)
         RETURNING *`,
        [serviceNumber, `Quick Enquiry: ${serviceNeeded}`, requirements || serviceNeeded, deviceInfo]
      );

      res.status(201).json(serviceToResponse(result.rows[0]));
    } catch (error) {
      console.error('Quick enquiry error:', error);
      res.status(500).json({ error: 'Failed to submit enquiry' });
    }
  }
);

// Get My Services
router.get('/my', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, status, serviceType } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE user_id = $1';
    const params: any[] = [req.user!.id];
    let paramIndex = 2;

    if (status) {
      whereClause += ` AND status = $${paramIndex}`;
      params.push(status);
      paramIndex++;
    }

    if (serviceType) {
      whereClause += ` AND service_type = $${paramIndex}`;
      params.push(serviceType);
      paramIndex++;
    }

    const servicesResult = await query(
      `SELECT id, service_number, service_type, status, title, description,
              estimated_cost, final_cost, created_at, updated_at
       FROM services
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
      [...params, Number(limit), offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM services ${whereClause}`,
      params
    );

    res.json({
      services: servicesResult.rows.map(serviceToResponse),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get services error:', error);
    res.status(500).json({ error: 'Failed to fetch services' });
  }
});

// Admin/Staff: list all services and public enquiries.
router.get('/',
  authenticate,
  authorize('admin', 'staff'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { page = 1, limit = 20, status, serviceType } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      let whereClause = '';
      const params: any[] = [];
      let paramIndex = 1;

      if (status) {
        whereClause += `${whereClause ? ' AND' : 'WHERE'} s.status = $${paramIndex}`;
        params.push(status);
        paramIndex++;
      }

      if (serviceType) {
        whereClause += `${whereClause ? ' AND' : 'WHERE'} s.service_type = $${paramIndex}`;
        params.push(serviceType);
        paramIndex++;
      }

      const servicesResult = await query(
        `SELECT s.*, u.first_name || COALESCE(' ' || u.last_name, '') AS customer_name,
                u.email AS customer_email, u.phone AS customer_phone
         FROM services s
         LEFT JOIN users u ON u.id = s.user_id
         ${whereClause}
         ORDER BY s.created_at DESC
         LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`,
        [...params, Number(limit), offset]
      );

      const countResult = await query(
        `SELECT COUNT(*) FROM services s ${whereClause}`,
        params
      );

      res.json({
        services: servicesResult.rows.map(serviceToResponse),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: parseInt(countResult.rows[0].count),
          totalPages: Math.ceil(parseInt(countResult.rows[0].count) / Number(limit))
        }
      });
    } catch (error) {
      console.error('Get all services error:', error);
      res.status(500).json({ error: 'Failed to fetch services' });
    }
  }
);

// Get Service by Number
router.get('/:serviceNumber',
  authenticate,
  [
    param('serviceNumber').notEmpty().withMessage('Service number is required')
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const { serviceNumber } = req.params;
      const isAdminOrStaff = req.user!.role === 'admin' || req.user!.role === 'staff';

      let queryText = 'SELECT * FROM services WHERE service_number = $1';
      const queryParams: any[] = [serviceNumber];

      // Non-admin users can only see their own services
      if (!isAdminOrStaff) {
        queryText += ' AND user_id = $2';
        queryParams.push(req.user!.id);
      }

      const result = await query(queryText, queryParams);

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Service not found' });
      }

      const s = result.rows[0];
      res.json(serviceToResponse(s));
    } catch (error) {
      console.error('Get service error:', error);
      res.status(500).json({ error: 'Failed to fetch service' });
    }
  }
);

// Create Service Request
router.post('/',
  authenticate,
  [
    body('serviceType').isIn(['repair', 'upgrade', 'rental', 'assembly', 'support'])
      .withMessage('Invalid service type'),
    body('title').notEmpty().withMessage('Title is required'),
    body('description').optional().isString()
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { serviceType, title, description, deviceInfo } = req.body;

      const serviceNumber = `SRV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      const result = await query(
        `INSERT INTO services
         (service_number, user_id, service_type, status, title, description, device_info)
         VALUES ($1, $2, $3, 'submitted', $4, $5, $6)
         RETURNING id, service_number, service_type, status, title, created_at`,
        [serviceNumber, req.user!.id, serviceType, title, description, deviceInfo]
      );

      const s = result.rows[0];
      res.status(201).json({
        id: s.id,
        serviceNumber: s.service_number,
        serviceType: s.service_type,
        status: s.status,
        title: s.title,
        createdAt: s.created_at
      });
    } catch (error) {
      console.error('Create service error:', error);
      res.status(500).json({ error: 'Failed to create service' });
    }
  }
);

// Update Service Status (Admin/Staff)
router.patch('/:id/status',
  authenticate,
  authorize('admin', 'staff'),
  [
    param('id').isUUID().withMessage('Invalid service ID'),
    body('status').isIn([
      'submitted', 'received', 'admin-approved', 'rejected', 'assigned',
      'diagnosing', 'quotation', 'quote-approved', 'in-repair', 'qc',
      'completed', 'delivered'
    ]).withMessage('Invalid status')
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status, estimatedCost, finalCost, technicianId } = req.body;

      const updates: string[] = ['status = $1'];
      const values: any[] = [status];
      let paramIndex = 2;

      if (estimatedCost !== undefined) {
        updates.push(`estimated_cost = $${paramIndex}`);
        values.push(estimatedCost);
        paramIndex++;
      }

      if (finalCost !== undefined) {
        updates.push(`final_cost = $${paramIndex}`);
        values.push(finalCost);
        paramIndex++;
      }

      if (technicianId !== undefined) {
        updates.push(`technician_id = $${paramIndex}`);
        values.push(technicianId);
        paramIndex++;
      }

      values.push(id);

      const result = await query(
        `UPDATE services SET ${updates.join(', ')}, updated_at = NOW()
         WHERE id = $${paramIndex}
         RETURNING *`,
        values
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Service not found' });
      }

      const s = result.rows[0];
      res.json({
        id: s.id,
        serviceNumber: s.service_number,
        status: s.status,
        estimatedCost: s.estimated_cost ? parseFloat(s.estimated_cost) : null,
        finalCost: s.final_cost ? parseFloat(s.final_cost) : null,
        updatedAt: s.updated_at
      });
    } catch (error) {
      console.error('Update service error:', error);
      res.status(500).json({ error: 'Failed to update service' });
    }
  }
);

export default router;
