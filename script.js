// Загрузка историй из JSON
async function loadStories() {
  try {
    const response = await fetch('stories.json');
    const stories = await response.json();
    return stories;
  } catch (error) {
    console.error('Ошибка загрузки stories.json:', error);
    // Заглушка на случай ошибки
    return {
      "1": {
        "text": "Ошибка загрузки историй",
        "options": {
          "A": { "outcome": "Попробуй обновить страницу", "premium": false }
        }
      }
    };
  }
}

// Проверка: запущено ли во ВКонтакте
function isInVK() {
  return /VK/.test(navigator.userAgent);
}

// Инициализация
let STORIES = {};
let userId = 'demo123';

async function initApp() {
  // Проверка подлинности для VK
  const urlParams = new URLSearchParams(window.location.search);
  const vkUserId = urlParams.get('vk_user_id');
  const vkAppId = urlParams.get('vk_app_id');
  const vkIsAppUser = urlParams.get('vk_is_app_user');
  const vkIsFavorite = urlParams.get('vk_is_favorite');
  const vkRef = urlParams.get('vk_ref');
  
  // Если параметры VK есть — это настоящий запуск в приложении
  const isRealVK = vkUserId && vkAppId;
  
  // Загружаем истории
  STORIES = await loadStories();

  if (isRealVK && isInVK()) {
    try {
      // Инициализируем VK Bridge
      const { bridge } = await import('https://unpkg.com/@vkontakte/vk-bridge/dist/vk-bridge.umd.js');
      bridge.send('VKWebAppInit');
      
      // Получаем данные пользователя
      const user = await bridge.send('VKWebAppGetUserInfo');
      userId = user.id;
      
      // Отправляем статистику для корректной работы stats.vk-portal.net
      bridge.send('VKWebAppConversionHit', { 
        pixel_code: 'default' 
      }).catch(e => console.log('Stats init:', e));
      
      showRandomStory();
    } catch (e) {
      console.error('VK Error:', e);
      showRandomStory();
    }
  } else {
    // Локальный демо-режим
    userId = 'demo123';
    showRandomStory();
    showDemoNote();
  }
}

// ПОКАЗ ИГРЫ
function getRandomFreeStoryId() {
  const freeIds = Object.keys(STORIES).filter(id => 
    !Object.values(STORIES[id].options).some(opt => opt.premium)
  );
  return freeIds[Math.floor(Math.random() * freeIds.length)];
}

function showRandomStory(storyId = null) {
  const id = storyId || getRandomFreeStoryId();
  const story = STORIES[id];
  if (!story) return;

  let html = `<div class="story-box">${story.text}</div>`;

  for (const key in story.options) {
    const opt = story.options[key];
    if (opt.premium) {
      html += `<button class="btn btn-premium" onclick="premiumStub('${id}', '${key}')">💎 ${key} (Премиум)</button>`;
    } else {
      html += `<button class="btn btn-free" onclick="showResult('${id}', '${key}')">${key}</button>`;
    }
  }

  document.getElementById('game').innerHTML = html;
}

// РЕЗУЛЬТАТ
function showResult(storyId, choice) {
  const outcome = STORIES[storyId].options[choice].outcome;
  
  const friends = ["@ivan → 'Кот-хакер'", "@maria → 'ИИ-бариста'", "@petr → 'Президент Марса'"];
  const randomFriends = friends.sort(() => 0.5 - Math.random()).slice(0, 2).join('\n');
  const rarity = outcome.includes("999/100") || outcome.includes("MAX") ? "Легендарная" : "Эпическая";

  const resultHtml = `
    <div class="result" id="resultBox">${outcome}<div class="rarity">💎 Редкость: ${rarity}</div></div>
    <div class="friends">👀 ВАШИ ДРУЗЬЯ:<br>${randomFriends}<br>— Вы → <b>${getTitle(outcome)}</b> 👑</div>
    <button class="btn btn-share" onclick="shareResult()">📲 Сравнить судьбы?</button>
    <button class="btn btn-free" onclick="showRandomStory()">🔁 Сыграть ещё</button>
    <button class="btn btn-premium" onclick="showPremium()">💎 Премиум-судьбы</button>
  `;

  document.getElementById('game').innerHTML = resultHtml;
  
  if (rarity === "Легендарная") triggerConfetti();
}

// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
function getTitle(outcome) {
  const lines = outcome.split('\n');
  for (let line of lines) {
    if (line.includes("ТЫ СТАЛ: ")) {
      return line.split("ТЫ СТАЛ: ")[1].replace(/[💎🏆🌀✨]/g, '').trim();
    }
  }
  return "Тайная личность";
}

function shareResult() {
  const link = isInVK() 
    ? `https://vk.com/app54388761?ref=${userId}`
    : "https://vk.com/app123456789?ref=demo123";
  
  if (isInVK()) {
    import('https://unpkg.com/@vkontakte/vk-bridge/dist/vk-bridge.umd.js').then(({ bridge }) => {
      bridge.send('VKWebAppShare', { link });
    });
  } else {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(link).then(() => {
        alert('🔗 Ссылка скопирована!\n' + link);
      });
    }
  }
}

function showPremium() {
  const premiumIds = Object.keys(STORIES).filter(id => 
    Object.values(STORIES[id].options).some(opt => opt.premium)
  );
  if (premiumIds.length > 0) {
    showRandomStory(premiumIds[0]);
  }
}

function premiumStub(storyId, choice) {
  if (isInVK()) {
    alert('Премиум-истории скоро! (VK Pay будет подключен)');
  } else {
    alert('✨ Демо: Премиум будет во ВКонтакте');
  }
  showResult(storyId, choice);
}

function triggerConfetti() {
  // (тот же код, что в предыдущем ответе — для краткости опущен)
  const confettiContainer = document.getElementById('confetti');
  confettiContainer.innerHTML = '';
  confettiContainer.style.opacity = '1';
  for (let i = 0; i < 50; i++) {
    const emoji = ['🎉', '💎', '✨', '🚀', '👑'][Math.floor(Math.random() * 5)];
    const confetti = document.createElement('div');
    confetti.textContent = emoji;
    Object.assign(confetti.style, {
      position: 'absolute',
      fontSize: (Math.random() * 20 + 10) + 'px',
      left: Math.random() * 100 + 'vw',
      top: '-20px',
      opacity: String(Math.random()),
      zIndex: '100'
    });
    confettiContainer.appendChild(confetti);
    const duration = Math.random() * 3 + 2;
    confetti.animate([
      { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
      { transform: `translateY(${window.innerHeight}px) rotate(${360 * (Math.random() > 0.5 ? 1 : -1)}deg)`, opacity: '0' }
    ], { duration: duration * 1000, easing: 'cubic-bezier(0,0.5,0.5,1)' });
  }
  setTimeout(() => confettiContainer.style.opacity = '0', 5000);
}

function showDemoNote() {
  const note = document.createElement('div');
  note.className = 'demo-note';
  note.innerHTML = '💡 Локальный демо-режим<br>Во ВКонтакте будет кнопка «Поделиться»';
  document.querySelector('.container').appendChild(note);
}

// ЗАПУСК
document.addEventListener('DOMContentLoaded', initApp);
