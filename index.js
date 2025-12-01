const express = require("express");
const mysql = require("mysql");
const cors = require("cors")

const port = 5000;

const app = express();

//middlewares

app.use(cors());
app.use(express.json());

//making connection with Mysql
let db = mysql.createConnection({
  host     : 'localhost',
  user     : 'root',
  password : '',
  database : 'postbook2'
});

db.connect( (err) => {
    if(err){
        console.log("Something went wrong while connecting to the database: ", err);
        throw err;
    }
    else{
        console.log("MySQL server connected...");
    }
});
  //getting user data from server
  app.post("/getUserInfo", (req, res) => {
    
    const { userId, password} = req.body;

    const getUserInfosql = `SELECT userId, userName, userImage FROM users WHERE users.userId = ? AND users.userPassword = ?`
     let query = db.query(getUserInfosql, [userId, password], (err, result) => {
        if(err){
            console.log("Error getting user info from server: ", err);
            throw err;
        }
        else{
            res.send(result);
        }

     });
  });

   app.get("/getAllPosts", (req, res) => {
    const sqlForAllPosts = `SELECT users.userName AS postedUserName, users.userimage AS postedUserImage, posts.postId, posts.postedTime, posts.postText, posts.postImageUrl FROM posts INNER JOIN users ON posts.postedUserId=users.userId ORDER BY posts.postedTime DESC`;
    let query = db.query(sqlForAllPosts, (err, result) => {
        if(err){
            console.log("Error loading posts from database: ", err);
            throw err;

        }
        else{
            console.log(result);
            res.send(result);
        }

    });
   });

   //getting comments of a single post

   app.get("/getAllComments/:postId", (req, res) => {
    let id = req.params.postId;
    let sqlForAllComments = `SELECT users.userName AS commentedUserName, users.userimage AS commentedUserImage, comments.commentId, comments.commentOfPostId, comments.commentText, comments.commentTime FROM comments INNER JOIN users ON comments.commentedUserId=users.userId WHERE comments.commentOfPostId= ${id}`;

    let query = db.query(sqlForAllComments, (err, result) => {
        if(err){
            console.log("Error fetching from the database: ", err);
            throw err;
        }
        else{
            res.send(result);
        }
    });

   });
   // adding new comments to a post
   app.post("/postComment", (req, res) => {
    const { commentOfPostId, commentedUserId, commentText, commentTime } = req.body;


    let sqlForAddingNewComments = `
    INSERT INTO comments (commentId, commentOfPostId, commentedUserId, commentText, commentTime) VALUES (NULL, ?, ?, ?, ?);
    `;

    let query = db.query(sqlForAddingNewComments, [commentOfPostId, commentedUserId, commentText, commentTime, ], (err, result) => {
        if(err){
            console.log("Error adding comment ot the database: ", err);
        }
        else{
            res.send(result);
        }
    });

   });
     
   // adding a new post
   app.post("/addNewPost", (req, res) => {
    //destructure the req.body object

    const { postedUserId, postedTime, postText, postImageUrl} = req.body;
     
    // sql query

    let sqlForAddingNewPost = `INSERT INTO posts (postId, postedUserId, postedTime, postText, postImageUrl) VALUES (NULL, ?, ?, ?, ?)`;
     
    let query = db.query(sqlForAddingNewPost, [postedUserId, postedTime, postText, postImageUrl], (err, result) => {
        if(err){
            console.log("Error while adding a new post in the database: ", err);
            throw err;
        }
        else{
            res.send(result);
        }
    });
   });


   
   // Edit a post
// app.put("/editPost/:postId", (req, res) => {
//     const postId = req.params.postId;
//     const { postText, postImageUrl } = req.body;

//     const sql = `UPDATE posts SET postText = ?, postImageUrl = ? WHERE postId = ?`;

//     db.query(sql, [postText, postImageUrl, postId], (err, result) => {
//         if(err){
//             console.log("Error editing post: ", err);
//             return res.status(500).send("Error editing post");
//         }
//         res.send(result);
//     });
// });

app.put("/editPost/:postId", (req, res) => {
    const postId = req.params.postId;
    const { postText, postPhoto } = req.body;

    if (!postText || !postPhoto) {
        return res.status(400).send("postText and postPhoto are required");
    }

    const sql = `UPDATE posts SET postText = ?, postImageUrl = ? WHERE postId = ?`;

    db.query(sql, [postText, postPhoto, postId], (err, result) => {
        if (err) {
            console.log("Error editing post:", err);
            return res.status(500).send("Error editing post");
        }
        res.send({ message: "Post updated successfully", result });
    });
});
// DELETE a specific post by ID
// app.delete("/deletePost/:postId", (req, res) => {
//     const postId = req.params.postId;

//     if (!postId) {
//         return res.status(400).json({ error: "Post ID is required" });
//     }

//     const sql = "DELETE FROM posts WHERE postId = ?";

//     db.query(sql, [postId], (err, result) => {
//         if (err) {
//             console.error("Error deleting post:", err);
//             return res.status(500).json({ error: "Database error" });
//         }

//         // যদি post না থাকে
//         if (result.affectedRows === 0) {
//             return res.status(404).json({ error: "Post not found" });
//         }


//         return res.json({ message: "Post deleted successfully" });
//     });
// });

// update code for delete
// DELETE POST (Safe + Works 100%)
app.delete("/deletePost/:postId/:userId", (req, res) => {
    const postId = req.params.postId;
    const userId = req.params.userId; // logged-in user

    if (!postId || !userId) {
        return res.status(400).json({ error: "Post ID and User ID are required" });
    }

    // 1. Check if this post belongs to this user
    const checkSql = "SELECT * FROM posts WHERE postId = ? AND postedUserId = ?";

    db.query(checkSql, [postId, userId], (err, rows) => {
        if (err) {
            console.error("CHECK SQL ERROR:", err);
            return res.status(500).json({ error: "Database check failed" });
        }

        // Not owner
        if (rows.length === 0) {
            return res.status(403).json({
                error: "You do not have permission to delete this post"
            });
        }

        // 2. If owner → delete now
        const deleteSql = "DELETE FROM posts WHERE postId = ?";

        db.query(deleteSql, [postId], (err, result) => {
            if (err) {
                console.error("DELETE SQL ERROR:", err);
                return res.status(500).json({ error: "Delete failed" });
            }

            return res.json({ message: "Post deleted successfully" });
        });
    });
});







app.listen(port, () => {
    console.log(`Server is runing on port ${port}`);
});