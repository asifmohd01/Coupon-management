const Logger = require('../utils/logger');

class EligibilityService {
  // Check if coupon is eligible based on user context and cart
  static checkEligibility(coupon, userContext, cart) {
    const eligibility = coupon.eligibility || {};

    // User-based eligibility checks
    if (!this.checkUserEligibility(eligibility, userContext, coupon.code)) {
      return false;
    }

    // Cart-based eligibility checks
    if (!this.checkCartEligibility(eligibility, cart, coupon.code)) {
      return false;
    }

    return true;
  }

  static checkUserEligibility(eligibility, userContext, couponCode) {
    // allowedUserTiers
    if (eligibility.allowedUserTiers && Array.isArray(eligibility.allowedUserTiers)) {
      if (!eligibility.allowedUserTiers.includes(userContext.userTier)) {
        Logger.debug(`Coupon ${couponCode} failed: user tier ${userContext.userTier} not in allowed tiers`, {
          couponCode,
          userTier: userContext.userTier,
          allowedTiers: eligibility.allowedUserTiers
        });
        return false;
      }
    }

    // minLifetimeSpend
    if (eligibility.minLifetimeSpend !== undefined && eligibility.minLifetimeSpend !== null) {
      if (userContext.lifetimeSpend < eligibility.minLifetimeSpend) {
        Logger.debug(`Coupon ${couponCode} failed: lifetime spend ${userContext.lifetimeSpend} < required ${eligibility.minLifetimeSpend}`);
        return false;
      }
    }

    // minOrdersPlaced
    if (eligibility.minOrdersPlaced !== undefined && eligibility.minOrdersPlaced !== null) {
      if (userContext.ordersPlaced < eligibility.minOrdersPlaced) {
        Logger.debug(`Coupon ${couponCode} failed: orders placed ${userContext.ordersPlaced} < required ${eligibility.minOrdersPlaced}`);
        return false;
      }
    }

    // firstOrderOnly
    if (eligibility.firstOrderOnly === true) {
      if (userContext.ordersPlaced > 0) {
        Logger.debug(`Coupon ${couponCode} failed: firstOrderOnly but user has ${userContext.ordersPlaced} orders`);
        return false;
      }
    }

    // allowedCountries
    if (eligibility.allowedCountries && Array.isArray(eligibility.allowedCountries)) {
      if (!eligibility.allowedCountries.includes(userContext.country)) {
        Logger.debug(`Coupon ${couponCode} failed: country ${userContext.country} not in allowed countries`, {
          couponCode,
          country: userContext.country,
          allowedCountries: eligibility.allowedCountries
        });
        return false;
      }
    }

    return true;
  }

  static checkCartEligibility(eligibility, cart, couponCode) {
    const items = cart.items || [];
    
    // Calculate cart value
    const cartValue = items.reduce((sum, item) => {
      return sum + (item.unitPrice * item.quantity);
    }, 0);

    // minCartValue
    if (eligibility.minCartValue !== undefined && eligibility.minCartValue !== null) {
      if (cartValue < eligibility.minCartValue) {
        Logger.debug(`Coupon ${couponCode} failed: cart value ${cartValue} < required ${eligibility.minCartValue}`);
        return false;
      }
    }

    // applicableCategories - normalize to lowercase for comparison
    if (eligibility.applicableCategories && Array.isArray(eligibility.applicableCategories)) {
      const cartCategories = items.map(item => 
        typeof item.category === 'string' ? item.category.toLowerCase() : item.category
      );
      const hasApplicableCategory = cartCategories.some(category => 
        eligibility.applicableCategories.includes(category)
      );
      if (!hasApplicableCategory) {
        Logger.debug(`Coupon ${couponCode} failed: no applicable categories in cart`, {
          couponCode,
          cartCategories,
          requiredCategories: eligibility.applicableCategories
        });
        return false;
      }
    }

    // excludedCategories - normalize to lowercase for comparison
    if (eligibility.excludedCategories && Array.isArray(eligibility.excludedCategories)) {
      const cartCategories = items.map(item => 
        typeof item.category === 'string' ? item.category.toLowerCase() : item.category
      );
      const hasExcludedCategory = cartCategories.some(category => 
        eligibility.excludedCategories.includes(category)
      );
      if (hasExcludedCategory) {
        Logger.debug(`Coupon ${couponCode} failed: excluded category found in cart`, {
          couponCode,
          cartCategories,
          excludedCategories: eligibility.excludedCategories
        });
        return false;
      }
    }

    // minItemsCount
    if (eligibility.minItemsCount !== undefined && eligibility.minItemsCount !== null) {
      const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);
      if (totalItems < eligibility.minItemsCount) {
        Logger.debug(`Coupon ${couponCode} failed: item count ${totalItems} < required ${eligibility.minItemsCount}`);
        return false;
      }
    }

    return true;
  }
}

module.exports = EligibilityService;

