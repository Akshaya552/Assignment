const express = require("express");
const app = express();
const path = require("path");
const bcrypt = require("bcryptjs");
const { open } = require("sqlite");
const sqlite3 = require('sqlite3')

const cors = require("cors");
const jwt = require("jsonwebtoken");
app.use(express.json());
app.use(cors());



var LocalStorage = require('node-localstorage').LocalStorage,
localStorage = new LocalStorage('./scratch');
 


const { format, formatDistanceToNow} = require("date-fns");

const dbPath = path.join(__dirname, "hackathonDatabase.db");

let db = null;
 
const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(1627, () => {
      console.log("Server Running at http://localhost:1627/");
    });
  } catch (e) {
    console.log(e);
    process.exit(1);
  }
};

initializeDbAndServer();

app.post("/signup", async (req, res) => {
  const { name, email } = req.body;
    const selectUserQuery = `SELECT * FROM users WHERE email LIKE '${email}';`
    const dbUser = await db.get(selectUserQuery);
    if(dbUser===undefined){
      const hashedPassword = await bcrypt.hash(req.body.password, 10);
    const present = format(new Date(), "MM/dd/yyyy");
      let uniqueId = Date.now();
      const addNewUserQuery = `INSERT INTO users(id,name,email,password,created_at) VALUES(${uniqueId},'${name}','${email.toLowerCase()}','${hashedPassword}','${present}');`;
      await db.run(addNewUserQuery);
      res.send({message:"Registration Success"});
    }else{
      res.status(400)
      res.send({message: 'Email Already Registered'})
    }
  
});

app.post("/login", async (req, res) => {
  const { email, password } = req.body;
  const selectUserQuery = `SELECT * FROM users WHERE email LIKE '${email.toLowerCase()}';`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    res.status(400);
    res.send({message:"Email Not Registered"});
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        email: email.toLowerCase(),
      };
      localStorage.setItem('userId', dbUser.id)
      const jwtToken = jwt.sign(payload, "AUTHENTICATION_TOKEN");
      res.send({ jwtToken });
    } else {
      res.status(400);
      res.send({message:"Invalid Password"});
    }
  }
});

app.get("/notes", async (req, res) => {
  const getAllQuery = `SELECT * FROM notes ORDER BY created_at and pinned desc;`;
  const allData = await db.all(getAllQuery);
  res.send(allData);
});

app.get("/notes/:id/",async(req,res)=>{
    const {id} =req.params
    const getSingleQuery = `SELECT * FROM notes WHERE id=${id};`;
  const data = await db.all(getSingleQuery);
  res.send(data);
})

app.post("/notes", async (req, res) => {
  const { title, content, category } = req.body;
  const present = format(new Date(), "Pp");
  const id = localStorage.getItem('userId')
  let uniqueId = Date.now();
  const addNoteQuery = `INSERT INTO notes 
    (id,title,content,category,created_at,updated_at,pinned,archieved,user_id) 
    VALUES
    (${uniqueId},'${title}','${content}','${category}','${present}','',false,false,${id});`;
  await db.run(addNoteQuery);
  res.send();
});

app.put("/notes/:id/", async (req, res) => {
  const { id } = req.params;
  let updateNotesQuery;
  const updated = format(new Date(),"Pp")
  const { title, content, category } = req.body;
  if (title !== undefined) {
    updateNotesQuery = `UPDATE notes SET title = '${title}', updated_at = '${updated}' WHERE id=${id};`;
    db.run(updateNotesQuery);
  }
  if (content !== undefined) {
    updateNotesQuery = `UPDATE notes SET content = '${content}', updated_at = '${updated}' WHERE id=${id};`;
    db.run(updateNotesQuery);
  }

  if (category !== undefined) {
    updateNotesQuery = `UPDATE notes SET category = '${category}', updated_at = '${updated}' WHERE id=${id};`;
    db.run(updateNotesQuery);
  }
});

app.delete("/notes/:id/", async (req, res) => {
  const { id } = req.params;
  const deleteQuery = `DELETE FROM notes WHERE id=${id};`;
  db.run(deleteQuery);
  res.send()
});

app.patch('/notes/:id/pin', async(req,res)=>{
  const {id} = req.params
  const{pinned} = req.body
  const updated = format(new Date(),"Pp")
  const pinPatchQuery = `UPDATE notes SET pinned = ${pinned},updated_at = '${updated}' WHERE id=${id};` 
  db.run(pinPatchQuery)
  res.send("Pin successful")
})


app.patch('/notes/:id/archive', async(req,res)=>{
  const {id} = req.params
  const updated = format(new Date(),"Pp")
  const{archieved} = req.body
  const archivePatchQuery = `UPDATE notes SET archieved = ${archieved},updated_at = '${updated}' WHERE id=${id};` 
  db.run(archivePatchQuery)
  res.send()
})