import { Telegraf } from 'telegraf';
import axios from 'axios';

// --- إعدادات البوت (تم وضع بياناتك يا Bilal) ---
const BOT_TOKEN = '8721778209:AAGxswCQ_EXe7bvw4SO6Qw_xbm7SH-lgxrg'; 
const GRIZZLY_API_KEY = '2cf2c47d6a1d49de642b2c3e26c87eda';
const BASE_URL = 'https://api.grizzlysms.com/stubs/handler_api.php';

const bot = new Telegraf(BOT_TOKEN);

async function getNumber() {
    try {
        // تم ضبط الدولة على اليمن (92) أو يمكنك تغيير الرقم '92' لأي دولة أخرى
        const res = await axios.get(`${BASE_URL}?api_key=${GRIZZLY_API_KEY}&action=getNumber&service=wa&country=92`);
        return res.data;
    } catch (e) { return null; }
}

async function checkStatus(orderId) {
    try {
        const res = await axios.get(`${BASE_URL}?api_key=${GRIZZLY_API_KEY}&action=getStatus&id=${orderId}`);
        return res.data;
    } catch (e) { return null; }
}

bot.start((ctx) => ctx.reply('مرحباً Bilal! أرسل /buy لطلب رقم واتساب يمني.'));

bot.command('buy', async (ctx) => {
    ctx.reply('جاري طلب رقم واتساب من Grizzly SMS...');
    const response = await getNumber();

    if (response && response.includes('ACCESS_NUMBER')) {
        const [_, id, number] = response.split(':');
        ctx.reply(`تم الحصول على الرقم: \n+${number}\n\nانتظر وصول الكود هنا...`);

        let attempts = 0;
        const interval = setInterval(async () => {
            attempts++;
            const status = await checkStatus(id);
            if (status.includes('STATUS_OK')) {
                const code = status.split(':')[1];
                ctx.reply(`✅ كود الواتساب الخاص بك هو: ${code}`);
                clearInterval(interval);
            } else if (attempts > 30) {
                ctx.reply('❌ انتهى الوقت (5 دقائق) ولم يصل كود.');
                clearInterval(interval);
            }
        }, 10000);
    } else {
        ctx.reply('❌ فشل طلب الرقم. تأكد من توفر أرقام لليمن أو وجود رصيد كافٍ.');
    }
});

bot.launch();
console.log('البوت يعمل بنجاح...');
