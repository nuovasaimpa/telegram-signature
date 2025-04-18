// api/signature.js
const axios = require('axios');
const FormData = require('form-data');

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
    // Converti in buffer binario
    const imageBuffer = Buffer.from(base64Data, 'base64');
    
    // Log per debug
    console.log(`Invio firma a utente ${telegramId} e admin ${notifyAdmin || 'nessuno'}`);
    
    try {
      // Prima invia un messaggio di notifica
      await axios.post(
        `https://api.telegram.org/bot${botToken}/sendMessage`,
        {
          chat_id: telegramId,
          text: '✏️ Sto elaborando la tua firma digitale...'
        }
      );
      
      // Prepara FormData per l'invio del file
      const formData = new FormData();
      formData.append('chat_id', telegramId);
      
      // Aggiungi didascalia specifica che il bot riconoscerà
      formData.append('caption', '[FIRMA-WEBAPP] Firma digitale generata automaticamente');
      
      // Aggiungi il file come buffer
      formData.append('photo', imageBuffer, {
        filename: `firma_${telegramId}_${Date.now()}.png`,
        contentType: 'image/png'
      });
      
      // Invia la foto usando FormData
      const response = await axios.post(
        `https://api.telegram.org/bot${botToken}/sendPhoto`, 
        formData, 
        {
          headers: {
            ...formData.getHeaders(),
          }
        }
      );
      
      console.log('Risposta da Telegram:', response.data);
      
      // Notifica l'admin se specificato
      if (notifyAdmin && notifyAdmin !== telegramId) {
        try {
          // Prepara FormData per l'admin
          const adminFormData = new FormData();
          adminFormData.append('chat_id', notifyAdmin);
          adminFormData.append('caption', `[FIRMA-WEBAPP] Nuova firma ricevuta dall'utente ${telegramId}`);
          
          // Aggiungi il file come buffer
          adminFormData.append('photo', imageBuffer, {
            filename: `firma_${telegramId}_${Date.now()}.png`,
            contentType: 'image/png'
          });
          
          // Invia la foto all'admin
          await axios.post(
            `https://api.telegram.org/bot${botToken}/sendPhoto`, 
            adminFormData, 
            {
              headers: {
                ...adminFormData.getHeaders(),
              }
            }
          );
        } catch (adminError) {
          console.error('Errore invio a admin:', adminError.message);
          // Non blocchiamo il flusso se la notifica all'admin fallisce
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
      throw telegramError;
    }
  } catch (error) {
    console.error('Errore completo:', error);
    return res.status(500).json({ 
      success: false, 
      message: `Errore interno del server: ${error.message}` 
    });
  }
};