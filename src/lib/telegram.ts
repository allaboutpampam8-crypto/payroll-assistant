export async function sendTelegramMessage(chatId: string, text: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token || !chatId) {
    console.warn('Telegram Bot Token or Chat ID not configured');
    return false;
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
      }),
    });

    const data = await res.json();
    if (!data.ok) {
      console.error('Telegram notification error:', data);
      return false;
    }
    return true;
  } catch (err) {
    console.error('Failed to send Telegram notification:', err);
    return false;
  }
}

export async function sendTelegramNotification(text: string): Promise<boolean> {
  const chatId = process.env.TELEGRAM_CHAT_ID;
  if (!chatId) {
    console.warn('Telegram Chat ID not configured');
    return false;
  }
  return sendTelegramMessage(chatId, text);
}
