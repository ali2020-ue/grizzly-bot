import { Telegraf, Markup } from 'telegraf';
import axios from 'axios';

const BOT_TOKEN = '8721778209:AAGxswCQ_EXe7bvw4SO6Qw_xbm7SH-lgxrg'; 
const GRIZZLY_API_KEY = '2cf2c47d6a1d49de642b2c3e26c87eda';
const CHANNEL_ID = '-1003990301134'; 
const BASE_URL = 'https://api.grizzlysms.com/stubs/handler_api.php';

const bot = new Telegraf(BOT_TOKEN);

async function autoHunt() {
    try {
        // جربنا كود 31 كبديل أدق للكويت في بعض تحديثات الموقع
        const res = await axios.get(`${BASE_URL}?api_key=${GRIZZLY_API_KEY}&action=getNumber&service=wa&country=52`);
        
        if (res.data.includes('ACCESS_NUMBER')) {
            const [_, orderId, number] = res.data.split(':');
            
            // --- الحماية: إذا لم يبدأ الرقم بـ 965 قم بإلغائه فوراً ---
            if (!number.startsWith('965')) {
                console.log(`تم رفض رقم غير كويتي: ${number}`);
                await axios.get(`${BASE_URL}?api_key=${GRIZZLY_API_KEY}&action=setStatus&status=8&id=${orderId}`);
                return; 
            }

            let msg = `🎯 **تم صيد رقم كويتي حقيقي!** 🇰🇼\n`;
            msg += `━━━━━━━━━━━━━━━\n`;
            msg += `📞 الرقم: \`+${number}\`\n`;
            msg += `🆔 الآيدي: \`${orderId}\`\n`;
            msg += `━━━━━━━━━━━━━━━\n`;
            msg += `⚠️ إذا كان محظوراً اضغط "إلغاء الرقم" فوراً.`;

            await bot.telegram.sendMessage(CHANNEL_ID, msg, {
                parse_mode: 'Markdown',
                ...Markup.inlineKeyboard([
                    [Markup.button.url('🧐 فحص واتساب', `https://wa.me/${number}`)],
                    [Markup.button.callback('✅ طلب الكود', `get_code_${orderId}`), Markup.button.callback('❌ إلغاء الرقم', `cancel_order_${orderId}`)]
                ])
            });
        }
    } catch (e) {
        console.log("بحث...");
    }
}

// ... بقية الكود (get_code و cancel_order) كما هي ...
bot.action(/get_code_(.+)/, async (ctx) => {
    const orderId = ctx.match[1];
    const res = await axios.get(`${BASE_URL}?api_key=${GRIZZLY_API_KEY}&action=getStatus&id=${orderId}`);
    if (res.data.includes('STATUS_OK')) {
        const code = res.data.split(':')[1];
        await ctx.reply(`✅ الكود: \`${code}\``, { parse_mode: 'Markdown' });
    } else {
        await ctx.answerCbQuery('⏳ لم يصل الكود..');
    }
});

bot.action(/cancel_order_(.+)/, async (ctx) => {
    const orderId = ctx.match[1];
    await axios.get(`${BASE_URL}?api_key=${GRIZZLY_API_KEY}&action=setStatus&status=8&id=${orderId}`);
    await ctx.editMessageText(`❌ تم إلغاء الرقم واسترداد الرصيد.`);
});

setInterval(autoHunt, 15000);
bot.launch();
