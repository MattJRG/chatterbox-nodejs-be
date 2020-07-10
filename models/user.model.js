const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

var userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: 'Username can\'t be empty'
  },
  email: {
    type: String,
    required: 'Email can\'t be empty',
    unique: true
  },
  password: {
    type: String,
    required: 'Password can\'t be empty',
    minlength: [4, 'Password must be atleast 4 character long']
  },
  verified: {
    type: Boolean
  },
  verificationCode: {
    type: String
  },
  resetCode: {
    type: String
  }, 
  currentlyResettingPassword: {
    type: Boolean
  },
  lastActivity: {
    type: Number
  },
  online: {
    type: Boolean
  },
  // Stores current friend userIds
  friends: {
    type: Array
  },
  // Stores userIds for users you have sent a request to
  pendingFriends: {
    type: Array
  },
  // Stores userIds for users who have added the user as a friend
  pendingRequests: {
    type: Array
  },
  accountDeactivated: {
    type: Boolean,
  },
  saltSecret: String
});

// Custom validation for email
userSchema.path('email').validate((val) => {
  emailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  return emailRegex.test(val);
}, 'Invalid e-mail.');

// Events
userSchema.pre('save', function (next) {
  bcrypt.genSalt(10, (err, salt) => {
    bcrypt.hash(this.password, salt, (err, hash) => {
      this.password = hash;
      this.saltSecret = salt;
      next();
    });
  });
});

// Methods
userSchema.methods.verifyPassword = function (password) {
  return bcrypt.compareSync(password, this.password);
};

userSchema.methods.generateJwt = function () {
return jwt.sign({ _id: this._id}, process.env.JWT_SECRET, {  expiresIn: process.env.JWT_EXP });
}

mongoose.model('User', userSchema);