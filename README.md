
---

# Coupon Management

A backend service for managing discount coupons in an e-commerce system.  
The application provides APIs to create coupons with configurable eligibility rules and an API to determine the best applicable coupon for a given user and cart. The system evaluates user attributes, cart details, usage limits, and validity periods before selecting the best offer.

---

## 🚀 Features

- Create and manage coupons with detailed eligibility rules  
- Find the best applicable coupon for a user and cart  
- Percentage and flat discounts supported  
- Usage limit handling per user  
- In-memory data storage (no database required)  
- Fully tested with Jest + Supertest  
- Clean API structure and deterministic coupon selection logic  

---

## 🛠 Tech Stack

- **Node.js**  
- **Express.js**  
- **In-memory storage (Map)**  
- **Jest + Supertest** for testing  

---

## 📦 Installation & Setup

### Prerequisites
- Node.js installed  
- npm installed  

### Steps
1. Install dependencies:
   ```bash
   npm install
````

2. Start the server:

   ```bash
   npm start
   ```

   Server runs at: **[http://localhost:3000](http://localhost:3000)**

3. Development mode:

   ```bash
   npm run dev
   ```

---

## 🧪 Running Tests

The project includes comprehensive tests covering:

* Coupon creation
* Eligibility rule validation
* Discount calculation
* Usage limits
* Tie-breaking logic

Run tests:

```bash
npm test
```

---

## 📘 API Documentation

### **1. POST /coupons**

Create or update a coupon.

**Example:**

```json
{
  "code": "SAVE20",
  "description": "20% off on electronics",
  "discountType": "PERCENT",
  "discountValue": 20,
  "maxDiscountAmount": 500,
  "startDate": "2025-01-01T00:00:00Z",
  "endDate": "2025-12-31T23:59:59Z",
  "usageLimitPerUser": 1,
  "eligibility": {
    "allowedUserTiers": ["NEW", "REGULAR"],
    "minCartValue": 1000,
    "applicableCategories": ["electronics"]
  }
}
```

---

### **2. POST /coupons/best**

Returns the best applicable coupon for a user and cart.

**Example Request:**

```json
{
  "userContext": {
    "userId": "u123",
    "userTier": "NEW",
    "country": "IN",
    "lifetimeSpend": 1200,
    "ordersPlaced": 2
  },
  "cart": {
    "items": [
      { "productId": "p1", "category": "electronics", "unitPrice": 1500, "quantity": 1 },
      { "productId": "p2", "category": "fashion", "unitPrice": 500, "quantity": 2 }
    ]
  }
}
```

**Response:**

```json
{
  "coupon": { "code": "SAVE20" },
  "discount": 300
}
```

If no coupon applies:

```json
{
  "coupon": null,
  "discount": 0
}
```

---

### **3. GET /coupons**

Returns all stored coupons.

---

### **4. GET /health**

Health check endpoint.

```json
{ "status": "ok" }
```

---

## 📑 Coupon Structure

Each coupon supports:

* `code`
* `description`
* `discountType` (FLAT or PERCENT)
* `discountValue`
* `maxDiscountAmount` (optional)
* `startDate`, `endDate`
* `usageLimitPerUser`
* `eligibility` object

---

## 🎯 Eligibility Rules

### User-based:

* allowedUserTiers
* minLifetimeSpend
* minOrdersPlaced
* firstOrderOnly
* allowedCountries

### Cart-based:

* minCartValue
* applicableCategories
* excludedCategories
* minItemsCount

Any missing eligibility field is treated as no restriction.

---

## 🔎 Best Coupon Selection Logic

1. Validate date window
2. Check usage limits
3. Verify eligibility rules
4. Calculate effective discount
5. Apply tie-breakers:

   * Higher discount wins
   * If tie → earlier end date
   * If tie → lexicographically smaller code

---

## 📊 Usage Tracking

Usage is stored in-memory:

```
Map<userId, Map<couponCode, usageCount>>
```

This enables enforcement of `usageLimitPerUser`.

---

## 📂 Project Structure

```
coupon-management/
├── models/
├── routes/
├── services/
├── utils/
├── tests/
├── server.js
├── postman_collection.json
└── README.md
```

---

## 📌 Notes

* Backend-only project as required
* No authentication or UI
* Data is stored in memory for simplicity

---


