import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const KNOWN_LOCATIONS = {
  'folsom library': [-73.68254, 42.72940],
  'russell sage dining hall': [-73.678224, 42.729802],
  'student union': [-73.67686, 42.72956],
  'greene building': [-73.68119608936347, 42.730054595010635],
  'walker laboratory': [-73.68283, 42.73073],
  'academy hall': [-73.67864608936347, 42.727292595010635],
  'dcc': [-73.67843, 42.72921],
  'darrin communications center': [-73.67843, 42.72921],
};

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are an RPI campus expert. Respond with both the building name and a brief description. Format your response as JSON with 'buildingName' and 'description' fields. Stick to these buildings: Folsom Library, Russell Sage Dining Hall, Student Union, Greene Building, Walker Laboratory, Academy Hall, DCC (Darrin Communications Center).`
        },
        {
          role: "user",
          content: query
        }
      ],
      temperature: 0.3,
      max_tokens: 150,
      response_format: { type: "json_object" }
    });

    const aiResponse = JSON.parse(completion.choices[0].message.content);
    const buildingName = aiResponse.buildingName.toLowerCase();
    const coordinates = KNOWN_LOCATIONS[buildingName];

    return NextResponse.json({
      content: aiResponse.description,
      buildingName: aiResponse.buildingName,
      coordinates: coordinates || null
    });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Error processing request' }, { status: 500 });
  }
}
