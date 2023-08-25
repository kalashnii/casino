import express from 'express'
import { MongoClient, ObjectId } from 'mongodb'
import crypto from 'crypto'
import { promisify } from "util";
import session from 'express-session';
import MongoStore from 'connect-mongo'
import { createServer } from 'http';
import { Server } from 'socket.io';
const pbkdf2 = promisify(crypto.pbkdf2);

const client = await MongoClient.connect('mongodb://127.0.0.1:27017')
const db = client.db("casino")
const users = await db.createCollection("users")

const app = express()
const port = 8080

const httpServer = createServer(app)
const io = new Server(httpServer)



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

  const result = await users.insertOne({
    username: req.body.username,
    password: hashedPassword,
    salt: salt,
    balance: 500
  })

  req.session.user = { _id: result.insertedId }

  return res.status(200).json({})

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

app.get("/api/v1/users/logout", async (req, res) => {
  req.session.destroy(() => {
    res.status(200).json({})
  })
})

const redBets = []
const blackBets = []
const greenBets = []

app.post("/api/v1/roll/bet", async (req, res) => {
  const user = await users.findOne({ _id: new ObjectId(req.session.user._id) })
  if (user.balance < req.body.betAmount) {
    return res.status(400).json({ error: "You dont have this amount of money" })
  }
  users.updateOne({ _id: user._id }, { $inc: { balance: -req.body.betAmount } })
  const bet = { userID: user._id, betAmount: req.body.betAmount, color: req.body.color }

  if (req.body.color === "red") {
    redBets.push(bet)
  }
  if (req.body.color === "black") {
    blackBets.push(bet)
  }
  if (req.body.color === "green") {
    greenBets.push(bet)
  }
  console.log(req.body)
})

let randomNumber = 0
setInterval(async () => {
  randomNumber = Math.floor(Math.random() * 15)
  let bets
  let multiplier
  if (randomNumber === 0) {
    bets = greenBets
    multiplier = 15
  }
  if (randomNumber > 0 && randomNumber < 8) {
    bets = redBets
    multiplier = 2
  }
  if (randomNumber > 7 && randomNumber < 15) {
    bets = blackBets
    multiplier = 2
  }
  console.log(bets)
  for (const object of bets) {
    users.updateOne({ userID: object._id }, { $inc: { balance: object.betAmount * multiplier } })
  }
  redBets.length = 0
  greenBets.length = 0
  blackBets.length = 0

  io.emit("roll", randomNumber)
}, 16000)

const firstTimestamp = new Date().getTime()
function getRemainingTime() {
  const newTimestamp = (new Date().getTime() - firstTimestamp)
  const remainingTime = 16000 - (newTimestamp % 16000)

  return remainingTime
}

io.on("connection", socket => {
  console.log(socket.id)
  socket.emit("remainingTime", getRemainingTime())
})


httpServer.listen(port, () => {
  console.log(`listening on port ${port}`)
})