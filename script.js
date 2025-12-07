// ======================
// ГЛОБАЛЬНЫЕ ПЕРЕМЕННЫЕ
// ======================
let STORIES = {};
let userId = 'demo123';
const APP_ID = '5198765432'; // ЗАМЕНИ НА СВОЙ РЕАЛЬНЫЙ APP ID

// ======================
// ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// ======================
function isInVK() {
  return window.location.search.includes('vk_') || 
         window.navigator.userAgent.includes('VK') ||
         window.location.hostname.includes('vk.com');
}

function getVKParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    vkUserId: params.get('vk_user_id'),
    vkAppId: params.get('vk_app_id'),
    vkIsAppUser: params.get('vk_is_app_user'),
    vkRef: params.get('vk_ref'),
    vkAccessToken: params.get('vk_access_token'),
    vkAuth: params.get('vk_auth')
  };
}

// ======================
// ИНИЦИАЛИЗАЦИЯ
// ======================
async function initApp() {
  // Отключаем проверку referrer на глобальном уровне
  if ('referrerPolicy' in document) {
    document.referrerPolicy = 'no-referrer';
  }
  
  // Загружаем истории
  try {
    const response = await fetch('stories.json', {
      mode: 'cors',
      credentials: 'omit',
      headers: {
        'Accept': 'application/json'
      }
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    STORIES = await response.json();
  } catch (error) {
    console.error('Ошибка загрузки историй:', error);
    // Фолбэк-истории
    STORIES = {
      "1": {
        "text": "🔥 Ты проснулся в теле ИИ, который управляет всеми мемами Вселенной...\n\nЧто запустишь?",
        "options": {
          "A": {
            "outcome": "💥 ТЫ СТАЛ: МЕМ-БОГ\n\nТвой мем «Плачь как Байден на балалайке»\nпросмотрели 2.1 млрд человек.\nТы запрещён в 3 галактиках.\n\n🏆 Уровень хаоса: 999/100",
            "premium": false
          },
          "B": {
            "outcome": "🕊️ ТЫ СТАЛ: МИРОТВОРЕЦ МЕМОВ\n\nТы убедил всех, что «кот с огурцом» — это искусство.\nМир объединился в хохоте.\n\n☮️ Уровень мира: 100/100",
            "premium": false
          }
        }
      }
    };
  }

  const vkParams = getVKParams();
  const isRealVK = vkParams.vkUserId && vkParams.vkAppId;
  
  if (isRealVK && isInVK()) {
    try {
      // Инициализируем VK Bridge
      const vkModule = await import('https://unpkg.com/@vkontakte/vk-bridge@2.12.2/dist/vk-bridge.umd.js');
      const { bridge } = vkModule.default || vkModule;
      
      // Отключаем проверку referrer для VK запросов
      if (bridge.applyOptions) {
        bridge.applyOptions({
          referrerPolicy: 'no-referrer'
        });
      }
      
      await bridge.send('VKWebAppInit');
      
      // Получаем данные пользователя
      const user = await bridge.send('VKWebAppGetUserInfo');
      userId = user.id;
      
      // Отправляем статистику с правильным referrer
      try {
        await bridge.send('VKWebAppConversionHit', { 
          pixel_code: 'default' 
        });
      } catch (e) {
        console.log('Статистика отправлена или отключена');
      }
      
      showRandomStory();
    } catch (e) {
      console.error('VK Error:', e);
      userId = 'demo123';
      showRandomStory();
      showDemoNote();
    }
  } else {
    // Локальный демо-режим
    userId = 'demo123';
    showRandomStory();
    showDemoNote();
  }
}

// ======================
// ОСНОВНЫЕ ФУНКЦИИ ИГРЫ
// ======================
function getRandomFreeStoryId() {
  const freeIds = Object.keys(STORIES).filter(id => 
    !Object.values(STORIES[id].options).some(opt => opt.premium)
  );
  return freeIds.length > 0 ? freeIds[Math.floor(Math.random() * freeIds.length)] : "1";
}

function showRandomStory(storyId = null) {
  const id = storyId || getRandomFreeStoryId();
  const story = STORIES[id];
  if (!story) {
    document.getElementById('game').innerHTML = '<p>Ошибка: история не найдена.</p>';
    return;
  }

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

function showResult(storyId, choice) {
  const outcome = STORIES[storyId].options[choice].outcome;
  
  const friendsList = [
    "@ivan → 'Кот-хакер'",
    "@maria → 'ИИ-бариста'",
    "@petr → 'Президент Марса'",
    "@lena → 'Нейро-шаман'",
    "@barsik → 'Тайный агент'"
  ];
  const shuffled = [...friendsList].sort(() => 0.5 - Math.random());
  const friends = shuffled.slice(0, 2).join('\n');
  
  let rarity = "Обычная";
  if (outcome.includes("999/100") || outcome.includes("MAX")) rarity = "Легендарная";
  else if (outcome.includes("9")) rarity = "Эпическая";

  const resultHtml = `
    <div class="result" id="resultBox">
      ${outcome}
      <div class="rarity">💎 Редкость: ${rarity}</div>
    </div>
    <div class="friends">
      👀 ВАШИ ДРУЗЬЯ:<br>${friends}<br>
      — Вы → <b>${getTitle(outcome)}</b> 👑
    </div>
    <button class="btn btn-share" onclick="shareResult()">📲 Сравнить судьбы?</button>
    <button class="btn btn-free" onclick="showRandomStory()">🔁 Сыграть ещё</button>
    <button class="btn btn-premium" onclick="showPremium()">💎 Премиум-судьбы</button>
  `;

  document.getElementById('game').innerHTML = resultHtml;
  
  if (rarity === "Легендарная") {
    triggerConfetti();
  }
}

function getTitle(outcome) {
  const lines = outcome.split('\n');
  for (let line of lines) {
    if (line.includes("ТЫ СТАЛ: ")) {
      return line.split("ТЫ СТАЛ: ")[1].replace(/[💎🏆🌀✨]/g, '').trim();
    }
  }
  return "Тайная личность";
}

// ======================
// ФУНКЦИИ ДЛЯ VK
// ======================
function shareResult() {
  const link = isInVK() 
    ? `https://vk.com/app${APP_ID}?ref=${userId}`
    : `https://vk.com/app${APP_ID}?ref=demo123`;
  
  const vkParams = getVKParams();
  if ((vkParams.vkIsAppUser || isInVK()) && window.vkBridge) {
    try {
      window.vkBridge.send('VKWebAppShare', { link });
    } catch (e) {
      fallbackShare(link);
    }
  } else {
    fallbackShare(link);
  }
}

function fallbackShare(link) {
  if (navigator.share) {
    navigator.share({
      title: 'Судьба за 10 секунд',
      text: 'Стань Кибер-Единорогом или Богом Абсурда!',
      url: link
    }).catch(e => console.log('Share cancelled', e));
  } else if (navigator.clipboard) {
    navigator.clipboard.writeText(link).then(() => {
      alert('🔗 Ссылка скопирована!\n' + link);
    });
  } else {
    prompt('Скопируй ссылку:', link);
  }
}

function showPremium() {
  const premiumIds = Object.keys(STORIES).filter(id => 
    Object.values(STORIES[id].options).some(opt => opt.premium)
  );
  if (premiumIds.length > 0) {
    const randomId = premiumIds[Math.floor(Math.random() * premiumIds.length)];
    showRandomStory(randomId);
  } else {
    alert('Премиум-истории скоро!');
  }
}

function premiumStub(storyId, choice) {
  if (isInVK()) {
    alert('✨ Премиум-истории доступны во ВКонтакте!\n\n(В продакшене: оплата за 49 руб через VK Pay)');
  } else {
    alert('✨ Это демо! Премиум будет во ВКонтакте.');
  }
  showResult(storyId, choice);
}

// ======================
// АНИМАЦИИ И ЭФФЕКТЫ
// ======================
function triggerConfetti() {
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
    const anim = confetti.animate([
      { transform: 'translateY(0) rotate(0deg)', opacity: '1' },
      { 
        transform: `translateY(${window.innerHeight}px) rotate(${360 * (Math.random() > 0.5 ? 1 : -1)}deg)`, 
        opacity: '0' 
      }
    ], {
      duration: duration * 1000,
      easing: 'cubic-bezier(0,0.5,0.5,1)'
    });
  }
  
  setTimeout(() => {
    confettiContainer.style.opacity = '0';
  }, 5000);
}

// ======================
// ДЕМО-РЕЖИМ
// ======================
function showDemoNote() {
  const note = document.createElement('div');
  note.className = 'demo-note';
  note.innerHTML = '💡 Локальный демо-режим<br>Во ВКонтакте будет кнопка «Поделиться»';
  document.querySelector('.container').appendChild(note);
  
  // Для отладки в консоли
  console.log('Демо-режим активирован');
  console.log('User ID:', userId);
  console.log('VK Params:', getVKParams());
}

// ======================
// ЗАПУСК ПРИ ЗАГРУЗКЕ
// ======================
document.addEventListener('DOMContentLoaded', () => {
  // Загружаем VK Bridge в фоне
  if (isInVK()) {
    import('https://unpkg.com/@vkontakte/vk-bridge@2.12.2/dist/vk-bridge.umd.js')
      .then(module => {
        window.vkBridge = module.default || module;
        initApp();
      })
      .catch(e => {
        console.error('Не удалось загрузить VK Bridge:', e);
        initApp();
      });
  } else {
    initApp();
  }
});

// Обработка ошибок на глобальном уровне
window.onerror = function(message, source, lineno, colno, error) {
  console.error('Global error:', { message, source, lineno, colno, error });
  return false;
};

window.addEventListener('unhandledrejection', function(event) {
  console.error('Unhandled promise rejection:', event.reason);
  event.preventDefault();
});
