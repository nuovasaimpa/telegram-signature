// api/image.js
module.exports = (req, res) => {
    try {
      const { image } = req.query;
      
      if (!image) {
        return res.status(400).send('Parametro immagine mancante');
      }
      
      // Decodifica l'immagine base64
      const imageData = Buffer.from(image, 'base64');
      
      // Imposta gli header appropriati
      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=300'); // Cache per 5 minuti
      
      // Invia l'immagine come risposta
      res.send(imageData);
    } catch (error) {
      console.error('Errore nell\'endpoint immagine:', error);
      res.status(500).send('Errore interno');
    }
  };