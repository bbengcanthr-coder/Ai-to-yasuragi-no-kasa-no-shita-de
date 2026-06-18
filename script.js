import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-app.js";
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy } from "https://www.gstatic.com/firebasejs/10.8.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCscwywWNu1fv9dVVpW5j9mIhgrctTUysg",
  authDomain: "ai-to-yasuragi-no-kasa.firebaseapp.com",
  projectId: "ai-to-yasuragi-no-kasa",
  storageBucket: "ai-to-yasuragi-no-kasa.firebasestorage.app",
  messagingSenderId: "279844885874",
  appId: "1:279844885874:web:d05b05e9abde90e714f9eb"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// --- UI Elements ---
const introScreen = document.getElementById('intro-screen');
const enterBtn = document.getElementById('enter-btn');
const bgMusic = document.getElementById('bg-music');
const skyCanvas = document.getElementById('sky-canvas');

const writeBtn = document.getElementById('write-btn');
const writeModal = document.getElementById('write-modal');
const closeModal = document.getElementById('close-modal');
const canvas = document.getElementById('drawing-pad');
const ctx = canvas.getContext('2d');
const colorBtns = document.querySelectorAll('.color-btn');
const clearBtn = document.getElementById('clear-btn');
const hangBtn = document.getElementById('hang-btn');

let currentColor = '#ff7eb3';

// --- Intro & Music ---
enterBtn.addEventListener('click', () => {
    introScreen.style.opacity = '0';
    setTimeout(() => introScreen.style.display = 'none', 2000);
    bgMusic.play().catch(e => console.log("Audio play prevented", e));
});

// --- Canvas Drawing Logic ---
let isDrawing = false;
let lastX = 0; let lastY = 0;

ctx.strokeStyle = '#222'; // สีปากกา (หมึกดำ)
ctx.lineWidth = 3;
ctx.lineCap = 'round';
ctx.lineJoin = 'round';

// เติมสีพื้นหลังเริ่มต้น
const fillCanvasBackground = (color) => {
    ctx.fillStyle = color;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
};
fillCanvasBackground(currentColor);

const startDrawing = (e) => {
    isDrawing = true;
    const pos = getPos(e);
    [lastX, lastY] = [pos.x, pos.y];
};

const draw = (e) => {
    if (!isDrawing) return;
    e.preventDefault(); // กันจอมือถือเลื่อนตอนวาด
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(lastX, lastY);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    [lastX, lastY] = [pos.x, pos.y];
};

const stopDrawing = () => { isDrawing = false; };

const getPos = (e) => {
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
};

canvas.addEventListener('mousedown', startDrawing);
canvas.addEventListener('mousemove', draw);
canvas.addEventListener('mouseup', stopDrawing);
canvas.addEventListener('mouseout', stopDrawing);

canvas.addEventListener('touchstart', startDrawing, {passive: false});
canvas.addEventListener('touchmove', draw, {passive: false});
canvas.addEventListener('touchend', stopDrawing);

// เปลี่ยนสีกระดาษ
colorBtns.forEach(btn => {
    btn.addEventListener('click', (e) => {
        colorBtns.forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentColor = e.target.getAttribute('data-color');
        fillCanvasBackground(currentColor); // เคลียร์และเทสีใหม่
    });
});

clearBtn.addEventListener('click', () => fillCanvasBackground(currentColor));

// --- Modal Controls ---
writeBtn.addEventListener('click', () => writeModal.classList.remove('hidden'));
closeModal.addEventListener('click', () => writeModal.classList.add('hidden'));

// --- Firebase : แขวนกระดาษ ---
hangBtn.addEventListener('click', async () => {
    hangBtn.innerText = "กำลังแขวน...";
    hangBtn.disabled = true;

    // แปลง Canvas เป็นรูปลายเส้น Base64
    const imageData = canvas.toDataURL('image/png');
    
    // สุ่มตำแหน่ง X (ให้กระจายทั่ว sky-canvas ที่กว้าง 300vw)
    const randomX = Math.floor(Math.random() * 90); // 0% ถึง 90% ของคอนเทนเนอร์

    try {
        await addDoc(collection(db, "wishes"), {
            image: imageData,
            x_pos: randomX,
            timestamp: new Date()
        });
        
        writeModal.classList.add('hidden');
        fillCanvasBackground(currentColor); // เคลียร์กระดานรอรอบใหม่
    } catch (error) {
        console.error("Error adding document: ", error);
        alert("เกิดข้อผิดพลาดในการแขวนกระดาษ");
    } finally {
        hangBtn.innerText = "แขวนกระดาษ";
        hangBtn.disabled = false;
    }
});

// --- Firebase : โหลดกระดาษมาแสดงผล ---
const q = query(collection(db, "wishes"), orderBy("timestamp", "asc"));
onSnapshot(q, (snapshot) => {
    snapshot.docChanges().forEach((change) => {
        if (change.type === "added") {
            const data = change.doc.data();
            renderTanzaku(data.image, data.x_pos);
        }
    });
});

function renderTanzaku(imgSrc, xPos) {
    const div = document.createElement('div');
    div.className = 'tanzaku';
    div.style.left = `${xPos}%`;
    div.tabIndex = 0; // เพื่อให้รับ Event focus เวลาซูมดูได้

    // สุ่มความเร็วลมให้แต่ละแผ่นพริ้วไม่พร้อมกัน
    const duration = (Math.random() * 2 + 1.5).toFixed(2); // 1.5s - 3.5s
    const delay = (Math.random() * 2).toFixed(2);
    div.style.animationDuration = `${duration}s`;
    div.style.animationDelay = `${delay}s`;

    const img = document.createElement('img');
    img.src = imgSrc;
    div.appendChild(img);
    
    skyCanvas.appendChild(div);
}
