const mongoose = require('mongoose');
const _ = require('lodash');

const Message = mongoose.model('Message');

// Fetch messages
module.exports.getMessages = (req, res) => {
  let queryParams = req.query;
  Message.countDocuments({ conversationId: req.conversationId }, (err, count) => {
  
  }).then(count => {
    // If this is the initial query return the latest 10 messages
    if (queryParams.query === 'initial') {
      Message.find({ conversationId: req.conversationId }, null, {limit: 10, sort: {'created': -1}})
      .then(messages => {
        // Reverse array as it is in the wrong order
        res.json(
          {
            messages: createFormattedMessage(messages, req).reverse(),
            totalMessages: count
          });
      });
    // Else if we want the previous messages
    } else if (queryParams.query === 'previous') {
      let record_id = queryParams.earliestId;
      Message.find({'_id': {$lt: record_id }, conversationId: queryParams.conversationId }).sort({'created': -1}).limit(10)
      .then(messages => {
        // Reverse array as it is in the wrong order
        res.json(
          {
            messages: createFormattedMessage(messages, req).reverse(),
            totalMessages: count
          });
      })
    // Else if we want the latest messages
    } else if (queryParams.query === 'latest') {
      let record_id = queryParams.latestId;
      Message.find({'_id': {$gt: record_id }, conversationId: req.conversationId })
      .then(messages => {
        // Reverse array as it is in the wrong order
        res.json(
          {
            messages: createFormattedMessage(messages, req),
            totalMessages: count
          });
      })
    // Else just get all the messages from the conversation
    } else {
      Message.find({ conversationId: queryParams.conversationId })
      .then(messages => {
        res.json(
          {
            messages: createFormattedMessage(messages, req),
            totalMessages: count
          });
      });
    }
  });
};

// Create a new message
module.exports.createMessage = (req, res) => {
  if (isValidMessage(req.body)) {
    let message = new Message();
    message.conversationId = req.conversationId;
    message.creatorUserId = req._id;
    message.username = req.username;
    message.content = req.body.content.toString();
    message.created = new Date();
    message.modified = new Date();
    message.save()
      .then(newMessage => {
        res.status(200);
        res.json({ "success": 'New message created.'});
      })
      .catch(err => {
        console.log('Error adding message to DB');
        console.log(err);
      });
  } else {
    res.status(400);
    res.json({
      message: 'Hey! We don\'t accept blank content!'
    });
  }
};

// Delete a message
module.exports.deleteMessage = (req, res) => {
  let messageId = req.body.messageId;
  Message.findById({ '_id' : messageId })
    .then(message => {
      // Check if the user attempting to delete is the user who created the message
      if (message.creatorUserId == req._id) {
        // Mark message as deleted
        message.deleted = true;
        // Set original content to content
        message.originalContent = JSON.parse(JSON.stringify(message.content));
        // Now set content to deleted message
        message.content = `Message deleted.`
        message.lastModified = Date.now;
      // If document not found return 404
      } else if (!message) {
        res.status(404);
        res.json({ "error": 'Error document does not exist.' })
      // If user is not creator return 401
      } else {
        res.status(401)
        res.json({ "error": 'User unauthorised' })
      }
    }).catch(err => {
      console.log(`Error deleting message ${messageId}.`);
      console.log(err);
    });
}

// Helper functions
function isValidMessage(message) {
  return message.content && message.content.toString().trim() !== '';
}

// Create the formatted response of messages
function createFormattedMessage(messages, req) {
  return messages.map(message => {
    // If message was created by the request user
    if (message.username === req.username) return createMessage(message, false);
    // If message was created by another user
    else return createMessage(message, true);
  });
}

// Map the database message values to response message keys
function createMessage(message, alt) {
  return {
  id: message._id.toString(),
  created: message.modified,
  username: message.username,
  userId: message.userId,
  content: message.content,
  deleted: message.deleted,
  alt: alt
  }
}
