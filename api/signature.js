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
    
    // Usa direttamente l'URL della firma per inviarla
    try {
      // Invia la foto all'utente tramite Telegram API
      const userResponse = await axios.post(
        `https://api.telegram.org/bot${botToken}/sendPhoto`,
        {
          chat_id: telegramId,
          photo: signatureData,
          caption: 'La tua firma è stata generata. Per favore, invia questa immagine al bot per confermarla.'
        }
      );
      
      console.log('Risposta da Telegram (utente):', userResponse.data);
      
      // Notifica admin se specificato
      if (notifyAdmin && notifyAdmin !== telegramId) {
        try {
          const adminResponse = await axios.post(
            `https://api.telegram.org/bot${botToken}/sendPhoto`,
            {
              chat_id: notifyAdmin,
              photo: signatureData,
              caption: `Nuova firma ricevuta dall'utente ${telegramId}`
            }
          );
          
          console.log('Risposta da Telegram (admin):', adminResponse.data);
        } catch (adminError) {
          console.error('Errore invio a admin:', adminError.message);
          // Continuiamo anche se la notifica all'admin fallisce
        }
      }
      
      return res.status(200).json({ 
        success: true, 
        message: 'Firma inviata con successo. Controlla i messaggi nel bot Telegram.'
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