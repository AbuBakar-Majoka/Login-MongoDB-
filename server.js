const express = require("express");
const cookieParser = require("cookie-parser");
var jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const path = require('path');
const app = express();
const port = 3000;

let secretKey = "mykey";

mongoose.connect('mongodb://localhost:27017/user-login', { 
    useNewUrlParser: true,
    useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.log('MongoDB connection error:', err));

const userSchema = new mongoose.Schema({
    name : String,
    email : String,
    password : String
})

const postSchema = new mongoose.Schema({
    title : String,
    body : String,
    postOwner : {
        type : mongoose.Schema.Types.ObjectId,
        ref : 'User'
    }
})

let User = mongoose.model("User", userSchema);
let Post = mongoose.model("Post", postSchema);

app.use(express.json());
app.use(cookieParser());
app.use(express.static(__dirname));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
})

app.post("/signUp", async (req, res) => {
    let email = req.body.email;
    let password = req.body.password;
    let name = req.body.name;

    try {
        let myUser = await User.findOne({email});
        if(myUser){
            return res.status(401).json({
                msg : "User already exist, plz login"
            })
        }
        let newUser = new User({
            name,
            email,
            password
        })

        await newUser.save();
        return res.status(200).json({
            msg : "user created successfully",
        })
    } catch (err) {
        return res.status(500).json({
            msg : "err",
        })
    }
})

app.post("/login", async(req, res) => {
    let email = req.body.email;
    let pass = req.body.password;

    try {
        let exUser = await User.findOne({email});
        
        if (!exUser || exUser.password != pass) {
            return res.status(401).json({
                msg : "invalid credientials"
            })
        }
        
        var token = jwt.sign({ email, password : pass, userId : exUser._id }, secretKey);
        res.cookie("token", token, {httpOnly : true});

        return res.status(200).json({
            msg : "login succesfull"
        })
        
    } catch (error) {
        return res.status(400).json({
            msg :"Error login"
        })
    }
})

function authentication(req, res, next) {
    let token = req.cookies.token;

    if(!token){
        return res.status(400).json({
            msg : "not logged in"
        })
    }
    
    try{
        var decoded = jwt.verify(token, secretKey);
        req.user = decoded;
        next();
    } catch(error){
        return res.status(401).json({
            msg : "invalid token"
        })
    }
}

app.post("/createPost",authentication, async(req, res) => {
    let postTitle = req.body.postTitle;
    let postBody = req.body.postBody;
    let userId = req.user.userId;

    try {
        let newPost = new Post({
            title : postTitle,
            body : postBody,
            postOwner : userId
        })

        await newPost.save();
        return res.status(200).json({
            msg : "Post Created successfully",
        })
    } catch (error) {
        return res.status(500).json({
            msg : "error occured, try again",
        })
    }
})

app.get("/profile",authentication, async(req, res) => {
    try {
        let userId = req.user.userId;
        let posts = await Post.find({postOwner: userId});
        // let posts = await Post.find({postOwner: { $ne: userId }});
        return res.status(200).json({
            posts
        })
    } catch (error) {
        return res.status(500).json({
            msg : "Error occur in fetching posts"
        })
    }
})

app.get("/timeLine",authentication, async(req, res) => {
    try {
        let userId = req.user.userId;
        let posts = await Post.find({postOwner: { $ne: userId }});
        return res.status(200).json({
            posts
        })
    } catch (error) {
        return res.status(500).json({
            msg : "Error occur in fetching posts"
        })
    }
})

app.listen(port, () => {
    console.log(`Server running on port ${port}`);
});