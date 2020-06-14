const express = require('express');
const router = express.Router();

const jwtHelper = require('../config/jwtHelper');

const ctrlTrollposts = require('../controllers/trollpost.controllers');

// Get trollposts without authentication
router.get('/', jwtHelper.verifyJwtToken, ctrlTrollposts.getPosts);

// Create trollposts - needs authentication
router.post('/', jwtHelper.verifyJwtToken, ctrlTrollposts.createPost);

module.exports = router;