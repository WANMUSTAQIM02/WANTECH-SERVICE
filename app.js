import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-analytics.js";
import { getFirestore, collection, addDoc, deleteDoc, onSnapshot, query, orderBy, updateDoc, doc, where, limit, getDoc } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-auth.js";

// ==========================================
// FIREBASE CONFIGURATION
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyD60kTrrAYRJHhiqVkom25443eN5wXwEuY",
  authDomain: "wantech-940b7.firebaseapp.com",
  projectId: "wantech-940b7",
  storageBucket: "wantech-940b7.firebasestorage.app",
  messagingSenderId: "282665795946",
  appId: "1:282665795946:web:91994a2fafc3444826e513",
  measurementId: "G-V1KWWNFKE2"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);

// ==========================================
// TELEGRAM BOT CONFIGURATION
// ==========================================
const TELEGRAM_BOT_TOKEN = "8845356364:AAE_OjsY210ORqUDEZHmXyBRzNU2dvZsZ7s"; 
const ADMIN_CHAT_ID = "8810571440";
const TELEGRAM_BOT_USERNAME = "wantech_bot"; 

async function sendTelegramMessage(chatId, text) {
    if (!chatId || !TELEGRAM_BOT_TOKEN) return;
    try {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'HTML' })
        });
    } catch (err) { console.error("Telegram Error:", err); }
}

if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').then(() => console.log('SW Registered'));
}

// ==========================================
// DYNAMIC PRICING & LIVE CURRENCY ENGINE
// ==========================================
let availableServices = {}; 
let currentCurrency = "MYR"; 
let EXCHANGE_RATE = 4.14; 

async function fetchLiveExchangeRate() {
    try {
        const response = await fetch('https://open.er-api.com/v6/latest/USD');
        const data = await response.json();
        if(data && data.rates && data.rates.MYR) {
            EXCHANGE_RATE = data.rates.MYR;
            updateEstimatedPriceDisplay();
            if(document.getElementById('admin-dashboard-view') && !document.getElementById('admin-dashboard-view').classList.contains('hidden')) {
                renderServicesTable(); 
            }
        }
    } catch (error) {
        console.warn("Gagal tarik kadar tukaran langsung. Menggunakan nilai Fallback RM 4.14");
    }
}
fetchLiveExchangeRate(); 

function formatPrice(usdPrice) {
    const price = parseFloat(usdPrice);
    if(isNaN(price)) return (currentCurrency === "MYR") ? "RM 0.00" : "$0.00";
    
    if (currentCurrency === "MYR") {
        return `RM ${(price * EXCHANGE_RATE).toFixed(2)}`;
    } else {
        return `$${price.toFixed(2)}`;
    }
}

document.getElementById('currency-selector')?.addEventListener('change', (e) => {
    currentCurrency = e.target.value;
    updateEstimatedPriceDisplay();
    if(document.getElementById('admin-dashboard-view') && !document.getElementById('admin-dashboard-view').classList.contains('hidden')) {
        renderServicesTable(); 
    }
});

function updateEstimatedPriceDisplay() {
    const selectedId = document.getElementById('service-type')?.value;
    const estPriceSpan = document.getElementById('est-price');
    if(!estPriceSpan) return;

    if(selectedId && availableServices[selectedId]) {
        estPriceSpan.innerText = formatPrice(availableServices[selectedId].price);
    } else {
        estPriceSpan.innerText = formatPrice(0);
    }
}

function loadCustomerServices() {
    const q = query(collection(db, "services"), orderBy("name", "asc"));
    onSnapshot(q, (snapshot) => {
        const select = document.getElementById('service-type');
        if(!select) return;

        select.innerHTML = '<option value="">-- Please Select a Service --</option>';
        availableServices = {};

        snapshot.forEach(docSnap => {
            const data = docSnap.data();
            availableServices[docSnap.id] = data; 
            select.innerHTML += `<option value="${docSnap.id}">${data.name}</option>`;
        });
        updateEstimatedPriceDisplay();
    });
}
loadCustomerServices(); 
document.getElementById('service-type')?.addEventListener('change', updateEstimatedPriceDisplay);

// ==========================================
// SERVER STATUS ENGINE (GOOGLE SCRIPT PROXY)
// ==========================================

function renderServerStatus(dataArray) {
    const grid = document.getElementById('server-status-grid');
    if(!grid) return;
    grid.innerHTML = '';
    let onlineCount = 0;

    dataArray.forEach(service => {
        const isOnline = service.online === true || String(service.status).toUpperCase() === "ONLINE";
        if(isOnline) onlineCount++;

        const card = document.createElement('div');
        card.className = 'status-card';
        
        const costText = service.credits ? `${service.credits} Credits` : (service.cost || "Check Server");

        card.innerHTML = `
            <div class="card-left">
                <div class="service-icon ${isOnline ? 'online' : 'offline'}"></div>
                <div class="service-info">
                    <h4>${service.name}</h4><p>${costText}</p>
                </div>
            </div>
            <div class="card-right ${isOnline ? 'online' : 'offline'}">
                <div class="status-dot"></div>${isOnline ? 'ONLINE' : 'OFFLINE'}
            </div>
        `;
        grid.appendChild(card);
    });

    const totalCount = dataArray.length;
    const uptimePercentage = totalCount === 0 ? 0 : Math.round((onlineCount / totalCount) * 100);
    
    document.getElementById('online-count').innerText = `${onlineCount} of ${totalCount} services online`;
    document.getElementById('uptime-percent-text').innerText = `${uptimePercentage}%`;
    document.getElementById('uptime-bar-fill').style.width = `${uptimePercentage}%`;

    const bannerIcon = document.getElementById('banner-icon');
    const bannerTitle = document.getElementById('banner-title');
    const uptimeText = document.getElementById('uptime-percent-text');
    const uptimeFill = document.getElementById('uptime-bar-fill');

    // LOGIK 3 TAHAP (SAMA SEPERTI PHOENIX SEBENAR)
    if (uptimePercentage >= 90) {
        // TAHAP 1: HIJAU (All Operational)
        bannerIcon.className = "banner-icon online"; 
        bannerIcon.innerHTML = "✓";
        bannerIcon.style.backgroundColor = "rgba(40, 167, 69, 0.1)";
        bannerIcon.style.color = "#28a745";
        bannerIcon.style.border = "none";
        
        bannerTitle.innerText = "All Systems Operational";
        uptimeText.style.color = "#28a745"; 
        uptimeFill.style.backgroundColor = "#28a745";
        
    } else if (uptimePercentage >= 40) {
        // TAHAP 2: OREN/KUNING (Partial Disruption)
        bannerIcon.className = "banner-icon warning"; 
        bannerIcon.innerHTML = "⚠️"; 
        bannerIcon.style.backgroundColor = "rgba(255, 149, 0, 0.1)"; 
        bannerIcon.style.color = "#FF9500"; 
        bannerIcon.style.border = "1px solid rgba(255, 149, 0, 0.3)";
        
        bannerTitle.innerText = "Partial Service Disruption";
        uptimeText.style.color = "#FF9500"; 
        uptimeFill.style.backgroundColor = "#FF9500";
        
    } else {
        // TAHAP 3: MERAH (Major Disruption)
        bannerIcon.className = "banner-icon offline"; 
        bannerIcon.innerHTML = "✕";
        bannerIcon.style.backgroundColor = "rgba(255, 59, 48, 0.1)";
        bannerIcon.style.color = "#FF3B30";
        bannerIcon.style.border = "1px solid rgba(255, 59, 48, 0.3)";
        
        bannerTitle.innerText = "Major Service Disruption";
        uptimeText.style.color = "#FF3B30"; 
        uptimeFill.style.backgroundColor = "#FF3B30";
    }
}

async function fetchLivePhoenixStatus() {
    const title = document.getElementById('banner-title');
    if(title) title.innerText = "Syncing with Live Server...";
    
    try {
        // ======================================================================
        // SILA PASTE LINK GOOGLE BOS DI BAWAH INI:
        // ======================================================================
        const proxyUrl = `https://script.google.com/macros/s/AKfycby1H7TSCc025Fm5uTYI85x8PV1HSTisnPlIF_oPl5CJdyVV04BZU1agrFs9lP-rT1Pa/exec`;
        
        if(proxyUrl.includes("MASUKKAN_LINK")) {
            throw new Error("SILA MASUKKAN LINK GOOGLE SCRIPT BOS KE DALAM KOD APP.JS TERLEBIH DAHULU!");
        }

        const response = await fetch(proxyUrl);
        const rawData = await response.json();

        if (rawData.error) {
            throw new Error(rawData.error);
        }

        let servicesArray = [];
        if (rawData && Array.isArray(rawData.services)) {
            servicesArray = rawData.services; 
        } else if (Array.isArray(rawData)) {
            servicesArray = rawData; 
        }

        if (servicesArray.length > 0) {
            renderServerStatus(servicesArray); 
        } else {
            throw new Error("Data berjaya ditarik, tapi senarai kosong atau format pelik.");
        }
        
    } catch (error) { 
        console.error("Sistem Live terputus:", error.message);
        
        const grid = document.getElementById('server-status-grid');
        if(grid) {
            grid.innerHTML = `<div style="grid-column: 1 / -1; text-align: center; padding: 40px; background: rgba(255, 59, 48, 0.1); border: 1px dashed #FF3B30; border-radius: 12px; color: #FF3B30;">
                <h3 style="margin-top: 0;">⚠️ Server Connection Lost</h3>
                <p style="font-size: 0.9rem;">Sistem tidak dapat menarik data Live dari Phoenix Tool pada masa ini.</p>
                <p style="font-size: 0.8rem; opacity: 0.7; margin-top: 10px;">Error: ${error.message}</p>
            </div>`;
        }
        
        if(title) title.innerText = "Server Unreachable";
        const icon = document.getElementById('banner-icon');
        if(icon) { icon.className = "banner-icon offline"; icon.innerText = "✕"; }
        
        document.getElementById('online-count').innerText = "0 services online";
        
        const uptimeText = document.getElementById('uptime-percent-text');
        const uptimeFill = document.getElementById('uptime-bar-fill');
        if(uptimeText) { uptimeText.innerText = "0%"; uptimeText.classList.remove('good'); }
        if(uptimeFill) { uptimeFill.style.width = "0%"; uptimeFill.classList.remove('good'); }
    }
}

function updateLiveClock() {
    const timeEl = document.getElementById('last-update-time');
    if(!timeEl) return;
    setInterval(() => {
        timeEl.innerText = new Date().toLocaleTimeString('en-US', { hour12: false });
    }, 1000);
}

fetchLivePhoenixStatus(); 
updateLiveClock();
setInterval(fetchLivePhoenixStatus, 60000); 

// ==========================================
// CUSTOMER BOOKING PORTAL
// ==========================================
document.getElementById('booking-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const serviceId = document.getElementById('service-type').value;
    if(!serviceId || !availableServices[serviceId]) return alert("Please select a valid service.");

    const sName = availableServices[serviceId].name; 
    const sPrice = availableServices[serviceId].price; 

    const dateStr = new Date().toISOString().slice(0,10).replace(/-/g,"");
    const randomCounter = Math.floor(1000 + Math.random() * 9000); 
    const trackingId = `SRV-${dateStr}-${randomCounter}`; 

    const bookingData = {
        trackingId: trackingId,
        customerName: document.getElementById('cust-name').value,
        phoneNumber: document.getElementById('cust-phone').value,
        deviceModel: document.getElementById('device-model').value,
        serviceType: sName,
        imei: document.getElementById('imei').value,
        description: document.getElementById('description').value,
        telegramId: "", 
        estimatedPrice: sPrice, 
        status: "Pending Approval",
        adminRemark: "",
        createdAt: new Date(),
        updatedAt: new Date()
    };

    try {
        await addDoc(collection(db, "bookings"), bookingData);
        alert(`Booking successful! Your Tracking ID is: ${trackingId}\nSave this ID and navigate to the 'Track' tab to connect your Telegram.`);
        document.getElementById('booking-form').reset();
        updateEstimatedPriceDisplay();

        const adminMsg = `🚨 <b>NEW BOOKING RECEIVED!</b>\n\n<b>ID:</b> <code>${trackingId}</code>\n<b>Name:</b> ${bookingData.customerName}\n<b>Model:</b> ${bookingData.deviceModel}\n<b>Service:</b> ${bookingData.serviceType}\n<b>Est. Price:</b> ${formatPrice(bookingData.estimatedPrice)}`;
        sendTelegramMessage(ADMIN_CHAT_ID, adminMsg);
    } catch (error) {
        console.error(error); alert("Failed to create booking.");
    }
});

// ==========================================
// TELEGRAM AUTO-POLLING LOGIC
// ==========================================
let pollInterval;
window.startTelegramPolling = function(docId, trackingId) {
    const btn = document.getElementById('telegram-connect-btn');
    btn.innerHTML = `⏳ Waiting for confirmation...`; btn.style.background = "#555"; btn.disabled = true;
    window.open(`https://t.me/${TELEGRAM_BOT_USERNAME}?start=${trackingId}`, '_blank');
    
    pollInterval = setInterval(async () => {
        try {
            const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/getUpdates`);
            const tgData = await res.json();
            if(tgData.ok && tgData.result) {
                for(let update of tgData.result) {
                    if(update.message && update.message.text === `/start ${trackingId}`) {
                        const chatId = update.message.chat.id;
                        await updateDoc(doc(db, "bookings", docId), { telegramId: chatId.toString() });
                        sendTelegramMessage(chatId, `✅ <b>Successfully Linked!</b>\nYou will now receive live updates for ID: <code>${trackingId}</code> right here.`);
                        clearInterval(pollInterval);
                        btn.innerHTML = `✅ Telegram Connected!`; btn.style.background = "#28a745";
                        return; 
                    }
                }
            }
        } catch(e) {}
    }, 3000); 

    setTimeout(() => {
        if(pollInterval) clearInterval(pollInterval);
        if(btn.innerHTML.includes("Waiting")) {
            btn.innerHTML = `<span style="font-size: 1.1rem; margin-right: 5px;">✈️</span> Retry Connection`;
            btn.style.background = "#0088cc"; btn.disabled = false;
        }
    }, 120000);
}

// ==========================================
// CUSTOMER TRACKING PORTAL
// ==========================================
document.getElementById('track-btn')?.addEventListener('click', () => {
    const trackId = document.getElementById('tracking-id-input').value.trim();
    if (!trackId) return;

    const resultBox = document.getElementById('tracking-result');
    if (resultBox) resultBox.classList.remove('hidden');
    
    const titleEl = document.getElementById('track-status-title');
    if (titleEl) titleEl.innerText = "Searching records...";

    const q = query(collection(db, "bookings"), where("trackingId", "==", trackId), limit(1));
    
    onSnapshot(q, (snapshot) => {
        if (snapshot.empty) {
            if (titleEl) titleEl.innerText = "Record not found.";
            return alert("Tracking ID does not exist in the system.");
        }
        
        const docId = snapshot.docs[0].id;
        const data = snapshot.docs[0].data();
        
        const remarkBox = document.getElementById('tracking-remark');
        const timeline = document.getElementById('tracking-timeline');
        const corrForm = document.getElementById('correction-form-container');
        const tgContainer = document.getElementById('telegram-link-container');
        const tgBtn = document.getElementById('telegram-connect-btn');
        
        document.querySelectorAll('.step').forEach(el => el.classList.remove('active'));
        if (corrForm) corrForm.classList.add('hidden');
        if (remarkBox) remarkBox.classList.add('hidden');

        if (!data.telegramId || data.telegramId === "") {
            tgContainer.classList.remove('hidden');
            const newTgBtn = tgBtn.cloneNode(true);
            tgBtn.parentNode.replaceChild(newTgBtn, tgBtn);
            newTgBtn.addEventListener('click', () => window.startTelegramPolling(docId, data.trackingId));
        } else {
            tgContainer.classList.add('hidden');
            if (pollInterval) clearInterval(pollInterval);
        }

        if (data.status === "Rejected") {
            if (titleEl) titleEl.innerHTML = `<span style="color: #FF3B30;">Cancelled (Rejected)</span>`;
            if (timeline) timeline.classList.add('hidden'); 
            if (remarkBox) {
                const reason = data.adminRemark ? data.adminRemark : "No reason provided.";
                remarkBox.innerHTML = `<strong>Reason for Cancellation:</strong> ${reason} <br><br><small>We apologize, but the service cannot proceed.</small>`;
                remarkBox.style.backgroundColor = "rgba(255, 59, 48, 0.1)"; remarkBox.style.color = "#FF3B30"; remarkBox.style.border = "1px solid rgba(255, 59, 48, 0.3)";
                remarkBox.classList.remove('hidden');
            }
        } else if (data.status === "Needs Correction") {
            if (titleEl) titleEl.innerHTML = `<span style="color: #FF9500;">Needs Correction</span>`;
            if (timeline) timeline.classList.add('hidden'); 
            if (remarkBox) {
                const reason = data.adminRemark ? data.adminRemark : "Please review your information.";
                remarkBox.innerHTML = `<strong>Admin Remarks:</strong> ${reason}`;
                remarkBox.style.backgroundColor = "rgba(255, 149, 0, 0.1)"; remarkBox.style.color = "#FF9500"; remarkBox.style.border = "1px solid rgba(255, 149, 0, 0.3)";
                remarkBox.classList.remove('hidden');
            }
            if (corrForm) {
                corrForm.classList.remove('hidden'); document.getElementById('corr-doc-id').value = docId;
                document.getElementById('corr-device-model').value = data.deviceModel || "";
                document.getElementById('corr-imei').value = data.imei || "";
                document.getElementById('corr-desc').value = data.description || "";
            }
        } else {
            if (titleEl) titleEl.innerText = `Status: ${data.status}`;
            if (timeline) { timeline.classList.remove('hidden'); timeline.style.opacity = '1'; }
            document.getElementById('step-pending')?.classList.add('active');
            if(["Approved", "In Progress", "Completed"].includes(data.status)) document.getElementById('step-approved')?.classList.add('active');
            if(["In Progress", "Completed"].includes(data.status)) document.getElementById('step-progress')?.classList.add('active');
            if(data.status === "Completed") document.getElementById('step-completed')?.classList.add('active');
        }
    });
});

document.getElementById('save-correction-btn')?.addEventListener('click', async () => {
    const docId = document.getElementById('corr-doc-id').value;
    const trackId = document.getElementById('tracking-id-input').value.trim();
    try {
        await updateDoc(doc(db, "bookings", docId), {
            deviceModel: document.getElementById('corr-device-model').value,
            imei: document.getElementById('corr-imei').value,
            description: document.getElementById('corr-desc').value,
            status: "Pending Approval", adminRemark: "", updatedAt: new Date()
        });
        alert("Correction submitted successfully!");
        sendTelegramMessage(ADMIN_CHAT_ID, `📝 <b>CORRECTION RECEIVED</b>\n\n<b>ID:</b> <code>${trackId}</code>\nCustomer updated their information.`);
    } catch (error) { alert("Failed to submit correction."); }
});

// ==========================================
// ADMIN AUTHENTICATION & DASHBOARD
// ==========================================
let unsubscribeAdmin = null; 
let unsubscribeServices = null;
let lastServicesSnapshot = null; 

onAuthStateChanged(auth, (user) => {
    const loginView = document.getElementById('admin-login-view');
    const dashboardView = document.getElementById('admin-dashboard-view');
    const customerNav = document.getElementById('customer-nav');
    const mainContainer = document.querySelector('main');

    if (user) {
        if(loginView) loginView.classList.add('hidden');
        if(dashboardView) dashboardView.classList.remove('hidden');
        if(customerNav) customerNav.classList.add('hidden'); 
        if(mainContainer) mainContainer.style.maxWidth = "1000px"; 

        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        const adminTab = document.getElementById('admin-tab');
        if(adminTab) adminTab.classList.add('active');

        loadAdminData(); 
    } else {
        if(loginView) loginView.classList.remove('hidden');
        if(dashboardView) dashboardView.classList.add('hidden');
        if(customerNav) customerNav.classList.remove('hidden'); 
        if(mainContainer) mainContainer.style.maxWidth = "650px"; 

        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        const homeTab = document.getElementById('home-tab');
        if(homeTab) homeTab.classList.add('active');
        
        if(customerNav) {
            document.querySelectorAll('#customer-nav button').forEach(b => b.classList.remove('active'));
            const firstBtn = document.querySelector('#customer-nav button:nth-child(1)');
            if(firstBtn) firstBtn.classList.add('active');
        }

        if(unsubscribeAdmin) unsubscribeAdmin(); 
        if(unsubscribeServices) unsubscribeServices();
    }
});

document.getElementById('admin-login-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    try {
        await signInWithEmailAndPassword(auth, document.getElementById('admin-email').value, document.getElementById('admin-password').value);
        document.getElementById('admin-login-form').reset();
    } catch (error) { alert("Invalid Admin Credentials!"); }
});

document.getElementById('logout-btn')?.addEventListener('click', async (e) => {
    e.preventDefault();
    try { await signOut(auth); window.location.reload(); } catch (error) {}
});

function renderServicesTable() {
    const sTbody = document.getElementById('services-tbody');
    if(!sTbody || !lastServicesSnapshot) return;
    sTbody.innerHTML = '';
    
    lastServicesSnapshot.forEach(docSnap => {
        const data = docSnap.data();
        const safeName = data.name.replace(/'/g, "\\'").replace(/"/g, "&quot;");
        
        let displayPriceValue = (currentCurrency === "MYR") ? (data.price * EXCHANGE_RATE).toFixed(2) : parseFloat(data.price).toFixed(2);
        
        sTbody.innerHTML += `
            <tr id="row-${docSnap.id}">
                <td>${data.name}</td>
                <td>
                    ${formatPrice(data.price)}
                    <br><small style="color:var(--text-dim)">(USD $${parseFloat(data.price).toFixed(2)})</small>
                </td>
                <td>
                    <button onclick="window.editServiceInline('${docSnap.id}', '${safeName}', ${displayPriceValue})" style="background:none; border:none; color:var(--accent-blue); font-weight:bold; cursor:pointer; margin-right:15px;">Edit</button>
                    <button onclick="window.deleteService('${docSnap.id}')" style="background:none; border:none; color:#FF3B30; font-weight:bold; cursor:pointer;">Delete</button>
                </td>
            </tr>
        `;
    });
}

function loadAdminData() {
    const servicesQ = query(collection(db, "services"), orderBy("name", "asc"));
    unsubscribeServices = onSnapshot(servicesQ, (snapshot) => {
        lastServicesSnapshot = snapshot;
        renderServicesTable();
    });

    const adminQ = query(collection(db, "bookings"), orderBy("createdAt", "desc"));
    unsubscribeAdmin = onSnapshot(adminQ, (snapshot) => {
        const tbody = document.getElementById('admin-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        let pendingCount = 0;
        
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const docId = docSnap.id;
            if(data.status === "Pending Approval" || data.status === "Needs Correction") pendingCount++;

            let statusColor = "";
            if(data.status === "Needs Correction") statusColor = "color: #FF9500; font-weight: bold;";
            if(data.status === "Rejected") statusColor = "color: #FF3B30;";

            tbody.innerHTML += `
                <tr>
                    <td><strong>${data.trackingId}</strong></td>
                    <td>
                        ${data.customerName}<br>
                        <small>${data.phoneNumber}</small><br>
                        <small style="color:var(--text-secondary)">IMEI: ${data.imei || "N/A"}</small>
                    </td>
                    <td>${data.deviceModel} <br><span style="color:var(--accent-blue)">${data.serviceType} <br>(${formatPrice(data.estimatedPrice)})</span></td>
                    <td style="${statusColor}">${data.status}</td>
                    <td>
                        <select onchange="window.updateStatus('${docId}', this.value)">
                            <option value="">Update...</option>
                            <option value="Pending Approval">Pending Approval</option>
                            <option value="Approved">Approve</option>
                            <option value="In Progress">In Progress</option>
                            <option value="Completed">Completed</option>
                            <option value="Needs Correction" style="color: #FF9500; font-weight: bold;">Request Correction</option>
                            <option value="Rejected" style="color: #FF3B30; font-weight: bold;">Reject / Cannot Process</option>
                        </select>
                    </td>
                </tr>
            `;
        });
        const statToday = document.getElementById('stat-today');
        const statPending = document.getElementById('stat-pending');
        if(statToday) statToday.innerText = snapshot.size; 
        if(statPending) statPending.innerText = pendingCount;
    });
}

// INLINE ADD SERVICE
window.toggleAddService = () => {
    const form = document.getElementById('add-service-form');
    form.classList.toggle('hidden');
};

window.saveNewService = async () => {
    const nameInput = document.getElementById('add-srv-name');
    const priceInput = document.getElementById('add-srv-price');
    const currInput = document.getElementById('add-srv-curr'); 
    
    const name = nameInput.value.trim();
    let price = parseFloat(priceInput.value);
    const curr = currInput.value;

    if(!name || isNaN(price)) return alert("Sila masukkan nama dan harga yang sah!");

    if (curr === 'MYR') { price = price / EXCHANGE_RATE; }

    try {
        await addDoc(collection(db, "services"), { name: name, price: price });
        nameInput.value = ""; priceInput.value = "";
        window.toggleAddService(); 
    } catch (error) { alert("Gagal menambah servis."); }
};

// INLINE EDIT SERVICE
window.editServiceInline = (docId, oldName, currentPriceVal) => {
    const tr = document.getElementById(`row-${docId}`);
    tr.innerHTML = `
        <td>
            <input type="text" id="edit-name-${docId}" value="${oldName}" style="width: 100%; padding: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.5); color: white; outline:none;">
        </td>
        <td style="display: flex; gap: 5px; align-items: center;">
            <select id="edit-curr-${docId}" style="padding: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.8); color: var(--primary-color); outline:none; font-weight: bold;">
                <option value="${currentCurrency}" selected>${currentCurrency}</option>
                <option value="${currentCurrency === 'MYR' ? 'USD' : 'MYR'}">${currentCurrency === 'MYR' ? 'USD' : 'MYR'}</option>
            </select>
            <input type="number" id="edit-price-${docId}" value="${currentPriceVal}" step="0.01" style="width: 100%; max-width: 100px; padding: 8px; border-radius: 6px; border: 1px solid rgba(255,255,255,0.2); background: rgba(0,0,0,0.5); color: white; outline:none;">
        </td>
        <td>
            <button onclick="window.saveEditService('${docId}')" style="background:none; border:none; color:#10B981; font-weight:bold; cursor:pointer; margin-right:15px; padding:5px;">Save</button>
            <button onclick="window.cancelEdit()" style="background:none; border:none; color:#FF3B30; font-weight:bold; cursor:pointer; padding:5px;">Cancel</button>
        </td>
    `;
};

window.saveEditService = async (docId) => {
    const newName = document.getElementById(`edit-name-${docId}`).value.trim();
    const curr = document.getElementById(`edit-curr-${docId}`).value;
    let newPrice = parseFloat(document.getElementById(`edit-price-${docId}`).value);

    if(!newName || isNaN(newPrice)) return alert("Sila pastikan nama dan harga adalah sah!");

    if (curr === 'MYR') { newPrice = newPrice / EXCHANGE_RATE; }

    try {
        await updateDoc(doc(db, "services", docId), { name: newName, price: newPrice });
    } catch (error) { alert("Gagal kemaskini servis."); }
};

window.cancelEdit = () => { renderServicesTable(); };

window.deleteService = async (docId) => {
    if(confirm("Are you sure you want to delete this service?")) {
        try { await deleteDoc(doc(db, "services", docId)); } catch(error) { alert("Failed to delete service."); }
    }
};

window.updateStatus = async (docId, newStatus) => {
    if(!newStatus || !auth.currentUser) return; 
    let updateData = { status: newStatus, updatedAt: new Date() };
    let reason = "";
    
    if (newStatus === "Rejected" || newStatus === "Needs Correction") {
        reason = prompt(`Reason for '${newStatus}':`);
        if (reason === null) return; 
        updateData.adminRemark = reason;
    } else { updateData.adminRemark = ""; }

    try {
        await updateDoc(doc(db, "bookings", docId), updateData);
        const docSnap = await getDoc(doc(db, "bookings", docId));
        if(docSnap.exists()) {
            const data = docSnap.data();
            if(data.telegramId && data.telegramId !== "") {
                sendTelegramMessage(data.telegramId, `🔔 <b>DEVICE STATUS UPDATE</b>\n\nID: <code>${data.trackingId}</code>\nYour device status is now: <b>${newStatus}</b>\n${reason ? `\nAdmin Remarks: <i>${reason}</i>` : ''}\n\nPlease check the website for more details.`);
            }
        }
    } catch (error) { alert("Failed to update status."); }
};

