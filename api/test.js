// api/test.js
module.exports = (req, res) => {
  console.log('Test API chiamata!');
  
  res.status(200).json({
    success: true,
    message: 'API di test funzionante',
    method: req.method,
    timestamp: new Date().toISOString()
  });
};