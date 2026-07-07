import { Router, Request, Response } from 'express';
import { query } from '../config/database';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { validationResult, body, param } from 'express-validator';

const router = Router();

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
      `SELECT id, order_number, status, subtotal, tax_amount, shipping_amount,
              total_amount, payment_status, payment_method, created_at, updated_at
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
        status: o.status,
        subtotal: parseFloat(o.subtotal),
        taxAmount: parseFloat(o.tax_amount),
        shippingAmount: parseFloat(o.shipping_amount),
        totalAmount: parseFloat(o.total_amount),
        paymentStatus: o.payment_status,
        paymentMethod: o.payment_method,
        createdAt: o.created_at,
        updatedAt: o.updated_at
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

      const itemsResult = await query(
        `SELECT oi.*, p.name as product_name, p.image_url as product_image
         FROM order_items oi
         JOIN products p ON oi.product_id = p.id
         WHERE oi.order_id = $1`,
        [order.id]
      );

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
        items: itemsResult.rows.map(item => ({
          id: item.id,
          productId: item.product_id,
          productName: item.product_name,
          productImage: item.product_image,
          quantity: item.quantity,
          unitPrice: parseFloat(item.unit_price),
          totalPrice: parseFloat(item.total_price),
          specifications: item.specifications
        }))
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
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { items, shippingAddress, billingAddress, notes } = req.body;

      // Generate order number
      const orderNumber = `ORD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

      // Calculate totals
      let subtotal = 0;
      for (const item of items) {
        const product = await query(
          'SELECT id, price, stock_quantity FROM products WHERE id = $1 AND is_active = TRUE',
          [item.productId]
        );

        if (product.rows.length === 0) {
          return res.status(400).json({ error: `Product ${item.productId} not found` });
        }

        const p = product.rows[0];
        if (p.stock_quantity < item.quantity) {
          return res.status(400).json({ error: `Insufficient stock for ${p.name}` });
        }

        subtotal += parseFloat(p.price) * item.quantity;
      }

      const taxAmount = subtotal * 0.18; // 18% GST
      const shippingAmount = subtotal > 5000 ? 0 : 500; // Free shipping above 5000
      const totalAmount = subtotal + taxAmount + shippingAmount;

      // Create order
      const orderResult = await query(
        `INSERT INTO orders
         (order_number, user_id, status, subtotal, tax_amount, shipping_amount, total_amount,
          shipping_address, billing_address, notes)
         VALUES ($1, $2, 'placed', $3, $4, $5, $6, $7, $8, $9)
         RETURNING id, order_number, status, total_amount, created_at`,
        [orderNumber, req.user!.id, subtotal, taxAmount, shippingAmount, totalAmount,
         shippingAddress, billingAddress, notes]
      );

      const order = orderResult.rows[0];

      // Create order items and update stock
      for (const item of items) {
        const product = await query(
          'SELECT id, name, price FROM products WHERE id = $1',
          [item.productId]
        );

        const p = product.rows[0];

        await query(
          `INSERT INTO order_items (order_id, product_id, quantity, unit_price, total_price)
           VALUES ($1, $2, $3, $4, $5)`,
          [order.id, item.productId, item.quantity, p.price, parseFloat(p.price) * item.quantity]
        );

        // Update stock
        await query(
          'UPDATE products SET stock_quantity = stock_quantity - $1 WHERE id = $2',
          [item.quantity, item.productId]
        );
      }

      res.status(201).json({
        id: order.id,
        orderNumber: order.order_number,
        status: order.status,
        totalAmount: parseFloat(order.total_amount),
        createdAt: order.created_at
      });
    } catch (error) {
      console.error('Create order error:', error);
      res.status(500).json({ error: 'Failed to create order' });
    }
  }
);

// Update Order Status (Admin/Staff)
router.patch('/:id/status',
  authenticate,
  authorize('admin', 'staff'),
  [
    param('id').isUUID().withMessage('Invalid order ID'),
    body('status').isIn(['placed', 'verified', 'packing', 'shipped', 'delivered', 'cancelled', 'refunded'])
      .withMessage('Invalid status')
  ],
  async (req: AuthRequest, res: Response) => {
    try {
      const { id } = req.params;
      const { status } = req.body;

      const result = await query(
        'UPDATE orders SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *',
        [status, id]
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ error: 'Order not found' });
      }

      res.json({
        id: result.rows[0].id,
        orderNumber: result.rows[0].order_number,
        status: result.rows[0].status,
        updatedAt: result.rows[0].updated_at
      });
    } catch (error) {
      console.error('Update order error:', error);
      res.status(500).json({ error: 'Failed to update order' });
    }
  }
);

export default router;
