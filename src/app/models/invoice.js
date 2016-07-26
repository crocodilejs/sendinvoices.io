
import accounting from 'accounting';
import _ from 'lodash';
import randomstring from 'randomstring-extended';
import s from 'underscore.string';
import mongoose from 'mongoose';
import validator from 'validator';
import jsonSelect from 'mongoose-json-select';
import config from '../../config';

import CommonPlugin from './plugins/common';

const Invoices = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    index: true,
    required: true
  },
  reference: {
    type: String,
    required: true,
    index: true,
    validate: [
      function (val) {
        // all reference numbers must be 5 characters long, all numbers
        val = val.replace(/\D/g, '');
        return val.length === 5;
      },
      'Reference number must be 5 characters long and all numbers (e.g. 10000)'
    ]
  },
  email: {
    required: true,
    index: true,
    type: String,
    trim: true,
    lowercase: true,
    validator: val => {
      if (s.isBlank(val)) return true;
      return validator.isEmail(val);
    }
  },
  charge: {},
  amount: {
    type: Number,
    min: 1,
    max: 10000
  },
  amount_cents: {
    type: Number,
    min: 100,
    max: 100000
  },
  status: {
    type: String,
    enum: [ 'paid', 'not paid' ],
    default: 'not paid'
  }
});

Invoices.pre('save', function (next) {
  this.amount_cents = accounting.toFixed(this.amount * 100);
  next();
});

Invoices.pre('validate', function (next) {
  // TODO: improve this later, make sure its unique per user in the db
  if (!_.isString(this.reference))
    this.reference = randomstring.randomNumber(5);
  next();
});

Invoices.plugin(CommonPlugin('invoice'));
Invoices.plugin(jsonSelect, config.omitCommonFields);

export default mongoose.model('Invoice', Invoices);
