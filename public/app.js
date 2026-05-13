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

let me = null;

let peer = null;

let confirmationResult;

/* ================= HELPERS ================= */

function el(id){

  return document.getElementById(id);

}

/* ================= AUTH ================= */

window.signup = async function(){

  try{

    const email =
      el("email").value.trim();

    const password =
      el("password").value.trim();

    await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

  }catch(e){

    alert(e.message);

  }

};

window.login = async function(){

  try{

    const email =
      el("email").value.trim();

    const password =
      el("password").value.trim();

    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

  }catch(e){

    alert(e.message);

  }

};

/* ================= PHONE LOGIN ================= */

window.recaptchaVerifier =
  new RecaptchaVerifier(

    auth,

    "recaptcha-container",

    {
      size:"normal"
    }

  );

window.sendPhoneCode = async function(){

  try{

    const phone =
      el("phoneNumber").value;

    confirmationResult =
      await signInWithPhoneNumber(

        auth,
        phone,
        window.recaptchaVerifier

      );

    alert("OTP Sent");

  }catch(e){

    alert(e.message);

  }

};

window.verifyPhoneCode = async function(){

  try{

    const code =
      el("otpCode").value;

    await confirmationResult.confirm(
      code
    );

  }catch(e){

    alert(e.message);

  }

};

/* ================= AUTH STATE ================= */

onAuthStateChanged(

  auth,

  async(user)=>{

    if(!user) return;

    me =
      user.email ||
      user.phoneNumber;

    el("authPage").style.display =
      "none";

    el("app").style.display =
      "flex";

    loadUsers();

  }

);

/* ================= ADD CHAT ================= */

window.addNewChat = async function(){

  const email =
    el("newChatEmail")
    .value
    .trim();

  if(!email) return;

  await setDoc(

    doc(
      db,
      "contacts",
      me + "_" + email
    ),

    {
      users:[me,email]
    }

  );

  await setDoc(

    doc(
      db,
      "contacts",
      email + "_" + me
    ),

    {
      users:[email,me]
    }

  );

  el("newChatEmail").value = "";

};

/* ================= USERS ================= */

function loadUsers(){

  onSnapshot(

    collection(db,"contacts"),

    (snap)=>{

      const box =
        el("chatList");

      box.innerHTML = "";

      snap.forEach(docSnap=>{

        const data =
          docSnap.data();

        if(
          !data.users.includes(me)
        ) return;

        const otherUser =
          data.users.find(
            u => u !== me
          );

        const div =
          document.createElement("div");

        div.className =
          "chatItem";

        div.innerHTML = `

          <div class="chatAvatar">
            💖
          </div>

          <div class="chatInfo">

            <div class="chatName">
              ${otherUser}
            </div>

            <div class="chatPreview">
              Open conversation
            </div>

          </div>

        `;

        div.onclick = ()=>{

          peer = otherUser;

          el("chatName").innerText =
            otherUser;

          document.body.classList.add(
            "showChat"
          );

          loadChat();

        };

        box.appendChild(div);

      });

    }

  );

}

/* ================= SEND ================= */

window.send = async function(){

  if(!peer) return;

  const text =
    el("msg").value;

  let imageUrl = "";

  const imageFile =
    el("imageInput").files[0];

  if(imageFile){

    const storageRef =
      ref(
        storage,
        "images/" + Date.now()
      );

    await uploadBytes(
      storageRef,
      imageFile
    );

    imageUrl =
      await getDownloadURL(
        storageRef
      );

  }

  await addDoc(

    collection(db,"messages"),

    {

      from:me,
      to:peer,
      text,
      image:imageUrl,
      time:serverTimestamp()

    }

  );

  el("msg").value = "";

};

/* ================= CHAT ================= */

function loadChat(){

  const q = query(

    collection(db,"messages"),

    orderBy("time")

  );

  onSnapshot(

    q,

    (snap)=>{

      const box =
        el("messages");

      box.innerHTML = "";

      snap.forEach(docSnap=>{

        const m =
          docSnap.data();

        if(

          (
            m.from === me &&
            m.to === peer
          )

          ||

          (
            m.from === peer &&
            m.to === me
          )

        ){

          const div =
            document.createElement("div");

          div.className =
            "msg " +

            (
              m.from === me
              ? "me"
              : "other"
            );

          div.innerHTML = `

            ${m.text || ""}

            ${
              m.image

              ?

              `<br>
               <img src="${m.image}">
              `

              :

              ""
            }

          `;

          box.appendChild(div);

        }

      });

      box.scrollTop =
        box.scrollHeight;

    }

  );

}

/* ================= MENU ================= */

window.toggleMenu = function(){

  const menu =
    el("menuBox");

  menu.style.display =

    menu.style.display === "block"

    ?

    "none"

    :

    "block";

};

/* ================= PLACEHOLDER FEATURES ================= */

window.startCall = function(){

  alert("Voice call ready");

};

window.startVideoCall = function(){

  el("callArea").style.display =
    "flex";

};

window.setMood = function(){

  alert("Mood updated");

};

window.setLoveLanguage = function(){

  alert("Love language saved");

};

window.waterPlant = function(){

  alert("Plant watered");

};

window.downloadChat = function(){

  alert("Backup ready");

};

window.voiceOnlyMode = function(){

  alert("Voice only mode enabled");

};

window.sendSOS = function(){

  alert("SOS sent");

};

window.breakupMode = function(){

  alert("Breakup mode ready");

};

/* ================= LOGOUT ================= */

window.logout = async function(){

  await signOut(auth);

  location.reload();

};