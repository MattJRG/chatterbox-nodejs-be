
const express = require('express');
const router = express.Router();
const jwtHelper = require('../config/jwtHelper');

const ctrlMessages = require('../controllers/message.controllers');
const ctrlConversation = require('../controllers/conversation.controllers');

// Need to factor in conversations

// Requests require authentication

// Conversations

// Messages

// Get messages - must verify user is part of the conversation
router.get('/', jwtHelper.verifyJwtToken, ctrlConversation.confirmUserPartOfConversation, ctrlMessages.getMessages);

// Create message - needs authentication
router.post('/', jwtHelper.verifyJwtToken, ctrlConversation.confirmUserPartOfConversation, ctrlMessages.createMessage);

// Delete message 
// Only the creator of a message can delete it, never truely deleted just gets stored in old content.
router.delete('/', jwtHelper.verifyJwtToken, ctrlMessages.deleteMessage);

module.exports = router;
