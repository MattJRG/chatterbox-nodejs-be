const mongoose = require('mongoose');

var BlacklistSchema = new mongoose.Schema({
  token: {
    type: String,
    required: 'token must be present'
  },
  created: {
    type: Number,
    required: 'token must be present'
  },
});

mongoose.model('Blacklist', BlacklistSchema);
