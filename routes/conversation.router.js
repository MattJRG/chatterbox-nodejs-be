
const express = require('express');
const router = express.Router();
const jwtHelper = require('../config/jwtHelper');

const ctrlConversation = require('../controllers/conversation.controllers');

// Requests require authentication

// Get conversation details
router.get('/', jwtHelper.verifyJwtToken, ctrlConversation.getConversation);
// Get conversations a user is in
router.get('/user', jwtHelper.verifyJwtToken, ctrlConversation.getUserConversationList);
// Update conversation title if part of conversation
router.post('/', jwtHelper.verifyJwtToken, ctrlConversation.confirmUserPartOfConversation, ctrlConversation.updateConversationTitle)

module.exports = router;
