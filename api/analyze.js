export default async function handler(req, res) {
  if (req.method !== 'POST') { res.status(405).json({ error: 'Metodo no permitido' }); return; }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) { res.status(500).json({ error: 'CONFIG: falta ANTHROPIC_API_KEY en Vercel.' }); return; }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { imageData, mediaType } = body;
  if (!imageData) { res.status(400).json({ error: 'Falta la imagen' }); return; }

  const prompt = `Este es un informe medico. Haz dos cosas:

1) Un resumen breve, en espanol sencillo, de que trata el informe y que se indica (sin dar consejo medico propio, solo explicar lo que dice el documento). Si hay algo ilegible o ambiguo, dilo explicitamente.

2) Extrae la pauta de medicacion TAL COMO aparece escrita (no inventes cantidades ni dosis que no esten escritas). Para cada medicamento decide UNO de estos dos modos:
   - Si el informe indica un intervalo ESTRICTO y repetido (p. ej. "cada 8 horas", "cada 12 horas"), pon "interval_hours" con ese numero (8, 12, ...) y deja "times" en null. La app se encargara de colocar las horas.
   - Si el informe indica algo FLEXIBLE o con horas concretas (p. ej. "3 veces al dia", "con las comidas", "manana y noche"), pon "interval_hours" en null y propon en "times" entre 1 y 3 horas concretas (HH:MM) colocadas en franjas comodas: manana 08:00-09:00 o tarde/noche 16:45-22:00, evitando el horario de colegio (09:00-16:45) y la madrugada.

Indica tambien la duracion del tratamiento en dias en "duration_days" si el informe lo especifica; si no, null.

Responde UNICAMENTE con JSON valido, sin texto adicional ni markdown, con esta forma exacta:
{"feedback":"...", "medications":[{"name":"...","quantity":"...","interval_hours":null,"times":null,"notes":"...","duration_days":null}]}`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': key, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({
        model: 'claude-sonnet-5',
        max_tokens: 1200,
        messages: [{ role: 'user', content: [
          { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageData } },
          { type: 'text', text: prompt }
        ] }]
      })
    });
    const data = await r.json();
    if (data.error) { res.status(500).json({ error: 'IA: ' + (data.error.message || 'error') }); return; }
    const textBlock = (data.content || []).find(b => b.type === 'text');
    res.status(200).json({ text: textBlock ? textBlock.text : '' });
  } catch (err) {
    res.status(500).json({ error: String(err.message || err) });
  }
}
