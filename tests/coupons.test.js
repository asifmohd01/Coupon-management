const request = require('supertest');
const app = require('../server');
const router = require('../routes/coupons');

describe('Coupon Management API Tests', () => {
  // Clear coupons and usage before each test
  beforeEach(() => {
    const coupons = router.getCoupons();
    const userUsage = router.getUserUsage();
    coupons.clear();
    userUsage.clear();
  });

  describe('POST /coupons - Create Coupon', () => {
    const validCoupon = {
      code: 'TEST100',
      description: 'Test coupon',
      discountType: 'FLAT',
      discountValue: 100,
      startDate: '2025-01-01T00:00:00Z',
      endDate: '2025-12-31T23:59:59Z',
      eligibility: {}
    };

    test('should create a valid coupon', async () => {
      const res = await request(app)
        .post('/coupons')
        .send(validCoupon)
        .expect(201);

      expect(res.body.message).toBe('Coupon created successfully');
      expect(res.body.coupon.code).toBe('TEST100');
    });

    test('should reject empty code', async () => {
      const res = await request(app)
        .post('/coupons')
        .send({ ...validCoupon, code: '   ' })
        .expect(400);

      expect(res.body.error).toBe('Validation failed');
      expect(res.body.details.some(d => d.includes('code cannot be empty') || d.includes('code is required'))).toBe(true);
    });

    test('should reject invalid discountType', async () => {
      const res = await request(app)
        .post('/coupons')
        .send({ ...validCoupon, discountType: 'INVALID' })
        .expect(400);

      expect(res.body.details).toContain('discountType is required and must be "FLAT" or "PERCENT"');
    });

    test('should reject negative discountValue', async () => {
      const res = await request(app)
        .post('/coupons')
        .send({ ...validCoupon, discountValue: -10 })
        .expect(400);

      expect(res.body.details).toContain('discountValue is required and must be a positive number');
    });

    test('should reject malformed date', async () => {
      const res = await request(app)
        .post('/coupons')
        .send({ ...validCoupon, startDate: 'invalid-date' })
        .expect(400);

      expect(res.body.details.some(d => d.includes('startDate'))).toBe(true);
    });

    test('should reject negative values in eligibility', async () => {
      const res = await request(app)
        .post('/coupons')
        .send({
          ...validCoupon,
          eligibility: { minCartValue: -100 }
        })
        .expect(400);

      expect(res.body.details).toContain('eligibility.minCartValue must be a non-negative number if provided');
    });

    test('should normalize categories to lowercase', async () => {
      const couponWithCategories = {
        ...validCoupon,
        code: 'CATEGORY_TEST',
        eligibility: {
          applicableCategories: ['ELECTRONICS', 'Fashion']
        }
      };

      await request(app)
        .post('/coupons')
        .send(couponWithCategories)
        .expect(201);

      const coupons = router.getCoupons();
      const coupon = coupons.get('CATEGORY_TEST');
      expect(coupon.eligibility.applicableCategories).toEqual(['electronics', 'fashion']);
    });
  });

  describe('GET /coupons - List All Coupons', () => {
    test('should return empty array when no coupons', async () => {
      const res = await request(app)
        .get('/coupons')
        .expect(200);

      expect(res.body.count).toBe(0);
      expect(res.body.coupons).toEqual([]);
    });

    test('should return all coupons', async () => {
      // Create test coupons
      const coupon1 = {
        code: 'COUPON1',
        description: 'First coupon',
        discountType: 'FLAT',
        discountValue: 50,
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2025-12-31T23:59:59Z',
        eligibility: {}
      };

      const coupon2 = {
        code: 'COUPON2',
        description: 'Second coupon',
        discountType: 'PERCENT',
        discountValue: 10,
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2025-12-31T23:59:59Z',
        eligibility: {}
      };

      await request(app).post('/coupons').send(coupon1);
      await request(app).post('/coupons').send(coupon2);

      const res = await request(app)
        .get('/coupons')
        .expect(200);

      expect(res.body.count).toBe(2);
      expect(res.body.coupons).toHaveLength(2);
    });
  });

  describe('POST /coupons/best - Best Coupon Selection', () => {
    const userContext = {
      userId: 'u123',
      userTier: 'NEW',
      country: 'IN',
      lifetimeSpend: 1000,
      ordersPlaced: 1
    };

    const cart = {
      items: [
        {
          productId: 'p1',
          category: 'electronics',
          unitPrice: 1000,
          quantity: 1
        }
      ]
    };

    test('should return null when no coupons match', async () => {
      const res = await request(app)
        .post('/coupons/best')
        .send({ userContext, cart })
        .expect(200);

      expect(res.body.coupon).toBeNull();
      expect(res.body.discount).toBe(0);
    });

    test('should select best coupon by highest discount', async () => {
      // Create coupons with different discounts
      const coupon1 = {
        code: 'FLAT50',
        description: 'Flat 50',
        discountType: 'FLAT',
        discountValue: 50,
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2025-12-31T23:59:59Z',
        eligibility: {}
      };

      const coupon2 = {
        code: 'FLAT100',
        description: 'Flat 100',
        discountType: 'FLAT',
        discountValue: 100,
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2025-12-31T23:59:59Z',
        eligibility: {}
      };

      await request(app).post('/coupons').send(coupon1);
      await request(app).post('/coupons').send(coupon2);

      const res = await request(app)
        .post('/coupons/best')
        .send({ userContext, cart })
        .expect(200);

      expect(res.body.coupon.code).toBe('FLAT100');
      expect(res.body.discount).toBe(100);
    });

    test('should handle tie-breaking by earliest endDate', async () => {
      const coupon1 = {
        code: 'COUPON_A',
        description: 'Coupon A',
        discountType: 'FLAT',
        discountValue: 100,
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2026-12-31T23:59:59Z',
        eligibility: {}
      };

      const coupon2 = {
        code: 'COUPON_B',
        description: 'Coupon B',
        discountType: 'FLAT',
        discountValue: 100,
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2026-06-30T23:59:59Z', // Earlier end date
        eligibility: {}
      };

      await request(app).post('/coupons').send(coupon1);
      await request(app).post('/coupons').send(coupon2);

      const res = await request(app)
        .post('/coupons/best')
        .send({ userContext, cart })
        .expect(200);

      expect(res.body.coupon.code).toBe('COUPON_B'); // Earlier end date wins
    });

    test('should handle tie-breaking by lexicographically smallest code', async () => {
      const coupon1 = {
        code: 'Z_COUPON',
        description: 'Z Coupon',
        discountType: 'FLAT',
        discountValue: 100,
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2025-12-31T23:59:59Z',
        eligibility: {}
      };

      const coupon2 = {
        code: 'A_COUPON',
        description: 'A Coupon',
        discountType: 'FLAT',
        discountValue: 100,
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2025-12-31T23:59:59Z',
        eligibility: {}
      };

      await request(app).post('/coupons').send(coupon1);
      await request(app).post('/coupons').send(coupon2);

      const res = await request(app)
        .post('/coupons/best')
        .send({ userContext, cart })
        .expect(200);

      expect(res.body.coupon.code).toBe('A_COUPON'); // Lexicographically smaller
    });

    test('should filter by date validity', async () => {
      const expiredCoupon = {
        code: 'EXPIRED',
        description: 'Expired coupon',
        discountType: 'FLAT',
        discountValue: 100,
        startDate: '2023-01-01T00:00:00Z',
        endDate: '2023-12-31T23:59:59Z', // Expired
        eligibility: {}
      };

      const validCoupon = {
        code: 'VALID',
        description: 'Valid coupon',
        discountType: 'FLAT',
        discountValue: 50,
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2025-12-31T23:59:59Z',
        eligibility: {}
      };

      await request(app).post('/coupons').send(expiredCoupon);
      await request(app).post('/coupons').send(validCoupon);

      const res = await request(app)
        .post('/coupons/best')
        .send({ userContext, cart })
        .expect(200);

      expect(res.body.coupon.code).toBe('VALID');
    });

    test('should filter by usage limit', async () => {
      const limitedCoupon = {
        code: 'LIMITED',
        description: 'Limited use coupon',
        discountType: 'FLAT',
        discountValue: 100,
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2025-12-31T23:59:59Z',
        usageLimitPerUser: 1,
        eligibility: {}
      };

      await request(app).post('/coupons').send(limitedCoupon);

      // First use - should work
      const res1 = await request(app)
        .post('/coupons/best')
        .send({ userContext, cart })
        .expect(200);

      expect(res1.body.coupon.code).toBe('LIMITED');

      // Second use - should be blocked
      const res2 = await request(app)
        .post('/coupons/best')
        .send({ userContext, cart })
        .expect(200);

      expect(res2.body.coupon).toBeNull();
    });

    test('should check eligibility rules', async () => {
      const tierRestrictedCoupon = {
        code: 'TIER_ONLY',
        description: 'Tier restricted',
        discountType: 'FLAT',
        discountValue: 100,
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2025-12-31T23:59:59Z',
        eligibility: {
          allowedUserTiers: ['GOLD'] // User is NEW, so should not match
        }
      };

      await request(app).post('/coupons').send(tierRestrictedCoupon);

      const res = await request(app)
        .post('/coupons/best')
        .send({ userContext, cart })
        .expect(200);

      expect(res.body.coupon).toBeNull();
    });

    test('should calculate percentage discount correctly', async () => {
      const percentCoupon = {
        code: 'PERCENT10',
        description: '10% off',
        discountType: 'PERCENT',
        discountValue: 10,
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2025-12-31T23:59:59Z',
        eligibility: {}
      };

      await request(app).post('/coupons').send(percentCoupon);

      const res = await request(app)
        .post('/coupons/best')
        .send({ userContext, cart })
        .expect(200);

      expect(res.body.coupon.code).toBe('PERCENT10');
      expect(res.body.discount).toBe(100); // 10% of 1000
    });

    test('should cap percentage discount at maxDiscountAmount', async () => {
      const cappedCoupon = {
        code: 'CAPPED',
        description: 'Capped 20%',
        discountType: 'PERCENT',
        discountValue: 20,
        maxDiscountAmount: 150,
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2025-12-31T23:59:59Z',
        eligibility: {}
      };

      await request(app).post('/coupons').send(cappedCoupon);

      const largeCart = {
        items: [
          {
            productId: 'p1',
            category: 'electronics',
            unitPrice: 2000, // 20% would be 400, but capped at 150
            quantity: 1
          }
        ]
      };

      const res = await request(app)
        .post('/coupons/best')
        .send({ userContext, cart: largeCart })
        .expect(200);

      expect(res.body.coupon.code).toBe('CAPPED');
      expect(res.body.discount).toBe(150); // Capped, not 400
    });

    test('should handle category normalization', async () => {
      const categoryCoupon = {
        code: 'CATEGORY',
        description: 'Category coupon',
        discountType: 'FLAT',
        discountValue: 100,
        startDate: '2025-01-01T00:00:00Z',
        endDate: '2025-12-31T23:59:59Z',
        eligibility: {
          applicableCategories: ['ELECTRONICS'] // Uppercase in coupon
        }
      };

      await request(app).post('/coupons').send(categoryCoupon);

      const res = await request(app)
        .post('/coupons/best')
        .send({ userContext, cart }) // cart has 'electronics' (lowercase)
        .expect(200);

      expect(res.body.coupon.code).toBe('CATEGORY'); // Should match despite case difference
    });
  });

  describe('GET /health', () => {
    test('should return health status', async () => {
      const res = await request(app)
        .get('/health')
        .expect(200);

      expect(res.body.status).toBe('ok');
    });
  });
});

