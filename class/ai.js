// Note: This script assumes you're using a bundler or a modern browser that supports ES modules

import { generateText } from 'ai';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { streamText, convertToCoreMessages } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { generateObject } from 'ai';
import { z } from 'zod';
import { streamObject } from 'ai';
import { createStreamableValue } from 'ai/rsc';
const apiKey=process.env.API_KEY
const groqapi=process.env.groqapi


// Allow streaming responses up to 30 seconds
const maxDuration = 30;

class AI {
    constructor(model,commands,schema) {
        this.model = model;
        this.google = createGoogleGenerativeAI({ apiKey });
        this.groq = createOpenAI({
            name: 'groq',
            baseURL: 'https://api.groq.com/openai/v1',
            apiKey:groqapi,
          });
        this.commands=commands
        this.schema=schema
    }

    async generateText(prompt,model,schema,commands) {
        const { text } = await generateText({
            model: model,
            messages: prompt,
            system:JSON.stringify(commands),
            schema:schema})
         return {text}
        }
    async streamtext(prompt,model,schema,commands){
        const result = await streamText({
            model: model,
            messages: convertToCoreMessages(prompt),
            system:commands,
            schema:schema
          });
        
          return result.toDataStreamResponse();

    }
    async generateObject(prompt,model,schema,commands){
        const { object: text } = await generateObject({
            model: model,
            messages: prompt, // Properly structured messages array
            schema:schema,
            system:commands,})
        
          return { text };
    }
    async streamobj(prompt,model,schema,commands){
        const stream = createStreamableValue();

    const { partialObjectStream } = await streamObject({
        model: model,
        system: JSON.stringify(commands),
        messages:prompt,
        schema:schema
    });

    for await (const partialObject of partialObjectStream) {
        stream.update(partialObject);
    }

    stream.done();

    return { object: stream.value };
    }
}