export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Metodo no permitido' });
    return;
  }
  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) {
    res.status(500).json({ error: 'Falta ANTHROPIC_API_KEY en el servidor' });
    return;
  }

  const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  const { imageData, mediaType } = body;
  if (!imageData) {
    res.status(400).json({ error: 'Falta la imagen' });
    return;
  }

  const prompt = `Este es un informe medico. Haz dos cosas:
1) Un resumen breve, en espanol sencillo, de que trata el informe y que se indica (sin dar consejo medico propio, solo explicar lo que dice el documento). Si hay algo ilegible o ambiguo, dilo explicitamente.
2) Extrae la pauta de medicacion TAL COMO aparece escrita en el informe (no inventes ni calcules nada que no este escrito): nombre del medicamento, cantidad/dosis tal cual figura, frecuencia y, si se puede deducir, horas de toma concretas en formato HH:MM (si el informe solo dice "cada 8 horas" propon horas razonables tipo 08:00/16:00/00:00, pero indicalo como propuesta).
Tambien indica, si el informe lo especifica, la duracion del tratamiento en dias. Si no se especifica, pon null.

Responde UNICAMENTE con JSON valido, sin texto adicional ni markdown, con esta forma exacta:
{"feedback":"...", "medications":[{"name":"...","quantity":"...","times":["HH:MM"],"notes":"...","duration_days":null}]}`;

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-5',
        max_tokens: 1200,
        messages: [{
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: mediaType || 'image/jpeg', data: imageData } },
            { type: 'text', text: prompt }
          ]
        }]
      })
    });
    const data = await r.json();
    const textBlock = (data.content || []).find(b => b.type === 'text');
    res.status(200).json({ text: textBlock ? textBlock.text : '' });
  } catch (err) {
    res.status(500).json({ error: 'Error llamando a la IA' });
  }
}
