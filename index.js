let firstCard = null;
let secondCard = null;
let lockBoard = false;
let timeLeft = 60;
let timerInterval;
let totalPairs = 6;
let matchedPairs = 0;
let gameActive = true;
let clickCount = 0;
let powerUsed = false;

const difficultySettings = {
  easy: { pairs: 3, time: 30 },
  medium: { pairs: 6, time: 45 },
  hard: { pairs: 9, time: 60 }
};

async function fetchUniquePokemonSprites(count = 6) {
  const maxPokemonId = 898;
  const pokemonImages = [];
  const usedIds = new Set();

  while (pokemonImages.length < count) {
    const randomId = Math.floor(Math.random() * maxPokemonId) + 1;
    if (usedIds.has(randomId)) continue;

    try {
      const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${randomId}`);
      const data = await res.json();
      const sprite = data.sprites.other?.['official-artwork']?.front_default || data.sprites.front_default;

      if (sprite && typeof sprite === 'string' && sprite.startsWith('http')) {
        pokemonImages.push(sprite);
        usedIds.add(randomId);
      }
    } catch (err) {
      console.warn(`Failed to fetch or parse Pokémon ID ${randomId}`, err);
    }
  }

  const paired = [];
  for (let i = 0; i < pokemonImages.length; i++) {
    paired.push(pokemonImages[i], pokemonImages[i]);
  }

  return shuffleArray(paired);
}

function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
  return array;
}

function renderCardsToGrid(images) {
  const gameGrid = $('#game_grid');
  gameGrid.empty();
  matchedPairs = 0;
  gameActive = true;

  let html = '';
  for (let i = 0; i < images.length; i++) {
    html += `
      <div class="card">
        <img class="front_face" src="${images[i]}" data-src="${images[i]}">
        <img class="back_face" src="back.webp">
      </div>
    `;
  }

  gameGrid.append(html);
  $('.card').off('click').on('click', onCardClick);
}

function activatePowerUp() {
  if (powerUsed || !gameActive) return;
  powerUsed = true;

  $('.card').addClass('flip');

  setTimeout(() => {
    const cards = document.querySelectorAll('.card');
    for (let i = 0; i < cards.length; i++) {
      if (!cards[i].classList.contains('matched')) {
        cards[i].classList.remove('flip');
      }
    }
  }, 2000);

  $('#powerUpBtn').prop('disabled', true).text('Power-Up Used');
}

function onCardClick() {
  if (!gameActive || lockBoard || $(this).hasClass('flip') || $(this).hasClass('matched')) return;

  clickCount++;
  updateGameStats();
  $(this).addClass('flip');

  if (!firstCard) {
    firstCard = $(this).find('.front_face')[0];
    return;
  }

  secondCard = $(this).find('.front_face')[0];
  lockBoard = true;

  const isMatch = firstCard.dataset.src === secondCard.dataset.src;

  if (isMatch) {
    matchedPairs++;
    $(firstCard).parent().addClass('matched').off('click');
    $(secondCard).parent().addClass('matched').off('click');
    updateGameStats();

    if (matchedPairs === totalPairs) finalizeGame(true);
    resetCardState();
  } else {
    setTimeout(() => {
      $(firstCard).parent().removeClass('flip');
      $(secondCard).parent().removeClass('flip');
      resetCardState();
    }, 1000);
  }
}

function updateGameStats() {
  $('#clicks').text(clickCount);
  $('#matched').text(matchedPairs);
  $('#remaining').text(totalPairs - matchedPairs);
  $('#total').text(totalPairs);
}

function finalizeGame(won) {
  gameActive = false;
  clearInterval(timerInterval);
  $('#popupMessage').text(won ? "You Win!" : "You Lose.");
  $('#endPopup').css('display', 'flex');
}

function resetCardState() {
  [firstCard, secondCard, lockBoard] = [null, null, false];
}

function beginCountdown(seconds) {
  clearInterval(timerInterval);
  timeLeft = seconds;
  $('#timer').text(`Time: ${timeLeft}s`);

  timerInterval = setInterval(() => {
    timeLeft--;
    $('#timer').text(`Time: ${timeLeft}s`);
    if (timeLeft <= 0) finalizeGame(false);
  }, 1000);
}

async function initializeGame() {
  const level = $('#difficulty').val();
  const config = difficultySettings[level];

  totalPairs = config.pairs;
  matchedPairs = 0;
  clickCount = 0;
  powerUsed = false;
  gameActive = true;

  $('#powerUpBtn').prop('disabled', false).text('🔍 Use Power-Up');
  $('#message').text('');
  updateGameStats();

  const images = await fetchUniquePokemonSprites(totalPairs);
  renderCardsToGrid(images);
  beginCountdown(config.time);

  const gridSize = { easy: 3, medium: 4, hard: 6 }[level];
  $('#game_grid').css({
    'grid-template-columns': `repeat(${gridSize}, 110px)`,
    'justify-content': 'center'
  });
}

$(document).ready(() => {
  $('#startBtn').on('click', initializeGame);
  $('#resetBtn').on('click', initializeGame);
  $('#powerUpBtn').on('click', activatePowerUp);
  $('#returnBtn').on('click', () => location.reload());

  const initialTheme = $('#theme').val();
  $('body').removeClass('dark light').addClass(initialTheme);

  $('#theme').on('change', () => {
    const selectedTheme = $('#theme').val();
    $('body').removeClass('dark light').addClass(selectedTheme);
  });
});