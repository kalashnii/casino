import express from "express"
import { MongoClient, ObjectId } from "mongodb"
import crypto from "crypto"
import { promisify } from "util";
import session from "express-session";
import MongoStore from "connect-mongo"
import { createServer } from "http";
import { Server } from "socket.io";
import process from "process";
import url from "url";
const pbkdf2 = promisify(crypto.pbkdf2);

process.on("uncaughtException", (error) => console.error(error.stack))

const client = await MongoClient.connect("mongodb://127.0.0.1:27017")
const db = client.db("casino")
const users = db.collection("users")

const app = express()
const port = 80

const httpServer = createServer(app)
const io = new Server(httpServer)

const sessionMiddleware = session({
  secret: "your-secret",
  resave: false,
  saveUninitialized: false,
  cookie: { secure: false, httpOnly: true },
  store: MongoStore.create({ client, dbName: "casino" })
})

app.use(express.static("public", { extensions: ["html"] }))
app.use(express.json())
app.use(sessionMiddleware)
io.engine.use(sessionMiddleware)

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

app.post("/api/v1/users/register", async (req, res) => {
  console.log(req.body)

  const user = await users.findOne({ username: req.body.username })
  if (user) {
    return res.status(400).json({ error: "An error occurred while checking the username.", errorCode: 1 });
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
  
  console.log(req.session.user)

  const user = await users.findOne({ _id: new ObjectId(req.session.user._id) })
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

function generateInitialBetHistory() {
  const history = [];
  for (let i = 0; i < 100; i++) {
    history.push(Math.floor(Math.random() * 15));
  }
  return history;
}
const redBets = []
const blackBets = []
const greenBets = []
let last100 = {
  "red": 0,
  "black": 0,
  "green": 0
}
let betHistory = generateInitialBetHistory()

for (const number of betHistory) {
  const rollColor = getRollColor(number);
  last100[rollColor] += 1;
}
console.log(last100)

app.post("/api/v1/roll/bet", async (req, res) => {
  let user = await users.findOne({ _id: new ObjectId(req.session.user._id) })
  if (user.balance < req.body.betAmount) {
    return res.status(400).json({ error: "You dont have this amount of money" })
  }
  user = await users.findOneAndUpdate({ _id: user._id }, { $inc: { balance: -req.body.betAmount } }, { returnDocument: "after" })
  user = user.value
  io.in(user._id.toString()).emit("balance", user.balance)
  console.log(user._id)
  const bet = { username: user.username, _id: user._id, betAmount: req.body.betAmount, color: req.body.color }

  const color = req.body.color;
  let currentBets;
  if (color === "red") {
    currentBets = redBets;
  } else if (color === "black") {
    currentBets = blackBets;
  } else if (color === "green") {
    currentBets = greenBets;
  }

  const foundBet = currentBets.find((currentBet) => currentBet.username === bet.username);
  if (foundBet) {
    foundBet.betAmount += bet.betAmount;
  } else {
    currentBets.push(bet);
  }

  currentBets.sort((a, b) => b.betAmount - a.betAmount);
  io.emit("currentBets", currentBets, color);

  res.status(200).json({})
})

function getRollColor(number) {
  if (number === 0) {
    return "green"
  }
  if (number > 0 && number < 8) {
    return "red"
  }
  if (number > 7 && number < 15) {
    return "black"
  }
}

let randomNumber = 0
setInterval(async () => {
  randomNumber = Math.floor(Math.random() * 15)
  let bets
  let multiplier
  let loserBets

  const rollColor = getRollColor(randomNumber);
  if (rollColor === "green") {
    bets = greenBets
    multiplier = 15
    loserBets = [...redBets, ...blackBets]
  }
  if (rollColor === "red") {
    bets = redBets
    multiplier = 2
    loserBets = [...greenBets, ...blackBets]
  }
  if (rollColor === "black") {
    bets = blackBets
    multiplier = 2
    loserBets = [...greenBets, ...redBets]
  }

  last100[rollColor] += 1

  const amountWon = {}
  for (const object of bets) {
    const winningAmount = object.betAmount * multiplier;
    let user = await users.findOneAndUpdate({ _id: object._id }, { $inc: { balance: winningAmount } }, { returnDocument: "after" })
    user = user.value;

    setTimeout(() => io.in(object._id.toString()).emit("balance", user.balance), 6000)
    amountWon[object._id.toString()] = winningAmount - object.betAmount
  }

  for (const object of loserBets) {
    const amount = amountWon[object._id.toString()] || 0;
    amountWon[object._id.toString()] = amount - object.betAmount
  }

  setTimeout(() => {
    for (const [_id, amount] of Object.entries(amountWon)) {
      io.in(_id).emit("popup", Math.abs(amount), amount >= 0)
    }
  }, 6000);


  redBets.length = 0
  greenBets.length = 0
  blackBets.length = 0

  betHistory.push(randomNumber)
  if (betHistory.length > 100) {
    const rollColor = getRollColor(betHistory[0])
    last100[rollColor] -= 1
    betHistory.shift()
  }

  console.log(betHistory, "bethistory")
  console.log(last100, "last100")

  setTimeout(() => {
    io.emit("last100", last100)
  }, 6000);

  io.emit("roll", randomNumber)
}, 16000)

const firstTimestamp = new Date().getTime()
function getRemainingTime() {
  const newTimestamp = (new Date().getTime() - firstTimestamp)
  const remainingTime = 16000 - (newTimestamp % 16000)

  return remainingTime
}

io.on("connection", async socket => {
  socket.emit("remainingTime", getRemainingTime(), betHistory[betHistory.length - 1])

  if (socket.request.session.user) {
    const user = await users.findOne({ _id: new ObjectId(socket.request.session.user._id) })
    socket.emit("balance", user.balance)
    socket.join(user._id.toString())
  }

  socket.emit("betHistory", betHistory.slice(-12))
  socket.emit("last100", last100)
  socket.emit("currentBets", redBets, "red")
  socket.emit("currentBets", blackBets, "black")
  socket.emit("currentBets", greenBets, "green")
})

app.get("*", (req, res) => res.redirect(302, "/main"))

app.use((error, req, res, next) => {
  console.error(error.stack)
  res.status(500).send({ error: "Something went wrong" })
})

httpServer.listen(port, () => {
  console.log(`listening on port ${port}`)
})


