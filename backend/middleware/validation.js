const Joi = require('joi');

/**
 * Validation middleware factory
 * @param {Joi.Schema} schema - Joi schema to validate against
 * @param {string} property - Request property to validate ('body', 'params', 'query')
 */
function validate(schema, property = 'body') {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false, // Return all errors
      stripUnknown: true // Remove unknown fields
    });

    if (error) {
      const errors = error.details.map(detail => detail.message);
      return res.status(400).json({
        error: 'Validation failed',
        details: errors
      });
    }

    // Replace request data with validated/sanitized data
    req[property] = value;
    next();
  };
}

// Common validation schemas
const schemas = {
  // Product validation
  costPrice: Joi.object({
    costPrice: Joi.number()
      .positive()
      .max(1000000)
      .required()
      .messages({
        'number.positive': 'Cost price must be positive',
        'number.max': 'Cost price cannot exceed $1,000,000'
      })
  }),

  // ID validation
  id: Joi.object({
    id: Joi.number()
      .integer()
      .positive()
      .required()
  }),

  // Email validation
  email: Joi.object({
    email: Joi.string()
      .email()
      .lowercase()
      .required()
  }),

  // Shop domain validation
  shopDomain: Joi.object({
    shop: Joi.string()
      .pattern(/^[a-zA-Z0-9-]+\.myshopify\.com$/)
      .required()
      .messages({
        'string.pattern.base': 'Shop must be a valid .myshopify.com domain'
      })
  }),

  // Product selection
  productSelection: Joi.object({
    selected: Joi.boolean().required()
  })
};

module.exports = { validate, schemas };
