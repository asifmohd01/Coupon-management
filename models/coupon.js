class Coupon {
  constructor(data) {
    this.code = data.code;
    this.description = data.description;
    this.discountType = data.discountType; // "FLAT" or "PERCENT"
    this.discountValue = data.discountValue;
    this.maxDiscountAmount = data.maxDiscountAmount || null;
    this.startDate = data.startDate;
    this.endDate = data.endDate;
    this.usageLimitPerUser = data.usageLimitPerUser || null;
    
    // Normalize eligibility categories to lowercase
    this.eligibility = this.normalizeEligibility(data.eligibility || {});
  }

  // Normalize categories to lowercase for consistent matching
  normalizeEligibility(eligibility) {
    const normalized = { ...eligibility };
    
    if (normalized.applicableCategories && Array.isArray(normalized.applicableCategories)) {
      normalized.applicableCategories = normalized.applicableCategories.map(cat => 
        typeof cat === 'string' ? cat.toLowerCase() : cat
      );
    }
    
    if (normalized.excludedCategories && Array.isArray(normalized.excludedCategories)) {
      normalized.excludedCategories = normalized.excludedCategories.map(cat => 
        typeof cat === 'string' ? cat.toLowerCase() : cat
      );
    }
    
    return normalized;
  }

  // Validate coupon structure
  static validate(couponData) {
    const errors = [];

    // Validate code - must be non-empty string
    if (!couponData.code || typeof couponData.code !== 'string') {
      errors.push('code is required and must be a string');
    } else if (couponData.code.trim() === '') {
      errors.push('code cannot be empty');
    }

    if (!couponData.description || typeof couponData.description !== 'string') {
      errors.push('description is required and must be a string');
    }

    // Validate discountType - only FLAT or PERCENT
    if (!couponData.discountType || !['FLAT', 'PERCENT'].includes(couponData.discountType)) {
      errors.push('discountType is required and must be "FLAT" or "PERCENT"');
    }

    // Validate discountValue - must be positive
    if (typeof couponData.discountValue !== 'number' || couponData.discountValue <= 0) {
      errors.push('discountValue is required and must be a positive number');
    }

    // Reject negative maxDiscountAmount
    if (couponData.maxDiscountAmount !== undefined && couponData.maxDiscountAmount !== null) {
      if (typeof couponData.maxDiscountAmount !== 'number' || couponData.maxDiscountAmount <= 0) {
        errors.push('maxDiscountAmount must be a positive number if provided');
      }
    }

    if (!couponData.startDate) {
      errors.push('startDate is required');
    }

    if (!couponData.endDate) {
      errors.push('endDate is required');
    }

    // Validate dates - reject malformed formats
    try {
      const startDate = new Date(couponData.startDate);
      const endDate = new Date(couponData.endDate);
      
      if (isNaN(startDate.getTime())) {
        errors.push('startDate must be a valid date in ISO 8601 format');
      }
      
      if (isNaN(endDate.getTime())) {
        errors.push('endDate must be a valid date in ISO 8601 format');
      }
      
      if (!isNaN(startDate.getTime()) && !isNaN(endDate.getTime()) && startDate > endDate) {
        errors.push('startDate must be before or equal to endDate');
      }
    } catch (e) {
      errors.push('Invalid date format - use ISO 8601 format (e.g., "2024-01-01T00:00:00Z")');
    }

    // Reject negative usageLimitPerUser
    if (couponData.usageLimitPerUser !== undefined && couponData.usageLimitPerUser !== null) {
      if (typeof couponData.usageLimitPerUser !== 'number' || couponData.usageLimitPerUser < 0) {
        errors.push('usageLimitPerUser must be a non-negative number if provided');
      }
    }

    // Validate eligibility object structure
    if (couponData.eligibility && typeof couponData.eligibility !== 'object') {
      errors.push('eligibility must be an object');
    }

    // Validate eligibility arrays and reject negative values
    if (couponData.eligibility) {
      if (couponData.eligibility.minLifetimeSpend !== undefined && 
          couponData.eligibility.minLifetimeSpend !== null &&
          (typeof couponData.eligibility.minLifetimeSpend !== 'number' || 
           couponData.eligibility.minLifetimeSpend < 0)) {
        errors.push('eligibility.minLifetimeSpend must be a non-negative number if provided');
      }

      if (couponData.eligibility.minOrdersPlaced !== undefined && 
          couponData.eligibility.minOrdersPlaced !== null &&
          (typeof couponData.eligibility.minOrdersPlaced !== 'number' || 
           couponData.eligibility.minOrdersPlaced < 0)) {
        errors.push('eligibility.minOrdersPlaced must be a non-negative number if provided');
      }

      if (couponData.eligibility.minCartValue !== undefined && 
          couponData.eligibility.minCartValue !== null &&
          (typeof couponData.eligibility.minCartValue !== 'number' || 
           couponData.eligibility.minCartValue < 0)) {
        errors.push('eligibility.minCartValue must be a non-negative number if provided');
      }

      if (couponData.eligibility.minItemsCount !== undefined && 
          couponData.eligibility.minItemsCount !== null &&
          (typeof couponData.eligibility.minItemsCount !== 'number' || 
           couponData.eligibility.minItemsCount < 0)) {
        errors.push('eligibility.minItemsCount must be a non-negative number if provided');
      }
    }

    return errors;
  }
}

module.exports = Coupon;

