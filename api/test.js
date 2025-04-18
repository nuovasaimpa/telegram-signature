// api/test.js
module.exports = (req, res) => {
    console.log('API di test chiamata!');
    res.status(200).json({
      success: true,
      message: 'API funzionante',
      method: req.method,
      query: req.query,
      headers: req.headers,
      timestamp: new Date().toISOString()
    });
  };