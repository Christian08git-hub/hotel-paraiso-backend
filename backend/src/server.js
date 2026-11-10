import 'dotenv/config';
// Cambiado a import y se agregó la extensión .js
import app from './app.js';

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`servidor funcionando en http://localhost:${PORT}`);
});

