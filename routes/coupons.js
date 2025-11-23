const express = require('express');
const router = express.Router();
const Coupon = require('../models/coupon');
const DiscountService = require('../services/discountService');
const EligibilityService = require('../services/eligibilityService');
const Logger = require('../utils/logger');

// In-memory storage
const coupons = new Map();

// Track user usage: Map<userId, Map<couponCode, count>>
const userUsage = new Map();

// Helper function to increment usage
function incrementUsage(userId, couponCode) {
  if (!userUsage.has(userId)) {
    userUsage.set(userId, new Map());
  }
  const userCouponUsage = userUsage.get(userId);
  const currentCount = userCouponUsage.get(couponCode) || 0;
  userCouponUsage.set(couponCode, currentCount + 1);
  Logger.info(`Incremented usage for user ${userId}, coupon ${couponCode}`, {
    userId,
    couponCode,
    newCount: currentCount + 1
  });
}

// GET /coupons - List all coupons (for testing)
router.get('/', (req, res) => {
  try {
    const couponList = Array.from(coupons.values());
    Logger.info('Retrieved all coupons', { count: couponList.length });
    res.json({
      count: couponList.length,
      coupons: couponList
    });
  } catch (error) {
    Logger.error('Error retrieving coupons', { error: error.message });
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// POST /coupons - Create a new coupon
router.post('/', (req, res) => {
  try {
    const couponData = req.body;

    // Validate coupon
    const validationErrors = Coupon.validate(couponData);
    if (validationErrors.length > 0) {
      Logger.warn('Coupon validation failed', { 
        code: couponData.code, 
        errors: validationErrors 
      });
      return res.status(400).json({
        error: 'Validation failed',
        details: validationErrors
      });
    }

    // Check if code already exists
    const isOverwrite = coupons.has(couponData.code);
    if (isOverwrite) {
      Logger.warn(`Overwriting existing coupon with code: ${couponData.code}`);
    }

    // Create and store coupon
    const coupon = new Coupon(couponData);
    coupons.set(coupon.code, coupon);

    Logger.info('Coupon created successfully', {
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      wasOverwrite: isOverwrite
    });

    res.status(201).json({
      message: 'Coupon created successfully',
      coupon: coupon
    });
  } catch (error) {
    Logger.error('Error creating coupon', { error: error.message });
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// POST /coupons/best - Find the best coupon for user and cart
router.post('/best', (req, res) => {
  try {
    const { userContext, cart } = req.body;

    Logger.info('Finding best coupon', {
      userId: userContext?.userId,
      cartItemCount: cart?.items?.length
    });

    // Validate input
    if (!userContext) {
      return res.status(400).json({
        error: 'userContext is required'
      });
    }

    if (!cart || !cart.items || !Array.isArray(cart.items)) {
      return res.status(400).json({
        error: 'cart with items array is required'
      });
    }

    // Validate userContext fields
    if (!userContext.userId || !userContext.userTier || !userContext.country) {
      return res.status(400).json({
        error: 'userContext must include userId, userTier, and country'
      });
    }

    // Validate cart items
    for (const item of cart.items) {
      if (!item.productId || !item.category || 
          typeof item.unitPrice !== 'number' || 
          typeof item.quantity !== 'number') {
        return res.status(400).json({
          error: 'Each cart item must have productId, category, unitPrice (number), and quantity (number)'
        });
      }
    }

    // Check usage limits and date validity
    const now = new Date();
    const activeCoupons = [];
    
    Logger.debug(`Evaluating ${coupons.size} coupons for date and usage limits`);
    
    for (const coupon of coupons.values()) {
      const startDate = new Date(coupon.startDate);
      const endDate = new Date(coupon.endDate);

      // Check date range
      if (now >= startDate && now <= endDate) {
        // Check usage limit per user
        if (coupon.usageLimitPerUser !== null && coupon.usageLimitPerUser !== undefined) {
          const userCouponUsage = userUsage.get(userContext.userId) || new Map();
          const usageCount = userCouponUsage.get(coupon.code) || 0;
          
          if (usageCount >= coupon.usageLimitPerUser) {
            Logger.debug(`Coupon ${coupon.code} skipped: usage limit exceeded`, {
              couponCode: coupon.code,
              userId: userContext.userId,
              usageCount,
              limit: coupon.usageLimitPerUser
            });
            continue; // Skip this coupon, usage limit exceeded
          }
        }
        activeCoupons.push(coupon);
      } else {
        Logger.debug(`Coupon ${coupon.code} skipped: outside date range`, {
          couponCode: coupon.code,
          now: now.toISOString(),
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        });
      }
    }

    Logger.debug(`Found ${activeCoupons.length} coupons within date range and usage limits`);

    // Filter by eligibility
    const eligibleCoupons = activeCoupons.filter(coupon => {
      const isEligible = EligibilityService.checkEligibility(coupon, userContext, cart);
      if (isEligible) {
        Logger.debug(`Coupon ${coupon.code} is eligible`);
      }
      return isEligible;
    });

    Logger.debug(`Found ${eligibleCoupons.length} eligible coupons after eligibility checks`);

    if (eligibleCoupons.length === 0) {
      Logger.info('No eligible coupons found', { userId: userContext.userId });
      return res.json({
        coupon: null,
        discount: 0
      });
    }

    // Calculate discounts and find best
    const couponsWithDiscounts = eligibleCoupons.map(coupon => {
      const discount = DiscountService.calculateDiscount(coupon, cart);
      Logger.debug(`Coupon ${coupon.code} discount calculated`, {
        couponCode: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        calculatedDiscount: discount
      });
      return { coupon, discount };
    });

    // Sort: highest discount -> earliest endDate -> lexicographically smallest code
    couponsWithDiscounts.sort((a, b) => {
      // Highest discount
      if (b.discount !== a.discount) {
        return b.discount - a.discount;
      }

      // Earliest endDate
      const endDateA = new Date(a.coupon.endDate);
      const endDateB = new Date(b.coupon.endDate);
      if (endDateA.getTime() !== endDateB.getTime()) {
        return endDateA.getTime() - endDateB.getTime();
      }

      // Lexicographically smallest code
      return a.coupon.code.localeCompare(b.coupon.code);
    });

    const best = couponsWithDiscounts[0];

    Logger.info('Best coupon selected', {
      couponCode: best.coupon.code,
      discount: best.discount,
      userId: userContext.userId,
      totalEligible: eligibleCoupons.length
    });

    // Increment usage count for the selected coupon
    incrementUsage(userContext.userId, best.coupon.code);

    res.json({
      coupon: best.coupon,
      discount: best.discount
    });
  } catch (error) {
    Logger.error('Error finding best coupon', { error: error.message });
    res.status(500).json({
      error: 'Internal server error',
      message: error.message
    });
  }
});

// Export coupons map and usage tracking for testing
router.getCoupons = () => coupons;
router.getUserUsage = () => userUsage;
router.incrementUsage = incrementUsage;

module.exports = router;

