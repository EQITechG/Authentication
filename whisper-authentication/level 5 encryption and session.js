//Passport encryption which is top level. which creates cookies for sessions
require('dotenv').config();
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const session = require('express-session');
const passport = require("passport");//requiring passport
const passportLocalMongoose = require("passport-local-mongoose"); //passport local must be installed but not required.


//The order of the code is so important 

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));

app.use(session({//using the session option for passport
  secret: "Our little secret",
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());//initializing passport 
app.use(passport.session());//starting sessions

mongoose.connect('mongodb://127.0.0.1:27017/userDB').then(() => {
    console.log('Connected to the database');
  })
  .catch(err => {
    console.error('Error connecting to the database:', err);
  });

  const userSchema = new mongoose.Schema({  
    email: String,
    password: String
  });

 userSchema.plugin(passportLocalMongoose);// Important login for passport to work
  
  const User = mongoose.model("User", userSchema);
  
passport.use(User.createStrategy());//Creates the passport strategy as there are plenty strategies in the future 

passport.serializeUser(User.serializeUser());//sets up cookie sessions
passport.deserializeUser(User.deserializeUser());//ends cookie sessions


/////AUTHENTICATION//////

app.get("/",(req,res)=>{
    res.render("home")

});
app.get("/register",(req,res)=>{
    res.render("register")
    
});
app.get("/login",(req,res)=>{

    res.render("login")
    
});

app.get("/secrets", (req,res)=>{
  if (req.isAuthenticated()){
    res.render("secrets");
  }else{
    res.redirect("/login");
  }
});

app.post("/register",  (req,res)=>{
User.register({username: req.body.username }, req.body.password, (err)=>{// User register is a fucntion of the passport package
  if (err){
    console.log(err);
    res.send("Incorrect login details");
    res.redirect("/register");
  }else{
    passport.authenticate("local")(req,res,()=>{
      res.redirect("/secrets");
    })
  }
})

});


app.post("/login",(req,res)=>{
  const user = new User({
    username: req.body.username,
    password: req.body.password
  })
  req.login(user, function(err) {
    if (err) {
       console.log(err); 
      }else{
        passport.authenticate("local")(req,res,()=>{
          res.redirect("/secrets");
        })

      }
  });
});


app.get("/logout",(req,res)=>{

  req.logout(function(err) {
    if (err) { 
      console.log(err); 
    }
    res.redirect('/');
 
});

});

let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port,()=>{
console.log("Server Running on Port 3000")
});