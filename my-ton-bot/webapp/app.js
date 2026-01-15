// ============================================
// TON PAYMENT - MAIN LOGIC
// ============================================

// 🔧 CONFIGURATION - CHANGE THESE!
const CONFIG = {
    // Your deployed smart contract address
    contractAddress: "EQBvL1b1vvi-yXP_leOiX3tsOBawWItXOf9FmB0xCl6chsx5",
    
    // Payment amount in TON
    paymentAmount: "1000000000", // 1 TON = 1,000,000,000 nanoTON
    
    // Your manifest URL (host this file online)
    manifestUrl: "https://yourwebsite.com/tonconnect-manifest.json"
};

// ============================================
// INITIALIZE
// ============================================

// Telegram Web App
const tg = window.Telegram.WebApp;
tg.expand(); // Make full screen
tg.ready();

// Get user info from Telegram
const userId = tg.initDataUnsafe?.user?.id || "unknown";
const userName = tg.initDataUnsafe?.user?.first_name || "Friend";

// TON Connect UI
let tonConnectUI;
let walletConnected = false;

// DOM Elements
const payButton = document.getElementById('payButton');
const statusBadge = document.getElementById('status');
const walletInfo = document.getElementById('walletInfo');
const walletAddressSpan = document.getElementById('walletAddress');
const loadingOverlay = document.getElementById('loadingOverlay');
const successMessage = document.getElementById('successMessage');

// ============================================
// INITIALIZE TON CONNECT
// ============================================

async function initTonConnect() {
    try {
        tonConnectUI = new TON_CONNECT_UI.TonConnectUI({
            manifestUrl: CONFIG.manifestUrl,
            buttonRootId: 'ton-connect-button',
            
            // Customize the button
            uiPreferences: {
                theme: 'DARK'
            }
        });

        // Listen for wallet connection changes
        tonConnectUI.onStatusChange(handleWalletChange);

        console.log("✅ TON Connect initialized");
        
    } catch (error) {
        console.error("❌ TON Connect init error:", error);
        showError("Failed to initialize wallet connection");
    }
}

// ============================================
// HANDLE WALLET CONNECTION
// ============================================

function handleWalletChange(wallet) {
    if (wallet) {
        // ✅ Wallet connected
        walletConnected = true;
        
        // Get wallet address
        const address = wallet.account.address;
        const shortAddress = address.slice(0, 6) + "..." + address.slice(-4);
        
        // Update UI
        walletAddressSpan.textContent = shortAddress;
        walletInfo.style.display = 'block';
        
        statusBadge.textContent = "Connected";
        statusBadge.classList.add('connected');
        
        payButton.disabled = false;
        payButton.querySelector('.button-text').textContent = "Pay 1 TON";
        
        console.log("✅ Wallet connected:", shortAddress);
        
    } else {
        // ❌ Wallet disconnected
        walletConnected = false;
        
        // Update UI
        walletInfo.style.display = 'none';
        
        statusBadge.textContent = "Not Connected";
        statusBadge.classList.remove('connected');
        
        payButton.disabled = true;
        payButton.querySelector('.button-text').textContent = "Connect Wallet First";
        
        console.log("❌ Wallet disconnected");
    }
}

// ============================================
// SEND PAYMENT
// ============================================

async function sendPayment() {
    if (!walletConnected || !tonConnectUI) {
        showError("Please connect your wallet first");
        return;
    }

    try {
        // Show loading
        loadingOverlay.style.display = 'flex';

        // Create unique payment ID
        const paymentId = `${userId}_${Date.now()}`;

        // Build transaction
        const transaction = {
            validUntil: Math.floor(Date.now() / 1000) + 300, // 5 minutes
            messages: [
                {
                    address: CONFIG.contractAddress,
                    amount: CONFIG.paymentAmount,
                    
                    // Payload contains user ID for verification
                    payload: buildPayload(paymentId)
                }
            ]
        };

        console.log("📤 Sending transaction:", transaction);

        // Send transaction
        const result = await tonConnectUI.sendTransaction(transaction);

        console.log("✅ Transaction sent:", result);

        // Hide loading, show success
        loadingOverlay.style.display = 'none';
        successMessage.style.display = 'flex';

        // Send confirmation to Telegram bot
        sendToBot({
            action: "payment_completed",
            userId: userId,
            paymentId: paymentId,
            boc: result.boc // Transaction data
        });

        // Close mini app after 2 seconds
        setTimeout(() => {
            tg.close();
        }, 2000);

    } catch (error) {
        loadingOverlay.style.display = 'none';
        
        if (error.message?.includes('Cancelled')) {
            console.log("❌ User cancelled transaction");
        } else {
            console.error("❌ Transaction error:", error);
            showError("Transaction failed. Please try again.");
        }
    }
}

// ============================================
// HELPER FUNCTIONS
// ============================================

// Build payload for smart contract
function buildPayload(paymentId) {
    // Simple text payload
    // In production, you might want to encode this properly
    const text = paymentId;
    const bytes = new TextEncoder().encode(text);
    const base64 = btoa(String.fromCharCode(...bytes));
    return base64;
}

// Send data back to Telegram bot
function sendToBot(data) {
    try {
        tg.sendData(JSON.stringify(data));
        console.log("📤 Sent to bot:", data);
    } catch (error) {
        console.error("❌ Failed to send to bot:", error);
    }
}

// Show error message
function showError(message) {
    tg.showAlert(message);
}

// ============================================
// EVENT LISTENERS
// ============================================

// Pay button click
payButton.addEventListener('click', sendPayment);

// Telegram back button
tg.BackButton.show();
tg.BackButton.onClick(() => {
    tg.close();
});

// ============================================
// START THE APP
// ============================================

initTonConnect();

console.log("🚀 TON Payment App started");
console.log("👤 User ID:", userId);
console.log("👋 User Name:", userName);