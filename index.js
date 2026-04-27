import { Telegraf, Markup } from 'telegraf';
import axios from 'axios';

const BOT_TOKEN = '8721778209:AAGxswCQ_EXe7bvw4SO6Qw_xbm7SH-lgxrg'; 
const GRIZZLY_API_KEY = '2cf2c47d6a1d49de642b2c3e26c87eda';
const BASE_URL = 'https://api.grizzlysms.com/stubs/handler_api.php';

const bot = new Telegraf(BOT_TOKEN);

// --- 1. تصميم لوحة الأزرار السفلية (الدول) ---
const mainKeyboard = Markup.keyboard([
    ['الكويت 🇰🇼', 'السعودية 🇸🇦'],
    ['اليمن 🇾🇪', 'مصر 🇪🇬'],
    ['قريباً.. ⏳']
]).resize();

// --- 2. خريطة الدول (الاسم : كود جريزلي) ---
const countryMap = {
    'الكويت 🇰🇼': '52',
    'السعودية 🇸🇦': '38',
    'اليمن 🇾🇪': '92',
    'مصر 🇪🇬': '7'
};

// --- 3. التعامل مع أمر /start ---
bot.start((ctx) => {
    ctx.reply(`مرحباً Bilal! 👋\nأهلاً بك في بوت صيد الأرقام الخاص بك.\nاختر دولة من القائمة في الأسفل لبدء الصيد:`, mainKeyboard);
});

// --- 4. التعامل مع الضغط على أزرار الدول ---
bot.hears(Object.keys(countryMap), async (ctx) => {
    const countryName = ctx.message.text;
    const countryId = countryMap[countryName];
    
    await ctx.reply(`🔄 جاري صيد رقم من ${countryName}.. انتظر قليلاً.`);

    try {
        const res = await axios.get(`${BASE_URL}?api_key=${GRIZZLY_API_KEY}&action=getNumber&service=wa&country=${countryId}`);
        
        if (res.data.includes('ACCESS_NUMBER')) {
            const [_, orderId, number] = res.data.split(':');
            const cleanNumber = number.replace('+', ''); // التأكد من أن الرقم بدون + للروابط
            
            // --- تصميم الرسالة الاحترافية للأرقام ---
            let messageText = `🎯 تم صيد رقم بنجاح!\n`;
            messageText += `━━━━━━━━━━━━━━━\n`;
            messageText += `🌍 الدولة: ${countryName}\n`;
            messageText += `📞 الرقم: \`+${cleanNumber}\` (اضغط للنسخ)\n`;
            messageText += `🆔 الآيدي: ${orderId}\n`;
            messageText += `━━━━━━━━━━━━━━━\n`;
            messageText += `الآن انتظر وصول الكود.. سيصلك آلياً هنا.`;

            await ctx.replyWithMarkdownV2(escapeMarkdown(messageText), 
            Markup.inlineKeyboard([
                // الصف الأول: روابط تحقق خارجية
                [
                    Markup.button.url('🧐 تحقق واتس', `https://wa.me/${cleanNumber}`),
                    Markup.button.url('🧐 تحقق تليجرام', `https://t.me/+${cleanNumber}`)
                ],
                // الصف الثاني: أزرار التحكم
                [
                    Markup.button.callback('✅ طلب الكود', `status_${orderId}`),
                    Markup.button.callback('❌ إلغاء الرقم', `cancel_${orderId}`)
                ]
            ]));

        } else {
            ctx.reply('❌ عذراً، لا توجد أرقام متوفرة لهذه الدولة حالياً.');
        }
    } catch (e) {
        ctx.reply('حدث خطأ في الاتصال، تأكد من مفتاح الـ API.');
    }
});

// --- 5. التعامل مع زر طلب الكود (اليدوي) ---
bot.action(/status_(.+)/, async (ctx) => {
    const orderId = ctx.match[1];
    try {
        const res = await axios.get(`${BASE_URL}?api_key=${GRIZZLY_API_KEY}&action=getStatus&id=${orderId}`);
        if (res.data.includes('STATUS_OK')) {
            const code = res.data.split(':')[1];
            await ctx.editMessageText(`✅ كود الواتساب هو: \`${code}\``, { parse_mode: 'MarkdownV2' });
        } else {
            await ctx.answerCbQuery('لم يصل الكود بعد، انتظر دقيقة وأعد المحاولة.');
        }
    } catch (e) {
        await ctx.answerCbQuery('خطأ في الاتصال.');
    }
});

// --- 6. التعامل مع زر الإلغاء ---
bot.action(/cancel_(.+)/, async (ctx) => {
    const orderId = ctx.match[1];
    try {
        // إرسال كود إلغاء (8) للموقع
        await axios.get(`${BASE_URL}?api_key=${GRIZZLY_API_KEY}&action=setStatus&status=8&id=${orderId}`);
        await ctx.answerCbQuery('تم الإلغاء بنجاح ✅');
        await ctx.editMessageText(`❌ تم إلغاء هذا الرقم واسترداد الرصيد للموقع.`);
    } catch (e) {
        await ctx.answerCbQuery('فشل الإلغاء، قد يكون الكود وصل.');
    }
});

// دالة مساعدة لتنظيف النصوص من رموز الماركداون
function escapeMarkdown(text) {
    return text.replace(/[_*[\]()~`>#+-=|{}.!]/g, '\\$&');
}

bot.launch();
