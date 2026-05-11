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
  getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-storage.js";

/* FIREBASE */

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

/* GLOBAL */

let me = null;
let peer = null;

let peerConnection;
let localStream;
let remoteStream;

const servers = {
  iceServers: [
    {
      urls: [
        "stun:stun.l.google.com:19302"
      ]
    }
  ]
};

function el(id) {
  return document.getElementById(id);
}

/* ENCRYPT */

function encrypt(text) {

  if (!text) return "";

  return btoa(text);

}

function decrypt(text) {

  if (!text) return "";

  try {

    return atob(text);

  } catch {

    return text;

  }

}

/* AUTH */

window.signup = async function () {

  try {

    const email =
      el("email").value.trim();

    const password =
      el("password").value.trim();

    if (!email || !password) {

      alert("Enter email and password");

      return;

    }

    await createUserWithEmailAndPassword(
      auth,
      email,
      password
    );

  } catch (e) {

    alert(e.message);

  }

};

window.login = async function () {

  try {

    const email =
      el("email").value.trim();

    const password =
      el("password").value.trim();

    if (!email || !password) {

      alert("Enter email and password");

      return;

    }

    await signInWithEmailAndPassword(
      auth,
      email,
      password
    );

  } catch (e) {

    alert(e.message);

  }

};

/* AUTH STATE */

onAuthStateChanged(
  auth,
  async (user) => {

    if (!user) return;

    me = user.email;

    el("auth").style.display =
      "none";

    el("app").style.display =
      "block";

    el("me").innerText = me;

    await setDoc(
      doc(db, "online", me),
      {
        online: true,
        lastSeen: Date.now()
      }
    );

   function loadUsers() {

  onSnapshot(
    collection(db, "online"),
    (snap) => {

      const box = el("users");

      box.innerHTML = "";

      let firstUser = null;

      snap.forEach((d) => {

        if (d.id !== me) {

          if (!firstUser) {
            firstUser = d.id;
          }

          const div =
            document.createElement("div");

          div.className =
            "userItem";

          div.innerHTML = `

            <div class="userAvatar">
              💖
            </div>

            <div class="userContent">

              <div class="userTop">

                <div class="userName">
                  ${d.id}
                </div>

              </div>

              <div class="userLast">
                Tap to open chat
              </div>

            </div>

          `;

          div.onclick = () => {

            peer = d.id;

            el("chatUser").innerText =
              d.id;

            loadChat();

            loadMood();

            loadLoveLanguage();

            if (window.innerWidth < 800) {

              document
                .querySelector(".chatArea")
                .classList.add("active");

            }

          };

          box.appendChild(div);

        }

      });

      /* AUTO OPEN FIRST CHAT */

      if (!peer && firstUser) {

        peer = firstUser;

        el("chatUser").innerText =
          firstUser;

        loadChat();

        loadMood();

        loadLoveLanguage();

      }

    }
  );

}

/* SEND */

window.send =
  async function () {

    if (!peer) {

      alert("Select chat");

      return;

    }

    const text =
      el("msg").value.trim();

    const imageFile =
      el("imageInput").files[0];

    const audioFile =
      el("audioInput").files[0];

    let imageUrl = "";
    let audioUrl = "";

    try {

      if (imageFile) {

        const imageRef =
          ref(
            storage,
            "images/" +
            Date.now()
          );

        await uploadBytes(
          imageRef,
          imageFile
        );

        imageUrl =
          await getDownloadURL(
            imageRef
          );

      }

      if (audioFile) {

        const audioRef =
          ref(
            storage,
            "audio/" +
            Date.now()
          );

        await uploadBytes(
          audioRef,
          audioFile
        );

        audioUrl =
          await getDownloadURL(
            audioRef
          );

      }

      await addDoc(
        collection(db, "messages"),
        {
          from: me,
          to: peer,
          text: encrypt(text),
          image: imageUrl,
          audio: audioUrl,
          seen: false,
          time: serverTimestamp()
        }
      );

      el("msg").value = "";

      el("imageInput").value = "";

      el("audioInput").value = "";

    } catch (e) {

      alert(e.message);

    }

  };

/* CHAT */

function loadChat() {

  if (!peer) return;

  const q =
    query(
      collection(db, "messages"),
      orderBy("time")
    );

  onSnapshot(
    q,
    async (snap) => {

      const box =
        el("box");

      box.innerHTML = "";

      snap.forEach(
        async (d) => {

          const m =
            d.data();

          if (

            (
              m.from === me &&
              m.to === peer
            )

            ||

            (
              m.from === peer &&
              m.to === me
            )

          ) {

            if (
              m.to === me &&
              !m.seen
            ) {

              await updateDoc(
                doc(
                  db,
                  "messages",
                  d.id
                ),
                {
                  seen: true
                }
              );

            }

            const div =
              document.createElement(
                "div"
              );

            div.className =
              "msg " +
              (
                m.from === me
                  ? "me"
                  : "other"
              );

            div.innerHTML = `

              ${
                m.text
                  ? `
                  <div class="msgText">
                    ${decrypt(m.text)}
                  </div>
                `
                  : ""
              }

              ${
                m.image
                  ? `
                  <img
                    src="${m.image}"
                    class="chatImage"
                  >
                `
                  : ""
              }

              ${
                m.audio
                  ? `
                  <audio
                    controls
                    src="${m.audio}"
                  ></audio>
                `
                  : ""
              }

              <div class="msgBottom">

                ${
                  m.from === me
                    ? (
                        m.seen
                          ? "✔✔"
                          : "✔"
                      )
                    : ""
                }

              </div>

            `;

            box.appendChild(div);

          }

        }
      );

      box.scrollTop =
        box.scrollHeight;

    }
  );

}

/* MOOD */

window.saveMood =
  async function () {

    const mood =
      prompt(
        "Enter your mood"
      );

    if (!mood) return;

    await setDoc(
      doc(db, "moods", me),
      {
        mood
      }
    );

    loadMood();

  };

async function loadMood() {

  const moodDoc =
    await getDoc(
      doc(db, "moods", peer)
    );

  if (
    moodDoc.exists()
  ) {

    el("moodText").innerText =
      "💭 " +
      moodDoc.data().mood;

  }

}

/* LOVE LANGUAGE */

window.saveLoveLanguage =
  async function () {

    const language =
      prompt(
        "Enter love language"
      );

    if (!language) return;

    await setDoc(
      doc(
        db,
        "loveLanguages",
        me
      ),
      {
        language
      }
    );

    loadLoveLanguage();

  };

async function loadLoveLanguage() {

  const loveDoc =
    await getDoc(
      doc(
        db,
        "loveLanguages",
        peer
      )
    );

  if (
    loveDoc.exists()
  ) {

    el("loveText").innerText =
      "💝 " +
      loveDoc.data().language;

  }

}

/* MENU */

window.toggleMenu =
  function () {

    const menu =
      el("menu");

    if (
      menu.style.display ===
      "flex"
    ) {

      menu.style.display =
        "none";

    } else {

      menu.style.display =
        "flex";

    }

  };

/* CALLS */

window.startCall =
  async function () {

    await setupCall(false);

  };

window.startVideoCall =
  async function () {

    await setupCall(true);

  };

async function setupCall(video) {

  if (!peer) {

    alert("Select chat");

    return;

  }

  localStream =
    await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: video
    });

  el("localVideo").srcObject =
    localStream;

  remoteStream =
    new MediaStream();

  el("remoteVideo").srcObject =
    remoteStream;

  peerConnection =
    new RTCPeerConnection(servers);

  localStream
    .getTracks()
    .forEach(track => {

      peerConnection.addTrack(
        track,
        localStream
      );

    });

  peerConnection.ontrack =
    event => {

      event.streams[0]
        .getTracks()
        .forEach(track => {

          remoteStream.addTrack(track);

        });

    };

  const offer =
    await peerConnection.createOffer();

  await peerConnection.setLocalDescription(
    offer
  );

  await addDoc(
    collection(db, "calls"),
    {
      from: me,
      to: peer,
      offer:
        JSON.stringify(offer)
    }
  );

}

/* LISTEN */

function listenForCalls() {

  onSnapshot(
    collection(db, "calls"),
    async (snap) => {

      snap.forEach(
        async (docSnap) => {

          const data =
            docSnap.data();

          if (
            data.to !== me
          ) return;

          if (
            data.offer &&
            !peerConnection
          ) {

            localStream =
              await navigator.mediaDevices.getUserMedia({
                audio: true,
                video: true
              });

            el("localVideo").srcObject =
              localStream;

            remoteStream =
              new MediaStream();

            el("remoteVideo").srcObject =
              remoteStream;

            peerConnection =
              new RTCPeerConnection(
                servers
              );

            localStream
              .getTracks()
              .forEach(track => {

                peerConnection.addTrack(
                  track,
                  localStream
                );

              });

            peerConnection.ontrack =
              event => {

                event.streams[0]
                  .getTracks()
                  .forEach(track => {

                    remoteStream.addTrack(
                      track
                    );

                  });

              };

            await peerConnection.setRemoteDescription(

              new RTCSessionDescription(
                JSON.parse(
                  data.offer
                )
              )

            );

            const answer =
              await peerConnection.createAnswer();

            await peerConnection.setLocalDescription(
              answer
            );

            await addDoc(
              collection(db, "calls"),
              {
                from: me,
                to: data.from,
                answer:
                  JSON.stringify(answer)
              }
            );

          }

          if (
            data.answer &&
            peerConnection
          ) {

            await peerConnection.setRemoteDescription(

              new RTCSessionDescription(
                JSON.parse(
                  data.answer
                )
              )

            );

          }

        }
      );

    }
  );

}

/* EXTRA FEATURES */

window.generateDateIdea =
  function () {

    const ideas = [

      "Movie night 🍿",
      "Cook together 🍝",
      "Voice call 🌙",
      "Walk together 🚶",
      "Selfie challenge 📸"

    ];

    alert(

      ideas[
        Math.floor(
          Math.random() *
          ideas.length
        )
      ]

    );

  };

window.waterPlant =
  function () {

    alert("🌱 Plant watered");

  };

window.sendSOS =
  function () {

    alert("🆘 SOS sent");

  };

window.voiceOnlyMode =
  function () {

    el("msg").disabled =
      true;

    alert(
      "Voice only mode enabled"
    );

  };

window.breakupMode =
  function () {

    alert(
      "Breakup export system ready"
    );

  };

/* BACKUP */

window.downloadChat =
  function () {

    const text =
      el("box").innerText;

    const blob =
      new Blob(
        [text],
        {
          type: "text/plain"
        }
      );

    const a =
      document.createElement("a");

    a.href =
      URL.createObjectURL(blob);

    a.download =
      "chat-backup.txt";

    a.click();

  };

/* LOGOUT */

window.logout =
  async function () {

    await signOut(auth);

    location.reload();

  };