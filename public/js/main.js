// Make sure the number of cards is odd. The first number will always be in the middle at the start
const CARD_ORDER = [0, 11, 5, 10, 6, 9, 7, 8, 1, 14, 2, 13, 3, 12, 4];
const NUMBER_OF_ROWS = 29;

addEventListener("load", async () => {
  createWheelElements();
  const user = await getUser();

  const elementUsername = document.getElementById("username")
  elementUsername.textContent = user.username
  const elementBalance = document.getElementById("balance")
  elementBalance.textContent = user.balance

  const timerElement = document.getElementById("timer");
  const timerBarElement = document.getElementById("timer-bar");
  let remainingTime = 1000;
  const timerInterval = 10; // 1 second in milliseconds

  function updateTimer() {
    if (remainingTime > 0) {
      remainingTime -= 1;
      timerElement.textContent = (remainingTime / 100).toFixed(0);
      timerBarElement.style.width = (remainingTime / 1000) * 100 + "%";
    }
    else if (remainingTime === 0) {
      remainingTime = -1
      const outcomeInput = document.getElementById("outcome-input");
      const outcome = parseInt(outcomeInput.value) || Math.ceil(Math.random() * CARD_ORDER.length);
      spinWheel(outcome);
      setTimeout(() => {
        remainingTime = 1000
      }, 6000);

    }
  }
  const timer = setInterval(updateTimer, timerInterval);

  document.getElementById("spin-button").addEventListener("click", () => {
    const outcomeInput = document.getElementById("outcome-input");
    const outcome = parseInt(outcomeInput.value) || Math.ceil(Math.random() * CARD_ORDER.length);
    spinWheel(outcome);
  });
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

  return responseData
}







