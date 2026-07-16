import { Router, Request, Response } from 'express';
import { getClient, query } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { validationResult, body, param } from 'express-validator';

const router = Router();

function normalizeDeliveryChargeStatus(value: unknown): 'FIXED' | 'MANUAL_QUOTE' {
  return value === 'MANUAL_QUOTE' ? 'MANUAL_QUOTE' : 'FIXED';
}

function parseMoney(value: unknown, fallback = 0): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function normalizeStoredItems(value: unknown): any[] {
  const items = Array.isArray(value) ? value : [];
  return items.map((item: any) => ({
    productId: item.productId,
    sku: item.sku,
    name: item.name || item.productName || 'Item',
    productName: item.name || item.productName || 'Item',
    productImage: item.img || item.productImage || '',
    quantity: Number(item.quantity || 0),
    unitPrice: parseMoney(item.unitPrice ?? item.price),
    totalPrice: parseMoney(item.totalPrice, parseMoney(item.unitPrice ?? item.price) * Number(item.quantity || 0)),
  }));
}

// Get My Orders
router.get('/my', authenticate, async (req: AuthRequest, res: Response) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const offset = (Number(page) - 1) * Number(limit);

    let whereClause = 'WHERE user_id = $1';
    const params: any[] = [req.user!.id];

    if (status) {
      whereClause += ' AND status = $2';
      params.push(status);
    }

    const ordersResult = await query(
      `SELECT id, order_number, user_id, status, subtotal, tax_amount, shipping_amount,
              total_amount, payment_status, payment_method, shipping_address, items, created_at, updated_at
       FROM orders
       ${whereClause}
       ORDER BY created_at DESC
       LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
      [...params, Number(limit), offset]
    );

    const countResult = await query(
      `SELECT COUNT(*) FROM orders ${whereClause}`,
      params
    );

    res.json({
      orders: ordersResult.rows.map(o => ({
        id: o.id,
        orderNumber: o.order_number,
        customerId: o.user_id,
        status: o.status,
        subtotal: parseFloat(o.subtotal),
        taxAmount: parseFloat(o.tax_amount),
        shippingAmount: parseFloat(o.shipping_amount),
        totalAmount: parseFloat(o.total_amount),
        paymentStatus: o.payment_status,
        paymentMethod: o.payment_method,
        shippingAddress: o.shipping_address,
        createdAt: o.created_at,
        updatedAt: o.updated_at,
        items: normalizeStoredItems(o.items),
      })),
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total: parseInt(countResult.rows[0].count),
        totalPages: Math.ceil(parseInt(countResult.rows[0].count) / Number(limit))
      }
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ error: 'Failed to fetch orders' });
  }
});

// Get All Orders (admin / staff only)
router.get('/',
  authenticate,
  authorize('admin', 'staff'),
  async (req: AuthRequest, res: Response) => {
    try {
      const { page = 1, limit = 20, status, search } = req.query;
      const offset = (Number(page) - 1) * Number(limit);

      const conditions: string[] = [];
      const params: any[] = [];
      if (status) {
        params.push(String(status));
        conditions.push(`o.status = $${params.length}`);
      }
      if (search) {
        params.push(`%${String(search)}%`);
        conditions.push(`(o.order_number ILIKE $${params.length} OR CAST(o.shipping_address AS text) ILIKE $${params.length})`);
      }
      const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

      const ordersResult = await query(
        `SELECT o.id, o.order_number, o.status, o.subtotal, o.tax_amount,
                o.shipping_amount, o.total_amount, o.payment_status, o.payment_method,
                o.shipping_address, o.items, o.created_at, o.updated_at, o.user_id,
                u.email AS user_email, u.first_name AS user_first_name, u.last_name AS user_last_name
         FROM orders o
         LEFT JOIN users u ON u.id = o.user_id
         ${whereClause}
         ORDER BY o.created_at DESC
         LIMIT $${params.length + 1} OFFSET $${params.length + 2}`,
        [...params, Number(limit), offset]
      );

      const countResult = await query(
        `SELECT COUNT(*) FROM orders o ${whereClause}`,
        params
      );

      res.json({
        orders: ordersResult.rows.map(o => ({
          id: o.id,
          orderNumber: o.order_number,
          customerId: o.user_id,
          status: o.status,
          subtotal: parseFloat(o.subtotal),
          taxAmount: parseFloat(o.tax_amount),
          shippingAmount: parseFloat(o.shipping_amount),
          totalAmount: parseFloat(o.total_amount),
          paymentStatus: o.payment_status,
          paymentMethod: o.payment_method,
          shippingAddress: o.shipping_address,
          createdAt: o.created_at,
          updatedAt: o.updated_at,
          user: o.user_id ? {
            id: o.user_id,
            email: o.user_email,
            firstName: o.user_first_name,
            lastName: o.user_last_name,
          } : null,
          customerName: [o.user_first_name, o.user_last_name].filter(Boolean).join(' ') || null,
          customerEmail: o.user_email,
          items: normalizeStoredItems(o.items),
        })),
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total: parseInt(countResult.rows[0].count),
          totalPages: Math.ceil(parseInt(countResult.rows[0].count) / Number(limit)),
        },
      });
    } catch (error) {
      console.error('List all orders error:', error);
      res.status(500).json({ error: 'Failed to fetch orders' });
    }
  }
);

// Get Order by Number (with full details)
router.get('/:orderNumber',
  authenticate,
  [
    param('orderNumber').notEmpty().withMessage('Order number is required')
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const { orderNumber } = req.params;

      const orderResult = await query(
        `SELECT * FROM orders WHERE order_number = $1 AND user_id = $2`,
        [orderNumber, req.user!.id]
      );

      if (orderResult.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const order = orderResult.rows[0];

      res.json({
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        subtotal: parseFloat(order.subtotal),
        taxAmount: parseFloat(order.tax_amount),
        shippingAmount: parseFloat(order.shipping_amount),
        discountAmount: parseFloat(order.discount_amount),
        totalAmount: parseFloat(order.total_amount),
        paymentStatus: order.payment_status,
        paymentMethod: order.payment_method,
        shippingAddress: order.shipping_address,
        billingAddress: order.billing_address,
        notes: order.notes,
        createdAt: order.created_at,
        updatedAt: order.updated_at,
        items: normalizeStoredItems(order.items),
      });
    } catch (error) {
      console.error('Get order error:', error);
      res.status(500).json({ error: 'Failed to fetch order' });
    }
  }
);

// Create Order
router.post('/',
  authenticate,
  [
    body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
    body('items.*.productId').isUUID().withMessage('Invalid product ID'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
    body('shippingAddress.line1').notEmpty().withMessage('Shipping address line 1 is required'),
    body('shippingAddress.city').notEmpty().withMessage('City is required'),
    body('shippingAddress.state').notEmpty().withMessage('State is required'),
    body('shippingAddress.postalCode').notEmpty().withMessage('Postal code is required'),
    body('shippingAddress.country').notEmpty().withMessage('Country is required')
  ],
  async (req: AuthRequest, res: Response) => {
    const client = await getClient();
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { items, shippingAddress, billingAddress, notes } = req.body;
      await client.query('BEGIN');

      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // Calculate totals
      let subtotal = 0;
      const storedItems: any[] = [];
      for (const item of items) {
        const product = await client.query(
          'SELECT id, sku, name, price, stock_quantity, image_url FROM products WHERE id = $1 AND is_active = TRUE FOR UPDATE',
          [item.productId]
        );

        if (product.rows.length === 0) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `Product ${item.productId} not found` });
        }

        const p = product.rows[0];
        if (p.stock_quantity < item.quantity) {
          await client.query('ROLLBACK');
          return res.status(400).json({ error: `Insufficient stock for ${p.name}` });
        }

        subtotal += parseFloat(p.price) * item.quantity;
        storedItems.push({
          productId: p.id,
          sku: p.sku,
          name: p.name,
          quantity: item.quantity,
          unitPrice: parseMoney(p.price),
          totalPrice: parseMoney(p.price) * item.quantity,
          img: p.image_url || item.img || '',
        });
      }

      const deliveryChargeStatus = normalizeDeliveryChargeStatus(req.body.deliveryChargeStatus || shippingAddress?.deliveryChargeStatus);
      const requestedDeliveryCharge = req.body.deliveryCharge ?? shippingAddress?.deliveryCharge;
      const shippingAmount = deliveryChargeStatus === 'MANUAL_QUOTE'
        ? 0
        : Math.max(0, parseMoney(requestedDeliveryCharge, subtotal > 5000 ? 0 : 500));
      const deliveryZone = req.body.deliveryZone || shippingAddress?.deliveryZone || (req.body.deliveryMethod === 'pickup' ? 'STORE_PICKUP' : 'SAME_CITY');
      const productSizeCategory = req.body.productSizeCategory || shippingAddress?.productSizeCategory || 'SMALL';
      const deliveryNote = req.body.deliveryNote || shippingAddress?.deliveryNote || (
        deliveryChargeStatus === 'MANUAL_QUOTE'
          ? 'Final delivery charge will be confirmed by admin after packaging and courier check.'
          : 'Delivery charge calculated successfully.'
      );
      const enrichedShippingAddress = {
        ...shippingAddress,
        deliveryMethod: req.body.deliveryMethod || shippingAddress?.deliveryMethod || (deliveryZone === 'STORE_PICKUP' ? 'pickup' : 'ship'),
        deliveryZone,
        productSizeCategory,
        deliveryCharge: deliveryChargeStatus === 'MANUAL_QUOTE' ? null : shippingAmount,
        deliveryChargeStatus,
        deliveryNote,
        estimatedDeliveryTime: req.body.estimatedDeliveryTime || shippingAddress?.estimatedDeliveryTime || null,
      };
      const taxAmount = subtotal * 0.18; // 18% GST
      const totalAmount = subtotal + taxAmount + shippingAmount;

      // Create order. The live `orders` table requires `customer_name`/`email`/`phone`
      // (NOT NULL) and has no `billing_address` column — billing info rides in `notes`.
      const custName = (shippingAddress && (shippingAddress as any).name)
        || (req.user as any)?.email
        || 'Customer';
      const custEmail = (shippingAddress && (shippingAddress as any).email) || null;
      const custPhone = (shippingAddress && (shippingAddress as any).phone) || null;
      const mergedNotes = notes
        ? `${notes}\nBilling: ${JSON.stringify(billingAddress || null)}`
        : `Billing: ${JSON.stringify(billingAddress || null)}`;
      const orderResult = await client.query(
        `INSERT INTO orders
         (order_number, user_id, customer_name, customer_email, customer_phone,
          status, subtotal, tax_amount, shipping_amount, total_amount,
          shipping_address, items, notes)
         VALUES ($1, $2, $3, $4, $5, 'placed', $6, $7, $8, $9, $10, $11, $12)
         RETURNING id, order_number, status, total_amount, created_at`,
        [orderNumber, req.user!.id, custName, custEmail, custPhone,
         subtotal, taxAmount, shippingAmount, totalAmount,
         enrichedShippingAddress, JSON.stringify(storedItems), mergedNotes]
      );

      const order = orderResult.rows[0];

      // Reserve stock in the same transaction as the order.
      for (const item of storedItems) {
        await client.query(
          'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
          [item.quantity, item.productId]
        );
      }

      // Home-delivery orders create a shared delivery workflow record in the
      // same transaction. Admin/staff delivery dashboards hydrate this record
      // from PostgreSQL and delivery status changes sync back to the order.
      if (enrichedShippingAddress.deliveryMethod === 'ship') {
        const deliveryNumber = `DLV-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;
        await client.query(
          `INSERT INTO services
           (service_number, user_id, service_type, status, title, description, device_info)
           VALUES ($1, $2, 'delivery', 'submitted', $3, $4, $5)`,
          [
            deliveryNumber,
            req.user!.id,
            `Delivery for ${orderNumber}`,
            `Order delivery workflow for ${orderNumber}`,
            JSON.stringify({
              orderNumber,
              customerName: custName,
              customerEmail: custEmail,
              customerPhone: custPhone,
              address: enrichedShippingAddress,
              deliveryMethod: enrichedShippingAddress.deliveryMethod,
            }),
          ]
        );
      }

      await client.query('COMMIT');

      res.status(201).json({
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        totalAmount: parseFloat(order.total_amount),
        shippingAmount,
        shippingAddress: enrichedShippingAddress,
        createdAt: order.created_at
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('Create order error:', error);
      res.status(500).json({ error: 'Failed to create order' });
    } finally {
      client.release();
    }
  }
);

// Confirm manual delivery charge (Admin/Staff)
router.patch('/:id/delivery-charge',
  authenticate,
  authorize('admin', 'staff'),
  [
    param('id').notEmpty().withMessage('Order ID or number is required'),
    body('deliveryCharge').isFloat({ min: 0 }).withMessage('Delivery charge must be 0 or more')
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const deliveryCharge = Math.max(0, parseMoney(req.body.deliveryCharge));

      const existingResult = await query(
        `SELECT id, order_number, subtotal, tax_amount, discount_amount, shipping_address
           FROM orders
          WHERE id::text = $1 OR order_number = $1`,
        [id]
      );

      if (existingResult.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }

      const existing = existingResult.rows[0];
      const subtotal = parseMoney(existing.subtotal);
      const taxAmount = parseMoney(existing.tax_amount);
      const discountAmount = parseMoney(existing.discount_amount);
      const totalAmount = subtotal - discountAmount + taxAmount + deliveryCharge;
      const shippingAddress = {
        ...(existing.shipping_address || {}),
        deliveryCharge,
        deliveryChargeStatus: 'FIXED',
        deliveryNote: 'Delivery charge confirmed by admin.',
      };

      const result = await query(
        `UPDATE orders
            SET shipping_amount = $1,
                total_amount = $2,
                shipping_address = $3,
                updated_at = NOW()
          WHERE id = $4
          RETURNING id, order_number, shipping_amount, total_amount, shipping_address, updated_at`,
        [deliveryCharge, totalAmount, shippingAddress, existing.id]
      );

      const order = result.rows[0];
      res.json({
        id: order.id,
        orderNumber: order.order_number,
        shippingAmount: parseFloat(order.shipping_amount),
        totalAmount: parseFloat(order.total_amount),
        shippingAddress: order.shipping_address,
        updatedAt: order.updated_at,
      });
    } catch (error) {
      console.error('Update delivery charge error:', error);
      res.status(500).json({ error: 'Failed to update delivery charge' });
    }
  }
);

// Update Order Status (Admin/Staff)
router.patch('/:id/status',
  authenticate,
  [
    // Accept either a UUID (orders.id) or the human-friendly order number
    // (orders.order_number). The frontend carries the orderNumber as the
    // primary key on hydrated rows (see apiOrderToFrontend in apiTypes.ts),
    // so allowing it here keeps the admin status dropdown working without
    // forcing a second round-trip to resolve the UUID.
    param('id').notEmpty().withMessage('Order ID or number is required'),
    body('status').isIn(['placed', 'verified', 'packing', 'shipped', 'delivered', 'cancelled', 'refunded'])
      .withMessage('Invalid status')
  ],
  async (req: AuthRequest, res: Response) => {
    const client = await getClient();
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { id } = req.params;
      const { status } = req.body;

      await client.query('BEGIN');
      const existing = await client.query(
        `SELECT id, order_number, user_id, status, items FROM orders
          WHERE id::text = $1 OR order_number = $1
          FOR UPDATE`,
        [id]
      );
      if (existing.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: 'Order not found' });
      }

      const current = existing.rows[0];
      if (req.user!.role === 'customer') {
        if (String(current.user_id) !== String(req.user!.id)) {
          await client.query('ROLLBACK');
          return res.status(403).json({ error: 'You can only update your own orders' });
        }
        if (status !== 'cancelled' || !['placed', 'verified'].includes(current.status)) {
          await client.query('ROLLBACK');
          return res.status(403).json({ error: 'Customers can only cancel placed or verified orders' });
        }
      } else if (!['admin', 'staff'].includes(req.user!.role)) {
        await client.query('ROLLBACK');
        return res.status(403).json({ error: 'Insufficient permissions' });
      }

      const result = await client.query(
        `UPDATE orders
            SET status = $1, updated_at = NOW()
          WHERE id::text = $2 OR order_number = $2
          RETURNING *`,
        [status, id]
      );

      // Restore reserved stock exactly once when an order is cancelled.
      if (status === 'cancelled' && current.status !== 'cancelled') {
        await client.query(
          `UPDATE products p
              SET stock_quantity = p.stock_quantity + restored.quantity
             FROM (
               SELECT (entry->>'productId')::uuid AS product_id,
                      SUM((entry->>'quantity')::int)::int AS quantity
                 FROM jsonb_array_elements($1::jsonb) entry
                GROUP BY (entry->>'productId')::uuid
             ) restored
            WHERE p.id = restored.product_id`,
          [JSON.stringify(current.items || [])]
        );
      }

      await client.query('COMMIT');

      res.json({
        id: result.rows[0].id,
        orderNumber: result.rows[0].order_number,
        status: result.rows[0].status,
        updatedAt: result.rows[0].updated_at
      });
    } catch (error) {
      await client.query('ROLLBACK').catch(() => {});
      console.error('Update order error:', error);
      res.status(500).json({ error: 'Failed to update order' });
    } finally {
      client.release();
    }
  }
);

export default router;
