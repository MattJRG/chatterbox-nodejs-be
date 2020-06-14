const mongoose = require('mongoose');

var trollPostSchema = new mongoose.Schema({
  userId: {
    type: String,
    required: 'UserId must be present'
  },
  username: {
    type: String,
    required: 'Username can\'t be empty'
  },
  content: {
    type: String,
    required: 'Email can\'t be empty'
  },
  created: {
    type: Date,
    default: Date.now
  },
});

mongoose.model('TrollPost', trollPostSchema);
