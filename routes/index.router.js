const express = require('express');
const router = express.Router();

const ctrlUser = require('../controllers/user.controllers');

const jwtHelper = require('../config/jwtHelper');

router.post('/register', ctrlUser.register);
router.post('/authenticate', ctrlUser.authenticate);
router.get('/forgot', ctrlUser.forgotPassword);
router.get('/reset', ctrlUser.resetPassword);
router.post('/logout', jwtHelper.verifyJwtToken, ctrlUser.logout);
router.get('/verify', ctrlUser.verifyAccount);
router.get('/users', jwtHelper.verifyJwtToken, ctrlUser.users);
// To be built - should also set users to online to false
// router.put('/deactivate', jwtHelper.verifyJwtToken, ctrlUser.deactivate);

// Not currently using
// router.get('/userProfile', jwtHelper.verifyJwtToken, ctrlUser.userProfile);

module.exports = router;
