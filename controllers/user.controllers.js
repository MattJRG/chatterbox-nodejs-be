const mongoose = require('mongoose');
const passport = require('passport');
const _ = require('lodash');
const nodemailer = require('nodemailer');

const User = mongoose.model('User');
const Blacklist = mongoose.model('Blacklist');

const emailAccount = process.env.ACCOUNT;
const emailPassword = process.env.PASSWORD;

module.exports.register = (req, res, next) => {
  var user = new User();
  user.username = req.body.username;
  user.email = req.body.email;
  user.password = req.body.password;
  // Auto verify for catch-up demo purposes
  user.verified = true;
  // user.verified = false;
  user.verificationCode = makeid(30);
  user.save((err, doc) => {
    // If user successfully added to the database send the data added to the FE and send the verification email
    if (!err) {
      // Send verification email
      let emailMessage = `Welcome to Chatterbox ${user.username}, please use the following verification code: ${user.verificationCode}`;
      sendEmail(user.email, 'Verification', emailMessage);
      console.log(`Verification email send to ${user.email}`);
      res.status(200);
      res.json({ message: `New user ${user.username} created.` });
    } else {
      if (err.code == 11000) {
        res.status(400)
        res.json({ message: `Email ${req.body.email} already exists.` });
      } else {
        return next(err);
      }
    }
  })
}

module.exports.authenticate = (req, res, next) => {
  // call for passport authentication
  passport.authenticate('local', (err, user, info) => {
    // error from passport middleware
    if (err) return res.status(400).json(err);
    // registered user
    else if (user) {
      return res.status(200).json({ "token": user.generateJwt(), "username": user.username });
    }
    // unknown user or wrong password
    else {
      return res.status(404).json(info);
    } 
  })(req, res, next);
}

// Upon logout store user token in blacklist to prevent it being used maliciously
module.exports.logout = (req, res, next) => {
  User.findOneAndUpdate({ _id: req._id }, { active: false }, { useFindAndModify: false }, (err, user) => {
    if (err) console.log(err);
    // If user successfully set to inactive, log out user
    else {
      let invalidToken = new Blacklist();
      console.log('User logging out....')
      invalidToken.token = req.token;
      console.log(req.exp)
      invalidToken.created = req.exp * 1000;
      invalidToken.save((err, doc) => {
        console.log(doc)
        if (!err) {
          res.status(200);
          res.json({ "message": 'loggout successful'})
        } else {
          res.status(204);
          console.log(err);
        }
      })
    }
  })
}

module.exports.users = (req, res, next) => {
  User.find({ active: true })
  .then(activeUsers => {
    // Strip out all but essential user data for the response
    let reducedUsers = activeUsers.reduce((arr, user, i) => {
      arr.push({
        userId: user._id,
        username: user.username,
      })
      return arr;
    }, []);
    // Need to add friend and pending friend request properties
    console.log(reducedUsers);
    res.status(200);
    res.json({ "activeUsers": reducedUsers })
  })
}

// Not currently using...
// module.exports.userProfile = (req, res, next) => {
//   User.findOne({ _id: req._id },
//     (err, user) => {
//       if (!user) {
//         return res.status(404).json({ status: false, message: "User record not found." });
//       } else {
//         return res.status(200).json({ status: true, user : _.pick(user,['username','email']) });
//       }
//     })
// }

// Handle account verification requests
module.exports.verifyAccount = (req, res, next) => {
  console.log('User attempting to verify...');
  User.findOne({ verificationCode: req.query.token })
    .then(user => {
      // Check verification code is correct
      if (!user) {
        // If not tell frontend it does not match
        res.status(404).json({ message: "Token does not match a user." });
        // If correct but account is already verified return already verified to the frontend
      } else if (user.verified) {
        res.status(204).json({ message: `User ${user.username} already verified` });
        // If correct and user not verified try to update the user account so it is verified
      } else {
        User.findByIdAndUpdate({ _id: user._id}, { verified: true }, function(err, result) {
          // If there is an error send message to user
          if (err) {
            res.status(500);
            res.json({ message: `User ${user.username} could not be verified verified` });
            // If it is update user account so they are now verified
          } else {
            res.status(200);
            res.json({ message: `User ${user.username} successfully verified` });
          }
        })
      }
    })
}

// Handle forgotten password requests
module.exports.forgotPassword = (req, res, next) => {
  User.findOne({ email: req.query.email })
  .then(user => {
    if (user) {
    User.findByIdAndUpdate({ _id: user._id}, { currentlyResettingPassword: true, verificationCode: makeid(30) }, function(err, result) {
      // If there is an error send message to user
      if (err) {
        res.status(500);
        res.json({ message: `User ${user.username} could not be verified verified` });
        // If it is update user account so they are now verified
      } else {
        let emailMessage = `You have requested a new password for chatterbox please click this LINK ${user.resetCode}`;
        sendEmail(user.email, 'Forgot password reset', emailMessage)
        res.status(200);
        res.json({
          message: 'User found & reset email sent'
        })
        console.log(user.email);
      }
    })
    } else {
      res.status(404)
      res.json({
        message: 'User not found!'
      })
    }
  })
}

// Handle forgotten password requests
module.exports.resetPassword = (req, res, next) => {
  User.findOne({ resetCode: req.body.resetKey })
  .then(user => {
    if (user) {
      User.findByIdAndUpdate({ _id: user._id}, { currentlyResettingPassword: false, verificationCode: '' }, function(err, result) {
        if (err) {
          res.status(500)
          res.json({
            message: 'Error updating password, please contact support!'
          })
        } else {
          let emailMessage = 'Your password has been reset, please contact support asap if this wasn\'t you';
          sendEmail(user.email, 'Reset Password', emailMessage)
          res.status(200)
          res.json({
            message: 'User found & reset email sent'
          })
        }
      });
    } else {
      res.status(404)
      res.json({
        message: 'User not found!'
      })
    }
  })
}

// Nodemailer stuff!
let transporter = nodemailer.createTransport({
  service: 'gmail',
  host: 'smtp.gmail.com',
  port: 465,
  secure: true,
  auth: {
    user: emailAccount,
    pass: emailPassword
  }
});


function sendEmail(sendAddress, subject, message) {

  let mailOptions = {
    from: 'adonis.tech.library@gmail.com',
    to: sendAddress,
    subject: subject,
    text: message
  }

  transporter.sendMail(mailOptions, function(err, data) {
    if (err) {
      console.log('Error occured');
      console.log(err);
      res.status(500)
      res.json({ "status": "failed" })
    } else {
      console.log('Email sent successfully..')
      res.status(200)
      res.json({ "status": "success" })
    }
  });
}


// Utility Functions

function makeid(length) {
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
     result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}