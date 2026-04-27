import { Telegraf, Markup } from 'telegraf';
import axios from 'axios';

// إعدادات البوت والخدمة
const BOT_TOKEN = '8721778209:AAGxswCQ_EXe7bvw4SO6Qw_xbm7SH-lgxrg'; 
const GRIZZLY_API_KEY = '2cf2c47d6a1d49de642b2c3e26c87eda';
const CHANNEL_ID = '-1003990301134'; // آيدي قناتك تم إضافته هنا
const BASE_URL = 'https://api.grizzlysms.com/stubs/handler_api.php';

const bot = new Telegraf(BOT_TOKEN);

// --- 1. وظيفة الصيد التلقائي (تعمل في الخلفية) ---
async function autoHunt() {
    try {
        // طلب رقم كويتي (ID: 52) لخدمة الواتساب (wa)
        const res = await axios.get(`${BASE_URL}?api_key=${GRIZZLY_API_KEY}&action=getNumber&service=wa&country=52`);
        
        if (res.data.includes('ACCESS_NUMBER')) {
            const [_, orderId, number] = res.data.split(':');
            
            let msg = `🎯 **تم صيد رقم كويتي جديد!** 🇰🇼\n`;
            msg += `━━━━━━━━━━━━━━━\n`;
            msg += `📞 الرقم: \`+${number}\`\n`;
            msg += `🆔 الآيدي: \`${orderId}\`\n`;
            msg += `━━━━━━━━━━━━━━━\n`;
            msg += `⚠️ افحص الرقم؛ إذا كان محظوراً أو لم يصل الكود اضغط "إلغاء الرقم" لاستعادة رصيدك فوراً.`;

            await bot.telegram.sendMessage(CHANNEL_ID, msg, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.url('🧐 فحص واتساب', `https://wa.me/${number}`)],
                    [Markup.button.callback('✅ طلب الكود', `get_code_${orderId}`), Markup.button.callback('❌ إلغاء الرقم', `cancel_order_${orderId}`)]
                ])
            });
        }
    } catch (e) {
        // في حال عدم وجود أرقام أو خطأ في الشبكة، يستمر البوت في المحاولة صمتاً
        console.log("جارٍ فحص توفر أرقام كويتية...");
    }
}

// --- 2. معالجة زر طلب الكود ---
bot.action(/get_code_(.+)/, async (ctx) => {
    const orderId = ctx.match[1];
    try {
        const res = await axios.get(`${BASE_URL}?api_key=${GRIZZLY_API_KEY}&action=getStatus&id=${orderId}`);
        if (res.data.includes('STATUS_OK')) {
            const code = res.data.split(':')[1];
            await ctx.reply(`✅ الكود للرقم (${orderId}) هو: \`${code}\``, { parse_mode: 'Markdown' });
        } else {
            await ctx.answerCbQuery('⏳ الكود لم يصل بعد، انتظر قليلاً وأعد المحاولة.', { show_alert: true });
        }
    } catch (e) {
        await ctx.answerCbQuery('حدث خطأ أثناء طلب الكود.');
    }
});

// --- 3. معالجة زر الإلغاء واسترجاع الرصيد ---
bot.action(/cancel_order_(.+)/, async (ctx) => {
    const orderId = ctx.match[1];
    try {
        // إرسال أمر الإلغاء (Status 8) للموقع
        const res = await axios.get(`${BASE_URL}?api_key=${GRIZZLY_API_KEY}&action=setStatus&status=8&id=${orderId}`);
        if (res.data.includes('ACCESS_CANCEL')) {
            await ctx.answerCbQuery('✅ تم إلغاء الرقم بنجاح واسترداد الرصيد.', { show_alert: true });
            await ctx.editMessageText(`❌ **تم إلغاء الطلب:**\nالآيدي: ${orderId}\nتم استرداد الرصيد لمحفظتك.`);
        } else {
            await ctx.answerCbQuery('❌ لا يمكن الإلغاء حالياً.');
        }
    } catch (e) {
        await ctx.answerCbQuery('خطأ في الاتصال بالموقع.');
    }
});

// تشغيل الصيد التلقائي كل 15 ثانية
setInterval(autoHunt, 15000);

// رسالة تأكيد تشغيل البوت في السجلات
bot.launch().then(() => {
    console.log("🤖 البوت يعمل الآن بنظام الصيد التلقائي في القناة...");
});
