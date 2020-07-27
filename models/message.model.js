const mongoose = require('mongoose');

var messageSchema = new mongoose.Schema({
  // Conversation this message is a part of
  conversationId: {
    type: String,
    required: 'Conversation Id must be present'
  },
  // User who submitted this message
  creatorUserId: {
    type: String,
    required: 'UserId must be present'
  },
  // Their username
  username: {
    type: String,
    required: 'Username can\'t be empty'
  },
  // Text content of the message
  content: {
    type: String,
    required: 'Email can\'t be empty'
  },
  originalContent: {
    type: String,
  },
  deleted: {
    type: Boolean,
    default: false
  },
  // Date it was submitted
  created: {
    type: Date,
    default: Date.now
  },
  // Date it was last modified
  modified: {
    type: Date
  },
});

mongoose.model('Message', messageSchema);
