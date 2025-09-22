// --- GLOBAL VARIABLES ---
const TRACKER_ID = 'mi-app-chat-super-secreta-xyz-p2p-v2'; // ID del tracker P2P
let peer; // Instancia de PeerJS para el usuario actual
let trackerPeer; // Instancia de PeerJS si este cliente es el tracker
let myAlias = localStorage.getItem('chatAlias') || ''; // Alias del usuario, persistido en localStorage
let myProfilePic = localStorage.getItem('userProfilePic') || ''; // Foto de perfil, persistida en localStorage
let isTracker = false; // Indica si el cliente actual es el tracker de la red
let trackerConnection; // Conexión con el tracker (si no soy el tracker)
let onlineUsers = {}; // Objeto que guarda los usuarios en línea {alias: {profilePic: '...', isTracker: true/false}}
let peerConnections = {}; // Objeto que guarda las conexiones de chat directas {peerId: DataConnection}
let activeChatPeerId = null; // Alias del usuario con el que se está chateando activamente
let mediaRecorder; // Para la grabación de voz (si se implementa)
let audioChunks = []; // Chunks de audio grabados (si se implementa)

let notificationQueue = []; // Cola para mostrar notificaciones una a una
let isDisplayingNotification = false; // Bandera para controlar el flujo de notificaciones

// --- Referencias al DOM (Elementos HTML) ---
const aliasModal = document.getElementById('aliasModal'); // Modal para introducir el alias
const aliasInput = document.getElementById('aliasInput'); // Input para el alias
const modalAvatarPreview = document.getElementById('modalAvatarPreview'); // Previsualización de la foto de perfil en el modal
const profilePicInput = document.getElementById('profilePicInput'); // Input de archivo para la foto de perfil

const peerListContainer = document.getElementById('connectedPeersList'); // Contenedor de la lista de usuarios en línea
const peerListUl = document.getElementById('peerList'); // Lista (UL) donde se muestran los usuarios
const chatDiv = document.getElementById('chat'); // Área donde se muestran los mensajes del chat
const messageInput = document.getElementById('message'); // Input de texto para escribir mensajes
const sendButton = document.getElementById('sendButton'); // Botón para enviar mensajes
const recordVoiceButton = document.getElementById('recordVoice'); // Botón para grabar mensajes de voz
const backToPeersListButton = document.getElementById('backToPeersList'); // Botón para volver a la lista de usuarios

const activePeerNameDisplay = document.getElementById('activePeerName'); // Nombre del compañero de chat activo en la cabecera
const activePeerProfilePic = document.getElementById('activePeerProfilePic'); // Foto de perfil del compañero de chat activo
const statusIndicator = document.getElementById('statusIndicator'); // Indicador de estado (online/cantidad de usuarios)

const attachButton = document.getElementById('attachButton'); // Botón para adjuntar archivos
const attachmentMenu = document.getElementById('attachmentMenu'); // Menú de opciones para adjuntar
const backdrop = document.getElementById('backdrop'); // Fondo oscuro para el menú de adjuntos/modal
const attachImageButton = document.getElementById('attachImageButton'); // Botón para adjuntar imagen
const imageInput = document.getElementById('imageInput'); // Input de archivo para imágenes
const attachFileButton = document.getElementById('attachFileButton'); // Botón para adjuntar archivo genérico
const fileInput = document.getElementById('fileInput'); // Input de archivo para documentos (CORREGIDO)

const notificationContainer = document.getElementById('notification-container'); // Contenedor para las notificaciones emergentes
const menuButton = document.getElementById('menuButton'); // Botón de menú (para abrir el menú lateral)
const sideMenu = document.getElementById('sideMenu'); // Menú lateral
const sideMenuBackdrop = document.getElementById('sideMenuBackdrop'); // Fondo oscuro para el menú lateral
const myProfileAvatar = document.getElementById('myProfileAvatar'); // Avatar del usuario en el menú lateral
const myAliasDisplay = document.getElementById('myAliasDisplay'); // Alias del usuario en el menú lateral

const chatHeader = document.getElementById('chatHeader'); // Referencia a la cabecera del chat

// --- LÓGICA DE INICIALIZACIÓN Y MODAL DE ALIAS ---
document.addEventListener('DOMContentLoaded', () => {
    // Si no hay un alias guardado, mostrar el modal.
    if (!myAlias) {
        aliasModal.style.display = 'flex';
        // Ocultar la interfaz principal de la app hasta que se establezca el alias
        chatHeader.style.display = 'none';
        document.querySelector('.main-container').style.display = 'none';
        document.querySelector('.input-area').style.display = 'none';
    } else {
        // Si ya hay un alias, ocultar el modal y directamente iniciar la aplicación.
        aliasModal.style.display = 'none';
        initApp();
    }
    // Registrar el Service Worker para la PWA
    registerServiceWorker();
});

// Event listener para la carga de foto de perfil en el modal de alias
profilePicInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return; // Si no se selecciona ningún archivo, no hacer nada
    const reader = new FileReader();
    reader.onload = (event) => {
        myProfilePic = event.target.result; // Guarda la imagen en Base64
        modalAvatarPreview.innerHTML = `<img src="${myProfilePic}" alt="Profile Pic">`; // Muestra la previsualización
    };
    reader.readAsDataURL(file); // Lee el archivo como Base64
});

// Función para establecer el alias (llamada desde el botón en el modal)
function setAlias() {
    const alias = aliasInput.value.trim().replace(/\s+/g, '_'); // Elimina espacios y los reemplaza por guiones bajos
    if (alias.length >= 3 && alias.length <= 15) {
        myAlias = alias;
        localStorage.setItem('chatAlias', alias); // Guarda el alias en localStorage
        localStorage.setItem('userProfilePic', myProfilePic); // Guarda la foto de perfil en localStorage
        aliasModal.style.display = 'none'; // Oculta el modal
        initApp(); // Inicia la aplicación principal
    } else {
        showNotification('El alias debe tener entre 3 y 15 caracteres.', 'error');
    }
}

// --- REGISTRO DEL SERVICE WORKER (PARA PWA) ---
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        window.addEventListener('load', () => {
            navigator.serviceWorker.register('/service-worker.js')
                .then(registration => {
                    console.log('ServiceWorker registrado con éxito:', registration.scope);
                })
                .catch(error => {
                    console.error('Fallo en el registro del ServiceWorker:', error);
                });
        });
    }
}

// --- LÓGICA PRINCIPAL DE LA APLICACIÓN ---
function initApp() {
    console.log("initApp() llamado.");

    // Mostrar los elementos principales de la interfaz de usuario de la aplicación
    chatHeader.style.display = 'flex';
    document.querySelector('.main-container').style.display = 'flex';
    document.querySelector('.input-area').style.display = 'flex';

    initMyPeer(); // Inicializa la conexión PeerJS
    setupUIEventListeners(); // Configura los listeners de eventos de la UI
    updateLayout(); // Actualiza el layout de la UI
    myAliasDisplay.textContent = myAlias; // Muestra el alias en el menú lateral
    if (myProfilePic) {
        myProfileAvatar.innerHTML = `<img src="${myProfilePic}" alt="My Profile Pic">`; // Muestra la foto de perfil en el menú lateral
    }

    // Gestión del historial del navegador para el botón de retroceso
    // Agrega un estado inicial para que el primer "atrás" no cierre la aplicación inesperadamente.
    history.pushState({ screen: 'peerList' }, '', location.href);
    window.addEventListener('popstate', handlePopState); // Escucha el evento popstate para el botón de retroceso

    // Añadir escuchadores de estado de red para reconexión automática
    window.addEventListener('online', handleNetworkChange);
    window.addEventListener('offline', handleNetworkChange);
}

// Manejador del evento popstate (botón de retroceso del navegador)
function handlePopState(event) {
    console.log("Evento Popstate disparado:", event.state);

    if (activeChatPeerId) {
        // Si estamos en un chat activo y se pulsa atrás, volvemos a la lista de usuarios.
        activeChatPeerId = null;
        updateLayout();
        renderOnlineUsers();
        // Volvemos a añadir un estado para "atrapar" el botón de retroceso dentro de la aplicación.
        history.pushState({ screen: 'peerList' }, '', location.href);
    } else {
        // Si estamos en la lista de usuarios y se pulsa atrás, simplemente "atrapamos" el evento
        // para que la aplicación no se cierre o el navegador no retroceda más allá de la app.
        history.pushState({ screen: 'peerList' }, '', location.href);
        showNotification('Presiona atrás de nuevo para salir de la aplicación (o cierra la pestaña).', 'info');
    }
}

// Función para manejar los cambios de estado de la red (online/offline)
function handleNetworkChange() {
    if (navigator.onLine) {
        showNotification('Conectado a internet. Reestableciendo conexiones...', 'info');
        initMyPeer(); // Reinicializar la conexión PeerJS
    } else {
        showNotification('Se perdió la conexión a internet', 'error');
    }
}

// Inicializa o re-inicializa la conexión PeerJS
function initMyPeer() {
    if (peer && !peer.destroyed) peer.destroy(); // Destruye la instancia PeerJS existente si hay una
    peer = new Peer(myAlias, { debug: 2, config: { 'iceServers': [{ 'urls': 'stun:stun.l.google.com:19302' }] } }); // Crea una nueva instancia

    peer.on('open', (id) => {
        console.log(`Mi Peer personal está listo con alias: ${id}`);
        addMessageToChat({ type: 'system', text: `¡Bienvenido, ${myAlias}! Buscando a otros usuarios...` });
        showNotification(`Conectado como ${myAlias}`, 'success');
        connectToTracker(); // Intenta conectar al tracker una vez que el peer esté abierto
    });

    peer.on('connection', (conn) => {
        console.log(`Recibí una conexión de chat directa de ${conn.peer}`);
        setupChatConnection(conn); // Configura el manejador de la conexión de chat entrante
    });

    // Manejador de errores para el objeto 'peer' principal
    peer.on('error', (err) => {
        console.error("Error en PeerJS:", err);
        if (err.type === 'unavailable-id') {
            showNotification(`El alias '${myAlias}' ya está en uso. Por favor, recarga y elige otro.`, 'error');
            localStorage.clear(); // Limpia el alias para forzar al usuario a elegir uno nuevo
            aliasModal.style.display = 'flex'; // Muestra el modal de alias nuevamente
            // Oculta la interfaz principal
            chatHeader.style.display = 'none';
            document.querySelector('.main-container').style.display = 'none';
            document.querySelector('.input-area').style.display = 'none';
        } else if (err.type === 'peer-unavailable' && err.message.includes(TRACKER_ID)) {
             // Este es el momento CRÍTICO. Si el Tracker no está disponible, me convierto en él.
            console.log('El Tracker no está disponible. Me convertiré en el Tracker.');
            becomeTracker(); // Intenta convertirse en el tracker
        } else {
             showNotification(`Error de conexión: ${err.type}`, 'error');
        }
    });
}

// Intenta conectar al tracker de la red P2P
function connectToTracker() {
    console.log('Intentando conectar con el Tracker en el ID:', TRACKER_ID);
    trackerConnection = peer.connect(TRACKER_ID, { metadata: { alias: myAlias, profilePic: myProfilePic }, serialization: 'json' });

    trackerConnection.on('open', () => {
        console.log('Conectado al Tracker exitosamente.');
        isTracker = false; // Ya no soy el tracker, si lo era temporalmente
        showNotification('Conectado al servidor de la red.', 'success');
    });
    trackerConnection.on('data', handleTrackerData); // Maneja los datos recibidos del tracker
    trackerConnection.on('close', () => {
        showNotification('El anfitrión se desconectó. Buscando uno nuevo...', 'error');
        onlineUsers = {}; renderOnlineUsers(); // Limpia la lista de usuarios y la renderiza
        // Introduce un retraso aleatorio antes de reconectar para evitar una "estampida" de reconexiones
        setTimeout(connectToTracker, 2000 + Math.random() * 2000);
    });
    trackerConnection.on('error', (err) => {
         console.error("Error de conexión del Tracker:", err);
         showNotification(`Error de conexión al anfitrión: ${err.type}`, 'error');
    });
}

// Se convierte en el tracker de la red P2P
function becomeTracker() {
    if (isTracker) return; // Ya es un tracker, no hacer nada
    isTracker = true;

    trackerPeer = new Peer(TRACKER_ID, { debug: 2 }); // Crea una nueva instancia PeerJS con el ID del tracker
    trackerPeer.on('open', () => {
        console.log('¡SOY EL TRACKER! Escuchando en:', TRACKER_ID);
        showNotification('Te has convertido en el anfitrión de la red.', 'success');
        onlineUsers = { [myAlias]: { profilePic: myProfilePic, isTracker: true } }; // Me añado a la lista de usuarios en línea
        renderOnlineUsers(); // Renderiza la lista de usuarios
    });

    trackerPeer.on('connection', (conn) => {
        const newUserAlias = conn.metadata.alias;
        console.log(`Tracker: Nuevo usuario conectado: ${newUserAlias}`);

        conn.on('open', () => {
            // 1. Enviar la lista de usuarios actual al nuevo usuario
            conn.send({ type: 'user-list', users: onlineUsers });
            // 2. Añadir el nuevo usuario a mi lista de usuarios en línea
            onlineUsers[newUserAlias] = { profilePic: conn.metadata.profilePic };
            // 3. Notificar a todos los demás usuarios sobre el nuevo usuario
            broadcastToAll({ type: 'user-joined', user: { alias: newUserAlias, data: onlineUsers[newUserAlias] } });
            renderOnlineUsers(); // Actualiza la lista de usuarios
        });

        conn.on('close', () => {
            console.log(`Tracker: Usuario desconectado: ${newUserAlias}`);
            delete onlineUsers[newUserAlias]; // Elimina el usuario desconectado
            broadcastToAll({ type: 'user-left', alias: newUserAlias }); // Notifica a todos
            renderOnlineUsers(); // Actualiza la lista de usuarios
        });
        conn.on('error', (err) => {
             console.error(`Conexión del Tracker con ${newUserAlias} error:`, err);
        });
    });
    trackerPeer.on('error', (err) => {
         console.error("Error del Peer Tracker:", err);
         showNotification(`Error del anfitrión: ${err.type}`, 'error');
    });
}

// Envía un mensaje a todos los usuarios conectados a este tracker
function broadcastToAll(data) {
     Object.values(trackerPeer.connections).flat().forEach(conn => {
        if (conn.open) conn.send(data);
    });
}

// Maneja los datos recibidos del tracker (si no soy el tracker)
function handleTrackerData(data) {
    switch(data.type) {
        case 'user-list':
            onlineUsers = data.users; // Recibe la lista completa de usuarios
            break;
        case 'user-joined':
            onlineUsers[data.user.alias] = data.user.data; // Un nuevo usuario se unió
            showNotification(`${data.user.alias} se ha unido.`, 'info');
            break;
        case 'user-left':
            delete onlineUsers[data.userAlias]; // Un usuario se fue
            showNotification(`${data.userAlias} se ha ido.`, 'info');
            break;
    }
    renderOnlineUsers(); // Actualiza la lista de usuarios en la UI
}

// --- RENDERIZADO DE LA UI Y MANEJO DEL CHAT ---
// Renderiza la lista de usuarios en línea en la UI
function renderOnlineUsers() {
    peerListUl.innerHTML = ''; // Limpia la lista existente
    if (Object.keys(onlineUsers).length === 0) {
         peerListUl.innerHTML = '<li style="text-align: center; color: #777; padding: 20px;">Buscando usuarios...</li>';
         statusIndicator.textContent = '0 usuarios conectados';
         statusIndicator.classList.remove('active');
         return;
    }
    Object.entries(onlineUsers).forEach(([alias, data]) => {
        const li = document.createElement('li');
        li.dataset.peerId = alias;
        if(data.hasUnread) li.classList.add('unread'); // Marca si tiene mensajes no leídos

        const avatarImg = data.profilePic ? `<img src="${data.profilePic}" alt="${alias}">` : `<i class="fa fa-user"></i>`;
        let statusText = 'En línea';
        let statusClass = 'online';
        if(data.isTracker){
            statusText = `Anfitrión ${alias === myAlias ? '(Tú)' : ''}`;
            statusClass = 'tracker';
        }

        li.innerHTML = `
            <div class="avatar">${avatarImg}</div>
            <div class="peer-info">
                <span class="peer-name">${alias === myAlias ? alias + ' (Tú)' : alias}</span>
                <span class="peer-status-text ${statusClass}">${statusText}</span>
            </div>
        `;

        if (alias !== myAlias) li.onclick = () => startChatWith(alias); // Permite iniciar chat si no es el propio usuario
        else li.style.backgroundColor = '#f1f1f1'; // Resalta el propio usuario
        if (alias === activeChatPeerId) li.classList.add('active'); // Marca el chat activo
        peerListUl.appendChild(li);
    });
    updateLayout(); // Llama a updateLayout para actualizar el estado de la conexión/vista
    statusIndicator.textContent = `${Object.keys(onlineUsers).length} usuario(s) conectado(s)`;
    statusIndicator.classList.add('active');
}

// Inicia un chat con un usuario específico
function startChatWith(peerAlias) {
    activeChatPeerId = peerAlias;
    if (onlineUsers[peerAlias]) onlineUsers[peerAlias].hasUnread = false; // Marca mensajes como leídos

    if (!peerConnections[peerAlias] || !peerConnections[peerAlias].open) {
        console.log(`Iniciando conexión de chat con ${peerAlias}...`);
        const conn = peer.connect(peerAlias, { serialization: 'json' }); // Intenta establecer una conexión directa
        setupChatConnection(conn); // Configura la conexión
    }
    chatDiv.innerHTML = ''; // Limpia los mensajes de chat anteriores
    addMessageToChat({ type: 'system-message', text: `Has iniciado un chat con ${peerAlias}.` }); // Mensaje del sistema
    updateLayout(); // Actualiza la UI para mostrar la vista de chat
    renderOnlineUsers(); // Vuelve a renderizar la lista de usuarios para actualizar el estado de no leídos

    history.pushState({ screen: 'chat', peerId: peerAlias }, '', `#chat-${peerAlias}`); // Añade un estado al historial
}

// Configura los manejadores de eventos para una conexión de chat P2P
function setupChatConnection(conn) {
    peerConnections[conn.peer] = conn;
    conn.on('data', (data) => {
        if (activeChatPeerId === data.sender) {
            addMessageToChat(data, 'remote'); // Si es el chat activo, añadir mensaje directamente
        } else {
            if(onlineUsers[data.sender]) onlineUsers[data.sender].hasUnread = true; // Si no, marcar como no leído
            showNotification(`Nuevo mensaje de ${data.sender}`, 'info'); // Mostrar notificación
            renderOnlineUsers(); // Actualizar la lista de usuarios
        }
    });
    conn.on('close', () => {
        showNotification(`${conn.peer} se ha desconectado del chat.`, 'error');
        delete peerConnections[conn.peer]; // Eliminar la conexión
        if (activeChatPeerId === conn.peer) { // Si el chat activo era con este peer
            activeChatPeerId = null; // Limpiar el chat activo
            updateLayout();
            renderOnlineUsers();
            history.pushState({ screen: 'peerList' }, '', location.href); // Volver a la lista de compañeros
        }
    });
    conn.on('error', (err) => {
         console.error(`Error de conexión de chat con ${conn.peer}:`, err);
         showNotification(`Error de chat con ${conn.peer}: ${err.type}`, 'error');
    });
}

// Envía un mensaje al compañero de chat activo
function sendMessage() {
    const text = messageInput.value.trim();
    if (!text || !activeChatPeerId) {
        if (!activeChatPeerId) {
            showNotification('Por favor, selecciona un usuario para chatear.', 'info');
        }
        return; // No hay mensaje o no hay chat activo
    }
    const messageData = { type: 'text', sender: myAlias, text };
    sendDataToPeer(messageData); // Envía el mensaje
    addMessageToChat(messageData, 'self'); // Añade el mensaje a mi propio chat
    messageInput.value = ''; // Limpia el input
    checkSendRecordButtonVisibility(); // Actualiza la visibilidad del botón de enviar/grabar
}

// Envía datos a través de la conexión P2P
function sendDataToPeer(data) {
     const conn = peerConnections[activeChatPeerId];
     if (conn && conn.open) {
         conn.send(data);
     } else {
         console.warn(`Se intentó enviar un mensaje a ${activeChatPeerId}, pero la conexión no está activa o se ha cerrado. Volviendo a la lista de usuarios.`);
         showNotification(`No se pudo enviar. La conexión con ${activeChatPeerId} no está activa o se ha cerrado. Volviendo a la lista de usuarios.`, 'error');
         activeChatPeerId = null; // Resetea el chat activo
         updateLayout();
         renderOnlineUsers();
         history.pushState({ screen: 'peerList' }, '', location.href); // Volver a la lista de compañeros
     }
}

// Añade un mensaje al área de chat
function addMessageToChat(data, direction = 'system-message') {
    const div = document.createElement('div');
    div.className = `message ${direction}`;

    if(direction !== 'system-message'){
        if (direction === 'remote') {
            const senderSpan = document.createElement('span');
            senderSpan.className = 'sender-name';
            senderSpan.textContent = data.sender;
            div.appendChild(senderSpan);
        }
        if(data.type === 'text'){
            const textSpan = document.createElement('span');
            textSpan.textContent = data.text;
            div.appendChild(textSpan);
        } else if(data.type === 'image'){
             const img = document.createElement('img');
             img.src = data.file;
             div.appendChild(img);
        } else if(data.type === 'file'){
             const link = document.createElement('a');
             link.href = data.file;
             link.download = data.name;
             link.className = 'file-download-link';
             link.innerHTML = `<i class="fa fa-file-alt"></i><span>${data.name}</span>`;
             div.appendChild(link);
        }
        const footer = document.createElement('div');
        footer.className = 'message-footer';
        footer.textContent = new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        div.appendChild(footer);
    } else {
         div.textContent = data.text;
    }
    chatDiv.appendChild(div);
    chatDiv.scrollTop = chatDiv.scrollHeight; // Desplaza al final
}

/**
 * Muestra una notificación emergente transitoria en la parte superior central de la pantalla.
 * La notificación se desvanece después de un tiempo y puede tener diferentes tipos (éxito, error, información).
 * @param {string} message - El mensaje a mostrar.
 * @param {'success' | 'error' | 'info'} type - El tipo de notificación para el estilo.
 */
function showNotification(message, type) {
    notificationQueue.push({ message, type });
    if (!isDisplayingNotification) {
        processNotificationQueue();
    }
}

/**
 * Procesa la cola de notificaciones, mostrando una notificación a la vez.
 */
function processNotificationQueue() {
    if (notificationQueue.length === 0) {
        isDisplayingNotification = false;
        return;
    }

    isDisplayingNotification = true;
    const { message, type } = notificationQueue.shift();

    const notification = document.createElement('div');
    notification.textContent = message;
    notification.classList.add('notification-popup');

    if (type === 'success') {
        notification.classList.add('notification-success');
    } else if (type === 'error') {
        notification.classList.add('notification-error');
    } else if (type === 'info') {
        notification.classList.add('notification-info');
    }

    notificationContainer.appendChild(notification);

    // Forzar el reflow para la transición
    void notification.offsetWidth;
    notification.classList.add('show');

    setTimeout(() => {
        notification.classList.remove('show');
        notification.classList.add('hide');

        notification.addEventListener('transitionend', function handler() {
            if (notification.classList.contains('hide')) {
                notification.remove();
                notification.removeEventListener('transitionend', handler);
                setTimeout(processNotificationQueue, 200); // Pequeño retraso antes de la siguiente notificación
            }
        });
    }, 3000); // Mostrar durante 3 segundos
}

// --- LÓGICA DE UI (EVENTOS Y DISEÑO) ---
// Configura los listeners de eventos para los elementos de la interfaz de usuario
function setupUIEventListeners() {
    sendButton.onclick = sendMessage; // Envía mensaje al hacer clic
    messageInput.onkeypress = (e) => { // Envía mensaje al presionar Enter (sin Shift)
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    // Alternar el menú lateral
    menuButton.onclick = () => {
        sideMenu.classList.toggle('active');
        sideMenuBackdrop.classList.toggle('active');
    };
    sideMenuBackdrop.onclick = () => {
        sideMenu.classList.remove('active');
        sideMenuBackdrop.classList.remove('active');
    };

    // Volver a la lista de usuarios al hacer clic en el botón de retroceso
    backToPeersListButton.onclick = () => {
        history.back(); // Utiliza history.back() para activar el popstate
    };

    // Manejo del menú de adjuntos
    attachButton.onclick = (e) => { e.stopPropagation(); attachmentMenu.classList.toggle('active'); backdrop.classList.toggle('active'); };
    backdrop.onclick = () => { attachmentMenu.classList.remove('active'); backdrop.classList.remove('active'); };

    // Disparar input de archivo al hacer clic en los botones de adjuntar
    attachImageButton.onclick = () => imageInput.click();
    attachFileButton.onclick = () => fileInput.click();

    // Manejar la selección de archivos
    imageInput.onchange = (e) => handleFile(e.target.files[0], 'image');
    fileInput.onchange = (e) => handleFile(e.target.files[0], 'file');

    // Comprobar visibilidad del botón de enviar/grabar al escribir
    messageInput.oninput = () => checkSendRecordButtonVisibility();
    checkSendRecordButtonVisibility(); // Comprobación inicial al cargar
}

// Maneja la carga de archivos (imágenes/documentos)
function handleFile(file, type){
     if(!file || !activeChatPeerId) {
        showNotification('Por favor, selecciona un usuario para chatear antes de enviar un archivo.', 'info');
        return;
     }
     const reader = new FileReader();
     reader.onload = (e) => {
         const messageData = { type, sender: myAlias, file: e.target.result, name: file.name };
         sendDataToPeer(messageData);
         addMessageToChat(messageData, 'self');
     };
     reader.readAsDataURL(file); // Lee el archivo como URL de datos (Base64)
     attachmentMenu.classList.remove('active'); // Oculta el menú de adjuntos
     backdrop.classList.remove('active'); // Oculta el fondo oscuro
}

// Comprueba si hay texto en el input para mostrar el botón de enviar o grabar
function checkSendRecordButtonVisibility() {
    const hasText = messageInput.value.trim().length > 0;
    sendButton.style.display = hasText ? 'flex' : 'none';
    recordVoiceButton.style.display = hasText ? 'none' : 'flex';
}

// Actualiza el layout de la interfaz según si se está en vista de chat o de lista de usuarios
function updateLayout() {
    const isChatView = !!activeChatPeerId;
    peerListContainer.classList.toggle('hidden-left', isChatView); // Oculta/muestra la lista de usuarios

    // Mostrar/ocultar botón de menú vs botón de retroceso en la cabecera
    menuButton.style.display = isChatView ? 'none' : 'block';
    backToPeersListButton.style.display = isChatView ? 'block' : 'none';

    if (isChatView) {
        // Si estamos en vista de chat, mostrar info del compañero
        const peerData = onlineUsers[activeChatPeerId] || {};
        activePeerNameDisplay.textContent = activeChatPeerId;
        activePeerProfilePic.innerHTML = peerData.profilePic ? `<img src="${peerData.profilePic}" alt="${activeChatPeerId}">` : `<i class="fa fa-user"></i>`;
        statusIndicator.textContent = 'En línea';
        statusIndicator.classList.add('active');
    } else {
        // Si estamos en vista de lista, mostrar info general
        activePeerNameDisplay.textContent = 'Usuarios en Línea';
        activePeerProfilePic.innerHTML = `<i class="fa fa-users"></i>`;
        // El estado de la vista de la lista de compañeros es manejado por renderOnlineUsers
    }
}

// Escuchadores de eventos globales
window.addEventListener('load', updateLayout); // Actualiza el layout al cargar la ventana
window.addEventListener('resize', updateLayout); // Actualiza el layout al redimensionar la ventana

