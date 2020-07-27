const mongoose = require('mongoose');

var conversationSchema = new mongoose.Schema({
  // Participants in the conversation
  participants: {
    type: [String],
    required: 'Conversation must have participants'
  },
  // Their usernames
  usernames: {
    type: Array,
    required: 'Usernames can\'t be empty'
  },
  // Title of the conversation (optional)
  title: {
    type: String,
  },
  // Date conversation was created
  created: {
    type: Date,
    default: Date.now
  },
  public: {
    type: Boolean,
    default: false
  }, 
  trollbox: {
    type: Boolean,
    default: false
  }
});

mongoose.model('Conversation', conversationSchema);
