// Make sure the number of cards is odd. The first number will always be in the middle at the start
const CARD_ORDER = [0, 11, 5, 10, 6, 9, 7, 8, 1, 14, 2, 13, 3, 12, 4];
const NUMBER_OF_ROWS = 29;
let remainingTime;
let remainingStartEpoch;
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

    document.getElementById("username").textContent = user.username
    document.getElementById("balance").textContent = user.balance

    document.getElementById("bet-red").addEventListener("click", () => {
      const betAmount = +document.getElementById("bet-amount").value
      console.log(betAmount)
      if (betAmount > 0) {
        const data = { betAmount: betAmount, color: "red" }
        bet(data)
      }
      else{
        alert("enter a valid amount")
      }       
    })
    document.getElementById("bet-black").addEventListener("click", () => {
      const betAmount = +document.getElementById("bet-amount").value
      console.log(betAmount)
      if (betAmount > 0) {
        const data = { betAmount: betAmount, color: "black" }
        bet(data)
      }
      else{
        alert("enter a valid amount")
      }       
    })
    document.getElementById("bet-green").addEventListener("click", () => {
      const betAmount = +document.getElementById("bet-amount").value
      console.log(betAmount)
      if (betAmount > 0) {
        const data = { betAmount: betAmount, color: "green" }
        bet(data)
      }
      else{
        alert("enter a valid amount")
      }       
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

  const timerTimeMs = 10 * 1000;
  const timerDelayMs = 6 * 1000;
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

// async function spinWheelRemote() {

//   const response = await fetch("/api/v1/roulette/roll")
//   const responseData = await response.json()

//   spinWheel(responseData.numberToLandOn)
// }


function spinWheel(numberToLandOn) {
  const wheel = document.getElementById("wheel");
  const position = CARD_ORDER.indexOf(numberToLandOn);

  /* 
   * Determines how many rows to go across before stopping,
   * the larger the number is the faster its initial velocity is,
   * this may not be larger than 12 or less than 0
   */
  const rowsToSpin = 10;

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
  wheel.style["transition-duration"] = "6s";
  wheel.style["transform"] = `translate3d(-${positionToLandOn}px, 0px, 0px)`;

  setTimeout(() => {
    wheel.style["transition-timing-function"] = "";
    wheel.style["transition-duration"] = "";

    const resetTo = -(position * card + positionInCardToLandOn);
    wheel.style["transform"] = `translate3d(${resetTo}px, 0px, 0px)`;
  }, 6 * 1000);
}

async function getUser() {
  const response = await fetch("/api/v1/users/@me")
  const responseData = await response.json()

  if (response.ok) {
    return responseData
  }
  return null
}

// async function getRemainingTime() {
//   const response = await fetch("/api/v1/roulette/currentRoll")
//   const responseData = await response.json()
//   return responseData.remainingTime

// }

const socket = io()
socket.on("connect", () => {
  console.log(`u are connected: ${socket.id}`)
})

socket.on("roll", randomNumber => {
  console.log(randomNumber)
  spinWheel(randomNumber)
})

socket.on("remainingTime", timeLeft => {
  remainingTime = Math.ceil(timeLeft / 10)
  console.log(remainingTime)

  remainingTime = timeLeft;
  remainingStartEpoch = new Date().getTime();
})






