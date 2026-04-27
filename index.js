import { Telegraf, Markup } from 'telegraf';
import axios from 'axios';

const BOT_TOKEN = '8721778209:AAGxswCQ_EXe7bvw4SO6Qw_xbm7SH-lgxrg'; 
const GRIZZLY_API_KEY = '2cf2c47d6a1d49de642b2c3e26c87eda';
const BASE_URL = 'https://api.grizzlysms.com/stubs/handler_api.php';

const bot = new Telegraf(BOT_TOKEN);

// مصفوفة الدول لضمان دقة الاختيار
const countryData = [
    { name: 'الكويت 🇰🇼', id: '52' },
    { name: 'السعودية 🇸🇦', id: '38' },
    { name: 'اليمن 🇾🇪', id: '92' },
    { name: 'مصر 🇪🇬', id: '7' }
];

const mainKeyboard = Markup.keyboard([
    ['الكويت 🇰🇼', 'السعودية 🇸🇦'],
    ['اليمن 🇾🇪', 'مصر 🇪🇬']
]).resize();

bot.start((ctx) => {
    ctx.reply(`مرحباً Bilal! 👋\nاختر الدولة المطلوبة من القائمة أدناه:`, mainKeyboard);
});

// معالجة اختيار الدولة بدقة
bot.on('text', async (ctx) => {
    const selectedCountry = countryData.find(c => c.name === ctx.message.text);
    
    if (!selectedCountry) return; // تجاهل النصوص الأخرى

    await ctx.reply(`🔄 جاري طلب رقم من ${selectedCountry.name}...`);

    try {
        // التأكد من إرسال الـ ID الصحيح للدولة في الرابط
        const res = await axios.get(`${BASE_URL}?api_key=${GRIZZLY_API_KEY}&action=getNumber&service=wa&country=${selectedCountry.id}`);
        
        if (res.data.includes('ACCESS_NUMBER')) {
            const [_, orderId, number] = res.data.split(':');
            
            let msg = `🎯 تم صيد رقم من ${selectedCountry.name}!\n`;
            msg += `━━━━━━━━━━━━━━━\n`;
            msg += `📞 الرقم: \`+${number}\`\n`;
            msg += `🆔 الآيدي: ${orderId}\n`;
            msg += `━━━━━━━━━━━━━━━`;

            await ctx.replyWithMarkdownV2(escapeMarkdown(msg), 
            Markup.inlineKeyboard([
                [Markup.button.url('🧐 تحقق واتس', `https://wa.me/${number}`)],
                [Markup.button.callback('✅ طلب الكود', `status_${orderId}`), Markup.button.callback('❌ إلغاء', `cancel_${orderId}`)]
            ]));
        } else {
            ctx.reply('❌ لا توجد أرقام متوفرة حالياً لهذه الدولة.');
        }
    } catch (e) {
        ctx.reply('❌ حدث خطأ في الاتصال بمزود الخدمة.');
    }
});

bot.action(/status_(.+)/, async (ctx) => {
    const orderId = ctx.match[1];
    const res = await axios.get(`${BASE_URL}?api_key=${GRIZZLY_API_KEY}&action=getStatus&id=${orderId}`);
    if (res.data.includes('STATUS_OK')) {
        const code = res.data.split(':')[1];
        await ctx.reply(`✅ كود الواتساب هو: \`${code}\``, { parse_mode: 'MarkdownV2' });
    } else {
        await ctx.answerCbQuery('الكود لم يصل بعد..');
    }
});

bot.action(/cancel_(.+)/, async (ctx) => {
    const orderId = ctx.match[1];
    await axios.get(`${BASE_URL}?api_key=${GRIZZLY_API_KEY}&action=setStatus&status=8&id=${orderId}`);
    await ctx.editMessageText('❌ تم إلغاء الرقم بنجاح.');
});

function escapeMarkdown(text) {
    return text.replace(/[_*[\]()~`>#+-=|{}.!]/g, '\\$&');
}

bot.launch();
