import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";

import {
  getFirestore,
  collection,
  addDoc,
  query,
  orderBy,
  onSnapshot,
  serverTimestamp,
  setDoc,
  doc,
  updateDoc,
  getDocs
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

/* ================= FIREBASE ================= */

const firebaseConfig = {
  apiKey: "AIzaSyDl3waU-ToyUXmQ6ZbuHr03-w4MPYQDSw8",
  authDomain: "lovers-app-f7296.firebaseapp.com",
  projectId: "lovers-app-f7296",
  storageBucket: "lovers-app-f7296.appspot.com",
  messagingSenderId: "918297830693",
  appId: "1:918297830693:web:69b61a15ca2962e5f2a6cc"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

/* ================= GLOBAL STATE ================= */

let me = null;
let peer = null;
let localStream;
let remoteStream;
let peerConnection;

const servers = {
  iceServers: [
    {
      urls: [
        "stun:stun.l.google.com:19302",
        "stun:stun1.l.google.com:19302"
      ]
    }
  ]
};
/* ================= SAFE DOM ACCESS ================= */

function el(id) {
  return document.getElementById(id);
}

/* ================= AUTH FIXED ================= */

window.signup = async function () {
  try {
    const email = el("email")?.value?.trim();
    const password = el("password")?.value?.trim();

    if (!email || !password) {
      alert("Enter email & password");
      return;
    }

    await createUserWithEmailAndPassword(auth, email, password);
  } catch (e) {
    alert("Signup failed: " + e.message);
  }
};

window.login = async function () {
  try {
    const email = el("email")?.value?.trim();
    const password = el("password")?.value?.trim();

    if (!email || !password) {
      alert("Enter email & password");
      return;
    }

    await signInWithEmailAndPassword(auth, email, password);
  } catch (e) {
    alert("Login failed: " + e.message);
  }
};

/* ================= AUTH STATE ================= */

onAuthStateChanged(auth, async (user) => {
  if (!user) return;

  me = user.email;

  el("auth").style.display = "none";
  el("app").style.display = "block";

  el("me").innerText = me;

  await setDoc(doc(db, "online", me), {
    online: true,
    lastSeen: Date.now()
  });

  loadUsers();
  loadChat();
});

/* ================= USERS ================= */

function loadUsers(){
  onSnapshot(collection(db, "online"), (snap) => {
    const box = el("users");
    box.innerHTML = "";

    snap.forEach(d => {
      if (d.id !== me) {
        const div = document.createElement("div");
        div.innerText = d.id;

        div.onclick = () => {
          peer = d.id;
          el("chatUser").innerText = d.id;
        };

        box.appendChild(div);
      }
    });
  });
}

/* ================= SEND MESSAGE ================= */

window.send = async function () {
  if (!peer) return alert("Select a user");

  const text = el("msg").value;

  let imageUrl = "";
  let audioUrl = "";

  const imageFile = el("imageInput")?.files[0];
  const audioFile = el("audioInput")?.files[0];

  try {
    if (imageFile) {
      const r = ref(storage, "images/" + Date.now());
      await uploadBytes(r, imageFile);
      imageUrl = await getDownloadURL(r);
    }

    if (audioFile) {
      const r = ref(storage, "audio/" + Date.now());
      await uploadBytes(r, audioFile);
      audioUrl = await getDownloadURL(r);
    }

    await addDoc(collection(db, "messages"), {
      from: me,
      to: peer,
      text,
      image: imageUrl,
      audio: audioUrl,
      seen: false,
      time: serverTimestamp()
    });

    el("msg").value = "";
    el("imageInput").value = "";
    el("audioInput").value = "";

  } catch (e) {
    alert("Send failed: " + e.message);
  }
};

/* ================= CHAT ================= */

function loadChat() {
  const q = query(collection(db, "messages"), orderBy("time"));

  onSnapshot(q, async (snap) => {
    const box = el("box");
    box.innerHTML = "";

    snap.forEach(async (d) => {
      const m = d.data();

      if (
        (m.from === me && m.to === peer) ||
        (m.from === peer && m.to === me)
      ) {

        if (m.to === me && !m.seen) {
          await updateDoc(doc(db, "messages", d.id), { seen: true });
        }

        const div = document.createElement("div");
        div.className = "msg " + (m.from === me ? "me" : "other");

        div.innerHTML = `
          ${m.text || ""}
          ${m.image ? `<br><img src="${m.image}" width="150">` : ""}
          ${m.audio ? `<br><audio controls src="${m.audio}"></audio>` : ""}
          <br>
          ${m.from === me ? (m.seen ? "✔✔" : "✔") : ""}
        `;

        box.appendChild(div);
      }
    });

    box.scrollTop = box.scrollHeight;
  });
}

/* ================= LOGOUT ================= */

window.logout = function () {
  signOut(auth);
  location.reload();
};

/* ================= WEBRTC CALLING ================= */

window.startCall = async function () {
  if (!peer) return alert("Select a user first");
  await setupCall(false);
};

window.startVideoCall = async function () {
  if (!peer) return alert("Select a user first");
  await setupCall(true);
};

async function setupCall(withVideo) {
  localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: withVideo
  });

  el("localVideo").srcObject = localStream;

  remoteStream = new MediaStream();
  el("remoteVideo").srcObject = remoteStream;

  peerConnection = new RTCPeerConnection(servers);

  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });

  peerConnection.ontrack = event => {
    event.streams[0].getTracks().forEach(track => {
      remoteStream.addTrack(track);
    });
  };

  peerConnection.onicecandidate = async event => {
    if (event.candidate) {
      await addDoc(collection(db, "calls"), {
        from: me,
        to: peer,
        candidate: JSON.stringify(event.candidate)
      });
    }
  };

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  await addDoc(collection(db, "calls"), {
    from: me,
    to: peer,
    offer: JSON.stringify(offer)
  });
}

window.endCall = function () {
  if (peerConnection) {
    peerConnection.close();
    peerConnection = null;
  }

  if (localStream) {
    localStream.getTracks().forEach(track => track.stop());
  }

  el("localVideo").srcObject = null;
  el("remoteVideo").srcObject = null;
};

function listenForCalls() {
  onSnapshot(collection(db, "calls"), async (snap) => {
    snap.forEach(async (docSnap) => {
      const data = docSnap.data();

      if (data.to !== me) return;

      if (data.offer && !peerConnection) {

        localStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true
        });

        el("localVideo").srcObject = localStream;

        remoteStream = new MediaStream();
        el("remoteVideo").srcObject = remoteStream;

        peerConnection = new RTCPeerConnection(servers);

        localStream.getTracks().forEach(track => {
          peerConnection.addTrack(track, localStream);
        });

        peerConnection.ontrack = event => {
          event.streams[0].getTracks().forEach(track => {
            remoteStream.addTrack(track);
          });
        };

        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(JSON.parse(data.offer))
        );

        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);

        await addDoc(collection(db, "calls"), {
          from: me,
          to: data.from,
          answer: JSON.stringify(answer)
        });
      }

      if (data.answer && peerConnection) {
        await peerConnection.setRemoteDescription(
          new RTCSessionDescription(JSON.parse(data.answer))
        );
      }

      if (data.candidate && peerConnection) {
        await peerConnection.addIceCandidate(
          new RTCIceCandidate(JSON.parse(data.candidate))
        );
      }
    });
  });
}/* ================= MOOD SYNC ================= */

window.setMood = async function () {
  const mood = el("moodSelect")?.value;
  if (!mood) return;

  await setDoc(doc(db, "moods", me), {
    mood,
    time: Date.now()
  });
};

function loadMood() {
  onSnapshot(collection(db, "moods"), (snap) => {
    snap.forEach(d => {
      if (d.id !== me && el("partnerMood")) {
        el("partnerMood").innerText = "Partner Mood: " + d.data().mood;
      }
    });
  });
}

/* ================= DATE GENERATOR ================= */

window.generateDate = function () {
  const ideas = [
    "Cook dinner together",
    "Watch a movie",
    "Take a walk",
    "Play a game",
    "Talk deeply for 10 mins"
  ];

  const random = ideas[Math.floor(Math.random() * ideas.length)];

  if (el("dateIdea")) {
    el("dateIdea").innerText = random;
  }
};

/* ================= SOS ================= */

window.sendSOS = async function () {
  if (!peer) return;

  navigator.geolocation.getCurrentPosition(async (pos) => {
    await addDoc(collection(db, "sos"), {
      from: me,
      to: peer,
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      time: Date.now()
    });

    alert("SOS sent");
  });
};

/* ================= LOVE LANGUAGE ================= */

window.saveLoveLanguage = async function () {
  const language = el("loveLanguage")?.value;
  if (!language) return;

  await setDoc(doc(db, "loveLanguages", me), {
    language
  });
};

/* ================= SHARED PLANT ================= */

window.waterPlant = async function () {
  await setDoc(doc(db, "plant", "shared"), {
    lastWatered: Date.now()
  });
};

function loadPlant() {
  onSnapshot(doc(db, "plant", "shared"), (snap) => {
    if (!snap.exists() || !el("plantStatus")) return;

    const last = snap.data().lastWatered;
    const diff = Date.now() - last;
    const days = diff / (1000 * 60 * 60 * 24);

    el("plantStatus").innerText =
      days < 1 ? "🌱 Healthy Plant" : "🥀 Needs Water";
  });
}

/* ================= VOICE ONLY MODE ================= */

window.voiceOnlyMode = function () {
  if (el("msg")) {
    el("msg").disabled = true;
    alert("Voice only mode enabled");
  }
};

/* ================= BREAKUP SWITCH ================= */

window.breakupMode = function () {
  const confirmBreak = confirm("Reset relationship data?");
  if (confirmBreak) {
    alert("Reset system ready");
  }
};

/* ================= UNDO PLACEHOLDER ================= */

window.clearRecentMessages = function () {
  alert("Undo feature coming soon");
};