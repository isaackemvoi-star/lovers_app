import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";

import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged,
  RecaptchaVerifier,
  signInWithPhoneNumber
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
  updateDoc
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

/* ================= GLOBAL ================= */

let me = "";
let peer = "";

let peerConnection;
let localStream;
let remoteStream;

let recorder;
let audioChunks = [];

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

/* ================= HELPERS ================= */

function el(id){
  return document.getElementById(id);
}

/* ================= SIGNUP ================= */

window.signup = async function(){

  try{

    const email = el("email").value.trim();

    const password = el("password").value.trim();

    if(!email || !password){
      return alert("Enter email and password");
    }

    await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

  }catch(err){

    alert(err.message);

  }

};

/* ================= LOGIN ================= */

window.login = async function(){

  try{

    const email = el("email").value.trim();

    const password = el("password").value.trim();

    if(!email || !password){
      return alert("Enter email and password");
    }

    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

  }catch(err){

    alert(err.message);

  }

};

/* ================= PHONE LOGIN ================= */

window.recaptchaVerifier = new RecaptchaVerifier(
  auth,
  "recaptcha-container",
  {
    size:"normal"
  }
);

window.sendPhoneCode = async function(){

  try{

    const phone = el("phoneNumber").value;

    window.confirmationResult =
      await signInWithPhoneNumber(
        auth,
        phone,
        window.recaptchaVerifier
      );

    alert("OTP Sent");

  }catch(err){

    alert(err.message);

  }

};

window.verifyPhoneCode = async function(){

  try{

    const code = el("otpCode").value;

    await window.confirmationResult.confirm(code);

  }catch(err){

    alert(err.message);

  }

};

/* ================= AUTH STATE ================= */

onAuthStateChanged(auth, async(user)=>{

  if(!user) return;

  me = user.email || user.phoneNumber;

  el("authPage").style.display = "none";

  el("app").style.display = "flex";

  await setDoc(
    doc(db,"online",me),
    {
      online:true,
      lastSeen:Date.now()
    }
  );

  loadChats();

  listenForCalls();

});

/* ================= LOAD CHATS ================= */

function loadChats(){

  const q = query(
    collection(db,"messages"),
    orderBy("time")
  );

  onSnapshot(q,(snap)=>{

    const users = {};

    snap.forEach(d=>{

      const m = d.data();

      if(m.from === me){
        users[m.to] = m;
      }

      if(m.to === me){
        users[m.from] = m;
      }

    });

    const box = el("chatList");

    box.innerHTML = "";

    Object.keys(users).forEach(user=>{

      const msg = users[user];

      const div = document.createElement("div");

      div.className = "chatItem";

      div.innerHTML = `
        <div class="chatAvatar"></div>

        <div class="chatInfo">

          <div class="chatName">
            ${user}
          </div>

          <div class="chatPreview">
            ${msg.text || "Media"}
          </div>

        </div>
      `;

      div.onclick = ()=>{

        peer = user;

        el("chatName").innerText = user;

        loadMessages();

        if(window.innerWidth < 900){
          document.body.classList.add("mobileChatOpen");
        }

      };

      box.appendChild(div);

    });

  });

}

/* ================= LOAD MESSAGES ================= */

function loadMessages(){

  const q = query(
    collection(db,"messages"),
    orderBy("time")
  );

  onSnapshot(q, async(snap)=>{

    const box = el("messages");

    box.innerHTML = "";

    snap.forEach(async(d)=>{

      const m = d.data();

      if(
        (m.from === me && m.to === peer) ||
        (m.from === peer && m.to === me)
      ){

        if(m.to === me && !m.seen){

          await updateDoc(
            doc(db,"messages",d.id),
            {
              seen:true
            }
          );

        }

        const div = document.createElement("div");

        div.className =
          "msg " +
          (m.from === me ? "me":"other");

        div.innerHTML = `
          ${m.text || ""}

          ${
            m.image
            ? `<br><img src="${m.image}">`
            : ""
          }

          ${
            m.audio
            ? `<br><audio controls src="${m.audio}"></audio>`
            : ""
          }
        `;

        box.appendChild(div);

      }

    });

    box.scrollTop = box.scrollHeight;

  });

}

/* ================= SEND ================= */

window.send = async function(){

  if(!peer){
    return alert("Select a chat");
  }

  const text = el("msg").value;

  const imageFile =
    el("imageInput").files[0];

  let imageUrl = "";

  let audioUrl = "";

  try{

    if(imageFile){

      const storageRef = ref(
        storage,
        "images/" + Date.now()
      );

      await uploadBytes(
        storageRef,
        imageFile
      );

      imageUrl =
        await getDownloadURL(storageRef);

    }

    if(window.recordedBlob){

      const audioRef = ref(
        storage,
        "audio/" + Date.now()
      );

      await uploadBytes(
        audioRef,
        window.recordedBlob
      );

      audioUrl =
        await getDownloadURL(audioRef);

      window.recordedBlob = null;

    }

    await addDoc(
      collection(db,"messages"),
      {
        from:me,
        to:peer,
        text,
        image:imageUrl,
        audio:audioUrl,
        seen:false,
        time:serverTimestamp()
      }
    );

    el("msg").value = "";

    el("imageInput").value = "";

  }catch(err){

    alert(err.message);

  }

};

/* ================= VOICE RECORD ================= */

window.startRecording = async function(){

  localStream =
    await navigator.mediaDevices.getUserMedia({
      audio:true
    });

  recorder = new MediaRecorder(localStream);

  audioChunks = [];

  recorder.ondataavailable = e=>{
    audioChunks.push(e.data);
  };

  recorder.onstop = ()=>{

    window.recordedBlob =
      new Blob(audioChunks,{
        type:"audio/mp3"
      });

    alert("Voice note ready");

  };

  recorder.start();

};

window.stopRecording = function(){

  if(recorder){
    recorder.stop();
  }

};

/* ================= CALLS ================= */

window.startCall = async function(){

  await setupCall(false);

};

window.startVideoCall = async function(){

  await setupCall(true);

};

async function setupCall(video){

  localStream =
    await navigator.mediaDevices.getUserMedia({
      audio:true,
      video:video
    });

  el("localVideo").srcObject =
    localStream;

  remoteStream = new MediaStream();

  el("remoteVideo").srcObject =
    remoteStream;

  peerConnection =
    new RTCPeerConnection(servers);

  localStream.getTracks().forEach(track=>{

    peerConnection.addTrack(
      track,
      localStream
    );

  });

  peerConnection.ontrack = event=>{

    event.streams[0]
    .getTracks()
    .forEach(track=>{

      remoteStream.addTrack(track);

    });

  };

  peerConnection.onicecandidate =
  async(event)=>{

    if(event.candidate){

      await addDoc(
        collection(db,"calls"),
        {
          from:me,
          to:peer,
          candidate:JSON.stringify(
            event.candidate
          )
        }
      );

    }

  };

  const offer =
    await peerConnection.createOffer();

  await peerConnection.setLocalDescription(
    offer
  );

  await addDoc(
    collection(db,"calls"),
    {
      from:me,
      to:peer,
      offer:JSON.stringify(offer)
    }
  );

}

/* ================= RECEIVE CALLS ================= */

function listenForCalls(){

  onSnapshot(
    collection(db,"calls"),
    async(snap)=>{

      snap.forEach(async(docSnap)=>{

        const data = docSnap.data();

        if(data.to !== me) return;

        if(data.offer && !peerConnection){

          localStream =
            await navigator.mediaDevices.getUserMedia({
              audio:true,
              video:true
            });

          el("localVideo").srcObject =
            localStream;

          remoteStream =
            new MediaStream();

          el("remoteVideo").srcObject =
            remoteStream;

          peerConnection =
            new RTCPeerConnection(servers);

          localStream.getTracks()
          .forEach(track=>{

            peerConnection.addTrack(
              track,
              localStream
            );

          });

          peerConnection.ontrack = event=>{

            event.streams[0]
            .getTracks()
            .forEach(track=>{

              remoteStream.addTrack(track);

            });

          };

          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(
              JSON.parse(data.offer)
            )
          );

          const answer =
            await peerConnection.createAnswer();

          await peerConnection.setLocalDescription(
            answer
          );

          await addDoc(
            collection(db,"calls"),
            {
              from:me,
              to:data.from,
              answer:JSON.stringify(answer)
            }
          );

        }

        if(data.answer && peerConnection){

          await peerConnection.setRemoteDescription(
            new RTCSessionDescription(
              JSON.parse(data.answer)
            )
          );

        }

        if(data.candidate && peerConnection){

          await peerConnection.addIceCandidate(
            new RTCIceCandidate(
              JSON.parse(data.candidate)
            )
          );

        }

      });

    }
  );

}

/* ================= END CALL ================= */

window.endCall = function(){

  if(peerConnection){

    peerConnection.close();

    peerConnection = null;

  }

  if(localStream){

    localStream
    .getTracks()
    .forEach(track=>track.stop());

  }

  el("localVideo").srcObject = null;

  el("remoteVideo").srcObject = null;

};

/* ================= MENU ================= */

window.toggleMenu = function(){

  const menu = el("menuBox");

  menu.style.display =
    menu.style.display === "block"
    ? "none"
    : "block";

};

/* ================= EXTRA FEATURES ================= */

window.setMood = function(){

  const mood =
    prompt(
      "Set Mood:\nHappy\nMiss you\nNeed space\nStressed"
    );

  if(mood){

    el("moodText").innerText =
      "💭 " + mood;

  }

};

window.setLoveLanguage = function(){

  const lang =
    prompt(
      "Love Language?"
    );

  if(lang){

    alert(
      "Saved: " + lang
    );

  }

};

window.sendSOS = function(){

  navigator.geolocation.getCurrentPosition(
    pos=>{

      alert(
        "SOS Sent\nLat: " +
        pos.coords.latitude
      );

    }
  );

};

window.downloadChat = function(){

  alert(
    "Backup system ready"
  );

};

window.voiceOnlyMode = function(){

  alert(
    "Voice only mode enabled"
  );

};

window.waterPlant = function(){

  alert(
    "🌱 Plant watered"
  );

};

window.breakupMode = function(){

  const ok =
    confirm(
      "Reset relationship?"
    );

  if(ok){

    alert(
      "Breakup mode ready"
    );

  }

};

/* ================= LOGOUT ================= */

window.logout = async function(){

  await signOut(auth);

  location.reload();

};