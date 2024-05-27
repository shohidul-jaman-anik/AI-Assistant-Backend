const mongoose = require('mongoose');

const paymentSchema = mongoose.Schema({
  ownerFirstName: { type: String, required: true },
  ownerLastName: { type: String, required: true },
  ownerProfile: { type: String, required: true },
  ownerEmail: {
    type: String,
    required: [true, 'Please provide a unique email'],
    unique: true,
  },
  paymentMethod: { type: String, required: true },
  name: { type: String, required: true },
  peropertyDetails: {
    details: String,
    yearBuilt: String,
    bedrooms: Number,
    bathrooms: Number,
    squareFootage: Number,
  },
  propertyId: { type: String, required: true },
  images: [{ type: String }],
  price: { type: Number, required: true },
  quantity: { type: Number, required: true },
  propertyType: { type: String, required: true },
  transactionId: { type: String },
  invoiceNumber: { type: String, unique: true },
  formData: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    address: { type: String, required: true},
    street: { type: String, required: true },
    country: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zip: { type: String, required: true },
    date: { type: Date, default: Date.now }
  }
});

const Payment = mongoose.model('Payment', paymentSchema);
module.exports = Payment;