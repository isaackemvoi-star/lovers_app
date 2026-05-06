const socket = io();

let myName = "";
let typingTimeout;

/* ================= AUTH ================= */
function login() {
  socket.emit("login", {
    username: username.value,
    password: password.value
  });
}

function signup() {
  socket.emit("signup", {
    username: username.value,
    password: password.value
  });
}

/* ================= AUTH EVENTS ================= */
socket.on("loginSuccess", (d) => {
  myName = d.username;

  auth.style.display = "none";
  chatPage.style.display = "block";
});

socket.on("loginError", (m) => msg.innerText = m);
socket.on("signupSuccess", (m) => msg.innerText = m);
socket.on("signupError", (m) => msg.innerText = m);

/* ================= ONLINE ================= */
socket.on("onlineUsers", (u) => {
  online.innerText = "Online: " + u.length;
});

/* ================= LOAD MESSAGES ================= */
socket.on("loadMessages", (msgs) => {
  chat.innerHTML = "";
  msgs.forEach(renderMessage);
});

/* ================= NEW MESSAGE ================= */
socket.on("message", (msg) => {
  renderMessage(msg);

  // mark delivered ONLY if not mine
  if (msg.user !== myName) {
    socket.emit("messageDelivered", msg.id);
  }
});

/* ================= UPDATE MESSAGE (TICKS FIXED) ================= */
socket.on("messageUpdate", (msg) => {
  updateTicks(msg);
});

/* ================= SEND TEXT ================= */
function send() {
  const text = msgInput.value.trim();
  if (!text) return;

  socket.emit("message", text);
  msgInput.value = "";
}

/* ================= RENDER MESSAGE ================= */
function renderMessage(msg) {

  const div = document.createElement("div");
  div.className = "msg " + (msg.user === myName ? "me" : "them");
  div.id = "m" + msg.id;

  let content = "";

  // TEXT
  if (!msg.type || msg.type === "text") {
    content = escapeHTML(msg.text);
  }

  // IMAGE
  else if (msg.type === "image") {
    content = `<img src="${msg.image}" style="max-width:200px;border-radius:10px;">`;
  }

  // VOICE
  else if (msg.type === "voice") {
    content = `<audio controls src="${msg.audio}"></audio>`;
  }

  const ticks = getTicks(msg);

  if (msg.user === myName) {
    div.innerHTML = `${content} <small>${ticks}</small>`;
  } else {
    div.innerHTML = content;
  }

  chat.appendChild(div);
  chat.scrollTop = chat.scrollHeight;
}

/* ================= UPDATE TICKS ONLY ================= */
function updateTicks(msg) {
  const el = document.getElementById("m" + msg.id);
  if (!el || msg.user !== myName) return;

  const ticks = getTicks(msg);

  const content = el.innerHTML.split("<small>")[0];
  el.innerHTML = `${content}<small>${ticks}</small>`;
}

/* ================= TICK LOGIC ================= */
function getTicks(msg) {

  if (msg.seenBy && msg.seenBy.length > 1) {
    return "✔✔"; // future blue tick ready
  }

  if (msg.deliveredTo && msg.deliveredTo.length > 1) {
    return "✔✔";
  }

  return "✔";
}

/* ================= IMAGE SEND ================= */
imgInput.addEventListener("change", function () {
  const file = this.files[0];
  if (!file) return;

  const reader = new FileReader();

  reader.onload = () => {
    socket.emit("image", reader.result);
  };

  reader.readAsDataURL(file);
});

/* ================= VOICE NOTE ================= */
let recorder;
let chunks = [];

function startVoice() {
  navigator.mediaDevices.getUserMedia({ audio: true })
    .then(stream => {

      recorder = new MediaRecorder(stream);
      recorder.start();

      chunks = [];

      recorder.ondataavailable = e => chunks.push(e.data);

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "audio/webm" });

        const reader = new FileReader();
        reader.onload = () => {
          socket.emit("voice", reader.result);
        };

        reader.readAsDataURL(blob);
      };

      setTimeout(() => recorder.stop(), 4000);
    });
}

/* ================= TYPING ================= */
socket.on("typing", (u) => {
  typing.innerText = u + " is typing...";
});

socket.on("stopTyping", () => {
  typing.innerText = "";
});

/* ================= TYPING DETECT ================= */
msgInput.addEventListener("input", () => {

  socket.emit("typing", myName);

  clearTimeout(typingTimeout);

  typingTimeout = setTimeout(() => {
    socket.emit("stopTyping");
  }, 800);
});

/* ================= SECURITY (IMPORTANT) ================= */
function escapeHTML(text) {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}