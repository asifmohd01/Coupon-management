class DiscountService {
  // Calculate discount for a coupon and cart
  static calculateDiscount(coupon, cart) {
    const items = cart.items || [];
    const cartValue = items.reduce((sum, item) => {
      return sum + (item.unitPrice * item.quantity);
    }, 0);

    let discount = 0;

    if (coupon.discountType === 'FLAT') {
      discount = coupon.discountValue;
    } else if (coupon.discountType === 'PERCENT') {
      discount = (cartValue * coupon.discountValue) / 100;
      
      // Apply maxDiscountAmount if provided
      if (coupon.maxDiscountAmount !== null && coupon.maxDiscountAmount !== undefined) {
        discount = Math.min(discount, coupon.maxDiscountAmount);
      }
    }

    // Discount cannot exceed cart value
    return Math.min(discount, cartValue);
  }

  // Get cart value
  static getCartValue(cart) {
    const items = cart.items || [];
    return items.reduce((sum, item) => {
      return sum + (item.unitPrice * item.quantity);
    }, 0);
  }
}

module.exports = DiscountService;

