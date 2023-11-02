
//DOTENV option
require('dotenv').config();// dotenv package to help save files for security reasons
const express = require("express");
const bodyParser = require("body-parser");
const ejs = require("ejs");
const mongoose = require('mongoose');
const encrypt = require('mongoose-encryption');

const app = express();

app.set('view engine', 'ejs');

app.use(bodyParser.urlencoded({
  extended: true
}));
app.use(express.static("public"));
mongoose.connect('mongodb://127.0.0.1:27017/userDB').then(() => {
    console.log('Connected to the database');
  })
  .catch(err => {
    console.error('Error connecting to the database:', err);
  });

  const userSchema = new mongoose.Schema({  
    email: String,
    password: String
  })

 
  userSchema.plugin(encrypt, { secret: process.env.SECRET ,encryptedFields: ['password']});// Difference is there is a .env file which stores the secret key for security reasons 
  
  const User = mongoose.model("User", userSchema);
  
/////AUTHENTICATION//////

app.get("/",(req,res)=>{
    res.render("home")

})
app.get("/register",(req,res)=>{
    res.render("register")
    
})
app.get("/login",(req,res)=>{

    res.render("login")
    
})

app.post("/register", async (req,res)=>{
  const newUser = new User ({ 
    email: req.body.username,
    password: req.body.password
  });
  try {
    await newUser.save();
    res.render("secrets");
  } catch (err) {
    console.log(err);
  }
});

app.post("/login", async (req,res)=>{
  const username = req.body.username;
  const password = req.body.password;
try{
  const foundLogin = await User.findOne({email:username})
  if (foundLogin){
    if(foundLogin.password === password){
      res.render("secrets");
    }else{
      res.send("Incorrect login details")
    }

  }
}catch(err){
  console.log(err);
}


})


let port = process.env.PORT;
if (port == null || port == "") {
  port = 3000;
}

app.listen(port,()=>{
console.log("Server Running on Port 3000")
});