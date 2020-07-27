const mongoose = require('mongoose');
const _ = require('lodash');

const ctrlUser = require('../controllers/user.controllers');

const Conversation = mongoose.model('Conversation');

// Check if a conversation exists
module.exports.getConversation = (req, res, next) => {
  // Get req query params
  let queryParams = req.query;
  // Get participants from the query params
  let participants = queryParams.participants.split(',');
  // Add the user to the participants list
  participants.push(req._id.toString());
  // Attempt to find the conversation if it exists
  Conversation.findOne({ participants: { $all: participants } })
  .then(conversation => {
    // If not create it
    if (!conversation) {
      let conversation = new Conversation;
      // Fetch usernames using perticipant ids
      ctrlUser.fetchUsernamesFromIds(participants)
      .then(users => {
        // If users are found
        if (users) {
          conversation.participants = participants;
          conversation.usernames = users.map(user => user.username);
          conversation.title = req.body.title ? req.body.title : createTitleFromUsernames(conversation.usernames);
          conversation.created = new Date();
          console.log(conversation);
          conversation.save()
            .then(newConversation => {
              // TO DO MUST PASS CONVERSATION DETAILS ONTO MESSAGE CONTROLLER
                console.log('New conversation created');
                res.status(201)
                res.json({ message: 'New conversation created', conversationId: newConversation._id, conversationTitle: newConversation.title })
              })
              .catch(err => {
                console.log('Error adding message to DB');
                console.log(err);
              });
        // If users are not found
        } else {
          console.log('No users found from ids');
        }
      });
    }
    // If found add it to the request object ready for the message controller
    if (conversation) {
      console.log(`Conversation found for participants: ${participants}.`);
      res.status(200)
      res.json({ message: 'Conversation found', conversationId: conversation._id, conversationTitle: conversation.title })
    }
  })
}

// Get all conversations a user is in
module.exports.getUserConversationList = (req, res, next) => {
  Conversation.find(
    { $or: [{ participants: { $in: [req._id] } }, { public: true }] }, 
    { title: 1, _id: 1 }
  )
  .then(conversations => {
    if (conversations.length > 0) {
      res.status(200);
      res.json({ 
        message: `Conversations found`,
        conversations,
      })
    } else {
      res.status(404);
      res.json({ message: `No conversations for user: ${req.username}`});
    }
  })
  .catch(err => {
    console.log('Error fetching conversations.')
    console.log(err)
  })
}

// Function to confirm user is part of the conversation
module.exports.confirmUserPartOfConversation = (req, res, next) => {
  // Get req query params
  let queryParams = req.query;
  // If conversationId is trollbox run next function
  if (queryParams.conversationId == 'Trollbox') {
    Conversation.findOne({ trollbox: true })
    .then(trollbox => {
      if (trollbox) {
        req.conversationId = trollbox._id;
        } else {
          createTrollbox();
        }
        next();
      })
      .catch(err => {
        console.log('Error fetching trollbox');
      })
  // If not use conversationId from the query params to find conversation in database
  } else {
    Conversation.findOne({ _id:  queryParams.conversationId })
    .then(conversation => {
      // If conversation is public the user is part of it
      if (conversation.public) {
        req.conversationId = conversation._id;
        next();
        // If conversation exists is the user part of it?
      } else if (conversation.participants.includes(req._id.toString())) {
        // If user is part of conversation run next function
        req.conversationId = conversation._id;
        next();
      } else {
        console.log(`User ${req._id} not part of that conversation.`);
        res.status(400);
        res.json({ message: 'User not part of that conversation.'})
      }
    })
    .catch(err => {
      console.log(err);
      res.status(404);
      res.json({ message: 'Conversation does not exist.'})
    })
  }
}

// TO DO
// --------------------------
// Add a user to an existing conversation

// Remove a user from a conversation
// --------------------------

// Change conversation title
module.exports.updateConversationTitle = (req, res, next) => {
  // Check request is valid
  if (isValidTitle(req.body.newTitle)) {
    // Check the conversation exists
    // If it does then change the title to the one in the request
    Conversation.findByIdAndUpdate({ _id: req.body.conversationId }, { title: req.body.newTitle }, { useFindAndModify: false }, (err, doc) => {
      // Respond to say the conversation title was updated
      if (!err) {
        res.status(200);
        res.json({ message: `Success conversation title changed to ${req.body.newTitle}.`});
      } else {
        res.status(500);
        res.json({ error: `Error title could not be updated.`});
      }
    })
  } else {
    res.status(400);
    res.json({ error: `Error that title is invalid.`});
  }
}

// Helper functions

// If title is present in request check it is valid
function isValidTitle(title) {
  return title.content && title.content.toString().trim() !== '';
}

// If no title in request create from usernames
function createTitleFromUsernames(usernames) {
  if (usernames.length < 3) {
    return `${usernames.join(' & ')}`
  } else { 
    return `${usernames.reduce((title, username, i, array) => title + (i < array.length - 1 ? ', ' : ' and ') + username)}`
  }
}

// Create the trollbox
function createTrollbox() {
  Conversation.findOne({ trollbox: true })
  .then(trollbox => {
    // If Trollbox doesn't exist create it
    if (!trollbox) {
      console.log('Creating trollbox conversation...');
      let newTrollbox = new Conversation();
      newTrollbox.participants = ['Everyone'];
      newTrollbox.usernames = ['Everyone'];
      newTrollbox.title = 'Trollbox';
      newTrollbox.created = new Date();
      newTrollbox.public = true;
      newTrollbox.trollbox = true;
      newTrollbox.save((err, doc) => {
        if (!err) {
          console.log('Created new trollbox successfully');
          console.log(newTrollbox);
        } else {
          console.log(err)
        }
      })
    } else {
      console.log("Trollbox already exists.")
    }
  })
  .catch(err => {
    console.log('Trollbox creation failed.');
  })
}