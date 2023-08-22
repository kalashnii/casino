import express from 'express'
import { MongoClient, ObjectId } from 'mongodb'
import crypto from 'crypto'
import { promisify } from "util";
import session from 'express-session';
import MongoStore from 'connect-mongo'
const pbkdf2 = promisify(crypto.pbkdf2);

const client = await MongoClient.connect('mongodb://127.0.0.1:27017')
const db = client.db("casino")
const users = await db.createCollection("users")
// await users.insertOne({
//   username:"dogger",
//   password:"meow"
// })
// console.log(await users.find({username:"dogger"}).toArray())

const app = express()
const port = 8080

app.use(express.static('public'))
app.use(express.json());
app.use(session({
  secret: 'your-secret',
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true },
  store: MongoStore.create({ client, dbName: "casino" })
}))

async function hashPassword(password, salt) {
  const hashedPassword = await pbkdf2(
    password,
    salt,
    100000,
    64,
    "sha512",
  )
  return hashedPassword.toString("base64")
}

app.post('/api/v1/users/register', async (req, res) => {
  console.log(req.body)
  const user = await users.findOne({ username: req.body.username })

  if (user) {
    return res.status(400).json({ error: 'An error occurred while checking the username.', errorCode: 1 });
  }

  if (req.body.password.length < 5) {
    return res.status(400).json({ error: "Password must be at least 5 characters long", errorCode: 2 });
  }

  const salt = crypto.randomBytes(16).toString("base64")

  const hashedPassword = await hashPassword(req.body.password, salt)

  await users.insertOne({
    username: req.body.username,
    password: hashedPassword,
    salt: salt,
    balance: 500
  })

})

app.post("/api/v1/users/login", async (req, res) => {

  const user = await users.findOne({ username: req.body.username })

  if (!user) {
    return res.status(401).json({ error: "user not found", errorCode: 3 })
  }

  const hashedEnteredPassword = await hashPassword(req.body.password, user.salt)

  if (hashedEnteredPassword !== user.password) {
    return res.status(401).json({ error: "password was incorrect", errorCode: 4 })
  }

  req.session.user = { _id: user._id }

  return res.status(200).json({ message: "login successful." })
})

app.get("/api/v1/users/@me", async (req, res) => {
  if (!req.session.user) {
    return res.status(401).json({ error: "not logged in", errorCode: 5 })
  }
  const user = await users.findOne({ _id: new ObjectId(req.session.user._id) })

  console.log(req.session.user)

  if (!user) {
    return res.status(401).json({ error: "user not found", errorCode: 6 })
  }

  return res.status(200).json({ username: user.username, balance: user.balance })

})


app.listen(port, () => {
  console.log(`listening on port ${port}`)
})

