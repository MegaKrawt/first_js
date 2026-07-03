// =========================================================================
// 1. ПОЛУЧЕНИЕ ЭЛЕМЕНТОВ DOM
// =========================================================================

const inputField = document.querySelector('#commentField');
const button = document.querySelector('#submitButton');
const result = document.querySelector('#result');
let keyButtons = document.querySelectorAll('.key-btn'); // Все символьные кнопки
const backspaceButton = document.querySelector('#backspaceKey');
const enterButton = document.querySelector('#enterKey');
const saveButton = document.querySelector('#save_btn');
const load_btn = document.querySelector('#load_btn');
const del_btn = document.querySelector('#del_btn');
const name_input = document.querySelector('#name_input');
const name_select = document.querySelector('#name_select');
const update_cod_app = document.querySelector('#update_cod_app');
const ghost = document.getElementById('ghost');

// Client ID 319124985995-asdujigq8so3ta3ndkm5cgckrm4rjve4.apps.googleusercontent.com

const CLIENT_ID = '319124985995-asdujigq8so3ta3ndkm5cgckrm4rjve4.apps.googleusercontent.com'; 
const PROXY_URL = 'https://aaaraboratuyhe.netlify.app/api/token';

let tokenClient;
let accessToken = null;

// // Элементы интерфейса
const loginBtn = document.getElementById('loginBtn');
const statusDiv = document.getElementById('status');

async function handleSuccessfulLogin(token) {
    accessToken = token;
    statusDiv.innerText = "Статус: Успешно авторизован!";
    statusDiv.style.color = "green";
}

// 1. Инициализация при загрузке страницы
window.addEventListener('load', async () => {
    try {
        // МЕНЯЕМ НА initCodeClient
        tokenClient = google.accounts.oauth2.initCodeClient({
            client_id: CLIENT_ID,
            scope: 'https://www.googleapis.com/auth/drive.appdata',
            ux_mode: 'popup',
            callback: async (authResponse) => {
                if (authResponse.code) {
                    console.log("Получен код авторизации, обмениваем на токены...");
                    await exchangeCodeForTokens(authResponse.code);
                    syncWithCloud('cloud_to_local');
                }
            },
        });

        // АВТО-ВХОД ЧЕРЕЗ REFRESH TOKEN
        const savedToken = localStorage.getItem('google_access_token');
        const expiresAt = localStorage.getItem('google_token_expires');
        const refreshToken = localStorage.getItem('google_refresh_token');

        if (savedToken && expiresAt && Date.now() < (Number(expiresAt) - 300000)) {
            // Вариант 1: Обычный токен еще жив
            console.log("Найден живой токен, входим...");
            await handleSuccessfulLogin(savedToken);
            await syncWithCloud('cloud_to_local');
        } else if (refreshToken) {
            // Вариант 2: Токен сдох, но есть вечный Refresh Token! Обновляем его в фоне
            console.log("Токен истёк, обновляем через Refresh Token...");
            statusDiv.innerText = "Обновление сессии...";
            await refreshAccessToken(refreshToken);
            await syncWithCloud('cloud_to_local');
        } else {
            statusDiv.innerText = "чтобы включить сохранения в облако, нажмите кнопку 'Войти'"
            statusDiv.style.color = "black";
        }

    } catch (err) {
        console.error("Критическая ошибка:", err);
        statusDiv.innerText = "Ошибка инициализации: " + err.message;
        statusDiv.style.color = "red";
    }
});

// 2. Обработчик кнопки Войти
loginBtn.addEventListener('click', () => {
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_token_expires');
    localStorage.removeItem('google_refresh_token');
    
    // Открываем окно выбора аккаунта
    tokenClient.requestCode();
});

document.getElementById("outloginBtn").addEventListener('click', () => {
    localStorage.removeItem('google_access_token');
    localStorage.removeItem('google_token_expires');
    localStorage.removeItem('google_refresh_token');
    localStorage.removeItem('is_sinc');

    alert("вы вышли на данном устройсве.")
    location.reload(true);
});

// ОДНА ФУНКЦИЯ ДЛЯ ПОЛНОЙ СИНХРОНИЗАЦИИ
// direction может быть:
// 'cloud_to_local' (скачать из облака в браузер) 
// 'local_to_cloud' (выгрузить из браузера в облако)
let user_know_cloud = false
async function syncWithCloud(direction = 'cloud_to_local') {
    let is_sinc = JSON.parse(localStorage.getItem('is_sinc'))
    localStorage.setItem('is_sinc', JSON.stringify(false));

    statusDiv.innerText = "Статус: синхронизация ...";
    statusDiv.style.color = "gray";

    const expiresAt = localStorage.getItem('google_token_expires');
    const refreshToken = localStorage.getItem('google_refresh_token');

    if (!refreshToken) {
        console.error("refreshToken отсутствует");
        statusDiv.innerText = "чтобы включить сохранения в облако, нажмите кнопку 'Войти'";
        statusDiv.style.color = "black";
        if (!user_know_cloud) alert("ВАЖНО! сейчас вашы данные сохраняются только в кеш браузера и могут быть случайно очищены!\nЧтобы этого избежать включите сохранения в облако.")
        user_know_cloud = true
        return false;
    }

    // Если токен умер в процессе игры (прошел час)
    if (!expiresAt || Date.now() > (Number(expiresAt) - 60000)) { 
        if (refreshToken) {
            console.log("Токен истек во время игры. Обновляем через рефреш...");
            accessToken = await refreshAccessToken(refreshToken);
        } else {
            statusDiv.innerText = "Нужна повторная авторизация.";
        }
    }
    
    if (!accessToken) {
        console.error("accessToken отсутствует");
        statusDiv.innerText = "Ошибка синхронизации. Проверьте интернет-соеденение";
        statusDiv.style.color = "red";
        return false;
    }

    // Поменяли имя файла, чтобы он содержал только сохранения
    const FILE_NAME = 'game_saves_backup.json';

    try {
        // 1. Ищем файл бэкапа в скрытой папке appDataFolder
        const searchUrl = `https://www.googleapis.com/drive/v3/files?q=name='${FILE_NAME}' and trashed = false&spaces=appDataFolder`;
        const searchResponse = await fetch(searchUrl, { headers: { 'Authorization': `Bearer ${accessToken}` } });
        const searchResult = await searchResponse.json();
        const fileId = searchResult.files && searchResult.files.length > 0 ? searchResult.files[0].id : null;

        // --- НАПРАВЛЕНИЕ: ИЗ ОБЛАКА В ЛОКАЛ СТОРЕДЖ ---
        if (direction === 'cloud_to_local') {
            if (!fileId) {
                console.log("Бэкап сохранений в облаке не найден. Это первый запуск, оставляем локальные данные.");
                await syncWithCloud('local_to_cloud');
                console.log("данные записаны в облако")
                localStorage.setItem('is_sinc', JSON.stringify(true));
                return true;
            }

            // Скачиваем содержимое файла
            const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
                headers: { 'Authorization': `Bearer ${accessToken}` }
            });
            const cloudDataText = await response.text();
            
            // В облаке лежит строка, которую мы получили из localStorage.getItem('saves')
            if (cloudDataText) {
                if (is_sinc){
                    localStorage.setItem('saves', cloudDataText); 
                    console.log("Сохранения успешно загружены из Google Диска в localStorage['saves']!");}
                else{
                    let cloudSaves = JSON.parse(cloudDataText)
                    let localSaves = JSON.parse(localStorage.getItem('saves'))
                    let mergedSaves = { ...localSaves, ...cloudSaves };
                    localStorage.setItem('saves', JSON.stringify(mergedSaves));
                    console.log("Данные из облака и localStorage успешно объединены! и записаны в localStorage");

                    await syncWithCloud('local_to_cloud');
                    console.log("обедененные данные записаны в облако")
                }

                

                saves = JSON.parse(localStorage.getItem('saves'))
                name_select.innerHTML = '\n<option value="">_________</option>'
                Object.keys(saves).forEach((i) => {
                    name_select.innerHTML += `\n<option value="${i}">${i}</option>`
                })
                
            }
            localStorage.setItem('is_sinc', JSON.stringify(true));
            statusDiv.innerText = "Статус: данные успешно синхронизированы с облаком!";
            statusDiv.style.color = "green";
            return true;
        }

        // --- НАПРАВЛЕНИЕ: ИЗ ЛОКАЛ СТОРЕДЖА В ОБЛАКО ---
        if (direction === 'local_to_cloud') {
            const saveData = localStorage.getItem('saves');
            
            if (!saveData) {
                console.warn("В localStorage нет ключа 'saves'. Нечего сохранять в облако.");
                return false;
            }

            const boundary = 'foo_bar_baz';
            const delimiter = `\r\n--${boundary}\r\n`;
            const close_delim = `\r\n--${boundary}--`;

            // Базовые метаданные (для обоих случаев)
            const metadata = {
                name: FILE_NAME,
                mimeType: 'application/json'
            };

            let url = 'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart';
            let method = 'POST';

            if (fileId) {
                // Если файл ОБНОВЛЯЕТСЯ (PATCH) — parents передавать НЕЛЬЗЯ
                url = `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=multipart`;
                method = 'PATCH';
            } else {
                // Если файл СОЗДАЕТСЯ (POST) — обязательно указываем, куда (в appDataFolder)
                metadata.parents = ['appDataFolder'];
            }

            // Собираем тело запроса с правильными метаданными
            const multipartRequestBody =
                delimiter +
                'Content-Type: application/json\r\n\r\n' +
                JSON.stringify(metadata) +
                delimiter +
                'Content-Type: text/plain\r\n\r\n' +
                saveData + 
                close_delim;

            const response = await fetch(url, {
                method: method,
                headers: {
                    'Authorization': `Bearer ${accessToken}`,
                    'Content-Type': `multipart/related; boundary=${boundary}`
                },
                body: multipartRequestBody
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                console.error("Ошибка сервера Google:", errorData);
                return false;
            }
            
            await response.json();
            console.log("Элемент 'saves' успешно синхронизирован с облаком!");
            localStorage.setItem('is_sinc', JSON.stringify(true));
            statusDiv.innerText = "Статус: данные успешно синхронизированы с облаком!";
            statusDiv.style.color = "green";
            return true;
        }

    } catch (err) {
        console.error("Ошибка при синхронизации:", err);
        statusDiv.innerText = "Ошибка синхронизации. Проверьте интернет-соеденение";
        statusDiv.style.color = "red";
        return false;
    }
}





// Функция 1: Обменивает одноразовый код на Access и Refresh токены (вызывается 1 раз при первом входе)
async function exchangeCodeForTokens(code) {
    try {
        statusDiv.innerText = "Обмен кода через безопасный прокси...";
        
        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }, 
            body: JSON.stringify({
                client_id: CLIENT_ID,
                code: code,
                grant_type: 'authorization_code',
                redirect_uri: window.location.origin
            })
        });

        const data = await response.json();
        
        if (data.access_token) {
            localStorage.setItem('google_access_token', data.access_token);
            localStorage.setItem('google_token_expires', Date.now() + (data.expires_in * 1000));
            
            // Сохраняем вечный ключ! Он приходит только ОДИН раз при первом входе
            if (data.refresh_token) {
                localStorage.setItem('google_refresh_token', data.refresh_token);
            }

            await handleSuccessfulLogin(data.access_token);
        } else {
            console.error("Не удалось получить токены:", data);
        }
    } catch (err) {
        console.error("Ошибка при обмене кода:", err);
    }
}

// Функция 2: Берет вечный Refresh Token и молча за 0.3 сек получает новый рабочий Access Token
async function refreshAccessToken(refreshToken) {
    try {
        const response = await fetch(PROXY_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                client_id: CLIENT_ID,
                refresh_token: refreshToken,
                grant_type: 'refresh_token'
            })
        });

        const data = await response.json();

        if (data.access_token) {
            localStorage.setItem('google_access_token', data.access_token);
            localStorage.setItem('google_token_expires', Date.now() + (data.expires_in * 1000));
            
            await handleSuccessfulLogin(data.access_token);
            console.log("Токен успешно обновлен в фоне через Refresh Token!");
            return data.access_token;
        } else {
            console.error("Не удалось обновить токен:", data);
            statusDiv.innerText = "Сессия устарела. Войдите заново.";
            statusDiv.style.color = "red";
        }
    } catch (err) {
        console.error("Ошибка при обновлении токена:", err);
    }
}

window.addEventListener('load', () => {
    const params = new URLSearchParams(window.location.search);
    const codeFromUrl = params.get('code');
    if (codeFromUrl) {
        inputField.value = codeFromUrl;
        // 1. Сначала генерируем интерфейс (App Mode)
        update_cod_app.click(); 
        // 2. Проходим по всем параметрам ссылки
        params.forEach((value, key) => {
            if (key.startsWith('v_')) {
                const varName = key.substring(2); // Отрезаем "v_"
                // Если такой инпут был создан в твоем объекте app_arr_in
                if (app_arr_in[varName]) {
                    app_arr_in[varName].value = value;
                    if (app_arr_in[varName].type == 'range'){app_arr_in[varName].dispatchEvent(new Event('updRes', {bubbles: true}));}
                }
            }
        });
        
        document.querySelector('#hideResult').checked=0; document.querySelector('#hideResult').click();
        if (codeFromUrl.includes("#input")){
          document.querySelector('#hideInput').checked=0; document.querySelector('#hideInput').click();}
        else{document.querySelector('#hideInput').checked=1; document.querySelector('#hideInput').click();}

        // 3. Пересчитываем всё с новыми значениями
        calculate(); 
        cal_cod_app.click(); // Обновляем вывод в приложении
        create_grafik()
    }
    else{inputField.value = JSON.parse(localStorage.getItem('auto_save'))
        calculate()
        update_cod_app.click()
        cal_cod_app.click()
        create_grafik()}
});

function generateShareLink() {
    const code = inputField.value;
    let shareUrl = window.location.origin + window.location.pathname + "?code=" + encodeURIComponent(code);
    // Добавляем значения всех инпутов, которые сейчас созданы в App Mode
    // app_arr_in — это твой объект с инпутами из mein.js
    for (const name in app_arr_in) {
        const val = app_arr_in[name].value;
        if (val) {
            shareUrl += `&v_${encodeURIComponent(name)}=${encodeURIComponent(val)}`;
        }
    }
    navigator.clipboard.writeText(shareUrl);
    alert("Ссылка с данными скопирована!");
}
document.getElementById("copiURL_btn").addEventListener("click", () => {generateShareLink()})

// 1. Объявляем переменную в глобальной области
let templates = {}; 
async function load_templates() {
    try {
        const response = await fetch('templates.json');
        // 2. Записываем данные в глобальную переменную
        templates = await response.json(); 
        
        // 3. Только ТУТ запускаем код, который зависит от шаблонов
        render_ready_select();
        document.getElementById("ready_select").addEventListener('change', function(){
          inputField.value = templates[document.getElementById("ready_select").value]
          console.log(name_select.value)
          calculate()
          update_cod_app.click()
        });
    } catch (e) {
        console.error("Ошибка загрузки:", e);
    }
}
function render_ready_select() {
    const select = document.getElementById("ready_select");
    select.innerHTML = '<option value=" ">_готовые шаблоны_</option>';
    
    // Теперь Object.keys сработает, так как templates уже заполнена
    Object.keys(templates).forEach((i) => {
        select.innerHTML += `\n<option value="${i}">${i}</option>`;
})
    };
// Запускаем процесс
load_templates();



inputField.addEventListener('scroll', () => {
    ghost.scrollTop = inputField.scrollTop;
    ghost.scrollLeft = inputField.scrollLeft;
});
// Создаем специальный наблюдатель за размером
const resizeObserver = new ResizeObserver(() => {
    // Подстраиваем высоту "призрачного" слоя под реальную высоту textarea
    ghost.style.height = inputField.offsetHeight + 'px';
    ghost.style.width = inputField.offsetWidth + 'px';
});
// Запускаем слежку за твоим инпутом
resizeObserver.observe(inputField);


// Настройка math.js для поддержки любых алфавитов (включая кириллицу)
math.config({
  predictable: false,
  epsilon: 1e-12,
  number: 'BigNumber', 
  precision: 20
});

// Переопределяем правила парсера, чтобы он принимал русские буквы
const isAlphaOriginal = math.parse.isAlpha;
math.parse.isAlpha = function (c, cNext, text) {
  return isAlphaOriginal(c, cNext, text) || (c >= '\u0400' && c <= '\u04FF'); 
  // Диапазон \u0400-\u04FF — это кириллица
};


let saves = JSON.parse(localStorage.getItem('saves'));
// Если localStorage.getItem('saves') вернул null,
// мы инициализируем saves как пустой объект.
if (saves == null) {
    saves = {}
    localStorage.setItem('saves', JSON.stringify(saves))
}

let setting = JSON.parse(localStorage.getItem('setting'));
if (setting == null) {
    setting = {}
    localStorage.setItem('setting', JSON.stringify(setting))
}

name_select.innerHTML = '\n<option value="">_________</option>'
Object.keys(saves).forEach((i) => {
    console.log(i)
    name_select.innerHTML += `\n<option value="${i}">${i}</option>`
})


saveButton.addEventListener('click', function(){
    if (!name_input.value) return
    saves = JSON.parse(localStorage.getItem('saves'))
    saves[name_input.value] = inputField.value
    localStorage.setItem('saves', JSON.stringify(saves))
    syncWithCloud("local_to_cloud")

    name_select.innerHTML = '\n<option value="">_________</option>'
    Object.keys(saves).forEach((i) => {
        console.log(i)
        name_select.innerHTML += `\n<option value="${i}">${i}</option>`
    })
})

load_btn.addEventListener('click', function(){
    saves = JSON.parse(localStorage.getItem('saves'))
    inputField.value = saves[name_input.value]
})

name_select.addEventListener('change', function(){
    name_input.value = name_select.value

    saves = JSON.parse(localStorage.getItem('saves'))
    inputField.value = saves[name_input.value]

    calculate(true)
    update_cod_app.click()
})

del_btn.addEventListener('click', function(){
    if (confirm('вы точно хотите удалить сохранение ' + name_input.value + ' ?')){
        saves = JSON.parse(localStorage.getItem('saves'))
        delete saves[name_input.value]
        localStorage.setItem('saves', JSON.stringify(saves))
        syncWithCloud("local_to_cloud")

        name_select.innerHTML = '\n<option value="">_________</option>'
        Object.keys(saves).forEach((i) => {
            console.log(i)
            name_select.innerHTML += `\n<option value="${i}">${i}</option>`
        })
    }

})


// обработка чекбоксов
const textarea_div = document.querySelector('#textarea_div')
document.querySelector('#hideResult').addEventListener('change', function() {
    if (!this.checked) {
        result.style.display = 'block';
    } else {
        result.style.display = 'none';
}});
document.querySelector('#hideInput').addEventListener('change', function() {
    const keyboard_=document.getElementById("keyboard")
    const velues_names_=document.getElementById("velues_names")
    if (!this.checked) {
        textarea_div.style.display = 'block';
        // button.style.display = 'block';
        // document.getElementById("hide_klaviatyr").style.display = 'block';
        keyboard_.style.display = 'grid';
        velues_names_.style.display = "block"
        document.querySelector('#hideKaybord').checked=0
    } else {
        textarea_div.style.display = 'none';
        // button.style.display = 'none';
        // document.getElementById("hide_klaviatyr").style.display = 'none';
        keyboard_.style.display = 'none';
        velues_names_.style.display = "none"
        document.querySelector('#hideKaybord').checked=1
}});
document.querySelector('#hideKaybord').addEventListener('change', function() {
    const keyboard_=document.getElementById("keyboard")
    const velues_names_=document.getElementById("velues_names")
    if (!this.checked) {
        keyboard_.style.display = 'grid';
    } else {
        keyboard_.style.display = 'none';
}});

// Функция для сохранения
function saveInterfaceSettings() {
    const settings = {
        hideResult: document.querySelector('#hideResult').checked,
        hideInput: document.querySelector('#hideInput').checked,
        hideKaybord: document.querySelector('#hideKaybord').checked,
        hideMobKaybord: document.getElementById('hideMobKaybord').checked
    };
    localStorage.setItem('interfaceSettings', JSON.stringify(settings));
}

// Функция для загрузки
function loadInterfaceSettings() {
    const saved = JSON.parse(localStorage.getItem('interfaceSettings'));
    if (saved) {
        const ids = ['hideResult', 'hideInput', 'hideKaybord', 'hideMobKaybord'];
        
        ids.forEach(id => {
            const chk = document.querySelector(`#${id}`);
            if (chk && saved[id] !== undefined) {
                chk.checked = saved[id];
                // ВОТ ЗДЕСЬ МАГИЯ: заставляем чекбокс "сработать"
                chk.dispatchEvent(new Event('change'));
            }
        });
    }
}

// Добавляем сохранение к существующим чекбоксам
document.querySelectorAll('input[type="checkbox"]').forEach(chk => {
    chk.addEventListener('change', saveInterfaceSettings);
});

// Запускаем при загрузке страницы
loadInterfaceSettings();






// СТАРТОВАЯ НАСТРОЙКА: Сразу делаем поле ReadOnly, чтобы при первом тапе 
// клавиатура телефона не появлялась. Мы вернем его в false позже.

document.querySelector('#hide_klaviatyr').addEventListener('click', function(){
    inputField.readOnly = false
})
inputField.addEventListener('click', function(){
    inputField.readOnly = false
})

// =========================================================================
// 2. ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ
// =========================================================================

function insertAtCursor(field, text) {
    const start = field.selectionStart;
    const end = field.selectionEnd;
    const value = field.value;
    inputField.style.caret_color='black'
    field.value = value.substring(0, start) + text + value.substring(end);

    field.selectionStart = field.selectionEnd = start + text.length;
    // ФОКУС всегда возвращается в основном обработчике

    calculate()
}

function handleBackspace() {
    const start = inputField.selectionStart;
    const end = inputField.selectionEnd;
    const value = inputField.value;

    if (start > 0 || start !== end) {
        if (start === end) {
            inputField.value = value.substring(0, start - 1) + value.substring(end);
            inputField.selectionStart = inputField.selectionEnd = start - 1;
        } else {
            inputField.value = value.substring(0, start) + value.substring(end);
            inputField.selectionStart = inputField.selectionEnd = start;
        }
    }

    calculate()
}

// =========================================================================
// 3. ЕДИНЫЙ ОБРАБОТЧИК КЛАВИАТУРЫ (Адаптация под мобильные)
// =========================================================================

function handleVirtualKey(e) {
    // 1. Предотвращаем стандартное действие браузера (главное для мобильных!)
    e.preventDefault(); 
    
    // 2. ЛОГИКА СКРЫТИЯ КЛАВИАТУРЫ
    // Временно ставим readOnly, чтобы при blur/focus клавиатура телефона скрылась.
    
    // 3. ВСТАВКА СИМВОЛА
    const button = e.currentTarget;
    const keyChar = button.getAttribute('data-key');

    if (keyChar) {
        // Проверяем, это символ новой строки или обычный символ
        const charToInsert = keyChar === '\\n' ? '\n' : keyChar;
        insertAtCursor(inputField, charToInsert);

    } else if (button.id === 'backspaceKey') {
        // УДАЛЕНИЕ
        handleBackspace();
    }
    
    // На всякий случай возвращаем фокус (хотя он уже был возвращен выше)
    if (!document.getElementById('hideMobKaybord').checked){inputField.focus()}

    // 4. ВОЗВРАЩАЕМ ВОЗМОЖНОСТЬ ввода с внешней клавиатуры (если вы не хотите,
    // чтобы пользователь мог использовать нативную клавиатуру, удалите эту строку)


    calculate()
    localStorage.setItem('auto_save', JSON.stringify(inputField.value))
    if (keyChar == '#') updeteINPUT_HELP()
    
}


// =========================================================================
// 4. НАЗНАЧЕНИЕ ОБРАБОТЧИКОВ
// =========================================================================

// Все символьные кнопки
keyButtons.forEach(button => {
    button.addEventListener('click', handleVirtualKey);
});
const buttonReshetka = document.getElementById('buttonReshetka')
buttonReshetka.addEventListener('click', handleVirtualKey);

// Кнопка УДАЛИТЬ
backspaceButton.addEventListener('click', handleVirtualKey);

// Кнопка ВВОД (новая строка)
enterButton.addEventListener('click', handleVirtualKey);


// =========================================================================
// 5. ЛОГИКА MATH.JS (Оставлена без изменений)
// =========================================================================

function processText() {
    // 2. Получаем весь текст как одну строку
    const fullText = inputField.value
    // 3. Используем метод split() для разделения строки на массив
    const linesArray = fullText.split(/\r?\n/);
    // Дополнительный шаг: Удаление пустых строк (см. ниже)
    // const filteredArray = linesArray.filter(line => line.trim() !== '');
    return linesArray
}
function escapeHTML(str) {
    const p = document.createElement('p');
    p.textContent = str; // Браузер сам заменит опасные символы на безопасные
    return p.innerHTML;
}

let app_arr_in={}
let app_arr_out={}

let inxgrafik = 0
let outygrafik = 0

let grafikstart = -10
let grafikstop = 10
let grafikstep = 0.1

function calculate(print_error = false, updeteUI=true){
    scope = {}
    app_arr_out={}
    old_result = result.innerHTML
    result.innerHTML = 'Результат: <br>'; // Очищаем и ставим заголовок
    let ghostContent = '';
    outygrafik=[]
    
    try {
        appForIn = []
        for (const s of processText()) {
            if (s == ''){ghostContent += `<span></span>\n`; continue}
            let isError = false
            let resultText = '';
            try {
            if (s[0]=="#"){
              if ("#input" == s.slice(0, 6)){
                  if (updeteUI){
                    let slider_setings = s.split(" ")[3]
                    if (slider_setings == undefined){appForIn.push([s.split(" ")[2] || s.split(" ")[1], undefined])}
                    else{appForIn.push([s.split(" ")[2], slider_setings.split(':')])}}
                  try{
                  scope[s.split(" ")[1]]=math.evaluate(app_arr_in[s.split(" ")[2] || s.split(" ")[1]].value)
                  resultText = ` = ${scope[s.split(" ")[1]]}`;
                  }
                  catch{scope[s.split(" ")[1]]="error"; isError = true}
                }
                if ("#output" == s.slice(0, 7)){
                  app_arr_out[s.split(" ")[2] || s.split(" ")[1]]=math.evaluate(s.split(" ")[1], scope)
                  resultText = ` = ${math.evaluate(s.split(" ")[1], scope)}`;
                }
                if (s.startsWith("#inx")){
                  scope[s.split(" ")[1]]=math.bignumber(inxgrafik)
                }
                if (s.startsWith("#outy")){
                  if (math.isNumeric(math.evaluate(s.split(" ")[1], scope))){
                    outygrafik.push(math.evaluate(s.split(" ")[1], scope))}
                  else{outygrafik.push(NaN)}
                  if (updeteUI) names_grafik.push([s.split(" ")[2] || s.split(" ")[1], s.split(" ")[3]])
                }
                if (s.startsWith("#range") && updeteUI){
                  grafikstart=math.evaluate(s.split(" ")[1], scope)
                  grafikstop=math.evaluate(s.split(" ")[2], scope)
                  grafikstep=math.evaluate(s.split(" ")[3] || "0", scope)
                }
            } else if(s.startsWith("//")){ghostContent += `<span></span>\n`; continue}
            else{
                try{
                    resultText = ` = ${math.evaluate(s, scope)}`
                }catch{scope[s.split('=')[0].replaceAll(" ", "")]='error'; isError = true}
            }}catch{isError = true}
            if(updeteUI){
                if (isError) {
                    ghostContent += `<span>${escapeHTML(s)}</span><span style="color: #ff4d4d; font-weight: bold;"> !! ошибка</span>\n`;}
                else if(resultText == " = undefined"){ghostContent += `<span>${escapeHTML(s)}</span><span style="color: #ff4d4d"> = undefined</span>\n`;}
                else{ghostContent += `<span>${escapeHTML(s)}</span><span class="res">${escapeHTML(resultText)}</span>\n`;}}
        }; 
        if (updeteUI){
        ghost.innerHTML = ghostContent;
        
        targetDiv.innerHTML = ''
        for (const key in scope){
            if (Object.hasOwn(scope, key)) {
                 result.innerHTML += `<b>${key}</b> = ${scope[key]}<br>`;
                 let newButton = document.createElement('button')
                 newButton.className = 'key-btn'
                 newButton.setAttribute('data-key', key)
                 newButton.textContent = key
                 newButton.style.cssText = "padding-inline: 10px; margin-inline: 10px; min-width: 50px; background-color: #00bfffff; font-size: 25px;";
                //  keyButtons = document.querySelectorAll('.key-btn')
                 targetDiv.appendChild(newButton)

                newButton.addEventListener('click', handleVirtualKey);
            }
        }}
        
    } catch (e) {
        if (print_error){
        // Ловим и отображаем ошибки вычисления
        result.innerHTML = `<span style="color: red;">Ошибка: ${e.message}</span>`;
        console.error("Math.js Error:", e);
        }
        else{result.innerHTML = old_result}
    }
}

let scope = {};
const targetDiv = document.getElementById('velues_names')
button.addEventListener('click', ()=>{calculate(true)});
inputField.addEventListener('input', ()=>{calculate(false); localStorage.setItem('auto_save', JSON.stringify(inputField.value))});



// cod_app
const cod_app_in = document.querySelector('#cod_app_in');
const cod_app_out = document.querySelector('#cod_app_out');
cal_cod_app = document.getElementById("cal_cod_app")
update_cod_app.addEventListener("click", ()=>{
  calculate()
    console.log(app_arr_out)
    
    cod_app_in.innerHTML = ''
    cod_app_out.innerHTML = ''
    app_arr_in = {}
    
    appForIn.forEach((i)=>{
    console.log(i)
    // 1. Создаем элементы
    const text = document.createElement('span');
    const input = document.createElement('input');
    if (i[1] != undefined){Object.assign(input, { type: 'range', min: i[1][0], max: i[1][1], step: i[1][2], value: i[1][0] });}
    // 2. Настраиваем их
    text.textContent = i[0] + " = "        // Добавляем текст
    text.style.fontSize = "40px"
    if (i[1] == undefined){input.type = 'tel'};        // Указываем тип инпута
    input.style.fontSize = "40px"
    input.style.width = "200px"
    input.addEventListener("input", (e)=>{cal_cod_app.click(); create_grafik()})
    app_arr_in[i[0]]=input
    // 3. Добавляем на страницу
    cod_app_in.appendChild(text);
    cod_app_in.appendChild(input);
        if (i[1] != undefined){
        const text2 = document.createElement('span');
        text2.textContent = " = " + input.value
        text2.style.fontSize = "40px"
        cod_app_in.appendChild(text2);
        input.addEventListener("input", (e)=>{text2.textContent = " = " + input.value})
        input.addEventListener("updRes", (e)=>{text2.textContent = " = " + input.value})
    }
    cod_app_in.appendChild(document.createElement("br"));
    })
    
    calculate()
    
    s_out=""
    for (const key in app_arr_out){
      s_out += key + " = " + app_arr_out[key] + "<br>"
    }
    newElement = document.createElement('p')
    newElement.innerHTML = s_out
    newElement.style.fontSize = '40px'
    cod_app_out.appendChild(newElement)
})

cal_cod_app.addEventListener("click", ()=>{
    cod_app_out.innerHTML=""
    calculate()
    
    s_out=""
    for (const key in app_arr_out){
      s_out += key + " = " + app_arr_out[key] + "<br>"
    }
    newElement = document.createElement('p')
    newElement.innerHTML = s_out
    newElement.style.fontSize = '40px'
    cod_app_out.appendChild(newElement)
})




// Функция преобразования в красивую степень 10
function formatScientific(num, decimals = 2) {
  if (num === 0) return '0';
  if (num >= 0.00001 && num <= 1000_000_000_000) {
    if (num >= 1000) return Number(num.toFixed(3)).toLocaleString('ru-RU').replace(',', '.');
    if (num >= 1) return Number(num.toFixed(6));
    return Number(num.toFixed(9));
  }

  // Получаем стандартную строку типа "1.5e-7"
  const expStr = num.toExponential(decimals); 
  const parts = expStr.split('e');
  
  const base = parts[0];
  const exponent = parseInt(parts[1], 10);
  
  // Карта надстрочных знаков для красивого отображения степени
  const superscripts = {
    '-': '⁻', '0': '⁰', '1': '¹', '2': '²', '3': '³', 
    '4': '⁴', '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹'
  };
  
  // Переводим цифры степени (например, -7) в надстрочные символы (⁻⁷)
  const prettyExponent = String(exponent)
    .split('')
    .map(char => superscripts[char] || char)
    .join('');
    
  return `${base} × 10${prettyExponent}`;
}
// =====================
// -------график--------
const colors = [
  '#E6194B', // Ярко-красный
  '#3CB44B', // Сочный зеленый
  '#000000', // Черный
  '#4363D8', // Синий
  '#F58231', // Оранжевый
  '#911EB4', // Пурпурный
  '#46F0F0', // Бирюзовый (темный)
  '#F032E6', // Маджента
  '#808000', // Оливковый
  '#000075'  // Темно-синий
];
let myChart = null
let x_arr = []
let y_arr = []
let names_grafik = []
document.getElementById('beginAtZeroY').addEventListener('change', function(){create_grafik()})
function create_grafik(){
names_grafik = []
x_arr = []
y_arr = []
grafikstart = -10
grafikstop = 10
grafikstep = 0.1
calculate()
if (grafikstep == 0){grafikstep = (grafikstop - grafikstart)/500}
for (let x = Number(grafikstart); x < Number(grafikstop)+Number(grafikstep); x+=parseFloat(grafikstep)) {
  x=math.round(x, 10)
  inxgrafik = x
  calculate(false, false)
  x_arr.push(x)
  y_arr.push(outygrafik)}

console.log(x_arr)
console.log(y_arr)

y_arr_res = y_arr[0].map((_, colIndex) => y_arr.map(row => row[colIndex]));
console.log(y_arr_res)
datasetsin=[]
let ind = 0
calculate()
y_arr_res.forEach((yarr) => {datasetsin.push({
            label: names_grafik[ind][0],
            data: yarr,
            borderColor: names_grafik[ind][1] || colors[ind],
        }); ind++
})

if (myChart !== null) {
    myChart.destroy();
}
const ctx = document.getElementById('myChart').getContext('2d');

Chart.defaults.font.size = 20;
Chart.defaults.elements.line.borderWidth = 6;
Chart.defaults.elements.point.radius = 8;
Chart.defaults.elements.point.hoverRadius = 12; 

myChart = new Chart(ctx, {
    type: 'line',
    data: { labels: x_arr, datasets: datasetsin },
    options: {
        devicePixelRatio: 1,
        animation: false,
        scales: {
            y: { beginAtZero: document.getElementById('beginAtZeroY').checked }
        },
        plugins: {
            tooltip: {
                bodyFont: { size: 20 },
                callbacks: {
                    label: function(context) {
                        let label = context.dataset.label || '';
                        if (label) label += ': ';
                        if (context.parsed.y !== null) {
                        // Вызываем нашу красивую функцию
                        label += formatScientific(context.parsed.y, 9); 
                        }
                        return label;
                    }
                }
            }

        }
    }
});

}
document.getElementById("create_grafik_btn").addEventListener("click", () => {create_grafik()})



document.getElementById("euro_csv").checked = 1
document.getElementById('export_csv_btn').addEventListener('click', () => {
    let euro_csv = document.getElementById("euro_csv").checked
    // 1. Проверяем, существует ли график и есть ли в нем данные
    if (!myChart || !myChart.data.datasets.length) {
        alert("Сначала создайте график!");
        return;
    }

    const data = myChart.data;
    let csvContent = "";

    // 2. Формируем шапку таблицы: X и названия всех активных графиков
    let header = ["X (Inx)"];
    names_grafik.forEach(label => {
        header.push(label[0] || "Unnamed");
    });
    csvContent += header.join(euro_csv  ? ";" : ",") + "\n";

    // 3. Проходим по всем точкам оси X
    for (let i = 0; i < data.labels.length; i++) {
        let row = [data.labels[i]]; // Начинаем строку со значения X
        
        // Добавляем значения Y для каждого графика в этой точке
        data.datasets.forEach(dataset => {
            row.push(dataset.data[i]);
        });
        
        csvContent += row.join(euro_csv  ? ";" : ",") + "\n";
    }
    if (euro_csv){csvContent = csvContent.replaceAll('.', ',')}
    
    // 4. Скачивание файла
    console.log(csvContent)
// 1. В csvContent должен быть ТОЛЬКО текст таблицы (без data:text/csv)
const blob = new Blob(["\uFEFF", csvContent], { type: 'text/csv' });
const url = URL.createObjectURL(blob);

// 2. Создаем ссылку и "кликаем"
const a = document.createElement('a');
a.href = url;
a.download = 'research.csv';
a.click();

// 3. Чистим память
URL.revokeObjectURL(url);

    
});



// =======================
// --- ПОДСКАЗКИ ВВОДА ---
// =======================

const wordsList = ["#input", "#output", "#inx", "#outy","#range"];
const suggestionsBox = document.getElementById('suggestions');

// Функция получения координат
function getCaretCoordinates() {
  const scrollLeft = inputField.scrollLeft;
  const scrollTop = inputField.scrollTop;
  const selectionStart = inputField.selectionStart;

  // Создаем временное "зеркало"
  const div = document.createElement('div');
  const style = window.getComputedStyle(inputField);
  
  // Копируем стили
  for (const prop of style) {
    div.style[prop] = style[prop];
  }

  div.style.position = 'absolute';
  div.style.visibility = 'hidden';
  div.style.left = '0';
  div.style.top = '0';
  
  // Берем текст до курсора
  const textBeforeCaret = inputField.value.substring(0, selectionStart);
  div.textContent = textBeforeCaret;

  // Создаем маркер в позиции курсора
  const span = document.createElement('span');
  span.textContent = inputField.value.substring(selectionStart) || '.';
  div.appendChild(span);

  document.body.appendChild(div);
  
  // Координаты относительно окна
  const rect = inputField.getBoundingClientRect();
  const spanRect = span.getBoundingClientRect();
  
  const x = spanRect.left - scrollLeft;
  const y = spanRect.top - scrollTop + window.scrollY;

  document.body.removeChild(div);
  return { x, y };
}

inputField.addEventListener('input', updeteINPUT_HELP);
inputField.addEventListener('click', updeteINPUT_HELP);
function updeteINPUT_HELP(){
    const value = inputField.value;
    const cursorIndex = inputField.selectionStart;
    
    // 1. Ищем ближайший разделитель (пробел или перенос строки) перед курсором
    // Регулярное выражение /\s/ ищет пробелы, табы и переносы строк (\n)
    const textBeforeCursor = value.substring(0, cursorIndex);
    const lastSeparatorIndex = Math.max(
        textBeforeCursor.lastIndexOf(' '), 
        textBeforeCursor.lastIndexOf('\n')
    );

    // 2. Вырезаем слово от последнего разделителя до курсора
    const currentWord = textBeforeCursor.substring(lastSeparatorIndex + 1).toLowerCase();

    if (currentWord.length > 0) {
        const matches = wordsList.filter(w => w.startsWith(currentWord));
        
        if (matches.length > 0) {
            const coords = getCaretCoordinates();
            
            suggestionsBox.innerHTML = '';
            suggestionsBox.style.display = 'block';
            suggestionsBox.style.left = coords.x + 'px';
            suggestionsBox.style.top = (coords.y + 20) + 'px';

            matches.forEach(match => {
                const item = document.createElement('div');
                item.className = 'suggestion-item';
                item.textContent = match;
                item.onclick = () => {
                    // // 3. При вставке сохраняем всё, что было до этого слова (включая Enter)
                    // const before = value.substring(0, lastSeparatorIndex + 1);
                    // const after = value.substring(cursorIndex);
                    // inputField.value = before + match + after;
                    // suggestionsBox.style.display = 'none';
                    insertAtCursor(inputField, match.replace(currentWord, ""))
                    inputField.focus();
                };
                suggestionsBox.appendChild(item);
            });
            return;
        }
    }
    suggestionsBox.style.display = 'none';
}

// Закрывать при клике мимо
document.addEventListener('click', (e) => {
  if (e.target !== inputField && e.target !== buttonReshetka) suggestionsBox.style.display = 'none';
});





