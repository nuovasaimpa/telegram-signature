const axios = require('axios');

module.exports = async (req, res) => {
  // Consenti richieste CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Gestisci le richieste OPTIONS (pre-flight)
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
  // Verifica che sia una richiesta POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Metodo non consentito' });
  }
  
  try {
    const { telegramId, signatureData, botToken, notifyAdmin } = req.body;
    
    if (!telegramId || !signatureData) {
      return res.status(400).json({ error: 'Mancano parametri obbligatori' });
    }
    
    // Estrai i dati base64 dall'URL
    const base64Data = signatureData.split(';base64,').pop();
    
    // Genera nome file univoco
    const fileName = `firma_${telegramId}_${Date.now()}.png`;
    
    // Crea formData per invio a Telegram
    const formData = new FormData();
    const blobData = Uint8Array.from(atob(base64Data), c => c.charCodeAt(0));
    const photoBlob = new Blob([blobData], { type: 'image/png' });
    
    formData.append('chat_id', telegramId);
    formData.append('photo', photoBlob, fileName);
    formData.append('caption', 'La tua firma è stata generata. Per favore, invia questa immagine al bot per confermarla.');
    
    // Invia a Telegram
    if (botToken) {
      await axios.post(`https://api.telegram.org/bot${botToken}/sendPhoto`, formData);
      
      // Notifica admin se specificato
      if (notifyAdmin && notifyAdmin !== telegramId) {
        const adminFormData = new FormData();
        adminFormData.append('chat_id', notifyAdmin);
        adminFormData.append('photo', photoBlob, fileName);
        adminFormData.append('caption', `Nuova firma ricevuta dall'utente ${telegramId}`);
        
        await axios.post(`https://api.telegram.org/bot${botToken}/sendPhoto`, adminFormData);
      }
    }
    
    return res.status(200).json({ 
      success: true, 
      message: 'Firma inviata con successo. Controlla i messaggi nel bot Telegram.'
    });
  } catch (error) {
    console.error('Errore:', error);
    return res.status(500).json({ 
      error: 'Errore interno del server', 
      message: error.message 
    });
  }
};