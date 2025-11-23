const EligibilityService = require('./eligibilityService');
const DiscountService = require('./discountService');

class CouponService {
  // Filter coupons by date and usage limit
  static filterActiveCoupons(coupons, userContext) {
    const now = new Date();
    const activeCoupons = [];

    for (const coupon of coupons.values()) {
      const startDate = new Date(coupon.startDate);
      const endDate = new Date(coupon.endDate);

      // Check if current date is between startDate and endDate
      if (now >= startDate && now <= endDate) {
        // Check usageLimitPerUser (simulate - in real app, track actual usage)
        // For this implementation, we'll assume usage is tracked elsewhere
        // and just check if limit exists
        if (coupon.usageLimitPerUser !== null && coupon.usageLimitPerUser !== undefined) {
          // In a real system, you'd check actual usage count here
          // For now, we'll assume it's not exceeded
        }
        activeCoupons.push(coupon);
      }
    }

    return activeCoupons;
  }

  // Find the best coupon
  static findBestCoupon(coupons, userContext, cart) {
    // Step 1: Filter by date and usage
    const activeCoupons = this.filterActiveCoupons(coupons, userContext);

    // Step 2: Filter by eligibility
    const eligibleCoupons = activeCoupons.filter(coupon => {
      return EligibilityService.checkEligibility(coupon, userContext, cart);
    });

    if (eligibleCoupons.length === 0) {
      return null;
    }

    // Step 3: Calculate discounts for all eligible coupons
    const couponsWithDiscounts = eligibleCoupons.map(coupon => ({
      coupon,
      discount: DiscountService.calculateDiscount(coupon, cart)
    }));

    // Step 4: Select best coupon
    // Sort by: highest discount -> earliest endDate -> lexicographically smallest code
    couponsWithDiscounts.sort((a, b) => {
      // First: highest discount
      if (b.discount !== a.discount) {
        return b.discount - a.discount;
      }

      // Second: earliest endDate
      const endDateA = new Date(a.coupon.endDate);
      const endDateB = new Date(b.coupon.endDate);
      if (endDateA.getTime() !== endDateB.getTime()) {
        return endDateA.getTime() - endDateB.getTime();
      }

      // Third: lexicographically smallest code
      return a.coupon.code.localeCompare(b.coupon.code);
    });

    const best = couponsWithDiscounts[0];
    return {
      coupon: best.coupon,
      discount: best.discount
    };
  }
}

module.exports = CouponService;

