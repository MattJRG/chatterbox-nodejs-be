const express = require('express');
const router = express.Router();

const ctrlUser = require('../controllers/user.controllers');
const jwtHelper = require('../config/jwtHelper');

// Account
router.post('/register', ctrlUser.register);
router.post('/login', ctrlUser.login);
router.get('/forgot', ctrlUser.forgotPassword);
router.get('/reset', ctrlUser.resetPassword);
router.post('/logout', jwtHelper.verifyJwtToken, ctrlUser.logout);
router.get('/verify', ctrlUser.verifyAccount);
router.put('/deactivate', jwtHelper.verifyJwtToken, ctrlUser.deactivate);

// Users
router.get('/get_users', jwtHelper.verifyJwtToken, ctrlUser.getUsers);
router.post('/add_friend', jwtHelper.verifyJwtToken, ctrlUser.addFriend);
router.post('/respond_friend_request', jwtHelper.verifyJwtToken, ctrlUser.respondToFriendRequest);
// router.get('/remove_friend', jwtHelper.verifyJwtToken, ctrlUser.removeFriend);


// Not currently using
// router.get('/userProfile', jwtHelper.verifyJwtToken, ctrlUser.userProfile);

module.exports = router;
