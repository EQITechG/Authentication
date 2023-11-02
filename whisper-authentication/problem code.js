
//The ultimate encription with oauth20 for social websites 

require("dotenv").config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require("mongoose");
const session = require("express-session");
const passport = require("passport");
const passportLocalMongoose = require("passport-local-mongoose"); //passport local must be installed but not required
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const FacebookStrategy = require('passport-facebook').Strategy;

const TwitterStrategy = require('passport-twitter').Strategy; //This currently has problems

const findOrCreate = require("mongoose-findorcreate");

//The order of this code is so important

const app = express();

app.set("view engine", "ejs");

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

app.use(session({
  secret: "Our little secret",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

mongoose.connect("mongodb://127.0.0.1:27017/userDB").then(() => {
    // console.log("Connected to the database");
  })
  .catch(err => {
    console.error("Error connecting to the database:", err);
  });

  const secretSchema = new mongoose.Schema({ 
    message: {
      type: String
    }
  });


  const userSchema = new mongoose.Schema({  
    email: String,
    password: String,
    googleId: String,
    facebookId: String,
    twitterId: String,
    instagramId: String,
    secretText: [secretSchema]
  });

 userSchema.plugin(passportLocalMongoose);
 userSchema.plugin(findOrCreate);
//  secretSchema.plugin(passportLocalMongoose);
//  secretSchema.plugin(findOrCreate);
  
 const Secret = mongoose.model("Secret",secretSchema);
  const User = mongoose.model("User", userSchema);
  
  
passport.use(User.createStrategy());
passport.serializeUser(function(user, cb) {
  cb(null, user.id);
});

passport.deserializeUser(function(id, cb) {
  User.findById(id, function(err, user) {
    cb(err, user);
  });
});



passport.use(new GoogleStrategy({
  clientID: process.env.CLIENT_ID,
  clientSecret: process.env.CLIENT_SECRET,
  callbackURL: "http://localhost:3000/auth/google/secrets"
},
function(accessToken, refreshToken, profile, cb) {
  // console.log(profile);
  User.findOrCreate({ googleId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));
//Facebook passport login strategy
passport.use(new FacebookStrategy({
  clientID: process.env.APP_ID,
  clientSecret: process.env.APP_SECRET,
  callbackURL: "http://localhost:3000/auth/facebook/secrets"
},
function(accessToken, refreshToken, profile, cb) {
  User.findOrCreate({ facebookId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));

passport.use(new TwitterStrategy({
  consumerKey: process.env.TWITTER_CONSUMER_KEY,
  consumerSecret: process.env.TWITTER_CONSUMER_SECRET,
  callbackURL: "http://localhost:3000/auth/twitter/secrets"
},
function(token, tokenSecret, profile, cb) {
  User.findOrCreate({ twitterId: profile.id }, function (err, user) {
    return cb(err, user);
  });
}
));




/////AUTHENTICATION//////

app.get("/",(req,res)=>{
  res.render("home")

});

app.get("/auth/google",
passport.authenticate("google", { scope: ["profile"] }));

app.get("/auth/google/secrets", 
passport.authenticate("google", { failureRedirect: "/login" }),
function(req, res) {
  // Successful authentication, redirect home.
  res.redirect("/secrets");
});



app.get('/auth/facebook',
passport.authenticate('facebook'));

app.get('/auth/facebook/secrets',
passport.authenticate('facebook', { failureRedirect: '/login' }),
function(req, res) {
  // Successful authentication, redirect home.
  res.redirect('/secrets');
});



app.get('/auth/twitter',
passport.authenticate('twitter'));

app.get('/auth/twitter/secrets', 
passport.authenticate('twitter', { failureRedirect: '/login' }),
function(req, res) {
  // Successful authentication, redirect home.
  res.redirect('/secrets');
});



app.get("/register",(req,res)=>{
  res.render("register")
  
});
app.get("/login",(req,res)=>{

  res.render("login")
  
});


app.get("/secrets", async(req,res)=>{
if (req.isAuthenticated()){
    const foundUser = await User.findOne({"_id": req.user.id});// the try statement is almost like an if statement, because if the request is not possible then it will catch an error.
    res.render("secrets", {usersWithSecrets: foundUser.secretText});// renders the secrets ejs file
  }else{
  res.redirect("/login");
}
});

app.post("/register", (req, res) => {
User.register({ username: req.body.username }, req.body.password, (err) => {
  if (err) {
    console.log(err);
    // Instead of sending multiple responses, you should choose one approach.
    // Let's send an error message as a response and handle the redirection on the client side.
    res.status(400).send("Registration failed: " + err.message);
  } else {
    passport.authenticate("local")(req, res, () => {
      res.redirect("/secrets");
    });
  }
});
});

app.post("/login", (req, res) => {
const user = new User({
  username: req.body.username,
  password: req.body.password
});

req.login(user, function(err) {
  if (err) {
    console.log(err);
    return res.status(401).send("Login failed: " + err.message);// Error message when login fails
  }
  // console.log(req.user);

  passport.authenticate("local")(req, res, () => {
    res.redirect("/secrets");
  });
});
});

app.get("/submit",(req,res)=>{
if (req.isAuthenticated()){//checks if users is authenticated
  res.render("submit");
}else{
  res.redirect("/login");
}


});

app.post("/submit", async (req, res) => {

const newSecret = new Secret ({message: req.body.secret})

if (req.isAuthenticated()){
 await User.findOne({_id: req.user.id}).then(foundId => {
  if(foundId){
    foundId.secretText.push(newSecret)
    foundId.save()
    res.redirect("/secrets")
  }else{
// Handle the case where the user is not found
res.status(404).send("User not found");
  }

    })

}else{
  res.redirect("/login");
}

});

app.post("/delete", async (req, res)=>{
  const checkedItemId = req.body.checkbox;
 
  if (req.isAuthenticated()){
    const userLogged = req.user.id;
    await User.findOneAndUpdate({_id: userLogged}, {$pull: {secretText: {_id: checkedItemId}}});
    res.redirect("/secrets");
   }else{
     res.redirect("/login");
   }
    
});

//Logout function will end all sessions
app.get("/logout",(req,res)=>{

req.logout(function(err) {
  if (err) { 
    console.log(err); 
  }
  res.redirect("/");

});

});



let port = process.env.PORT;
if (port == null || port == "") {
port = 3000;
}

app.listen(port,()=>{
console.log("Server Running on Port 3000")
});