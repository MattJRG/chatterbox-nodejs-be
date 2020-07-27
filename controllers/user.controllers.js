const mongoose = require('mongoose');
const passport = require('passport');
const _ = require('lodash');
const nodemailer = require('nodemailer');

const User = mongoose.model('User');
const Blacklist = mongoose.model('Blacklist');

const emailAccount = process.env.ACCOUNT;
const emailPassword = process.env.PASSWORD;

module.exports.register = (req, res, next) => {
  if (req.body.username == 'Everyone') {
    res.send(400);
    res.json({ message: 'That username is taken.' });
  }
  var user = new User();
  user.username = req.body.username;
  user.email = req.body.email;
  user.password = req.body.password;
  user.accountDeactivated = false;
  user.friends = [];
  user.pendingFriends = [];
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

module.exports.login = (req, res, next) => {
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
  User.findOneAndUpdate({ _id: req._id }, { online: false }, { useFindAndModify: false }, (err, user) => {
    // If there is an error updating log it
    if (err) console.log(err);
    // If user successfully set to offline, log out user
    else {
      let invalidToken = new Blacklist();
      console.log(`User ${req._id} logging out....`)
      invalidToken.token = req.token;
      invalidToken.created = req.exp * 1000;
      invalidToken.save((err, doc) => {
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

// Upon logout store user token in blacklist to prevent it being used maliciously
module.exports.deactivate = (req, res, next) => {
  User.findOneAndUpdate({ _id: req._id }, { online: false, accountDeactivated: true }, { useFindAndModify: false }, (err, user) => {
    // If there is an error updating log it
    if (err) console.log(err);
    // If user successfully set to offline, log out user
    else {
      let invalidToken = new Blacklist();
      console.log('User logging out....');
      invalidToken.token = req.token;
      invalidToken.created = req.exp * 1000;
      invalidToken.save((err, doc) => {
        if (!err) {
          res.status(200);
          res.json({ "message": 'Account deactivation successful'})
        } else {
          res.status(204);
          console.log(err);
        }
      })
    }
  })
}

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

module.exports.getUsers = (req, res, next) => {
  // Fetch the req user's friends
  User.findOne({ _id: req._id })
  .then(reqUser => {
    // Get the users friends
    let friends = reqUser.friends;
    // Get the people the user has added
    let pendingFriends = reqUser.pendingFriends;
    // Get the people who have added the user
    let friendRequests = reqUser.pendingRequests;
    // Find all users in database
    User.find()
    .then(users => {
      // console.log('Found online users')
      // Strip out all but essential user data and filter only online users
      let pendingRequests = [];
      let onlineFriends = [];
      let onlineUsers = [];
      let offlineFriends = [];
      let offlineUsers = [];
      // Define variable to track if the reqUser has been filtered out of response
      let reqUserFiltered = false;
      users.forEach(user => {
        // If the user is the reqUser ignore them and don't check for them again
        if (!reqUserFiltered && user._id.toString() == reqUser._id.toString()) {
          reqUserFiltered = true;
          console.log(user.username)
        // If user is on the reqUsers friend requests add them to that array
        } else if (friendRequests.includes(user._id)){
          pendingRequests.push(returnSimplifiedUser(user, false, pendingFriends));
        // If user is online and friends with reqUser add them to onlineFriends array
        } else if (user.online && friends.includes(user._id)) {
          onlineFriends.push(returnSimplifiedUser(user, true, pendingFriends));
        // If user is online and not friends with reqUser add them to onlineUsers array
        } else if (user.online && !friends.includes(user._id)) {
          onlineUsers.push(returnSimplifiedUser(user, false, pendingFriends));
        // If user is offline and friends with reqUser add them to offlineFriends array
        } else if (!user.online && friends.includes(user._id)) {
          offlineFriends.push(returnSimplifiedUser(user, true, pendingFriends));
        // If user is offline and not friends with reqUser add them to offlineUsers array
        } else if (!user.online && !friends.includes(user._id)) {
          offlineUsers.push(returnSimplifiedUser(user, false, pendingFriends));
        }
      });
      let resData = {
        pendingRequests,
        onlineFriends,
        onlineUsers,
        offlineFriends,
        offlineUsers
      }
      // Need to add friend and pending friend request properties
      res.status(200);
      res.json({ "userData": resData })
    })
    .catch(err => {
      console.log(err);
    })
  })
}

module.exports.addFriend = (req, res, next) => {
  // Id of user adding the recipient
  let userId = req._id;
  // Id of recipient
  let recipientId = req.body.userId;
  // Check user isn't adding themselves as friend
  if (recipientId == userId) {
    res.status(400);
    res.json({ "message": "Cannot add yourself as a friend." })
  } else {
    // Find the user document in the DB
    console.log(`User: ${userId}`);
    console.log(`Recipient: ${recipientId}`);
    User.findOne({ _id: userId })
    .then(reqUser => {
      // If the user does not already have requested friend as a friend or as a pending friend
      if (!reqUser.friends.includes(recipientId) && !reqUser.pendingFriends.includes(recipientId)) {
        console.log('Updating...');
        // Now retrieve the recipient from the database
        User.findOne({ _id: recipientId })
        .then(recipientUser => {
          // If the recipientUser does not already have the user as a friend or as a pending request
          if (!recipientUser.friends.includes(reqUser) && !recipientUser.pendingRequests.includes(reqUser)) {
            // We can now update each user
            // First add the recipientId to the users pendingFriends
            User.findOneAndUpdate(
              { _id: userId },
              { "$push": { "pendingFriends": recipientId } },
              { useFindAndModify: false },
              (err, reqUserUpdate) => {
                // If that is successful add the userId to the recipinents pendingRequests
                if (!err) {
                  console.log('Success ')
                  console.log(reqUserUpdate);
                  User.findOneAndUpdate(
                    { _id: recipientId },
                    { "$push": { "pendingRequests":  userId } },
                    { useFindAndModify: false },
                    (err, recUserUpdate) => {
                      // If no error all records are now up to date
                      if (!err) {
                        res.status(200);
                        res.json({ "message": `Success user ${userId} friend request sent.` })
                      // If error log to server console
                      } else {
                        console.log(`Error adding id:${userId} to user:${recipientId} pending requests.`);
                      }
                    })
                // If error log to server console
                } else {
                  console.log(`Error adding id:${recipientId} to user:${userId} pending friends.`);
                }
            });
          }
        });
      // If user has the recipient on their friend list or pending list respond with error
      } else {
        console.log('User already in friends list..');
        res.status(400);
        res.json({ "message": "User already in your friends list." });
      }
    }).catch(err => {
      console.log(err);
    })
  }
}

module.exports.respondToFriendRequest = (req, res, next) => {
  // If accept friend request
  if (req.body.accept) {
    User.findOneAndUpdate(
      { _id: req._id },
      // Remove new friend's id from pendingRequests
      { "$pull": { "pendingRequests":  req.body.userId }, "$push": { "friends":  req.body.userId } },
      // Add new friend's id to user friends
      { useFindAndModify: false },
      (err, user) => {
        if (!err) {
          console.log('Added new friend')
          User.findOneAndUpdate(
            { _id: req.body.userId },
            // Remove user's id from new friends pendingFriends
            { "$pull": { "pendingFriends":  req._id }, "$push": { "friends":  req._id } },
            // Add user's id to new friends freinds array
            { useFindAndModify: false },
            (err, friend) => {
              if (!err) {
                console.log('Updated friends details')
                res.status(200);
                res.json({ "message": `Successfully accepted ${friend.username}'s friend request.` });
              } else {
                console.log(`There was an error updating user ${friend._id}.`);
              }
            });
       } else {
        console.log(`There was an error updating user ${user._id}.`);
        }
      });
    // If decline friend request
  } else if (!req.body.accept) {
    User.findOneAndUpdate(
      { _id: req._id },
      // Remove non friend's id from pendingRequests
      { "$pull": { "pendingRequests":  req.body.userId } },
      { useFindAndModify: false },
      (err, user) => {
        if (!err) {
          User.findOneAndUpdate(
            { _id: req.body.userId },
            // Remove user's id from non friends pendingFriends
            { "$pull": { "pendingFriends":  req._id } },
            { useFindAndModify: false },
            (err, friend) => {
              if (!err) {
                res.status(200);
                res.json({ "message": `Successfully declined ${friend.username}'s friend request.` });
              } else {
                console.log(`There was an error updating user ${friend._id}.`);
              }
            });
        } else {
          console.log(`There was an error updating user ${user._id}.`);
        }
    });
  }
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

module.exports.fetchUsernamesFromIds = (ids) => {
  return User.find({ _id: { $in : [...ids] } }, 'username')
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

function returnSimplifiedUser(user, friend, pendingFriends) {
  return {
    userId: user._id,
    username: user.username,
    online: user.online,
    friend: friend,
    pendingFriend: pendingFriends.includes(user._id)
  }
}

function makeid(length) {
  var result           = '';
  var characters       = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  var charactersLength = characters.length;
  for ( var i = 0; i < length; i++ ) {
     result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
}