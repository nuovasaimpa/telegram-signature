// api/signature.js
const axios = require('axios');

module.exports = async (req, res) => {
  // Consenti richieste CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  // Gestisci le richieste OPTIONS (pre-flight)
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  // Verifica che sia una richiesta POST
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Metodo non consentito' });
  }
  
  try {
    console.log('API signature ricevuta richiesta');
    
    const { telegramId, signatureData, botToken, notifyAdmin } = req.body;
    
    if (!telegramId || !signatureData || !botToken) {
      console.log('Parametri mancanti:', { telegramId: !!telegramId, signatureData: !!signatureData, botToken: !!botToken });
      return res.status(400).json({ 
        success: false, 
        message: 'Mancano parametri obbligatori (telegramId, signatureData o botToken)' 
      });
    }
    
    // Log per debug
    console.log(`Invio firma a utente ${telegramId} e admin ${notifyAdmin || 'nessuno'}`);
    
    try {
      // Per prima cosa invia un messaggio normale all'utente
      await axios.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          chat_id: telegramId,
          text: '✏️ La tua firma è stata ricevuta. Ti invierò un\'immagine che potrai usare per confermarla nel bot.'
        }
      );
      
      // Metodo 1: Invia usando un URL di file temporaneo (sarà visualizzato nel browser)
      return res.status(200).json({ 
        success: true, 
        message: 'Firma ricevuta! Salva l\'immagine visualizzata ora nel browser e inviala al bot.',
        image: signatureData // L'immagine base64 verrà visualizzata nel browser
      });
      
    } catch (telegramError) {
      console.error('Errore API Telegram:', telegramError.message);
      if (telegramError.response) {
        console.error('Dettagli errore:', telegramError.response.data);
      }
      throw new Error(`Errore nell'invio a Telegram: ${telegramError.message}`);
    }
  } catch (error) {
    console.error('Errore completo:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Errore interno del server: ${error.message}` 
    });
  }
};