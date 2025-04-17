const axios = require('axios');
const FormData = require('form-data');

module.exports = async (req, res) => {
  // Configurazione CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  
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
    
    // Configura GitHub API
    const githubToken = process.env.GITHUB_TOKEN; // Imposta questo nelle variabili di ambiente di Vercel
    const repo = 'nome-del-tuo-repo';
    const owner = 'tuo-username';
    const path = `signatures/${fileName}`;

    // Carica il file su GitHub
    const githubResponse = await axios.put(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
      {
        message: `Aggiungi firma ${fileName}`,
        content: base64Data,
        branch: 'main' // o il branch che preferisci
      },
      {
        headers: {
          'Authorization': `token ${githubToken}`,
          'Accept': 'application/vnd.github.v3+json'
        }
      }
    );
    
    // Invia a Telegram (opzionale)
    if (botToken) {
      const formData = new FormData();
      const imageBuffer = Buffer.from(base64Data, 'base64');
      
      formData.append('chat_id', telegramId);
      formData.append('photo', imageBuffer, fileName);
      formData.append('caption', `Firma salvata su GitHub: ${path}`);
      
      await axios.post(`https://api.telegram.org/bot${botToken}/sendPhoto`, formData, {
        headers: formData.getHeaders()
      });
      
      // Notifica admin se specificato
      if (notifyAdmin && notifyAdmin !== telegramId) {
        const adminFormData = new FormData();
        adminFormData.append('chat_id', notifyAdmin);
        adminFormData.append('photo', imageBuffer, fileName);
        adminFormData.append('caption', `Nuova firma salvata su GitHub per utente ${telegramId}`);
        
        await axios.post(`https://api.telegram.org/bot${botToken}/sendPhoto`, adminFormData, {
          headers: adminFormData.getHeaders()
        });
      }
    }
    
    return res.status(200).json({ 
      success: true, 
      message: 'Firma salvata su GitHub',
      githubPath: path
    });
  } catch (error) {
    console.error('Errore:', error.response ? error.response.data : error.message);
    return res.status(500).json({ 
      error: 'Errore interno del server', 
      message: error.response ? error.response.data : error.message 
    });
  }
};
