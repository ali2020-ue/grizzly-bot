import { Telegraf, Markup } from 'telegraf';
import axios from 'axios';

// --- البيانات التي زودتني بها ---
const BOT_TOKEN = '8754267850:AAEjAb5ytUraVK9UNWhyJjj2dqifIItDs5c';
const ADMIN_ID = 1411976114;
const CHANNEL_ID = '-1003657989156';
const API_KEY = 'bnc5ZFFXM3NmclFOdE9neWJxODhiUT09';
const BASE_URL = 'http://api.durianrcs.com/stubs/handler_api.php';

const bot = new Telegraf(BOT_TOKEN);

// متغيرات التحكم
let isHunting = false;
let countriesList = []; // لتخزين الدول المضافة مثل ['sa', 'kw']
let waitingForInput = null; 

// دالة الربط مع الموقع
const apiCall = async (params) => {
    try {
        const res = await axios.get(BASE_URL, { params: { api_key: API_KEY, ...params } });
        return res.data;
    } catch (e) { return 'ERROR'; }
};

// --- واجهة اللوحة الاحترافية ---
const mainControlPanel = () => {
    return Markup.inlineKeyboard([
        [Markup.button.callback('✅ إضافة دولة', 'add_co'), Markup.button.callback('🚫 حذف دولة', 'del_co')],
        [Markup.button.callback('🧩 السحب اليدوي', 'manual_get')],
        [Markup.button.callback('♻️ الدول المضافة', 'view_list')],
        [Markup.button.callback('📝 أضف معلوماتك', 'info'), Markup.button.callback('🔎 فحص الصيد', 'check_status')],
        [Markup.button.callback('🗑️ تنظيف البوت', 'clean')],
        [Markup.button.callback('💸 رصيد حسابي', 'balance')]
    ]);
};

// أمر البداية والترحيب
bot.start((ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    ctx.reply(`✅ أهلاً ب المطور 👨‍💻\n\n⬇️ تستطيع التحكم ب البوت عبر الأزرار في الأسفل\n\nلجعل البوت يبدأ الصيد /work\nلجعل البوت يتوقف عن الصيد /stop`, mainControlPanel());
});

// --- أوامر التشغيل والإيقاف (كما في الفيديو) ---
bot.command('work', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    isHunting = true;
    ctx.reply("🚀 تم بدء نظام الصيد التلقائي.. سيتم مراقبة الدول المضافة.");
    startHunting();
});

bot.command('stop', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;
    isHunting = false;
    ctx.reply("🛑 تم إيقاف نظام الصيد.");
});

// --- معالجة الأزرار ---
bot.action('add_co', (ctx) => {
    waitingForInput = 'add';
    ctx.reply("📝 رجاءً أرسل رمز الدولة (مثال: sa للسعودية، sy لسوريا):");
});

bot.action('balance', async (ctx) => {
    const res = await apiCall({ action: 'getBalance' });
    const amount = res.includes(':') ? res.split(':')[1] : '0';
    ctx.answerCbQuery(`رصيدك الحالي هو : ${amount}`, { show_alert: true });
});

bot.action('view_list', (ctx) => {
    const list = countriesList.length > 0 ? countriesList.join(' - ').toUpperCase() : "لا توجد دول مضافة";
    ctx.reply(`♻️ الدول المضافة حالياً:\n\n${list}`);
});

// استقبال النصوص (إضافة الدول)
bot.on('text', (ctx) => {
    if (ctx.from.id !== ADMIN_ID) return;

    if (waitingForInput === 'add') {
        const co = ctx.message.text.trim().toLowerCase();
        if (!countriesList.includes(co)) {
            countriesList.push(co);
            ctx.reply(`✅ تم إضافة دولة [${co.toUpperCase()}] بنجاح.`, mainControlPanel());
        }
        waitingForInput = null;
    }
});

// --- محرك الصيد والحماية ---
async function startHunting() {
    if (!isHunting || countriesList.length === 0) return;

    for (const country of countriesList) {
        const res = await apiCall({ action: 'getNumber', service: 'wa', country: country });
        
        if (res.includes('ACCESS_NUMBER')) {
            const [_, id, number] = res.split(':');
            
            // إرسال الرقم للقناة مع أزرار التحكم (إلغاء أو طلب كود)
            bot.telegram.sendMessage(CHANNEL_ID, `🔥 رقم جديد متاح!\n\n📞 الرقم: ${number}\n🌍 الدولة: ${country.toUpperCase()}\n🆔 المعرف: ${id}`, 
            Markup.inlineKeyboard([
                [Markup.button.callback('📩 طلب الكود', `get_sms:${id}`)],
                [Markup.button.callback('❌ إلغاء الرقم', `cancel_num:${id}`)]
            ]));
        }
    }
    // تكرار الصيد كل 10 ثوانٍ
    setTimeout(startHunting, 10000);
}

// تنفيذ الإلغاء لاسترجاع الرصيد
bot.action(/cancel_num:(.+)/, async (ctx) => {
    const id = ctx.match[1];
    await apiCall({ action: 'setStatus', status: 8, id: id });
    ctx.editMessageText(ctx.callbackQuery.message.text + "\n\n⚠️ تم إلغاء الرقم واسترجاع الرصيد.");
});

bot.launch();
