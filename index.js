import { Telegraf, Markup } from 'telegraf';
import axios from 'axios';

const BOT_TOKEN = '8754267850:AAEjAb5ytUraVK9UNWhyJjj2dqifIItDs5c';
const ADMIN_ID = 1411976114;
const CHANNEL_ID = '-1003657989156';
const API_KEY = 'bnc5ZFFXM3NmclFOdE9neWJxODhiUT09';
const BASE_URL = 'http://api.durianrcs.com/stubs/handler_api.php';

const bot = new Telegraf(BOT_TOKEN);

let isHunting = false;
let countriesList = []; 
let waitingForInput = null; 

const apiCall = async (params) => {
    try {
        const res = await axios.get(BASE_URL, { params: { api_key: API_KEY, ...params } });
        return res.data;
    } catch (e) { return 'ERROR_CONNECTION'; }
};

const mainControlPanel = () => {
    return Markup.inlineKeyboard([
        [Markup.button.callback('✅ إضافة دولة', 'add_co'), Markup.button.callback('🚫 حذف دولة', 'del_co')],
        [Markup.button.callback('🧩 السحب اليدوي', 'manual_get')],
        [Markup.button.callback('♻️ الدول المضافة', 'view_list')],
        [Markup.button.callback('📝 أضف معلوماتك', 'info'), Markup.button.callback('🔎 فحص الصيد', 'check_status')],
        [Markup.button.callback('🗑️ تنظيف البوت', 'clean')],
        [Markup.button.callback('💸 رصيد حسابي', 'balance')]
    ], { columns: 2 });
};

bot.start((ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.reply(`✅ أهلاً ب المطور Bilal 👨‍💻\n\nرصيدك ونظامك متصل بموقع DurianRCS.\n\nاستخدم /work لبدء الصيد\nاستخدم /stop لإيقاف الصيد`, mainControlPanel());
});

bot.command('work', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    if (countriesList.length === 0) return ctx.reply("⚠️ أضف دولة أولاً عبر زر (إضافة دولة).");
    isHunting = true;
    ctx.reply("🚀 انطلق الصيد التلقائي.. سيتم إرسال الأرقام للقناة فور توفرها.");
    startHunting();
});

bot.command('stop', (ctx) => {
    isHunting = false;
    ctx.reply("🛑 تم إيقاف الصيد.");
});

bot.action('balance', async (ctx) => {
    const res = await apiCall({ action: 'getBalance' });
    // رد الموقع يكون: ACCESS_BALANCE:5300
    if (res.includes('ACCESS_BALANCE')) {
        const balance = res.split(':')[1];
        ctx.answerCbQuery(`💰 رصيدك الحالي هو: ${balance}`, { show_alert: true });
    } else {
        ctx.answerCbQuery(`❌ خطأ في جلب الرصيد: ${res}`, { show_alert: true });
    }
});

bot.action('add_co', (ctx) => {
    waitingForInput = 'add';
    ctx.reply("📝 أرسل رمز الدولة الآن (مثال: sa أو kw):");
});

bot.on('text', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    if (waitingForInput === 'add') {
        const co = ctx.message.text.trim().toLowerCase();
        if (!countriesList.includes(co)) {
            countriesList.push(co);
            ctx.reply(`✅ تم إضافة [${co.toUpperCase()}] لقائمة المراقبة.`, mainControlPanel());
        }
        waitingForInput = null;
    }
});

async function startHunting() {
    if (!isHunting) return;

    for (const country of countriesList) {
        // نطلب رقم واتساب (wa) للدولة المضافة
        const res = await apiCall({ action: 'getNumber', service: 'wa', country: country });
        
        if (res.includes('ACCESS_NUMBER')) {
            const [_, id, number] = res.split(':');
            
            // إرسال الرقم للقناة فوراً
            await bot.telegram.sendMessage(CHANNEL_ID, `🔥 رقم جديد من Durian!\n\n📞 الرقم: ${number}\n🌍 الدولة: ${country.toUpperCase()}\n🆔 المعرف: ${id}`, 
            Markup.inlineKeyboard([
                [Markup.button.callback('📩 طلب الكود', `get_sms:${id}`)],
                [Markup.button.callback('❌ إلغاء واسترجاع الرصيد', `cancel_num:${id}`)]
            ]));
        }
    }
    // فحص كل 10 ثوانٍ لعدم حظر الـ API
    if (isHunting) setTimeout(startHunting, 10000);
}

// تنفيذ الإلغاء
bot.action(/cancel_num:(.+)/, async (ctx) => {
    const id = ctx.match[1];
    await apiCall({ action: 'setStatus', status: 8, id: id });
    ctx.editMessageText(ctx.callbackQuery.message.text + "\n\n🚫 تم إلغاء الرقم بنجاح.");
});

bot.launch();
