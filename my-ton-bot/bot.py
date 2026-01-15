"""
TON Payment Bot
Simple Telegram bot with TON payments
"""

import telebot
from telebot import types
import json
import requests
import time

# ============================================
# CONFIGURATION - CHANGE THESE!
# ============================================

BOT_TOKEN = "8405472605:AAH9HL30DJvTOIQfuzTvOgBb92XgCBnq7Hg"
WEBAPP_URL = "https://yourwebsite.com/index.html"
CONTRACT_ADDRESS = "EQBvL1b1vvi-yXP_leOiX3tsOBawWItXOf9FmB0xCl6chsx5"

# TON API for verification
TON_API_URL = "https://toncenter.com/api/v2"

# Store paid users (use database in production!)
paid_users = {}

# ============================================
# INITIALIZE BOT
# ============================================

bot = telebot.TeleBot(BOT_TOKEN)

# ============================================
# COMMANDS
# ============================================

@bot.message_handler(commands=['start'])
def start_command(message):
    """Welcome message with payment button"""
    
    user_id = message.from_user.id
    user_name = message.from_user.first_name
    
    # Check if already paid
    if user_id in paid_users:
        bot.send_message(
            message.chat.id,
            f"✅ Welcome back {user_name}!\n\n"
            f"Your premium access is active.\n"
            f"Use /status to check your subscription."
        )
        return
    
    # Create payment button
    markup = types.InlineKeyboardMarkup()
    
    # Web App button (opens mini app)
    webapp_button = types.InlineKeyboardButton(
        text="💎 Pay with TON",
        web_app=types.WebAppInfo(url=WEBAPP_URL)
    )
    markup.add(webapp_button)
    
    # Welcome message
    welcome_text = f"""
👋 Welcome {user_name}!

🚀 **Premium Access**

Get unlimited access to all features:
• ✨ Feature 1
• ✨ Feature 2  
• ✨ Feature 3

💰 **Price: 1 TON** (one-time payment)

Click the button below to pay with your TON wallet!
    """
    
    bot.send_message(
        message.chat.id,
        welcome_text,
        reply_markup=markup,
        parse_mode="Markdown"
    )


@bot.message_handler(commands=['status'])
def status_command(message):
    """Check payment status"""
    
    user_id = message.from_user.id
    
    if user_id in paid_users:
        bot.send_message(
            message.chat.id,
            "✅ **Status: ACTIVE**\n\n"
            f"Payment ID: `{paid_users[user_id]}`\n"
            "You have full access!",
            parse_mode="Markdown"
        )
    else:
        bot.send_message(
            message.chat.id,
            "❌ **Status: NOT PAID**\n\n"
            "Use /start to make a payment.",
            parse_mode="Markdown"
        )


@bot.message_handler(commands=['verify'])
def verify_command(message):
    """Manually verify payment"""
    
    user_id = message.from_user.id
    
    bot.send_message(message.chat.id, "🔍 Checking blockchain...")
    
    if verify_payment_on_chain(user_id):
        paid_users[user_id] = f"manual_{int(time.time())}"
        bot.send_message(
            message.chat.id,
            "✅ Payment found! Access granted."
        )
    else:
        bot.send_message(
            message.chat.id,
            "❌ No payment found.\n"
            "If you just paid, wait 30 seconds and try again."
        )


# ============================================
# WEB APP DATA HANDLER
# ============================================

@bot.message_handler(content_types=['web_app_data'])
def handle_webapp_data(message):
    """Handle data from mini app"""
    
    try:
        data = json.loads(message.web_app_data.data)
        user_id = message.from_user.id
        
        print(f"📥 Received from webapp: {data}")
        
        if data.get('action') == 'payment_completed':
            payment_id = data.get('paymentId')
            
            # Store payment (use database in production!)
            paid_users[user_id] = payment_id
            
            # Send confirmation
            bot.send_message(
                message.chat.id,
                "✅ **Payment Successful!**\n\n"
                f"Payment ID: `{payment_id}`\n\n"
                "You now have full access to all premium features!\n"
                "Use /status to check your subscription.",
                parse_mode="Markdown"
            )
            
            print(f"✅ User {user_id} paid. ID: {payment_id}")
            
    except Exception as e:
        print(f"❌ Error handling webapp data: {e}")
        bot.send_message(
            message.chat.id,
            "⚠️ Something went wrong. Please try /verify"
        )


# ============================================
# BLOCKCHAIN VERIFICATION
# ============================================

def verify_payment_on_chain(user_id):
    """Check if user has paid by looking at contract transactions"""
    
    try:
        url = f"{TON_API_URL}/getTransactions"
        params = {
            "address": CONTRACT_ADDRESS,
            "limit": 100
        }
        
        response = requests.get(url, params=params)
        data = response.json()
        
        if not data.get('ok'):
            return False
        
        transactions = data.get('result', [])
        
        for tx in transactions:
            # Check transaction message for user ID
            in_msg = tx.get('in_msg', {})
            msg_data = in_msg.get('msg_data', {})
            
            # Try to find user ID in transaction
            text = msg_data.get('text', '')
            body = msg_data.get('body', '')
            
            if str(user_id) in text or str(user_id) in body:
                return True
        
        return False
        
    except Exception as e:
        print(f"❌ Verification error: {e}")
        return False


# ============================================
# START BOT
# ============================================

if __name__ == "__main__":
    print("🤖 Bot starting...")
    print(f"📍 Contract: {CONTRACT_ADDRESS}")
    print(f"🌐 WebApp: {WEBAPP_URL}")
    print("✅ Bot is running!")
    
    bot.infinity_polling()