import OpenAI from 'openai';
import { NextResponse } from 'next/server';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export async function POST(request: Request) {
  try {
    const { query } = await request.json();

    const completion = await openai.chat.completions.create({
      model: "gpt-3.5-turbo",
      messages: [
        {
          role: "system",
          content: `You are an RPI campus expert. Your task is to understand user queries about campus locations and return the most relevant building or facility name. Only respond with names that match exactly with these locations: Folsom Library, Russell Sage Dining Hall, Student Union, Greene Building, Walker Laboratory, Academy Hall, DCC (Darrin Communications Center). Do not include any additional text or explanation - just return the matching building name.`
        },
        {
          role: "user",
          content: query
        }
      ],
      temperature: 0.3,
      max_tokens: 50,
    });

    const content = completion.choices[0].message.content;
    console.log('OpenAI Response:', content); // Debug log

    return NextResponse.json({ content });
  } catch (error) {
    console.error('API Error:', error);
    return NextResponse.json({ error: 'Error processing request' }, { status: 500 });
  }
}
