// Make sure the number of cards is odd. The first number will always be in the middle at the start
const CARD_ORDER = [0, 11, 5, 10, 6, 9, 7, 8, 1, 14, 2, 13, 3, 12, 4];
const NUMBER_OF_ROWS = 29;
const SPIN_TIME = 6 * 1000
let remainingTime;
let remainingStartEpoch;
let cooldownTime = 10 * 1000;
const socket = io()

addEventListener("load", async () => {
  createWheelElements();
  const user = await getUser();

  if (user) {
    document.getElementById("navLogin").remove()
    document.getElementById("navRegister").remove()

    const navbar = document.getElementById("navbar")
    const newListItem = document.createElement("li")
    newListItem.innerHTML = "<a id='logout' href='Main.html'>Logout</a>"
    navbar.querySelector(".nav-links").appendChild(newListItem)

    const logout = document.getElementById('logout')
    logout.addEventListener('click', async (event) => {
      event.preventDefault()
      const response = await fetch("/api/v1/users/logout")
      window.location = "/main.html"
    })

    document.getElementById("balance").textContent = user.balance
    document.getElementById("username").textContent = user.username

    async function placeBet(color) {
      const betAmount = +document.getElementById("bet-amount").value
      if (betAmount > 0) {
        const data = { betAmount: betAmount, color: color }
        await bet(data)
      }
      else {
        alert("enter a valid amount")
      }
    }


    document.getElementById("bet-red").addEventListener("click", async () => {
      placeBet("red")
    })
    document.getElementById("bet-black").addEventListener("click", async () => {
      placeBet("black")
    })
    document.getElementById("bet-green").addEventListener("click", async () => {
      placeBet("green")
    })

    async function bet(data) {
      const response = await fetch("/api/v1/roll/bet", {
        method: "POST",
        body: JSON.stringify(data),
        headers: { "content-type": "application/json" }
      })
      const responseData = await response.json()
    }


  }

  if (!user) {
    document.getElementById("userInfo").style.display = "none"
    document.getElementById("userInfoSplitter").style.display = "none"
  }

  const timerElement = document.getElementById("timer");
  const timerBarElement = document.getElementById("timer-bar");

  const timerTimeMs = cooldownTime
  const timerDelayMs = SPIN_TIME;
  const totalTimeMs = timerTimeMs + timerDelayMs;
  const timerIntervalMs = 10;

  let waitingForNext = false;
  function updateTimer() {
    if (waitingForNext) {
      return;
    }

    const remainingTimeNow = remainingTime - (new Date().getTime() - remainingStartEpoch);
    if (remainingTimeNow > 0) {
      timerElement.textContent = (remainingTimeNow / 1000).toFixed(0);
      timerBarElement.style.width = (remainingTimeNow / Math.max(timerTimeMs, remainingTimeNow)) * 100 + "%";
    }
    else if (remainingTimeNow <= 0) {
      timerElement.textContent = 0;
      timerBarElement.style.width = "0%";

      waitingForNext = true;

      setTimeout(() => {
        const now = new Date().getTime();
        const timeSinceLast = now - (remainingStartEpoch + remainingTime);
        const next = totalTimeMs - (timeSinceLast % totalTimeMs);

        remainingStartEpoch = now;
        remainingTime = next;
        waitingForNext = false;
      }, timerDelayMs);
    }
  }

  const timer = setInterval(updateTimer, timerIntervalMs);


});

function rotate(array, count) {
  for (let i = 0; i < count; i++) {
    array.push(array.shift());
  }
  return array;
}

function generateWheelRowCards() {
  let elementText = "";
  let red = true;

  const cards = rotate([...CARD_ORDER], CARD_ORDER.length / 2);
  for (const card of cards) {
    let color;
    if (card === 0) {
      color = "green";
    } else {
      color = red ? "red" : "black";
      red = !red;
    }
    elementText += `<div class="card ${color}">${card}</div>`;
  }
  return elementText;
}

function createWheelElements() {
  const wheel = document.getElementById("wheel");
  const wheelRowCards = generateWheelRowCards();

  for (let i = 0; i < NUMBER_OF_ROWS; i++) {
    const row = document.createElement("div");
    row.classList.add("row");
    row.innerHTML = wheelRowCards;

    wheel.append(row);
  }
}

async function spinWheel(numberToLandOn, remainingTime) {
  const wheel = document.getElementById("wheel");
  const position = CARD_ORDER.indexOf(numberToLandOn);



  /* 
   * Determines how many rows to go across before stopping,
   * the larger the number is the faster its initial velocity is,
   * this may not be larger than 12 or less than 0
   */
  const defaultRowsToSpin = 10;
  const defaultTimeToSpin = SPIN_TIME;

  const percentage = (remainingTime != undefined ? remainingTime : defaultTimeToSpin) / defaultTimeToSpin;
  const rowsToSpin = Math.round(defaultRowsToSpin * percentage);
  const timeToSpin = Math.round(defaultTimeToSpin * percentage);

  // The HTML width of the card element
  const cardWidth = 75;
  // The HTML margin/padding between each card to account for
  const cardPadding = 3 * 2;
  // The total amount of pixels occupied by each card
  const card = cardWidth + cardPadding;

  /* 
   * A random position inside of the the card to land on,
   * whether it lands at the start, end or in the middle of
   * the card is determined by this
   */
  const positionInCardToLandOn = Math.floor(Math.random() * cardWidth) - (cardWidth / 2);
  // The position of the card to land on
  const positionToLandOn = (rowsToSpin * 15 * card) + (position * card) + positionInCardToLandOn;

  const x = Math.floor(Math.random() * 50) / 100;
  const y = Math.floor(Math.random() * 20) / 100;

  wheel.style["transition-timing-function"] = `cubic-bezier(0, ${x}, ${y}, 1)`;
  wheel.style["transition-duration"] = timeToSpin + "ms";
  wheel.style["transform"] = `translate3d(-${positionToLandOn}px, 0px, 0px)`;

  return new Promise((resolve) => {
    setTimeout(() => {
      wheel.style["transition-timing-function"] = "";
      wheel.style["transition-duration"] = "";

      const resetTo = -(position * card + positionInCardToLandOn);
      wheel.style["transform"] = `translate3d(${resetTo}px, 0px, 0px)`;

      resolve();
    }, timeToSpin);
  })
}


async function getUser() {
  const response = await fetch("/api/v1/users/@me")
  const responseData = await response.json()

  if (response.ok) {
    return responseData
  }
  return null
}

socket.on("roll", async (randomNumber) => {
  disableButtons(true)
  await spinWheel(randomNumber)
  disableButtons(false)
  removeCurrentBets()

  const rouletteHistory = document.getElementById('rouletteHistory');
  addBetHistory(randomNumber)
  if (rouletteHistory.childElementCount > 12) {
    rouletteHistory.children[0].remove()
  }
})

socket.on("remainingTime", async timeLeft => {

  remainingTime = timeLeft;
  remainingStartEpoch = new Date().getTime();

  const lastNumber = 0;
  if (remainingTime > cooldownTime) {
    disableButtons(true)
    await spinWheel(lastNumber, remainingTime - cooldownTime);
    disableButtons(false)

  } else {
    disableButtons(false)
    spinWheel(lastNumber, 0);
  }
})

socket.on("balance", balance => {
  document.getElementById("balance").textContent = balance
})

function addBetHistory(rollNumber) {
  const rouletteHistory = document.getElementById('rouletteHistory');
  const historyItem = document.createElement('div');
  historyItem.classList.add('history-item');
  historyItem.textContent = `${rollNumber}`;
  if (rollNumber == 0) {
    historyItem.style.backgroundColor = "#00C74D";
    historyItem.style.paddingLeft = "8px";
  }
  if (rollNumber > 0 && rollNumber < 8) {
    historyItem.style.backgroundColor = "#F95146";
    historyItem.style.paddingLeft = "8px";
  }
  if (rollNumber > 7 && rollNumber < 10) {
    historyItem.style.backgroundColor = "#2D3035";
    historyItem.style.paddingLeft = "8px";
  }
  if (rollNumber > 9 && rollNumber < 15) {
    historyItem.style.backgroundColor = "#2D3035";
    historyItem.style.paddingLeft = "2px";
  }

  rouletteHistory.appendChild(historyItem);
}

socket.on("betHistory", bets => {
  if (bets.length === 0) {
    return
  }
  for (const bet of bets) {
    addBetHistory(bet)
  }
})

socket.on("last100", last100 => {
  document.getElementById("last-100-green").textContent = `${last100["green"]}`
  document.getElementById("last-100-black").textContent = `${last100["black"]}`
  document.getElementById("last-100-red").textContent = `${last100["red"]}`
})

socket.on("currentBets", (currentBets, color) => {
  addCurrentBets(currentBets, color)
})

function disableButtons(boolean) {
  document.getElementById("bet-red").disabled = boolean
  document.getElementById("bet-black").disabled = boolean
  document.getElementById("bet-green").disabled = boolean
}

function addCurrentBets(currentBets, color) {
  let totalBetAmount = 0
  let totalBetID
  let totalAmountID
  console.log(currentBets, "asdasd")
  let ul
  if (color === "red") {
    ul = document.getElementById("container1Bets")
    totalAmountID = "tb1"
    totalBetID = "ta1"
  }
  if (color === "black") {
    ul = document.getElementById("container2Bets")
    totalAmountID = "tb2"
    totalBetID = "ta2"
  }
  if (color === "green") {
    ul = document.getElementById("container3Bets")
    totalAmountID = "tb3"
    totalBetID = "ta3"
  }

  while (ul.firstChild) {
    ul.removeChild(ul.firstChild);
  }

  for (const currentBet of currentBets) {
    totalBetAmount += currentBet.betAmount
    const li = document.createElement("li")

    li.innerHTML = `<div class="user-container"> </div>`
    li.firstChild.textContent = `${currentBet.username} ${currentBet.betAmount}🟡`
    ul.appendChild(li)
  }
  document.getElementById(totalBetID).textContent = `${totalBetAmount} 💰`
  document.getElementById(totalAmountID).textContent = `Total Bets ${currentBets.length}`
}

function removeCurrentBets() {
  var ul1 = document.getElementById("container1Bets")
  var ul2 = document.getElementById("container2Bets")
  var ul3 = document.getElementById("container3Bets")

  while (ul1.firstChild) {
    ul1.removeChild(ul1.firstChild);
  }
  while (ul2.firstChild) {
    ul2.removeChild(ul2.firstChild);
  }
  while (ul3.firstChild) {
    ul3.removeChild(ul3.firstChild);
  }

  document.getElementById("ta1").textContent = `0 💰`
  document.getElementById("tb1").textContent = `Total Bets 0`
  document.getElementById("ta2").textContent = `0 💰`
  document.getElementById("tb2").textContent = `Total Bets 0`
  document.getElementById("ta3").textContent = `0 💰`
  document.getElementById("tb3").textContent = `Total Bets 0`
}

socket.on("popup", (amount, isWinningBet) => {
  popup(amount, isWinningBet)
})


function popup(amount, isWinningBet) {
  let text, color;
  if (isWinningBet) {
    text = `You won ${amount} 🔥🔥🔥🔥`
    color = "#4CAF50"
  } else {
    text = `You lost ${amount} ❌❌❌❌`
    color = "#FF0000"
  }

  const notification = document.getElementById("notification");
  document.getElementById("popupText").textContent = text;
  notification.style.backgroundColor = color;

  function showPopup() {
    notification.style.top = "0"
    setTimeout(hidePopup, 2000)
  }

  function hidePopup() {
    notification.style.top = "-80px"
  }


  showPopup()
}
