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
    
    // Estrai la parte base64 dalla data URL
    const base64Data = signatureData.split(',')[1];
    
    // Log per debug
    console.log(`Invio firma a utente ${telegramId} e admin ${notifyAdmin || 'nessuno'}`);
    
    try {
      // Ottieni l'URL del deployment corrente
      const host = req.headers.host || 'telegram-signature.vercel.app';
      const protocol = req.headers['x-forwarded-proto'] || 'https';
      const baseUrl = `${protocol}://${host}`;
      
      // Crea un URL temporaneo per l'immagine
      const imageUrl = `${baseUrl}/api/image?image=${encodeURIComponent(base64Data)}`;
      
      console.log('URL immagine generato:', imageUrl);
      
      // Invia l'immagine all'utente tramite Telegram API
      const userResponse = await axios.post(
        `https://api.telegram.org/bot${botToken}/sendPhoto`,
        {
          chat_id: telegramId,
          photo: imageUrl,
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
              photo: imageUrl,
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
        message: 'Firma inviata con successo. Controlla i messaggi nel bot Telegram.',
        imageUrl: imageUrl
      });
    } catch (telegramError) {
      console.error('Errore API Telegram:', telegramError.message);
      if (telegramError.response) {
        console.error('Dettagli errore:', telegramError.response.data);
      }
      
      // Fallback: restituisci comunque l'immagine al client
      return res.status(200).json({ 
        success: true, 
        message: 'Firma ricevuta. Usa l\'immagine mostrata e inviala al bot.',
        error: telegramError.message,
        image: signatureData
      });
    }
  } catch (error) {
    console.error('Errore completo:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Errore interno del server: ${error.message}` 
    });
  }
};